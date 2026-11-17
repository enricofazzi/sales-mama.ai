---
title: Sales Harness Leaderboard
emoji: 🤝
colorFrom: purple
colorTo: gray
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: true
license: apache-2.0
short_description: Benchmarking agent harnesses on B2B SMB sales in SEA & India
tags:
  - leaderboard
  - agents
  - harness
  - sales
  - crm
  - evaluation
  - multilingual
datasets:
  - praveengovi/sales-harness-bench
  - praveengovi/multilingual-smb-sales-care-eval-dataset
  - praveengovi/multilingual-smb-sales-care-kb
---

# Sales Harness Leaderboard (SalesHarnessBench, SHB-SEA)

Ranks **harness × model** pairs (agent runtime + instructions/skills + tools, on a given LLM) on a sandboxed B2B SMB
sales world in Singapore, Malaysia and India. Grading is state-based and deterministic first; a policy breach zeroes the
task (Completion under Policy) and lowers the headline score through a trust multiplier.

- Benchmark kit, tasks and runner: [`praveengovi/sales-harness-bench`](https://huggingface.co/datasets/praveengovi/sales-harness-bench)
- Submissions: a pull request adding `results/<date>_<name>.json` (schema `shl/v0.1`, see the Submit tab)
- Reference harness: [sales-mama.ai](https://github.com/neam-lang/sales-mama.ai)

`app.py` reads `results/*.json`; scoring, bootstrap CIs and ties are in `src/scoring.py`.
