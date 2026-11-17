"""Build the free static Space (site/) from results/*.json.

Scoring, bootstrap CIs and tie ranks run here in Python (src/scoring.py); the page only renders
site/data.json. Re-run after adding or changing a result, then publish:

    python benchmark/space/build_static.py
    python benchmark/publish.py --only space
"""
from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from src import about
from src.load import leaderboard_df, load_submissions
from src.scoring import BENCH_VERSION, LIVE, TRACKS, TRUST_SLOPE, WEIGHTS

HERE = Path(__file__).resolve().parent
SITE = HERE / "site"


def clean(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):
        return v.item()
    return v


def main() -> int:
    subs = load_submissions()
    df = leaderboard_df(subs)
    rows = [] if df.empty else [{k: clean(v) for k, v in r.items() if k != "_sub"} for r in df.to_dict("records")]
    data = {
        "version": BENCH_VERSION,
        "n_subs": len(subs),
        "header_html": about.header_html(len(subs), BENCH_VERSION),
        "tracks": [{"key": t.key, "name": t.name, "weight": t.weight, "live": t.live} for t in TRACKS],
        "live": LIVE, "weights": WEIGHTS, "trust_slope": TRUST_SLOPE,
        "rows": rows,
        "md": {"intro": about.LEADERBOARD_INTRO, "tracks": about.tracks_md(), "trust": about.TRUST_MD,
               "cost": about.COST_MD, "method": about.METHODOLOGY_MD, "submit": about.SUBMIT_MD,
               "refs": about.REFERENCES_MD},
        "example": about.EXAMPLE_SUBMISSION, "citation": about.CITATION,
    }
    SITE.mkdir(exist_ok=True)
    (SITE / "data.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    if (SITE / "results").exists():
        shutil.rmtree(SITE / "results")
    shutil.copytree(HERE / "results", SITE / "results")
    card = (HERE / "README.md").read_text(encoding="utf-8")
    card = card.replace("sdk: gradio\nsdk_version: 5.49.1\napp_file: app.py", "sdk: static\napp_file: index.html")
    card = card.split("`app.py` reads")[0] + ("This is the free static build: `build_static.py` scores `results/*.json` in Python "
                                              "(bootstrap CIs, tie ranks) into `data.json`, and `index.html` renders it.\n")
    (SITE / "README.md").write_text(card, encoding="utf-8")
    print(f"site/data.json: {len(rows)} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
