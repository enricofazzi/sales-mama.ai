"""Reference adapter: sales-mama.ai's deterministic tools, no LLM (prospect + recommend only).

    python -m shb.run --adapter "python adapters/sales_mama_scripts.py" --track prospect,recommend \
        --harness-name "sales-mama.ai deterministic tools" --runtime "Python scripts (no LLM)" --model "none"

Needs a sales-mama.ai checkout: $SALES_MAMA_ROOT, or the repo this folder lives in.
"""
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ.get("SALES_MAMA_ROOT", Path(__file__).resolve().parents[3]))
sys.path.insert(0, str(ROOT / "scripts"))
import mama_common as mc  # noqa: E402
import recommend as rc  # noqa: E402
import resolve as rs  # noqa: E402
import score as sc  # noqa: E402

box = Path(sys.argv[1])
md = (box / "TASK.md").read_text(encoding="utf-8")
tid = re.search(r"# Task (\S+) \((\w+)\)", md)
track = tid.group(2)
as_of = dt.date.fromisoformat(re.search(r"Today is (\d{4}-\d{2}-\d{2})", md).group(1))

if track == "prospect":
    item = json.loads((box / "raw/signals/item.json").read_text(encoding="utf-8"))
    item["market"] = item["market"].upper()
    types = rs.id_types(box)
    cands = rs.match(item, rs.load_accounts(box, types), types)
    best = cands[0] if cands else None
    if best and best[0] >= rs.LINK_AT:
        ans = {"decision": best[2].id, "confidence": best[0], "reason": best[1]}
    elif best and best[0] >= rs.REVIEW_AT:
        ans = {"decision": "review", "confidence": best[0], "reason": best[1]}
    else:
        icp = mc.load_icp(box)
        ok, why = rs.icp_fit(item, icp, (icp["fit"].get(item["market"]) or {}).get("ssic_prefixes"))
        ans = {"decision": "new" if ok else "reject", "confidence": best[0] if best else 0.0, "reason": why}
elif track == "recommend":
    acc = re.search(r"account `([^`]+)`", md).group(1)
    r = rc.recommend(box, acc, sc.Knowledge(box), on=as_of)
    top = (r.get("candidates") or [None])[0]
    ans = {"product": top["product"] if top else "none",
           "chain": [{"signal": c["signal"], "pain": c["pain"], "product": top["product"]} for c in top["chain"]]
           if top else [], "hooks": r.get("hooks", []), "reason": r.get("reason", "")}
else:
    sys.exit(0)
(box / "answer.json").write_text(json.dumps(ans, default=str), encoding="utf-8")
