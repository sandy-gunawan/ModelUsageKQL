import io
import json
import unittest
from collections import Counter
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

import demo_usage as demo


class DemoUsageTests(unittest.TestCase):
    def test_schedule_exercises_all_models_and_projects_under_traffic_limits(self):
        cases = demo.schedule(42)
        self.assertEqual(Counter(case.phase for case in cases), {"normal": 12, "ramai": 24, "pulih": 12})
        self.assertEqual(Counter(case.project for case in cases), {"ops-shift": 24, "maintenance": 15, "supply-chain": 9})
        self.assertEqual(Counter(case.model["name"] for case in cases), {
            "gpt-5-nano": 13, "gpt-5-mini": 11, "gpt-5.4-mini": 12, "gpt-6.1-terra": 6, "gpt-6.1-sol": 6,
        })
        self.assertEqual(len({(case.project, case.model_index) for case in cases}), 15)
        self.assertEqual(len({case.model_index for case in cases[:5]}), 5)
        self.assertEqual(cases, demo.schedule(42))
        for case in cases:
            self.assertLessEqual(len(case.prompt.encode("utf-8")), case.model["max_input_bytes"])

    def test_usage_counts_zero_distinct_from_missing_and_does_not_double_count(self):
        events = [
            {"project": "ops-shift", "http_status": 200, "error": None, "usage":
             {"input_tokens": 15, "output_tokens": 0, "total_tokens": 15}},
            {"project": "ops-shift", "http_status": 200, "error": "usage_tidak_ada", "usage": None},
            {"project": "maintenance", "http_status": 429, "error": "http_429", "usage": None},
        ]
        ops, maintenance = demo.summarize(events, ("project",))
        self.assertEqual((ops["attempts"], ops["requests_2xx"], ops["requests_with_usage"]), (2, 2, 1))
        self.assertEqual((ops["output_tokens"], ops["total_tokens"]), (0, 15))
        self.assertEqual(maintenance["requests_2xx"], 0)
        self.assertIsNone(maintenance["total_tokens"])

    def test_project_request_keeps_payload_and_auth_out_of_event(self):
        case = demo.schedule(42)[0]
        body = {"status": "incomplete", "output": ["not telemetry"], "model": "gpt-5-nano",
                "usage": {"input_tokens": 10, "output_tokens": 3, "total_tokens": 13}}
        response = io.BytesIO(json.dumps(body).encode("utf-8"))
        response.status = 200
        response.headers = {"apim-request-id": "demo-123"}
        opener = Mock()
        opener.open.return_value = response
        result = demo.foundry_request(opener, "fd-pamadigi-usage-aaaaaaaaaaaaa", "fake-test-token", case)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://fd-pamadigi-usage-aaaaaaaaaaaaa.services.ai.azure.com"
                         f"/api/projects/{case.project}/openai/v1/responses")
        payload = json.loads(request.data)
        self.assertFalse(payload["store"])
        self.assertLessEqual(payload["max_output_tokens"], 320)
        self.assertEqual(result["usage"]["total_tokens"], 13)
        self.assertEqual(result["response_status"], "incomplete")
        self.assertNotIn("not telemetry", json.dumps(result))
        self.assertNotIn("fake-test-token", json.dumps(result))

    @patch.object(demo, "cli_token")
    def test_unconfirmed_or_over_limit_live_run_never_gets_credentials(self, token):
        with redirect_stderr(io.StringIO()):
            for args in (["--live"], ["--live", "--limit", "49"]):
                with self.assertRaises(SystemExit) as exc:
                    demo.main(args)
                self.assertEqual(exc.exception.code, 2)
        token.assert_not_called()

    def test_usage_record_can_be_reimported_without_extra_rows_in_the_workbook(self):
        case = demo.schedule(42)[0]
        subscription = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        target = demo.UsageTarget(
            subscription,
            "fd-pamadigi-usage-aaaaaaaaaaaaa",
            "https://demo.southeastasia-1.ingest.monitor.azure.com",
            "dcr-" + "0" * 32,
            "Custom-FoundryDemoRequests_CL",
        )
        run = {"mode": "live", "subscription": subscription, "account": target.account,
               "started_utc": "2026-11-18T06:07:40+00:00"}
        event = {"mode": "live", "subscription": subscription, "number": case.number,
                 "project": case.project, "model": case.model["name"], "deployment": case.model["deployment"],
                 "time_utc": "2026-11-18T06:07:41+00:00", "http_status": 429, "usage": None,
                 "prompt": "not for telemetry", "api_key": "do not send"}
        row = demo.usage_record(event, run, "live-first-lab", target)
        again = demo.usage_record(event, run, "live-first-lab", target)
        schema = json.loads((demo.ROOT / "infra" / "usage-schema.json").read_text(encoding="utf-8"))
        self.assertEqual(set(row), {column["name"] for column in schema})
        self.assertEqual(row["EventId"], again["EventId"])
        self.assertNotEqual(row["EventId"], demo.usage_record(event, run, "live-second-lab", target)["EventId"])
        self.assertEqual(row["HttpStatus"], 429)
        self.assertIsNone(row["TotalTokens"])
        self.assertNotIn("not for telemetry", json.dumps(row))
        self.assertNotIn("do not send", json.dumps(row))
        with self.assertRaises(ValueError):
            demo.usage_record(event | {"mode": "simulasi"}, run, "live-first-lab", target)

    def test_usage_config_refuses_to_send_credentials_to_untrusted_hosts(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "target.json"
            path.write_text(json.dumps({
                "subscription": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "account": "fd-pamadigi-usage-aaaaaaaaaaaaa",
                "endpoint": "https://azure.com.example.com",
                "immutable_id": "dcr-" + "0" * 32,
                "stream": "Custom-FoundryDemoRequests_CL",
            }), encoding="utf-8")
            with self.assertRaises(ValueError):
                demo.UsageTarget.load(path)

    @patch.object(demo, "foundry_request")
    @patch.object(demo, "import_usage")
    def test_import_never_invokes_foundry(self, importer, foundry_request):
        self.assertEqual(demo.main(["--import-usage", "reports/live-first-lab"]), 0)
        importer.assert_called_once_with(Path("reports/live-first-lab"))
        foundry_request.assert_not_called()

    def test_connected_live_runner_sends_metadata_without_manual_import(self):
        subscription = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        account = "fd-pamadigi-usage-aaaaaaaaaaaaa"
        with TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / "target.json"
            path.write_text(json.dumps({
                "subscription": subscription, "account": account,
                "endpoint": "https://demo.southeastasia-1.ingest.monitor.azure.com",
                "immutable_id": "dcr-" + "0" * 32, "stream": "Custom-FoundryDemoRequests_CL",
            }), encoding="utf-8")
            result = {"http_status": 200, "response_status": "completed", "error": None,
                      "usage": {"input_tokens": 10, "output_tokens": 2, "total_tokens": 12}}
            with (
                patch.object(demo, "ROOT", root),
                patch.object(demo, "USAGE_CONFIG", path),
                patch.object(demo, "cli_token", return_value="not-a-real-credential") as credentials,
                patch.object(demo, "foundry_request", return_value=result) as foundry_request,
                patch.object(demo, "publish_usage") as publisher,
                redirect_stdout(io.StringIO()),
            ):
                code = demo.main(["--live", "--confirm-live", "--account", account,
                                  "--subscription", subscription, "--limit", "1", "--run-name", "connected"])
            self.assertEqual(code, 0)
            foundry_request.assert_called_once()
            credentials.assert_any_call(subscription, demo.MONITOR_SCOPE)
            publisher.assert_called_once()
            row = publisher.call_args.args[3][0]
            self.assertEqual(row["Project"], demo.schedule(42)[0].project)
            self.assertEqual(row["TotalTokens"], 12)
            self.assertTrue((root / "reports" / "live-connected" / "events.jsonl").is_file())

if __name__ == "__main__":
    unittest.main()
