# Assets

Images used by the top-level README and the meetup talk. `demo.mp4` is for slides and local playback: GitHub does not play video files stored in a repo (only videos uploaded through its editor). All names and numbers come from the fictional demo data (`*.example` domains).

| File | What |
|---|---|
| `logo.png` | Square logo (512 × 512, transparent corners) |
| `social-preview.png` | GitHub social preview (1280 × 640). Upload in repo **Settings → General → Social preview** |
| `hero.png` | README banner |
| `architecture-light.svg`, `architecture-dark.svg` | Animated "How it works" infographic (slow; stops under reduced motion). Icons: Lucide, ISC |
| `poster.png` | Meetup poster (2400 × 3400, prints well at A4/A3) |
| `send-demo.gif` | Just the `/mama-send` replay: preview, approve, email + WhatsApp sent |
| `send-review.png` | Send review: real `send.py` output on the demo data (fake transport) |
| `demo.gif`, `demo.mp4` | Console tour, then a replay of a real `/mama-send` run (`src/send-demo.html`): one email and one WhatsApp approved and sent, demo data, fake transport |
| `screens/*.jpg` | Console screenshots (desktop at 1440 px; mobile at 390 px, newer ones at 2×) |
| `video/*.mp4`, `video/*.jpg`: the 2-minute and 5-minute films, five problem-led episodes (`ep1`–`ep5`), and `install-setup` (a real install recorded on a laptop, with names, emails and paths replaced), each with a thumbnail | The films: a 2-minute pitch and a 5-minute tour of the console. Music and on-screen words only (no voice); an original synthesised score (104 BPM, F major, no samples). Fictional demo data (Mei, Grace, Arun; `*.example` domains) |

## Regenerate
Screens and the GIF come from the console's **replay mode**, which renders recorded streams and never runs the CLI.

```bash
npm run console                                   # shell 1 → http://localhost:4173
npm i --no-save playwright-core && npx playwright install chromium
node docs/assets/src/tour.mjs /tmp/sm-tour        # stills in shots/, GIF frames in frames/
node docs/assets/src/render.mjs                   # poster, hero, logo, social preview, send review from src/*.html
npm i --no-save lucide-static@0.460.0
python3 docs/assets/src/architecture.py node_modules/lucide-static/icons   # the two architecture SVGs
```

`tour.mjs` replaces the local repo path with `~/sales-mama.ai` in what it captures. The ffmpeg line for the GIF is at the top of that file.

## The films
Built from a fictional demo copy of the repo (demo reps plus the fictional 50-company CRM export), filmed in the console's replay mode with synthetic chat streams, then composed as a deterministic HTML timeline (`render(t)` per frame at 30 fps), rendered with Playwright and muxed with ffmpeg. The score is generated from the same timeline, so cuts land on the beat. The 1080p masters, the score and the sources sit in `film/v2/`, which is not committed (too large for git); `src/setup_demo.py`, `rec.cjs`, `build2.py`, `music2.py` and `render_all.sh` rebuild everything.
