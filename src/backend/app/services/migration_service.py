"""
Startup migration: backfill bilingual translations for existing data.

Scans conversations and frames that lack EN/ZH translations and fills them in
via the AI translation agent. Runs as a background task at startup so it
doesn't block the application from serving requests.

Translation failures are non-fatal — items that fail are skipped and can be
retried on the next restart.
"""
import asyncio
import json
import logging
from pathlib import Path
from typing import Optional

from app.agents.config import AIConfig, get_ai_config
from app.agents.conversation import ConversationAgent
from app.services.conversation_service import ConversationService
from app.services.frame_service import FrameService

logger = logging.getLogger("migration")


def _detect_language(text: str) -> str:
    """Heuristic: if >30% of characters are CJK, treat as Chinese."""
    if not text:
        return "en"
    cjk_count = sum(1 for ch in text if '\u4e00' <= ch <= '\u9fff')
    return "zh" if cjk_count / max(len(text), 1) > 0.3 else "en"


async def backfill_conversation_translations(
    conv_service: ConversationService,
    agent: ConversationAgent,
) -> int:
    """Translate conversation messages that lack bilingual fields.

    Returns the number of messages translated.
    """
    translated_count = 0

    if not conv_service.conversations_path.exists():
        return 0

    conv_dirs = sorted(conv_service.conversations_path.iterdir())
    for conv_dir in conv_dirs:
        if not conv_dir.is_dir() or not conv_dir.name.startswith("conv-"):
            continue

        try:
            messages = conv_service._read_messages(conv_dir)
        except Exception:
            continue

        dirty = False
        for msg in messages:
            # Skip messages that already have both translations
            if msg.content_en and msg.content_zh:
                continue
            # Skip empty messages
            if not msg.content or not msg.content.strip():
                continue

            try:
                detected_lang = _detect_language(msg.content)
                other_lang = "zh" if detected_lang == "en" else "en"

                translated = await agent.translate_texts(
                    {"text": msg.content},
                    detected_lang,
                    other_lang,
                )
                translated_text = translated.get("text", "")

                if detected_lang == "en":
                    msg.content_en = msg.content
                    msg.content_zh = translated_text
                else:
                    msg.content_zh = msg.content
                    msg.content_en = translated_text

                dirty = True
                translated_count += 1
                logger.info(
                    "Translated message %s in %s (%s→%s)",
                    msg.id, conv_dir.name, detected_lang, other_lang,
                )
            except Exception as e:
                logger.warning(
                    "Failed to translate message %s in %s: %s",
                    msg.id, conv_dir.name, e,
                )
                continue

        if dirty:
            try:
                conv_service._write_messages(conv_dir, messages)
            except Exception as e:
                logger.warning("Failed to write messages for %s: %s", conv_dir.name, e)

    return translated_count


async def backfill_frame_translations(
    frame_service: FrameService,
    agent: ConversationAgent,
) -> int:
    """Translate frame content that lacks bilingual translations.

    Returns the number of frames translated.
    """
    translated_count = 0

    if not frame_service.frames_path.exists():
        return 0

    frame_dirs = sorted(frame_service.frames_path.iterdir())
    for frame_dir in frame_dirs:
        if not frame_dir.is_dir() or not frame_dir.name.startswith("f-"):
            continue

        translations_file = frame_dir / "translations.json"
        if translations_file.exists():
            # Already has translations — skip
            continue

        try:
            frame = frame_service.get_frame(frame_dir.name)
        except Exception:
            continue

        # Build dict of non-empty sections
        sections = {}
        for key in ("problem_statement", "root_cause", "user_perspective",
                     "engineering_framing", "validation_thinking"):
            value = getattr(frame.content, key, None)
            if value and value.strip():
                sections[key] = value

        if not sections:
            continue

        # Detect primary language from the longest section
        longest_text = max(sections.values(), key=len)
        detected_lang = _detect_language(longest_text)
        other_lang = "zh" if detected_lang == "en" else "en"

        try:
            translated = await agent.translate_texts(sections, detected_lang, other_lang)

            translations = {
                detected_lang: {k: sections.get(k, "") for k in (
                    "problem_statement", "root_cause", "user_perspective",
                    "engineering_framing", "validation_thinking"
                )},
                other_lang: {k: translated.get(k, "") for k in (
                    "problem_statement", "root_cause", "user_perspective",
                    "engineering_framing", "validation_thinking"
                )},
            }

            translations_file.write_text(
                json.dumps(translations, ensure_ascii=False, indent=2)
            )
            translated_count += 1
            logger.info(
                "Translated frame %s (%s→%s)",
                frame_dir.name, detected_lang, other_lang,
            )
        except Exception as e:
            logger.warning("Failed to translate frame %s: %s", frame_dir.name, e)
            continue

    return translated_count


async def run_translation_migration(
    conv_service: ConversationService,
    frame_service: FrameService,
    config: Optional[AIConfig] = None,
) -> None:
    """Run the full translation migration.

    This is designed to be called as a background task at startup.
    """
    logger.info("Starting bilingual translation migration...")

    try:
        config = config or get_ai_config()
        agent = ConversationAgent(config=config)
    except Exception as e:
        logger.warning("Cannot initialize AI agent for migration: %s", e)
        return

    msg_count = await backfill_conversation_translations(conv_service, agent)
    frame_count = await backfill_frame_translations(frame_service, agent)

    logger.info(
        "Bilingual migration complete: %d messages translated, %d frames translated",
        msg_count, frame_count,
    )
