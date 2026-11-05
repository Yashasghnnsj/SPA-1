"""Generate clearly labeled synthetic DNS events for local pipeline demos."""

import logging
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger("synthetic_dns_source")

SCENARIO_WEIGHTS = (
    ("benign", 0.45),
    ("periodic_beacon", 0.20),
    ("dga_like", 0.20),
    ("dns_tunnel_like", 0.15),
)
SOURCE_IPS = {
    "benign": ("192.0.2.10", "192.0.2.11", "192.0.2.12"),
    "periodic_beacon": ("198.51.100.10", "198.51.100.11"),
    "dga_like": ("203.0.113.10", "203.0.113.11"),
    "dns_tunnel_like": ("203.0.113.20", "203.0.113.21"),
}
ABUSE_CONFIDENCE_RANGES = {
    "benign": (0, 5),
    "periodic_beacon": (20, 50),
    "dga_like": (55, 80),
    "dns_tunnel_like": (80, 100),
}


def _domain_for_scenario(scenario: str, rng: random.Random) -> str:
    if scenario == "benign":
        return f"cdn-{rng.randrange(1, 100)}.assets.example.test"
    if scenario == "periodic_beacon":
        return f"keepalive-{rng.randrange(1, 20)}.edge.example.test"
    if scenario == "dga_like":
        label = "".join(rng.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=24))
        return f"{label}.resolve.example.test"
    if scenario == "dns_tunnel_like":
        payload = "".join(rng.choices("0123456789abcdef", k=48))
        chunk = "".join(rng.choices("0123456789abcdef", k=16))
        return f"{payload}.{chunk}.tunnel.example.test"
    raise ValueError(f"Unknown synthetic DNS scenario: {scenario}")


def build_synthetic_event(
    scenario: str | None = None,
    rng: random.Random | None = None,
) -> dict[str, Any]:
    """Build one valid sample event using reserved example IPs and domains."""
    generator = rng or random.Random()
    if scenario is None:
        scenarios, weights = zip(*SCENARIO_WEIGHTS)
        scenario = generator.choices(scenarios, weights=weights, k=1)[0]
    if scenario not in SOURCE_IPS:
        raise ValueError(f"Unknown synthetic DNS scenario: {scenario}")

    confidence_min, confidence_max = ABUSE_CONFIDENCE_RANGES[scenario]
    return {
        "event_id": f"sim-{uuid.uuid4().hex}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_ip": generator.choice(SOURCE_IPS[scenario]),
        "vector_type": "dns_exfiltration",
        "indicators": {
            "domain_query": _domain_for_scenario(scenario, generator),
        },
        "threat_intelligence": {
            "abuse_confidence_score": generator.randint(confidence_min, confidence_max),
        },
        "source_type": "synthetic",
        "simulation_scenario": scenario,
    }


def run_source() -> None:
    """Continuously send sample events through the real event-ingestion API."""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s [SYNTHETIC-DNS] %(levelname)s %(message)s",
    )
    api_base_url = os.getenv("SYNTHETIC_API_BASE_URL", "http://api:8000").rstrip("/")
    interval_seconds = max(
        0.2, float(os.getenv("SYNTHETIC_EVENT_INTERVAL_SECONDS", "1.5"))
    )
    logger.warning(
        "Synthetic DNS feed is active; generated events are not real threat telemetry."
    )

    with requests.Session() as session:
        while True:
            event = build_synthetic_event()
            try:
                response = session.post(
                    f"{api_base_url}/api/events",
                    json=event,
                    timeout=(3, 10),
                )
                response.raise_for_status()
                logger.info(
                    "Published %s scenario=%s source_ip=%s",
                    event["event_id"],
                    event["simulation_scenario"],
                    event["source_ip"],
                )
            except requests.RequestException:
                logger.exception(
                    "Failed to publish synthetic event %s; will retry with a new event.",
                    event["event_id"],
                )
            time.sleep(interval_seconds)


if __name__ == "__main__":
    run_source()
