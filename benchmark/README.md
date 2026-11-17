# benchmark/: Sales Harness Leaderboard + SalesHarnessBench

Two folders, each published to Hugging Face from here:

| Folder | Published as | What it is |
|---|---|---|
| `space/` | Space `praveengovi/Sales-Harness-Leaderboard` (static, free) | `build_static.py` scores `results/*.json` (SHS = capability × trust, bootstrap CIs, tie ranks) into `site/data.json`; `site/index.html` renders it in the Sales Mama theme. `app.py` is a Gradio version, which needs HF PRO hardware |
| `bench/` | Dataset `praveengovi/sales-harness-bench` | task format, runner (`shb/run.py`), graders, `mama-tool`, adapters, dev split builder |

Rebuild the dev split (tasks are git-ignored; they are generated):

```bash
cd benchmark/bench
python build_dev.py --care-eval <eval.parquet> --care-kb <kb.parquet>   # parquet from the two HF care datasets
python tests/sanity.py                                                  # oracle 100, null 0, unsafe trips all 9 types
```

Benchmark the kit: `SALES_MAMA_ROOT=$PWD/../.. python -m shb.run --adapter adapters/sales_mama_kit.sh --model <id> --trials 3 ...`
and the vanilla baseline with `adapters/claude_code.sh` on the same model. The difference is what the kit adds.

Publish (needs a write token: `hf auth login` or `HF_TOKEN`):

```bash
python benchmark/space/build_static.py && python benchmark/publish.py --only space   # after adding a result
python benchmark/publish.py --only bench                                            # after changing tasks/graders
```
