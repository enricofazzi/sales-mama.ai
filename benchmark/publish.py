"""Publish the leaderboard Space and the benchmark dataset to Hugging Face.

    hf auth login            # once, with a WRITE token for the target account
    python benchmark/publish.py [--owner praveengovi] [--only space|bench] [--private]

Creates (if missing) and uploads:
  Space    <owner>/Sales-Harness-Leaderboard   from benchmark/space/site/ (static; run space/build_static.py first)
  Dataset  <owner>/sales-harness-bench         from benchmark/bench/ (incl. generated tasks/)
"""
from __future__ import annotations

import argparse
from pathlib import Path

from huggingface_hub import HfApi

HERE = Path(__file__).resolve().parent
IGNORE = ["**/__pycache__/**", "**/*.pyc", "**/.DS_Store", "runs/**", ".gitignore"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--owner", default="praveengovi")
    ap.add_argument("--only", choices=["space", "bench"])
    ap.add_argument("--private", action="store_true")
    a = ap.parse_args()
    api = HfApi()
    who = api.whoami()["name"]
    print(f"logged in as {who}")
    if a.only in (None, "bench"):
        if not (HERE / "bench" / "tasks" / "dev").is_dir():
            raise SystemExit("bench/tasks/dev is missing: run build_dev.py first")
        repo = f"{a.owner}/sales-harness-bench"
        api.create_repo(repo, repo_type="dataset", private=a.private, exist_ok=True)
        api.upload_folder(repo_id=repo, repo_type="dataset", folder_path=HERE / "bench",
                          ignore_patterns=IGNORE, commit_message="SalesHarnessBench v0.1 (dev split, runner, graders)")
        print(f"dataset: https://huggingface.co/datasets/{repo}")
    if a.only in (None, "space"):
        repo = f"{a.owner}/Sales-Harness-Leaderboard"
        api.create_repo(repo, repo_type="space", space_sdk="static", private=a.private, exist_ok=True)
        if not (HERE / "space" / "site" / "data.json").is_file():
            raise SystemExit("space/site/data.json is missing: run space/build_static.py first")
        api.upload_folder(repo_id=repo, repo_type="space", folder_path=HERE / "space" / "site",
                          ignore_patterns=IGNORE, commit_message="Sales Harness Leaderboard v0.1")
        print(f"space:   https://huggingface.co/spaces/{repo}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
