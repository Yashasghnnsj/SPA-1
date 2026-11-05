import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

from dns_inference_api import ThreatEventPayload, ingest_threat_event


class EventIngestionTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "event_id": "evt-9f83b1c8e7d4",
            "timestamp": "2026-11-05T09:00:15Z",
            "source_ip": "185.220.xxx.xxx",
            "vector_type": "dns_exfiltration",
            "indicators": {
                "domain_query": "a9f83b1c8e7d4.data-stream.tunnel-c2.xyz",
                "shannon_entropy": 4.12,
            },
            "threat_intelligence": {"abuse_confidence_score": 88},
        }

    def test_validates_and_preserves_source_fields(self):
        event = ThreatEventPayload.model_validate(self.payload)

        self.assertEqual(event.event_id, self.payload["event_id"])
        self.assertEqual(event.indicators["domain_query"], self.payload["indicators"]["domain_query"])
        self.assertEqual(event.model_extra["threat_intelligence"], {"abuse_confidence_score": 88})

    def test_requires_domain_query_for_dns_scoring(self):
        invalid = {**self.payload, "indicators": {"shannon_entropy": 4.12}}

        with self.assertRaises(ValidationError):
            ThreatEventPayload.model_validate(invalid)

    def test_returns_broker_acknowledgement_for_accepted_event(self):
        with patch(
            "dns_inference_api.publish_event",
            return_value={"topic": "dns-threat-events", "partition": 1, "offset": 4},
        ):
            result = ingest_threat_event(ThreatEventPayload.model_validate(self.payload))

        self.assertEqual(result["event_id"], self.payload["event_id"])
        self.assertEqual(result["topic"], "dns-threat-events")
        self.assertTrue(result["accepted"])

    def test_reports_kafka_unavailable_instead_of_accepting_event(self):
        with patch(
            "dns_inference_api.publish_event",
            side_effect=RuntimeError("broker unavailable"),
        ):
            with self.assertRaises(HTTPException) as raised:
                ingest_threat_event(ThreatEventPayload.model_validate(self.payload))

        self.assertEqual(raised.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
