"""
Application Configuration
=========================
Central place for settings. Values are read from environment variables,
which are loaded from the .env file at project startup.

Keeping configuration in one module means:
  - secrets (DATABASE_URL) never live in code
  - changing a setting means editing one place
"""

import os

from dotenv import load_dotenv

# Load variables from .env into os.environ.
# load_dotenv does not override variables already set in the real environment,
# which is what we want in production.
load_dotenv()


class Settings:
    APP_NAME: str = "Inventory Management API"
    APP_VERSION: str = "1.0.0"

    # Database connection string.
    # Raises a clear error if it is missing, rather than silently failing later.
    DATABASE_URL: str = os.environ["DATABASE_URL"]

    # CORS: list of origins allowed to call the API from a browser.
    # For local development this is the React dev server.
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


# A single settings instance used across the app.
settings = Settings()
