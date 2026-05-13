"""
run_pipeline.py
Runs the full SportTech data pipeline in order and verifies each step.
"""

import os
import subprocess
import sys
import time


# ── Colours (graceful fallback on Windows without ANSI) ──────────────────────
def _ansi(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if sys.stdout.isatty() else text


def green(t):
    return _ansi("92", t)


def red(t):
    return _ansi("91", t)


def yellow(t):
    return _ansi("93", t)


def bold(t):
    return _ansi("1", t)


def dim(t):
    return _ansi("2", t)


# ── Step definition ───────────────────────────────────────────────────────────
# Each step has:
#   script   – the .py file to run
#   desc     – human-readable description
#   checks   – list of (path, min_size_bytes, description) post-run checks
STEPS = [
    {
        "script": "getCompLinks.py",
        "desc": "Scrape event links from SportTech",
        "checks": [
            ("event_links.txt", 50, "event_links.txt is non-empty"),
        ],
    },
    {
        "script": "processComps.py",
        "desc": "Download competition CSVs",
        "checks": [
            ("csv", 0, "csv/ directory exists"),
        ],
    },
    {
        "script": "createMegaCSV.py",
        "desc": "Combine CSVs into mega_data.csv",
        "checks": [
            ("mega_data.csv", 1000, "mega_data.csv is non-empty"),
        ],
    },
    {
        "script": "fetch_event_dates.py",
        "desc": "Fetch event dates from API",
        "checks": [
            ("event_dates.json", 10, "event_dates.json created"),
        ],
    },
    {
        "script": "sort_data.py",
        "desc": "Build mega_data.json",
        "checks": [
            ("sporttech_search/public/mega_data.json", 1000, "mega_data.json created"),
            (
                "sporttech_search/public/mega_data.json.gz",
                100,
                "mega_data.json.gz created",
            ),
        ],
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def run_step(step: dict, index: int, total: int) -> bool:
    script = step["script"]
    desc = step["desc"]

    print()
    print(bold(f"[{index}/{total}] {desc}"))
    print(dim(f"      → python {script}"))
    print()

    t0 = time.time()
    result = subprocess.run(
        [sys.executable, script],
        capture_output=False,  # let output stream to terminal live
    )
    elapsed = time.time() - t0

    if result.returncode != 0:
        print()
        print(red(f"  ✗  {script} exited with code {result.returncode}"))
        return False

    # Post-run file/directory checks
    failed_checks = []
    for path, min_bytes, label in step["checks"]:
        if not os.path.exists(path):
            failed_checks.append(f"missing: {label}")
        elif os.path.isfile(path) and os.path.getsize(path) < min_bytes:
            failed_checks.append(f"too small ({os.path.getsize(path)} B): {label}")

    if failed_checks:
        print()
        for msg in failed_checks:
            print(red(f"  ✗  Check failed — {msg}"))
        return False

    print()
    print(green(f"  ✓  Done in {elapsed:.1f}s"))
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print()
    print(bold("=" * 55))
    print(bold("  SportTech Data Pipeline"))
    print(bold("=" * 55))

    total = len(STEPS)
    passed = 0
    failed_at = None

    for i, step in enumerate(STEPS, start=1):
        ok = run_step(step, i, total)
        if ok:
            passed += 1
        else:
            failed_at = step["script"]
            break

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print(bold("=" * 55))
    if failed_at is None:
        print(green(bold(f"  All {total} steps completed successfully!")))
    else:
        print(red(bold(f"  Pipeline failed at: {failed_at}")))
        print(yellow(f"  {passed}/{total} steps completed before failure."))
        print(yellow("  Fix the error above and re-run."))
    print(bold("=" * 55))
    print()

    sys.exit(0 if failed_at is None else 1)


if __name__ == "__main__":
    main()
