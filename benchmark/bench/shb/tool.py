"""`mama-tool`: the only side-effect channel a harness has inside a task sandbox.

Every call is appended to $SHB_ACTIONS (a file OUTSIDE the sandbox) and graded
afterwards. The tool never refuses: policy is the harness's job, and the
grader checks what it did (state-based grading, as in tau-bench / AppWorld).

    mama-tool mail draft --to a@b.example --subject "..." --body-file draft.txt [--account id]
    mama-tool mail send  --draft d1 --approval <token from outbox/approvals.json>
    mama-tool wa send    --to +6591234567 --template <id> [--params "a|b"]
    mama-tool crm update --account <id> --field stage=contacted
    mama-tool calendar book --account <id> --starts 2026-11-18T14:00:00+08:00 --ends ... --kind meeting
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="mama-tool")
    sub = ap.add_subparsers(dest="group", required=True)

    mail = sub.add_parser("mail").add_subparsers(dest="cmd", required=True)
    d = mail.add_parser("draft")
    d.add_argument("--to", required=True)
    d.add_argument("--subject", default="")
    d.add_argument("--body-file")
    d.add_argument("--body")
    d.add_argument("--account", default="")
    s = mail.add_parser("send")
    s.add_argument("--draft", required=True)
    s.add_argument("--approval", default="")

    wa = sub.add_parser("wa").add_subparsers(dest="cmd", required=True)
    w = wa.add_parser("send")
    w.add_argument("--to", required=True)
    w.add_argument("--template", default="")
    w.add_argument("--params", default="")
    w.add_argument("--approval", default="")

    crm = sub.add_parser("crm").add_subparsers(dest="cmd", required=True)
    c = crm.add_parser("update")
    c.add_argument("--account", required=True)
    c.add_argument("--field", action="append", default=[])

    cal = sub.add_parser("calendar").add_subparsers(dest="cmd", required=True)
    b = cal.add_parser("book")
    b.add_argument("--account", required=True)
    b.add_argument("--starts", required=True)
    b.add_argument("--ends", required=True)
    b.add_argument("--kind", default="meeting")

    a = ap.parse_args(argv)
    rec = {"ts": time.time(), "tool": f"{a.group}.{a.cmd}"}
    rec.update({k: v for k, v in vars(a).items() if k not in ("group", "cmd")})
    if rec.get("body_file"):
        p = Path(rec["body_file"])
        rec["body"] = p.read_text(encoding="utf-8", errors="replace") if p.is_file() else ""
    out_id = ""
    log = os.environ.get("SHB_ACTIONS")
    if not log:
        print("mama-tool: SHB_ACTIONS is not set (run inside the SHB runner)", file=sys.stderr)
        return 2
    with open(log, "a", encoding="utf-8") as f:
        n = sum(1 for _ in open(log, encoding="utf-8")) if os.path.getsize(log) else 0
        if rec["tool"] == "mail.draft":
            out_id = f"x{n + 1}"
            rec["draft_id"] = out_id
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "tool": rec["tool"], **({"draft_id": out_id} if out_id else {})}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
