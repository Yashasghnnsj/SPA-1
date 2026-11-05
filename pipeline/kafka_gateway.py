"""Kafka publishing helpers shared by the API and external API poller."""

import json
import logging
import os
import threading
from typing import Any

logger = logging.getLogger("kafka_gateway")

_producer = None
_producer_lock = threading.Lock()


class KafkaUnavailableError(RuntimeError):
    """Raised when an event cannot be acknowledged by the configured broker."""


def _get_producer():
    global _producer
    with _producer_lock:
        if _producer is None:
            try:
                from kafka import KafkaProducer
                from kafka.errors import KafkaError
            except ImportError as exc:
                raise RuntimeError("kafka-python is required to publish events.") from exc

            bootstrap_servers = os.getenv(
                "KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"
            )
            try:
                _producer = KafkaProducer(
                    bootstrap_servers=bootstrap_servers.split(","),
                    value_serializer=lambda value: json.dumps(value).encode("utf-8"),
                    key_serializer=lambda value: value.encode("utf-8") if value else None,
                    acks="all",
                    retries=5,
                    max_in_flight_requests_per_connection=1,
                )
            except KafkaError as exc:
                raise KafkaUnavailableError(
                    f"Could not connect to Kafka at {bootstrap_servers}."
                ) from exc
            logger.info("Kafka producer connected to %s", bootstrap_servers)
        return _producer


def publish_event(event: dict[str, Any]) -> dict[str, Any]:
    """Publish an event and wait for the broker acknowledgement."""
    topic = os.getenv("KAFKA_INPUT_TOPIC", "dns-threat-events")
    event_key = event.get("source_ip") or event.get("event_id")
    producer = _get_producer()
    try:
        from kafka.errors import KafkaError
    except ImportError as exc:
        raise RuntimeError("kafka-python is required to publish events.") from exc
    try:
        metadata = producer.send(topic, value=event, key=event_key).get(timeout=10)
    except KafkaError as exc:
        raise KafkaUnavailableError(f"Kafka did not acknowledge topic {topic}.") from exc

    return {
        "topic": metadata.topic,
        "partition": metadata.partition,
        "offset": metadata.offset,
    }


def close_producer() -> None:
    global _producer
    with _producer_lock:
        if _producer is not None:
            _producer.close(timeout=10)
            _producer = None
