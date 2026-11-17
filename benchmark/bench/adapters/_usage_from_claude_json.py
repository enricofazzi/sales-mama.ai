"""Turn Claude Code's `--output-format json` result into .shb_usage.json (adapter-reported cost).

Exits 75 (infrastructure error) when the run never reached the model or the API failed
(network, overload, auth): the runner then retries it and, if it keeps failing, excludes it
instead of scoring it 0.
"""
import json
import sys

try:
    t = json.load(open(sys.argv[1]))
except (OSError, json.JSONDecodeError):
    sys.exit(75)  # no transcript: the CLI crashed or was killed
u = t.get("usage") or {}
json.dump({"usd": t.get("total_cost_usd"),
           "input_tokens": sum(u.get(k, 0) or 0 for k in ("input_tokens", "cache_read_input_tokens",
                                                          "cache_creation_input_tokens")),
           "output_tokens": u.get("output_tokens", 0) or 0}, open(sys.argv[2], "w"))

if t.get("is_error") and str(t.get("result", "")).startswith("API Error"):
    sys.exit(75)
