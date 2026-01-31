"""
AI Configuration for agents.
"""
from typing import Optional
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
        from pathlib import Path

        config_path = Path(path)
        if not config_path.exists():
            return cls()

        with open(config_path) as f:
            data = yaml.safe_load(f)

        return cls(**data) if data else cls()
