"""Rebuild timing, captions, film page and music from script2.json + processed voice clips (vo2/*.wav)."""
import json, math, re, subprocess
sc = json.load(open('script2.json'))
BPM = 104; BAR = 4 * 60 / BPM
LEAD, GAP, TAIL = 0.7, 0.35, 0.9
clean = lambda s: re.sub(r"\s*\[\[[^\]]*\]\]\s*", " ", s).replace(" ,", ",").strip()
start = 0.0; scenes = []
for i, s in enumerate(sc):
    cur = LEAD; lines = []
    for j, line in enumerate(s["lines"]):
        f = f"vo2/{i:02d}-{j}.wav"
        d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())
        lines.append({"text": clean(line), "file": f, "rel": round(cur, 3), "start": round(start + cur, 3), "dur": round(d, 3)})
        cur += d + GAP
    need = max(cur - GAP + TAIL, s["min"])
    bars = max(2, math.ceil(need / BAR - 0.08))
    scenes.append({"id": s["id"], "start": round(start, 3), "end": round(start + bars * BAR, 3), "bars": bars, "lines": lines})
    start += bars * BAR
tl = {"bpm": BPM, "bar": BAR, "duration": round(start + BAR * 0.5, 3), "scenes": scenes}
json.dump(tl, open('timeline_q.json', 'w'), indent=1)
def ts(x): return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}".replace('.', ',')
srt = [f"{n}\n{ts(l['start'])} --> {ts(l['start'] + l['dur'] + 0.2)}\n{l['text']}\n"
       for n, l in enumerate((l for s in scenes for l in s["lines"]), 1)]
open('captions.srt', 'w').write("\n".join(srt))
s = open('player.html').read().replace('__TIMELINE__', json.dumps(tl)).replace('__SEND__', open('assets/send-data.json').read())
s = s.replace('✉️&nbsp; Gmail', 'Gmail').replace('💬&nbsp; WhatsApp', 'WhatsApp')
open('film.html', 'w').write(s)
print(f"total {tl['duration']:.1f}s")
for x in scenes: print(f"  {x['id']:11} {x['start']:6.1f} → {x['end']:6.1f}  {x['bars']} bars")
