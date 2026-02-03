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
    provider: str = Field(default="openai", description="AI provider (openai, anthropic)")
    model: str = Field(default="gpt-4o", description="Model to use")
    api_key: Optional[str] = Field(default=None, description="API key")
    endpoint: Optional[str] = Field(default=None, description="Custom API endpoint")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096, ge=1)

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
        """
        # Try to load from config file first
        config_path = os.getenv("AI_CONFIG_PATH", "/config/ai.yaml")
        base_config = cls.from_yaml_file(config_path)

        # Override with environment variables
        return cls(
            provider=os.getenv("AI_PROVIDER", base_config.provider),
            model=os.getenv("AI_MODEL", base_config.model),
            api_key=os.getenv("AI_API_KEY", base_config.api_key),
            endpoint=os.getenv("AI_ENDPOINT", base_config.endpoint),
            temperature=float(os.getenv("AI_TEMPERATURE", base_config.temperature)),
            max_tokens=int(os.getenv("AI_MAX_TOKENS", base_config.max_tokens)),
        )


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
