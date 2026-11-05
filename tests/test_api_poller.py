import unittest
import tempfile
from pathlib import Path

from pipeline.api_poller import load_poller_cursor, parse_api_page, save_poller_cursor


class ApiPollerPageTests(unittest.TestCase):
    def test_reads_event_list_and_cursor_from_api_envelope(self):
        response = {
            "status": "success",
            "pagination": {"next_cursor": "next-page-token"},
            "data": [
                {
                    "event_id": "evt-1",
                    "vector_type": "dns_exfiltration",
                    "indicators": {
                        "domain_query": "payload.example.test",
                    },
                }
            ],
        }

        events, cursor = parse_api_page(response)

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["event_id"], "evt-1")
        self.assertEqual(cursor, "next-page-token")

    def test_allows_missing_optional_cursor(self):
        events, cursor = parse_api_page({"data": []})

        self.assertEqual(events, [])
        self.assertIsNone(cursor)

    def test_rejects_non_array_event_path(self):
        with self.assertRaisesRegex(ValueError, "must be an array"):
            parse_api_page({"data": {"event_id": "evt-1"}})

    def test_rejects_non_object_event(self):
        with self.assertRaisesRegex(ValueError, "JSON object"):
            parse_api_page({"data": ["evt-1"]})

    def test_persists_cursor_across_poller_restarts(self):
        with tempfile.TemporaryDirectory() as directory:
            state_file = str(Path(directory) / "nested" / "cursor.json")

            save_poller_cursor(state_file, "resume-token")

            self.assertEqual(load_poller_cursor(state_file), "resume-token")


if __name__ == "__main__":
    unittest.main()
