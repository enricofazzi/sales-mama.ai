# Sales Harness Bench films: sources

Two ~6-minute films about SalesHarnessBench and the Sales Harness Leaderboard (`benchmark/`).
Same method as the v2 films; a new template and score.

| File | What it does |
|---|---|
| `rec-bench.cjs` | Records stills and clips of the leaderboard (`benchmark/space/site`, served on :4300) and the live Hugging Face pages into `clips/` |
| `build_bench.py` | The two scripts, scene by scene; writes `timeline-bench{1,2}.json` and `bench{1,2}.html` from `player5.html` |
| `player5.html` | Template 5 ("Bench"): night grid, question tracker and progress rail, terminal, history, anatomy, formula, flow, tree |
| `music3.py` | The v2 score engine re-harmonised in A minor at 96 BPM |
| `render.sh` | Renders 30 fps frames (`frames2.cjs`, 3 workers per film) and both scores |
| `oracle.txt`, `null.txt`, `sanity.txt` | Real runs of the v0.1 dev split, replayed in the terminal scenes |

Mux (as in `render.sh`'s siblings): loudnorm the WAV to -14 LUFS, encode frames + audio to `*-1080p.mp4` (CRF 18), scale to `*-720p.mp4` (CRF 24),
thumbnail = the frame at 34 s. The 720p films live in `docs/assets/video/`; 1080p masters here are git-ignored.
