import argparse
import csv
import json
import random
import re
import shutil
import subprocess
import sys
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parent
SCENARIO = json.loads((ROOT / "infra" / "scenario.json").read_text(encoding="utf-8"))
MODELS = SCENARIO["models"]
PROJECTS = [project["name"] for project in SCENARIO["projects"]]
MAX_REQUESTS = SCENARIO["max_requests"]
MAX_OUTPUT = SCENARIO["max_output_tokens"]
ACCOUNT = re.compile(r"fd-pamadigi-usage-[a-z0-9]{13}")
TOKEN_FIELDS = ("input_tokens", "output_tokens", "total_tokens")
USAGE_CONFIG = ROOT / ".azure" / "workbook-target.json"
MONITOR_SCOPE = "https://monitor.azure.com/.default"


@dataclass(frozen=True)
class Case:
    number: int
    phase: str
    project: str
    model_index: int
    prompt: str

    @property
    def model(self):
        return MODELS[self.model_index]


def example_prompt(project: str, phase: str, seed: int, max_bytes: int) -> str:
    rng = random.Random(seed)
    if project == "ops-shift":
        intro = (
            "Baca laporan pergantian shift ini. Kelompokkan prioritas menjadi tinggi, sedang, "
            "dan rendah. Jelaskan alasan dan satu tindak lanjut per prioritas; maksimal 75 kata.\n"
            "menit | unit | blok | antrean | status | target rit\n"
        )
        options = ("akses berlumpur", "siap", "antrean isi bahan", "jadwal operator berubah")
        rows = [
            f"{6 + i * 7} | DT-{rng.randrange(11, 48)} | Blok-{i % 3 + 1} | "
            f"{rng.randint(0, 9 if phase == 'ramai' else 4)} | {options[i % len(options)]} | {rng.randint(3, 8)}"
            for i in range(5 + seed % 4)
        ]
    elif project == "maintenance":
        intro = (
            "Bandingkan histori beberapa unit berikut. Cari pola berulang lintas shift, "
            "bedakan dugaan dari bukti, dan sebutkan tiga work order yang perlu ditinjau. "
            "Sebutkan ID pendukung. Jawab maksimal 90 kata.\n"
            "WO | hari | unit | tipe | jam mesin | deviasi suhu C | downtime menit | status | catatan\n"
        )
        notes = (
            "deviasi muncul setelah beban tinggi; pembacaan kedua belum ada",
            "nilai kembali normal pada shift berikutnya; verifikasi sensor terjadwal",
            "gejala serupa muncul pekan lalu; unit pembanding tidak menunjukkan deviasi",
            "pemeriksaan visual selesai; hasil pengukuran ulang sedang ditinjau",
        )
        rows = [
            f"WO-{seed % 1000:03d}-{i:02d} | {i % 7 + 1} | EX-{10 + i % 4} | "
            f"{('hidrolik', 'pendingin', 'sensor')[i % 3]} | {6800 + i * 19 + rng.randrange(10)} | "
            f"{rng.randint(0, 12) + (4 if i % 4 == 2 else 0)} | {rng.randint(0, 95)} | "
            f"{('baru', 'ditinjau', 'selesai')[i % 3]} | {notes[i % len(notes)]}"
            for i in range(34 + seed % 9)
        ]
    elif project == "supply-chain":
        intro = (
            "Nilai risiko stok habis sebelum ETA. Hati-hati: on-hand dicatat dalam karton, "
            "permintaan dalam unit, dan substitusi harus ada di tabel. Beri tiga prioritas "
            "dengan angka dan satu langkah tindak lanjut per prioritas; maksimal 80 kata.\n"
            "SKU | gudang | on-hand karton | unit per karton | kebutuhan per hari | ETA hari | substitusi\n"
        )
        rows = [
            f"P-{100 + i} | Gudang-{i % 3 + 1} | {rng.randrange(0, 18)} | {rng.choice((6, 10, 12))} | "
            f"{rng.randint(8, 58)} | {rng.randint(1, 10 if phase == 'ramai' else 6)} | "
            f"{'-' if i % 3 == 2 else f'P-{100 + (i + 1) % 12}'}"
            for i in range(12)
        ]
    else:
        raise ValueError(f"Project tidak dikenal: {project}")
    text = f"Data sintetis. Fase {phase}; batch {seed}.\n{intro}"
    for row in rows:
        if len((text + row + "\n").encode("utf-8")) > max_bytes:
            break
        text += row + "\n"
    if len(text.encode("utf-8")) > max_bytes:
        raise ValueError(f"Instruksi {project} melebihi batas input.")
    return text


def schedule(seed: int) -> list[Case]:
    rng = random.Random(seed)
    result = []
    for phase in SCENARIO["phases"]:
        entries = [
            (project, model)
            for project, counts in phase["counts"].items()
            for model, count in enumerate(counts)
            for _ in range(count)
        ]
        rng.shuffle(entries)
        if not result:
            # Coba setiap deployment sekali di awal, tanpa menambah request.
            first = [next(pair for pair in entries if pair[1] == i) for i in range(len(MODELS))]
            for pair in first:
                entries.remove(pair)
            entries = first + entries
        for project, model in entries:
            number = len(result) + 1
            prompt = example_prompt(project, phase["name"], seed * 100 + number, MODELS[model]["max_input_bytes"])
            result.append(Case(number, phase["name"], project, model, prompt))
    if len(result) != MAX_REQUESTS:
        raise ValueError(f"Jadwal berisi {len(result)} request, seharusnya {MAX_REQUESTS}.")
    return result


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def cli_token(subscription: str, scope: str = "https://ai.azure.com/.default") -> str:
    az = shutil.which("az")
    if not az:
        raise RuntimeError("Azure CLI belum ditemukan. Pasang Azure CLI dan jalankan az login.")
    result = subprocess.run(
        [az, "account", "get-access-token", "--subscription", subscription,
         "--scope", scope, "--query", "accessToken",
         "--only-show-errors", "-o", "tsv"],
        capture_output=True, text=True, timeout=30, check=False,
    )
    token = result.stdout.strip()
    if result.returncode or not re.fullmatch(r"[A-Za-z0-9_.-]+", token):
        raise RuntimeError("Token Entra tidak didapat. Cek az login dan akses subscription.")
    return token


def read_usage(body: dict) -> dict | None:
    usage = body.get("usage")
    if isinstance(usage, dict) and all(type(usage.get(k)) is int and usage[k] >= 0 for k in TOKEN_FIELDS):
        return {key: usage[key] for key in TOKEN_FIELDS}
    return None


@dataclass(frozen=True)
class UsageTarget:
    subscription: str
    account: str
    endpoint: str
    immutable_id: str
    stream: str

    @classmethod
    def load(cls, path: Path) -> "UsageTarget":
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(data, dict):
            raise ValueError("Konfigurasi Workbook bukan objek JSON.")
        values = {key: data.get(key) for key in ("subscription", "account", "endpoint", "immutable_id", "stream")}
        if not all(isinstance(value, str) for value in values.values()):
            raise ValueError("Konfigurasi Workbook tidak lengkap.")
        values["endpoint"] = values["endpoint"].rstrip("/")
        if not (
            str(uuid.UUID(values["subscription"])) == values["subscription"]
            and ACCOUNT.fullmatch(values["account"])
            and re.fullmatch(r"https://[a-z0-9][a-z0-9.-]*\.ingest\.monitor\.azure\.com", values["endpoint"])
            and re.fullmatch(r"dcr-[a-f0-9]{32}", values["immutable_id"])
            and values["stream"] == "Custom-FoundryDemoRequests_CL"
        ):
            raise ValueError("Target Workbook bukan endpoint Azure Monitor milik lab.")
        return cls(**values)


def usage_record(event: dict, run: dict, run_name: str, target: UsageTarget) -> dict:
    if not (
        run.get("mode") == event.get("mode") == "live"
        and run.get("subscription") == event.get("subscription") == target.subscription
        and run.get("account") == target.account
        and event.get("project") in PROJECTS
        and any(event.get("model") == m["name"] and event.get("deployment") == m["deployment"] for m in MODELS)
        and re.fullmatch(r"live-[a-zA-Z0-9_-]{1,48}", run_name)
        and type(event.get("number")) is int
        and 1 <= event["number"] <= MAX_REQUESTS
    ):
        raise ValueError("Catatan usage bukan dari putaran live lab yang disetujui.")
    timestamp = datetime.fromisoformat(event["time_utc"])
    started = datetime.fromisoformat(run["started_utc"])
    if timestamp.utcoffset() is None or started.utcoffset() is None:
        raise ValueError("Waktu catatan usage harus menyertakan zona waktu.")
    fields = read_usage(event) or {}
    event_id = uuid.uuid5(uuid.NAMESPACE_URL, f"{target.subscription}/{target.account}/{run_name}/{started.isoformat()}/{event['number']}")
    request_id = event.get("request_id")
    return {
        "TimeGenerated": timestamp.astimezone(UTC).isoformat(),
        "EventId": str(event_id),
        "Project": event["project"],
        "Model": event["model"],
        "Deployment": event["deployment"],
        "Run": run_name,
        "Phase": event["phase"] if event.get("phase") in {"normal", "ramai", "pulih"} else "",
        "ApiRequestId": request_id if isinstance(request_id, str) and re.fullmatch(r"[a-zA-Z0-9_.-]{1,128}", request_id) else "",
        "HttpStatus": event.get("http_status") if type(event.get("http_status")) is int else None,
        "ResponseStatus": event["response_status"] if event.get("response_status") in {"completed", "incomplete", "failed"} else "",
        "LatencyMs": event.get("latency_ms") if type(event.get("latency_ms")) is int else None,
        "InputTokens": fields.get("input_tokens"),
        "OutputTokens": fields.get("output_tokens"),
        "TotalTokens": fields.get("total_tokens"),
    }


def publish_usage(opener, target: UsageTarget, token: str, rows: list[dict]) -> None:
    data = json.dumps(rows, separators=(",", ":"), allow_nan=False).encode("utf-8")
    if not 1 <= len(rows) <= MAX_REQUESTS or len(data) >= 1_000_000:
        raise ValueError("Batch metadata di luar batas lab.")
    url = f"{target.endpoint}/dataCollectionRules/{target.immutable_id}/streams/{target.stream}?api-version=2023-01-01"
    request = Request(url, method="POST", headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json",
    }, data=data)
    try:
        with opener.open(request, timeout=15) as result:
            if result.status != 204:
                raise RuntimeError(f"Azure Monitor tidak mengonfirmasi metadata: HTTP {result.status}.")
    except HTTPError as exc:
        with exc:
            raise RuntimeError(f"Azure Monitor menolak metadata: HTTP {exc.code}.") from None
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Azure Monitor tidak dapat dijangkau: {type(exc).__name__}.") from None


def import_usage(folder: Path) -> None:
    folder = folder.resolve()
    if folder.parent != (ROOT / "reports").resolve():
        raise ValueError("Sumber impor harus berupa folder putaran di reports.")
    target = UsageTarget.load(USAGE_CONFIG)
    run = json.loads((folder / "run.json").read_text(encoding="utf-8"))
    events = [json.loads(line) for line in (folder / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    rows = [usage_record(event, run, folder.name, target) for event in events]
    publish_usage(build_opener(NoRedirect()), target, cli_token(target.subscription, MONITOR_SCOPE), rows)
    print(f"Azure Monitor menerima {len(rows)} catatan untuk Workbook; tidak ada panggilan model baru.", flush=True)


def api_error_fields(response) -> dict:
    try:
        body = json.load(response)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    error = body.get("error") if isinstance(body, dict) else None
    if not isinstance(error, dict):
        return {}
    # Keep identifiers useful for troubleshooting, not vendor error messages that can repeat input.
    return {
        f"api_error_{key}": value
        for key in ("code", "param")
        if isinstance(value := error.get(key), str) and re.fullmatch(r"[a-zA-Z0-9_.-]{1,80}", value)
    }


def foundry_request(opener, account: str, token: str, case: Case) -> dict:
    if not ACCOUNT.fullmatch(account) or case.project not in PROJECTS:
        raise ValueError("Endpoint harus milik project pada lab pamadigi.")
    url = f"https://{account}.services.ai.azure.com/api/projects/{case.project}/openai/v1/responses"
    request = Request(url, method="POST", headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json",
    }, data=json.dumps({
        "model": case.model["deployment"], "input": case.prompt, "store": False,
        "max_output_tokens": MAX_OUTPUT, "reasoning": {"effort": case.model["effort"]},
    }, ensure_ascii=False).encode("utf-8"))
    try:
        with opener.open(request, timeout=90) as response:
            status = response.status
            request_id = response.headers.get("apim-request-id") or response.headers.get("x-request-id")
            try:
                body = json.load(response)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return {"http_status": status, "request_id": request_id, "error": "respons_bukan_json", "usage": None}
    except HTTPError as exc:
        with exc:
            return {"http_status": exc.code, "request_id": exc.headers.get("apim-request-id"),
                    "error": f"http_{exc.code}", "usage": None, **api_error_fields(exc)}
    except (URLError, TimeoutError) as exc:
        return {"http_status": None, "error": type(exc).__name__, "usage": None}
    if not isinstance(body, dict):
        return {"http_status": status, "request_id": request_id, "error": "respons_tidak_valid", "usage": None}
    usage = read_usage(body)
    response_status = body.get("status")
    error = None
    if response_status not in {"completed", "incomplete"}:
        error = "status_model_tidak_valid"
    elif usage is None:
        error = "usage_tidak_ada"
    return {"http_status": status, "request_id": request_id, "response_status": response_status,
            "response_model": body.get("model"), "error": error, "usage": usage}


def simulate(case: Case) -> dict:
    input_tokens = (len(case.prompt.encode("utf-8")) + 3) // 4
    output_tokens = 36 + case.model_index * 9 + case.number % 17
    return {"http_status": 200, "response_status": "completed", "error": None, "usage": {
        "input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": input_tokens + output_tokens,
    }}


def summarize(events: list[dict], dimensions: tuple[str, ...]) -> list[dict]:
    groups = defaultdict(list)
    for event in events:
        groups[tuple(event[key] for key in dimensions)].append(event)
    rows = []
    for values, group in groups.items():
        usage = [e["usage"] for e in group if e["usage"] is not None]
        successes = sum(200 <= (e["http_status"] or 0) < 300 for e in group)
        rows.append(dict(zip(dimensions, values)) | {
            "attempts": len(group),
            "requests_2xx": successes,
            "errors": sum(e["error"] is not None for e in group),
            "incomplete": sum(e.get("response_status") == "incomplete" for e in group),
            "requests_with_usage": len(usage),
            **{key: sum(item[key] for item in usage) if usage else None for key in TOKEN_FIELDS},
        })
    return rows


def save_reports(folder: Path, events: list[dict], planned: int, mode: str) -> None:
    metrics = ("attempts", "requests_2xx", "errors", "incomplete", "requests_with_usage", *TOKEN_FIELDS)
    groups = {
        "pemakaian": ("mode", "subscription", "project", "model", "deployment"),
        "per-project": ("project",),
        "per-model": ("model", "deployment"),
        "fase": ("phase",),
    }
    for name, dimensions in groups.items():
        with (folder / f"{name}.csv").open("w", newline="", encoding="utf-8-sig") as file:
            writer = csv.DictWriter(file, fieldnames=[*dimensions, *metrics])
            writer.writeheader()
            writer.writerows(summarize(events, dimensions))
    total = next(iter(summarize(events, ())), None)
    lines = [
        f"# Pemakaian model Foundry — {mode}",
        "",
        "Angka simulasi, bukan metrik Azure." if mode == "simulasi" else
        "Angka dari respons API live; bukan hasil query portal dan bukan tagihan.",
        "",
        f"Request tercatat: **{len(events)}/{planned}**.",
    ]
    if total:
        lines += [
            f"HTTP 2xx: **{total['requests_2xx']}**; error runner: **{total['errors']}**; "
            f"respons incomplete: **{total['incomplete']}**.",
            f"Respons dengan usage: **{total['requests_with_usage']}**; "
            f"token terukur: **{total['total_tokens'] if total['total_tokens'] is not None else 'tidak tersedia'}**.",
        ]
    if events:
        lines += ["", f"Window UTC: `{events[0]['time_utc']}` sampai `{events[-1]['finished_utc']}`."]
    lines += ["", "| Project | Request 2xx | Ada usage | Input | Output | Total |",
              "|---|---:|---:|---:|---:|---:|"]
    for row in summarize(events, ("project",)):
        tokens = [row[key] if row[key] is not None else "-" for key in TOKEN_FIELDS]
        lines.append(f"| {row['project']} | {row['requests_2xx']} | {row['requests_with_usage']} | "
                     f"{tokens[0]} | {tokens[1]} | {tokens[2]} |")
    lines += ["", "Kosong pada CSV berarti data token tidak tersedia, bukan nol.",
              "Periksa `requests_with_usage` sebelum membandingkan total. Request 2xx yang "
              "incomplete masih bisa menghasilkan dan memakai token."]
    (folder / "ringkasan.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Demo request dan token lintas project Foundry.")
    parser.add_argument("--live", action="store_true", help="Kirim request berbayar ke lab.")
    parser.add_argument("--confirm-live", action="store_true", help="Konfirmasi biaya trafik live.")
    parser.add_argument("--account")
    parser.add_argument("--subscription", type=uuid.UUID)
    parser.add_argument("--limit", type=int, default=MAX_REQUESTS)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--run-name", default=datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ"))
    parser.add_argument("--import-usage", type=Path, help="Impor metadata putaran live lama, tanpa memanggil model.")
    parser.add_argument("--no-telemetry", action="store_true", help="Untuk live: simpan report hanya di laptop.")
    args = parser.parse_args(argv)
    if args.import_usage:
        if args.live or args.confirm_live or args.subscription or args.account or args.no_telemetry:
            parser.error("--import-usage tidak boleh digabung dengan pengaturan trafik live.")
        import_usage(args.import_usage)
        return 0
    if not 1 <= args.limit <= MAX_REQUESTS:
        parser.error(f"--limit harus 1 sampai {MAX_REQUESTS}.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,48}", args.run_name):
        parser.error("--run-name harus berisi 1-48 huruf, angka, underscore, atau tanda hubung.")
    if args.live and not (args.confirm_live and args.subscription and ACCOUNT.fullmatch(args.account or "")):
        parser.error("--live perlu --confirm-live, --subscription, dan --account milik lab.")
    if not args.live and (args.confirm_live or args.subscription or args.account or args.no_telemetry):
        parser.error("Gunakan argumen Azure hanya bersama --live.")
    cases = schedule(args.seed)[:args.limit]
    mode = "live" if args.live else "simulasi"
    folder = ROOT / "reports" / f"{mode}-{args.run_name}"
    subscription = str(args.subscription) if args.live else "simulasi"
    target = UsageTarget.load(USAGE_CONFIG) if args.live and not args.no_telemetry and USAGE_CONFIG.is_file() else None
    if target and (target.subscription != subscription or target.account != args.account):
        parser.error("Workbook terpasang untuk lab lain. Periksa target, atau gunakan --no-telemetry.")
    monitor_token = cli_token(subscription, MONITOR_SCOPE) if target else None
    token = cli_token(subscription) if args.live else None
    opener = build_opener(NoRedirect()) if args.live else None
    folder.mkdir(parents=True, exist_ok=False)
    samples = [max((case for case in cases if case.project == name), key=lambda case: len(case.prompt), default=None)
               for name in PROJECTS]
    (folder / "contoh-data.json").write_text(json.dumps([
        {"project": case.project, "phase": case.phase, "synthetic_prompt": case.prompt}
        for case in samples if case is not None
    ], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    started = datetime.now(UTC)
    run = {
        "mode": mode, "subscription": subscription, "account": args.account, "seed": args.seed,
        "planned": len(cases), "started_utc": started.isoformat(),
    }
    (folder / "run.json").write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    events = []
    exit_code = 0
    unpublished = 0
    previous_phase = cases[0].phase
    try:
        with (folder / "events.jsonl").open("x", encoding="utf-8") as file:
            for case in cases:
                if args.live and case.number > 1:
                    time.sleep(30 if case.phase != previous_phase else 2)
                previous_phase = case.phase
                now = datetime.now(UTC) if args.live else started + timedelta(seconds=case.number * 4)
                before = time.monotonic()
                if token is not None:
                    result = foundry_request(opener, args.account, token, case)
                    latency_ms = round((time.monotonic() - before) * 1000)
                    finished = datetime.now(UTC)
                else:
                    result = simulate(case)
                    latency_ms = 80 + case.model_index * 47 + case.number % 29
                    finished = now + timedelta(milliseconds=latency_ms)
                event = {
                    "mode": mode, "subscription": subscription, "time_utc": now.isoformat(),
                    "finished_utc": finished.isoformat(), "latency_ms": latency_ms,
                    "number": case.number, "phase": case.phase, "project": case.project,
                    "model": case.model["name"], "deployment": case.model["deployment"], **result,
                }
                events.append(event)
                file.write(json.dumps(event) + "\n")
                file.flush()
                if target and monitor_token:
                    try:
                        publish_usage(opener, target, monitor_token, [usage_record(event, run, folder.name, target)])
                    except RuntimeError as exc:
                        unpublished += 1
                        print(f"Request {case.number}: {exc} Metadata masih ada di report lokal.", file=sys.stderr)
                tokens = result["usage"]["total_tokens"] if result["usage"] is not None else "tidak tersedia"
                print(f"{case.number:02d}/{len(cases)} {case.phase} {case.project} {case.model['name']}: {tokens}", flush=True)
                if result["error"]:
                    print(f"Berhenti tanpa retry: {result['error']}. Periksa report parsial.", file=sys.stderr)
                    exit_code = 1
                    break
    except KeyboardInterrupt:
        print("Dihentikan; request yang sedang berjalan mungkin tetap dihitung di Azure.", file=sys.stderr)
        exit_code = 130
    finally:
        save_reports(folder, events, len(cases), mode)
        print(f"Report {mode}: {folder}", flush=True)
    if unpublished:
        print(f"{unpublished} catatan gagal dikirim ke Workbook; jalankan --import-usage untuk mengirim ulang.", file=sys.stderr)
        return exit_code or 1
    return exit_code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, ValueError, subprocess.TimeoutExpired) as exc:
        print(f"Demo gagal: {exc}", file=sys.stderr)
        sys.exit(1)
