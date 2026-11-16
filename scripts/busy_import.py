"""Import Google Calendar busy blocks for the current rep (ADR-0010 addendum). A tool: JSON in and out.

Reads whatever the claude.ai Google Calendar connector returned (a free/busy answer or an event list),
keeps ONLY start and end of each busy period (rule 8: no titles, attendees, descriptions or locations),
merges overlaps, and writes a new add-only file raw/calendar/<rep>/<YYYY-MM-DD-HHMM>.json. The newest
file per rep is the current picture; build_books.py shows the blocks as anonymous "Busy" items and
appointments.py warns when a booking overlaps one. It never creates or changes calendar events.

    python3 scripts/busy_import.py --file /tmp/gcal.json --approved --json
    python3 scripts/busy_import.py --stdin --approved --from 2026-11-15 --to 2026-12-16 --json

Refused (exit 1): unknown user, missing --approved (the rep's yes to this import), unreadable input.
Skipped: declined events, events marked free (transparent), all-day events, anything outside the window.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mama_common as mc  # noqa: E402

WINDOW_BEFORE, WINDOW_AFTER = 1, 30


class Refused(ValueError):
    pass


def _when(v) -> str | None:
    """An instant from '2026-…' strings or {dateTime: …}; None for all-day ({date: …}) or missing."""
    if isinstance(v, dict):
        v = v.get("dateTime")
    return v if isinstance(v, str) and "T" in v else None


def periods(data) -> tuple[list[tuple[str, str]], set[str], int]:
    """(start, end) pairs, the names of fields we dropped, and how many entries were skipped."""
    dropped: set[str] = set()
    skipped = 0
    if isinstance(data, dict) and isinstance(data.get("calendars"), dict):
        entries = [b for c in data["calendars"].values() if isinstance(c, dict) for b in c.get("busy") or []]
    elif isinstance(data, dict):
        entries = data.get("items") or data.get("events") or data.get("busy") or []
    else:
        entries = data if isinstance(data, list) else []
    out = []
    for e in entries:
        if not isinstance(e, dict):
            skipped += 1
            continue
        dropped |= {k for k in e if k not in mc.BUSY_KEYS}
        declined = any(isinstance(a, dict) and a.get("self") and a.get("responseStatus") == "declined" for a in e.get("attendees") or [])
        if declined or e.get("transparency") == "transparent" or e.get("status") == "cancelled":
            skipped += 1
            continue
        s, t = _when(e.get("start")), _when(e.get("end"))
        if not s or not t:
            skipped += 1
            continue
        out.append((s, t))
    return out, dropped, skipped


def merge(blocks: list[tuple[dt.datetime, dt.datetime]]) -> list[tuple[dt.datetime, dt.datetime]]:
    out: list[list[dt.datetime]] = []
    for s, e in sorted(blocks):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [(s, e) for s, e in out]


def run(root: Path, user: dict, raw, a: argparse.Namespace) -> dict:
    rep = user["id"]
    market = str((user.get("markets") or ["SG"])[0]).upper()
    _, tz = mc.market_tz(root, market)
    frm = mc.to_date(a.date_from) or mc.today() - dt.timedelta(days=WINDOW_BEFORE)
    to = mc.to_date(a.date_to) or mc.today() + dt.timedelta(days=WINDOW_AFTER)
    pairs, dropped, skipped = periods(raw)
    blocks = []
    for s, e in pairs:
        try:
            start = dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(tz)
            end = dt.datetime.fromisoformat(e.replace("Z", "+00:00")).astimezone(tz)
        except ValueError:
            skipped += 1
            continue
        if end <= start or end.date() < frm or start.date() > to:
            skipped += 1
            continue
        blocks.append((start, end))
    merged = merge(blocks)
    stamp = mc.now_stamp()
    rel = f"raw/calendar/{rep}/{stamp[:10]}-{stamp[11:].replace(':', '')}.json"
    n = 2
    while (root / rel).exists():                                    # raw/ is add-only: never overwrite
        rel = f"raw/calendar/{rep}/{stamp[:10]}-{stamp[11:].replace(':', '')}-{n}.json"
        n += 1
    doc = {"type": "busy", "rep": rep, "source": "google_calendar", "fetched": stamp, "approved_by": rep,
           "window": {"from": frm.isoformat(), "to": to.isoformat()},
           "busy": [{"start": s.isoformat(timespec="seconds"), "end": e.isoformat(timespec="seconds")} for s, e in merged]}
    if not a.dry_run:
        mc.write_text(root / rel, json.dumps(doc, indent=2) + "\n")
        mc.append_log("calendar", rep, rel, f"{len(merged)} busy blocks imported (Google Calendar, busy only)", root)
    return {"file": rel, "blocks": len(merged), "busy": doc["busy"], "skipped": skipped,
            "dropped_fields": sorted(dropped), "window": doc["window"], "dry_run": a.dry_run}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Import Google Calendar busy blocks (start/end only) for the current rep.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="the connector's JSON output")
    src.add_argument("--stdin", action="store_true", help="read the connector's JSON from stdin")
    ap.add_argument("--approved", action="store_true", help="the rep said yes to importing busy times")
    ap.add_argument("--from", dest="date_from", help="window start YYYY-MM-DD (default: yesterday)")
    ap.add_argument("--to", dest="date_to", help="window end YYYY-MM-DD (default: +30 days)")
    ap.add_argument("--dry-run", action="store_true", help="sanitise and print; write nothing")
    ap.add_argument("--json", action="store_true", help="print JSON (the default for this tool)")
    a = ap.parse_args(argv)
    mc.setup_stdout()
    if mc.yaml is None:
        print(mc.YAML_MISSING)
        return 1
    root = mc.repo_root()
    user = mc.current_user(root)
    try:
        if not user:
            raise Refused("unknown user; run mama-setup first")
        if not a.approved:
            raise Refused("pass --approved only after the rep said yes to importing their busy times")
        try:
            raw = json.load(sys.stdin) if a.stdin else json.loads(mc.read_text(Path(a.file)))
        except (OSError, ValueError) as exc:
            raise Refused(f"cannot read the connector output: {exc}") from exc
        res = run(root, user, raw, a)
    except Refused as exc:
        print(f"Refused: {exc}")
        return 1
    print(json.dumps(res, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
