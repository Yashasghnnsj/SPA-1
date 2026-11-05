"""Poll a configured REST API and publish its DNS threat events to Kafka."""

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from pipeline.kafka_gateway import close_producer, publish_event

logger = logging.getLogger("event_api_poller")


def load_poller_cursor(state_file: str) -> Any:
    path = Path(state_file)
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as state:
        saved = json.load(state)
    if not isinstance(saved, dict) or "cursor" not in saved:
        raise ValueError(f"Poller state file '{state_file}' has an invalid format.")
    return saved["cursor"]


def save_poller_cursor(state_file: str, cursor: Any) -> None:
    path = Path(state_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8") as state:
        json.dump({"cursor": cursor}, state)
        state.flush()
        os.fsync(state.fileno())
    os.replace(temporary_path, path)


def _read_path(value: Any, path: str) -> Any:
    current = value
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            raise ValueError(f"API response is missing configured path '{path}'.")
        current = current[part]
    return current


def parse_api_page(
    payload: Any,
    items_path: str = "data",
    cursor_path: str = "pagination.next_cursor",
) -> tuple[list[dict[str, Any]], Any]:
    """Validate the configured list and cursor fields in one API response."""
    events = _read_path(payload, items_path)
    if not isinstance(events, list):
        raise ValueError(f"API response path '{items_path}' must be an array.")
    if any(not isinstance(event, dict) for event in events):
        raise ValueError("Every event in the API response must be a JSON object.")

    try:
        next_cursor = _read_path(payload, cursor_path)
    except ValueError:
        next_cursor = None
    return events, next_cursor


def _api_headers() -> dict[str, str]:
    secret = os.getenv("API_SECRET", "")
    header_name = os.getenv("EVENT_API_AUTH_HEADER", "Authorization").strip()
    scheme = os.getenv("EVENT_API_AUTH_SCHEME", "Bearer").strip()
    if not secret:
        raise RuntimeError(
            "API_SECRET is required when EVENT_API_URL is configured."
        )
    if not header_name:
        raise RuntimeError("EVENT_API_AUTH_HEADER must not be empty.")
    value = f"{scheme} {secret}" if scheme else secret
    return {header_name: value}


def run_poller() -> None:
    """Continuously fetch pages from the configured source API."""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s [API-POLLER] %(levelname)s %(message)s",
    )
    endpoint = os.getenv("EVENT_API_URL", "").strip()
    if not endpoint:
        raise RuntimeError(
            "EVENT_API_URL is not configured. Set it before starting the API poller."
        )

    headers = _api_headers()
    interval = max(1, int(os.getenv("EVENT_API_INTERVAL_SECONDS", "30")))
    items_path = os.getenv("EVENT_API_ITEMS_PATH", "data")
    cursor_path = os.getenv("EVENT_API_CURSOR_PATH", "pagination.next_cursor")
    cursor_parameter = os.getenv("EVENT_API_CURSOR_PARAMETER", "cursor")
    state_file = os.getenv("EVENT_API_STATE_FILE", "data/event_api_cursor.json")
    cursor = load_poller_cursor(state_file)
    retry_policy = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        respect_retry_after_header=True,
    )
    session = requests.Session()
    session.mount("http://", HTTPAdapter(max_retries=retry_policy))
    session.mount("https://", HTTPAdapter(max_retries=retry_policy))

    logger.info("Polling configured threat-event API every %d seconds", interval)
    try:
        while True:
            params = {cursor_parameter: cursor} if cursor else None
            response = session.get(
                endpoint,
                headers=headers,
                params=params,
                timeout=(5, 30),
            )
            response.raise_for_status()
            events, next_cursor = parse_api_page(
                response.json(), items_path=items_path, cursor_path=cursor_path
            )

            published = 0
            for event in events:
                if not event.get("event_id"):
                    raise ValueError("API event is missing the required event_id.")
                publish_event(event)
                published += 1

            if next_cursor is not None:
                cursor = next_cursor
                save_poller_cursor(state_file, cursor)
            logger.info("Published %d events to Kafka", published)
            time.sleep(interval)
    finally:
        close_producer()


if __name__ == "__main__":
    run_poller()
