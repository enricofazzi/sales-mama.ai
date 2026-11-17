"""Sales Harness Bench film score, v3: the v2 engine re-harmonised in A minor at the timeline's tempo
(96 BPM), a darker, investigative colour for the benchmark films. Synthesised, no samples. Sections come from the timeline's scenes:
  intro  -> Dm7 Bbmaj7 Fmaj7 Cadd9, pad + sparse keys, riser into the reveal
  groove -> Fmaj7 Am7 Dm7 Bbmaj7: kick/snap/hats, sub bass, EP arpeggio, sidechain pump
  lift   -> groove + four-on-the-floor, claps, octave bass, lead hook, crash on entry
  break  -> pad + keys, soft pulse, snare roll out
  outro  -> groove, then a ringing Fmaj7
Scenes with hit=True get an impact and a crash on their first beat.
Usage: python3 music2.py timeline-short.json out.wav
"""
import array, json, math, random, sys, wave

SR = 44100
TL = json.load(open(sys.argv[1])); OUT = sys.argv[2]
BPM = TL["bpm"]; BEAT = 60 / BPM; BAR = 4 * BEAT
DUR = TL["duration"] + 2.0
N = int(DUR * SR)
L = [0.0] * N; R = [0.0] * N
padL = [0.0] * N; padR = [0.0] * N
random.seed(7)

bars = []                      # per bar: (section, scene index, bar within scene, scene bars)
for i, s in enumerate(TL["scenes"]):
    for k in range(s["bars"]):
        bars.append((s["mus"], i, k, s["bars"]))
END = len(bars)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

INTRO = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
GROOVE = [[57, 60, 64, 71], [53, 57, 60, 67], [50, 53, 57, 60], [52, 56, 59, 64]]
BASS_I = [45, 41, 36, 43]; BASS_G = [45, 41, 38, 40]
cache = {}

def tone(kind, f, dur):
    key = (kind, round(f, 3), round(dur, 3))
    if key in cache: return cache[key]
    n = int(dur * SR); w = 2 * math.pi * f / SR; out = [0.0] * n
    if kind == "pad":
        att, rel = .45 * SR, 1.1 * SR
        for i in range(n):
            e = min(1.0, i / att) * (1.0 if i < n - rel else max(0.0, (n - i) / rel)); p = w * i
            out[i] = e * (math.sin(p) + .32 * math.sin(2 * p) + .11 * math.sin(3 * p) + .05 * math.sin(4 * p))
    elif kind == "keys":
        for i in range(n):
            t = i / SR; p = w * i; e = min(1.0, t / .004) * math.exp(-t / 1.0)
            out[i] = e * (math.sin(p) + .45 * math.exp(-t / .22) * math.sin(2 * p) + .12 * math.exp(-t / .09) * math.sin(3 * p) + .04 * math.exp(-t / .03) * math.sin(7 * p))
    elif kind == "bass":
        for i in range(n):
            t = i / SR; p = w * i; e = min(1.0, t / .012) * (1.0 if t < dur - .06 else max(0.0, (dur - t) / .06))
            out[i] = math.tanh(1.6 * e * (math.sin(p) + .22 * math.sin(2 * p))) * .9
    elif kind == "obass":      # brighter octave bass for the lifts
        for i in range(n):
            t = i / SR; p = w * i; e = min(1.0, t / .006) * math.exp(-t / .35) * (1.0 if t < dur - .03 else max(0.0, (dur - t) / .03))
            out[i] = math.tanh(2.2 * e * (math.sin(p) + .5 * math.sin(2 * p) + .25 * math.sin(3 * p) + .12 * math.sin(4 * p))) * .8
    elif kind == "lead":       # plucked saw-ish lead, the hook
        for i in range(n):
            t = i / SR; p = w * i; e = min(1.0, t / .003) * math.exp(-t / .42)
            b = math.exp(-t / .12)
            out[i] = e * (math.sin(p) + (.5 * math.sin(2 * p) + .33 * math.sin(3 * p) + .22 * math.sin(4 * p) + .14 * math.sin(5 * p)) * (.35 + .65 * b))
    cache[key] = out
    return out

def add(buf, start, data, gain, other=None, pan=0.0):
    s0 = int(start * SR)
    if s0 >= N: return
    n = min(len(data), N - s0)
    gl, gr = gain * (1 - max(0, pan)), gain * (1 + min(0, pan))
    buf[s0:s0 + n] = [a + b * gl for a, b in zip(buf[s0:s0 + n], data)]
    if other is not None:
        other[s0:s0 + n] = [a + b * gr for a, b in zip(other[s0:s0 + n], data)]

def noise(n): return [random.uniform(-1, 1) for _ in range(n)]

def _kick():
    n = int(.45 * SR); ph = 0.0; out = []
    for i in range(n):
        t = i / SR; f = 46 + 75 * math.exp(-t / .035); ph += 2 * math.pi * f / SR
        out.append(math.tanh(1.3 * math.sin(ph) * math.exp(-t / .28)) + random.uniform(-1, 1) * .3 * math.exp(-t / .002))
    return out
def _snap():
    n = int(.4 * SR); nz = noise(n); out = []; prev = 0.0
    for i in range(n):
        t = i / SR; hp = nz[i] - prev; prev = nz[i]
        out.append(hp * math.exp(-t / .055) + .5 * math.sin(2 * math.pi * 190 * t) * math.exp(-t / .04) + nz[i] * .12 * math.exp(-t / .28))
    return out
def _clap():
    n = int(.35 * SR); nz = noise(n); out = []; prev = 0.0
    for i in range(n):
        t = i / SR; hp = nz[i] - prev; prev = nz[i]
        env = sum(math.exp(-(t - d) / .008) for d in (0, .011, .023) if t >= d) * .5 + .6 * math.exp(-t / .12)
        out.append(hp * env)
    return out
def _hat(open_):
    n = int((.18 if open_ else .05) * SR); nz = noise(n + 1)
    return [((nz[i + 1] - nz[i]) * .7 + (nz[i] - (nz[i - 1] if i else 0)) * .3) * math.exp(-i / SR / (.11 if open_ else .022)) for i in range(n)]
def _crash():
    n = int(2.4 * SR); nz = noise(n + 1)
    return [(nz[i + 1] - nz[i]) * (.55 * math.exp(-i / SR / .9) + .45 * math.exp(-i / SR / .08)) for i in range(n)]
KICK, SNAP, CLAP, HATC, HATO, CRASH = _kick(), _snap(), _clap(), _hat(False), _hat(True), _crash()

kicks = []
def kick(t0, gain=.62): add(L, t0, KICK, gain, R); kicks.append(t0)
def snap(t0, gain=.15): add(L, t0, SNAP, gain, R, pan=-.08)
def clap(t0, gain=.16): add(L, t0, CLAP, gain, R, pan=.06)
def hat(t0, gain=.05, open_=False, pan=.25): add(L, t0, HATO if open_ else HATC, gain, R, pan=pan)
def crash(t0, gain=.09): add(L, t0, CRASH, gain, None, pan=0); add(R, t0 + .011, CRASH, gain * .9)

def riser(t0, dur, gain=.16):
    n = int(dur * SR); nz = noise(n); out = []; y = 0.0
    for i in range(n):
        p = i / n; a = .02 + .55 * p * p; y += a * (nz[i] - y); out.append(y * p ** 2)
    add(L, max(0, t0), out, gain, R)

def impact(t0, gain=.6):
    n = int(1.8 * SR); nz = noise(n); out = []; ph = 0.0
    for i in range(n):
        t = i / SR; ph += 2 * math.pi * (36 + 34 * math.exp(-t / .08)) / SR
        out.append(math.sin(ph) * math.exp(-t / 1.0) + nz[i] * .35 * math.exp(-t / .25))
    add(L, t0, out, gain, R)

# the hook: (beat, chord index, octave shift)
HOOK = [(0, 0, 24), (.75, 2, 24), (1.5, 3, 24), (2, 2, 24), (3, 1, 24), (3.5, 0, 36)]
HOOK_B = [(0, 3, 24), (.5, 2, 24), (1.5, 1, 24), (2.5, 0, 24), (3, 1, 24), (3.5, 2, 24)]

prev_sec = None
for b, (sec, si, k, nb) in enumerate(bars):
    t = b * BAR
    scene = TL["scenes"][si]
    intro, brk, lift = sec == "intro", sec == "break", sec == "lift"
    final = b == END - 1
    chord = (INTRO if intro else GROOVE)[b % 4]; bassn = (BASS_I if intro else BASS_G)[b % 4]
    if final: chord, bassn = GROOVE[0], BASS_G[0]
    if k == 0 and scene.get("hit"): impact(t, .5 if sec != "intro" else .3); crash(t, .1)
    if k == 0 and lift and prev_sec != "lift": crash(t, .11)
    nxt = bars[b + 1][0] if b + 1 < END else None
    if nxt == "lift" and not lift: riser(t + BAR * .5, BAR * .5, .1)
    prev_sec = sec
    for m in chord:
        f = hz(m); d = BAR + (2.5 if final else 1.1); g = .045 * (.8 if intro else 1.0)
        add(padL, t, tone("pad", f * 1.0025, d), g); add(padR, t, tone("pad", f * .9975, d), g)
    if intro:
        late = b >= sum(1 for x in bars if x[0] == "intro") - 3
        notes = [(0, chord[2] + 12), (2.5, chord[3] + 12)] + ([(1.5, chord[1] + 12), (3.5, chord[0] + 24)] if late else [])
        for beat, m in notes: add(padL, t + beat * BEAT, tone("keys", hz(m), 2.4), .07, padR, pan=.15)
        add(L, t, tone("bass", hz(bassn - 12), BAR * .95), .08 if b >= 2 else 0, R)
        if late: kick(t, .3 if b % 2 else .22)
        continue
    arp = [chord[0], chord[1], chord[2], chord[3], chord[0] + 12, chord[3], chord[2], chord[1]]
    for j, m in enumerate(arp if not final else arp[:1]):
        add(padL, t + j * BEAT / 2, tone("keys", hz(m + 12), 1.4), (.05 if not brk else .045), padR, pan=(-.35 if j % 2 else .35))
    if final:
        add(L, t, tone("bass", hz(bassn), BAR * 1.5), .22, R); kick(t, .7); crash(t, .12)
        add(padL, t, tone("lead", hz(chord[3] + 24), 2.5), .05, padR)
        continue
    if brk:
        if k == nb - 1:
            for j in range(16): snap(t + j * BEAT / 4, gain=.05 + .13 * j / 16)
            riser(t, BAR, .12)
        else:
            kick(t, .32)
            if k % 2: kick(t + 2 * BEAT, .22)
        continue
    # bass
    add(L, t, tone("bass", hz(bassn), BEAT * 1.4), .21, R)
    add(L, t + 2.5 * BEAT, tone("bass", hz(bassn), BEAT * 1.2), .17, R)
    add(L, t + 3.5 * BEAT, tone("bass", hz(bassn + 12 if b % 2 else bassn + 7), BEAT * .45), .12, R)
    if lift:
        for j in range(8):
            if j in (0, 3, 5): continue
            add(L, t + j * BEAT / 2, tone("obass", hz(bassn + 12), BEAT * .45), .075, R)
    # drums
    beats = (0, 1, 2, 3) if lift else (0, 1.5, 2)
    for beat in beats: kick(t + beat * BEAT, .66 if lift else .62)
    if lift and k % 2 == 1: kick(t + 3.5 * BEAT, .35)
    for beat in (1, 3):
        snap(t + beat * BEAT, .17 if lift else .15)
        if lift: clap(t + beat * BEAT, .15)
    for j in range(16):
        sw = (BEAT / 4) * (.08 if j % 2 else 0)
        hat(t + j * BEAT / 4 + sw, gain=(.034 if lift else .026) if j % 4 == 2 else (.02 if lift else .015), open_=(j % 8 == 6) or (lift and j % 4 == 2), pan=.25 if j % 2 else -.15)
    # the hook
    if lift:
        pat = HOOK if k % 2 == 0 else HOOK_B
        for beat, ci, sh in pat:
            m = chord[ci] + sh - 12
            add(padL, t + beat * BEAT, tone("lead", hz(m) * 1.003, .9), .036, None)
            add(padR, t + beat * BEAT, tone("lead", hz(m) * .997, .9), .036, None)

# reveal: riser + impact (the first scene after the intro)
first = next(i for i, x in enumerate(bars) if x[0] != "intro")
riser(first * BAR - BAR, BAR, .18)
outro_bar = next(i for i, x in enumerate(bars) if x[0] == "outro")

# sidechain pump on the pad/keys bus
pump = [1.0] * N
env = [1 - .4 * math.exp(-i / SR / .1) for i in range(int(.32 * SR))]
for k0 in kicks:
    s0 = int(k0 * SR); n = min(len(env), N - s0)
    if n > 0: pump[s0:s0 + n] = [min(a, e) for a, e in zip(pump[s0:s0 + n], env)]
wetL = [0.0] * N; wetR = [0.0] * N
for d, gl, gr in [(.153, .26, .21), (.307, .16, .2), (.461, .1, .12), (.692, .06, .07)]:
    k = int(d * SR)
    wetL[k:] = [a + b * gl for a, b in zip(wetL[k:], padR[:N - k])]
    wetR[k:] = [a + b * gr for a, b in zip(wetR[k:], padL[:N - k])]
L = [l + (p + w) * q for l, p, w, q in zip(L, padL, wetL, pump)]
R = [r + (p + w) * q for r, p, w, q in zip(R, padR, wetR, pump)]

fade_in, fade_out = int(.8 * SR), int(2.4 * SR)
end = int(TL["duration"] * SR) + int(1.2 * SR)
def g(i): return min(1.0, i / fade_in) * (1.0 if i < end - fade_out else max(0.0, (end - i) / fade_out))
L = [math.tanh(1.25 * v * g(i)) for i, v in enumerate(L)]
R = [math.tanh(1.25 * v * g(i)) for i, v in enumerate(R)]
peak = max(max(map(abs, L)), max(map(abs, R)), 1e-9); sc = .9 / peak
pcm = array.array("h", [0] * (2 * N))
pcm[0::2] = array.array("h", (int(v * sc * 32767) for v in L)); pcm[1::2] = array.array("h", (int(v * sc * 32767) for v in R))
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"{OUT} {DUR:.1f}s · {END} bars · reveal bar {first} · outro bar {outro_bar} · kicks {len(kicks)}")
