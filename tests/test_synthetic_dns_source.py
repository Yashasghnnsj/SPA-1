import ipaddress
import random
import unittest

from dns_inference_api import ThreatEventPayload
from pipeline.synthetic_dns_source import SOURCE_IPS, build_synthetic_event


class SyntheticDnsSourceTests(unittest.TestCase):
    def test_builds_api_valid_events_for_each_scenario(self):
        for scenario in SOURCE_IPS:
            with self.subTest(scenario=scenario):
                event = build_synthetic_event(scenario, random.Random(7))
                validated = ThreatEventPayload.model_validate(event)

                self.assertTrue(validated.event_id.startswith("sim-"))
                self.assertEqual(event["source_type"], "synthetic")
                self.assertEqual(event["simulation_scenario"], scenario)
                self.assertTrue(event["indicators"]["domain_query"].endswith(".example.test"))

    def test_uses_reserved_documentation_addresses(self):
        for scenario in SOURCE_IPS:
            with self.subTest(scenario=scenario):
                event = build_synthetic_event(scenario, random.Random(3))
                address = ipaddress.ip_address(event["source_ip"])

                self.assertTrue(
                    any(
                        address in ipaddress.ip_network(network)
                        for network in (
                            "192.0.2.0/24",
                            "198.51.100.0/24",
                            "203.0.113.0/24",
                        )
                    )
                )

    def test_rejects_unknown_scenario(self):
        with self.assertRaises(ValueError):
            build_synthetic_event("unknown")


if __name__ == "__main__":
    unittest.main()
