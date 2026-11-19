"""Regrade a finished run from its --keep-traces folder (after a grader fix), without re-running the harness.

    python -m shb.regrade --traces runs/traces --like runs/old.json --out runs/new.json

Uses each trial's answer.json, actions.jsonl, diff.json and .shb_transcript.json (time and cost).
Harness, model and run metadata are copied from --like.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from types import SimpleNamespace

from .graders import grade
from .run import summarise


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--traces", required=True)
    ap.add_argument("--like", required=True)
    ap.add_argument("--tasks", default=str(Path(__file__).resolve().parent.parent / "tasks" / "dev"))
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    like = json.loads(Path(a.like).read_text())
    tdirs = {p.parent.name: p.parent for p in Path(a.tasks).glob("*/*/task.json")}
    runs = []
    for tdir in sorted(Path(a.traces).iterdir()):
        task = json.loads((tdirs[tdir.name] / "task.json").read_text())
        gold = json.loads((tdirs[tdir.name] / "gold.json").read_text())
        for trial in sorted(tdir.glob("trial*")):
            def j(name, default):
                try:
                    return json.loads((trial / name).read_text())
                except (OSError, json.JSONDecodeError):
                    return default
            acts = [json.loads(l) for l in (trial / "actions.jsonl").read_text().splitlines() if l.strip()] \
                if (trial / "actions.jsonl").exists() else []
            tr = j(".shb_transcript.json", {})
            infra = "API error" if tr.get("is_error") and str(tr.get("result", "")).startswith("API Error") else ""
            g = grade(task, gold, {"answer": j("answer.json", None), "actions": acts, "diff": j("diff.json", {}),
                                   "world": gold.get("world_state", {})})
            u = tr.get("usage") or {}
            runs.append({"task": task["id"], "track": task["track"], "trial": int(trial.name[5:]), **g,
                         "injection_task": bool(gold.get("injection")), "seconds": (tr.get("duration_ms") or 0) / 1000,
                         "usd": tr.get("total_cost_usd"), "tokens": sum(u.get(k, 0) or 0 for k in (
                             "input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens")),
                         "infra_error": infra})
    h, m = like["harness"], like["model"]
    args = SimpleNamespace(id=like["id"], harness_name=h["name"], runtime=h["runtime"], kit=h.get("kit", ""),
                           kit_version=h.get("kit_version", ""), url=h.get("url", ""), open_source=h.get("open_source", False),
                           model=m["name"], provider=m.get("provider", ""), open_weights=m.get("open_weights", False),
                           split=like["benchmark"]["split"], trials=like["trials"], flag=like.get("flags"))
    sub = summarise(runs, args)
    sub["date"] = like.get("date", sub["date"])
    Path(a.out).write_text(json.dumps(sub, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"tracks": {k: v["score"] for k, v in sub["tracks"].items()}, "safety": sub["safety"],
                      "efficiency": sub["efficiency"], "infra": sub["infra"]}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
