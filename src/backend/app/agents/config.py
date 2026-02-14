"""
AI Configuration for agents.

Configuration is loaded from (in order of priority):
1. Environment variables (AI_PROVIDER, AI_MODEL, AI_API_KEY, etc.)
2. YAML config file (/config/ai.yaml or AI_CONFIG_PATH)
3. Default values
"""
import os
from typing import Optional
from pathlib import Path

from pydantic import BaseModel, Field


class AIConfig(BaseModel):
    """Configuration for AI providers."""
    provider: str = Field(default="openai", description="AI provider (openai, anthropic, minimax, glm)")

    @property
    def is_openai_compatible(self) -> bool:
        """Check if provider uses OpenAI-compatible API."""
        return self.provider in ("openai", "minimax", "glm")
    model: str = Field(default="gpt-4o", description="Model to use")
    api_key: Optional[str] = Field(default=None, description="API key")
    endpoint: Optional[str] = Field(default=None, description="Custom API endpoint")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096, ge=1)
    timeout: int = Field(default=300, ge=1, description="Request timeout in seconds")
    ssl_verify: bool = Field(default=True, description="SSL certificate verification")

    @classmethod
    def from_yaml_file(cls, path: str) -> "AIConfig":
        """Load config from YAML file."""
        import yaml

        config_path = Path(path)
        if not config_path.exists():
            return cls()

        with open(config_path) as f:
            data = yaml.safe_load(f)

        return cls(**data) if data else cls()

    @classmethod
    def from_environment(cls) -> "AIConfig":
        """
        Load config from environment variables and config file.

        Environment variables take precedence over config file.
        Empty env vars are treated as unset (config file value used).
        """
        # Try to load from config file first
        config_path = os.getenv("AI_CONFIG_PATH", "/config/ai.yaml")
        base_config = cls.from_yaml_file(config_path)

        def env_or(key: str, default):
            """Get env var, treating empty strings as unset."""
            val = os.getenv(key, "")
            return val if val else default

        # Override with environment variables (non-empty only)
        ssl_env = os.getenv("AI_SSL_VERIFY", "")
        ssl_verify = ssl_env.lower() in ("true", "1", "yes") if ssl_env else base_config.ssl_verify

        return cls(
            provider=env_or("AI_PROVIDER", base_config.provider),
            model=env_or("AI_MODEL", base_config.model),
            api_key=env_or("AI_API_KEY", base_config.api_key),
            endpoint=env_or("AI_ENDPOINT", base_config.endpoint),
            temperature=float(env_or("AI_TEMPERATURE", base_config.temperature)),
            max_tokens=int(env_or("AI_MAX_TOKENS", base_config.max_tokens)),
            timeout=int(env_or("AI_TIMEOUT", base_config.timeout)),
            ssl_verify=ssl_verify,
        )

    def get_http_client(self):
        """Get an httpx.AsyncClient configured with SSL and timeout settings."""
        import httpx

        return httpx.AsyncClient(
            verify=self.ssl_verify,
            timeout=httpx.Timeout(self.timeout, connect=30.0),
        )

    def _needs_custom_http_client(self) -> bool:
        """Check if a custom HTTP client is needed."""
        return bool(self.endpoint) or not self.ssl_verify or self.timeout != 300

    def create_openai_client(self):
        """Create an AsyncOpenAI client with endpoint/SSL/timeout settings."""
        import openai

        kwargs: dict = {"api_key": self.api_key}
        if self.endpoint:
            kwargs["base_url"] = self.endpoint
        if self._needs_custom_http_client():
            kwargs["http_client"] = self.get_http_client()
        return openai.AsyncOpenAI(**kwargs)

    def create_anthropic_client(self):
        """Create an AsyncAnthropic client with endpoint/SSL/timeout settings."""
        import anthropic

        kwargs: dict = {"api_key": self.api_key}
        if self.endpoint:
            kwargs["base_url"] = self.endpoint
        if self._needs_custom_http_client():
            kwargs["http_client"] = self.get_http_client()
        return anthropic.AsyncAnthropic(**kwargs)


def parse_json_response(text: str) -> dict:
    """Parse JSON from AI response, stripping markdown code fences if present."""
    import json
    import re

    if not text or not text.strip():
        raise ValueError("Empty AI response")

    stripped = text.strip()

    # Strip ```json ... ``` or ``` ... ``` wrappers (greedy to handle nested code blocks)
    match = re.match(r'^```(?:json)?\s*\n(.*)\n\s*```$', stripped, re.DOTALL)
    if match:
        inner = match.group(1).strip()
        if inner:
            stripped = inner

    # If still not starting with '{', try to find JSON object in the text
    if not stripped.startswith('{'):
        start = stripped.find('{')
        end = stripped.rfind('}')
        if start != -1 and end > start:
            stripped = stripped[start:end + 1]

    if not stripped:
        raise ValueError("No JSON content found in AI response")

    # Try strict parse first, then lenient (allows control characters in strings)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        return json.loads(stripped, strict=False)


async def call_ai_with_retry(fn, max_retries: int = 4, retry_delay: float = 1.0):
    """Call an async AI function with retry and exponential backoff on transient failures."""
    import asyncio
    import logging

    logger = logging.getLogger("ai_retry")
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except (ValueError, Exception) as e:
            error_msg = str(e)
            is_retryable = (
                "Empty" in error_msg
                or "No JSON" in error_msg
                or "Expecting value" in error_msg
                or "JSONDecodeError" in type(e).__name__
            )
            if not is_retryable or attempt >= max_retries:
                raise
            last_error = e
            delay = retry_delay * (2 ** attempt)  # exponential backoff: 1s, 2s, 4s, 8s
            logger.warning(f"AI call attempt {attempt + 1}/{max_retries + 1} failed ({error_msg}), retrying in {delay}s...")
            await asyncio.sleep(delay)

    raise last_error  # unreachable but satisfies type checker


# Singleton instance for the application
_ai_config: Optional[AIConfig] = None


def get_ai_config() -> AIConfig:
    """Get the AI configuration singleton."""
    global _ai_config
    if _ai_config is None:
        _ai_config = AIConfig.from_environment()
    return _ai_config


def reload_ai_config() -> AIConfig:
    """Reload the AI configuration from environment/file."""
    global _ai_config
    _ai_config = AIConfig.from_environment()
    return _ai_config
