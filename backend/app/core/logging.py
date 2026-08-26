"""
Centralized logging configuration.

Import `logger` from here everywhere instead of using `print()`.
Logs go to the console with a consistent format that includes:
  - timestamp
  - log level (INFO, WARNING, ERROR)
  - logger name
  - message

In production you would also send logs to a file or service.
"""

import logging
import sys

# Create a single logger used across the app.
logger = logging.getLogger("inventory")

# Only configure handlers once (avoid duplicate logs on reload).
if not logger.handlers:
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Log to stderr so uvicorn captures them in the terminal.
    stream_handler = logging.StreamHandler(sys.stderr)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    # Don't propagate to the root logger (which would duplicate output).
    logger.propagate = False
