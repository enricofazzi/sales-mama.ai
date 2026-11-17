"""Original score for the Sales Mama film: 104 BPM, F major, synthesised from scratch (no samples, no licences).

Structure follows the edit in timeline_q.json:
  problem   -> intro: Dm7 Bbmaj7 Fmaj7 Cadd9, soft pad + sparse keys, riser into the reveal
  reveal..insights -> groove: Fmaj7 Am7 Dm7 Bbmaj7, kick/snap/hats, sub bass, EP arpeggio, sidechain pump
  guardrails -> breakdown: no drums, pad + keys, snare roll build
  outro -> groove, then a ringing Fmaj7
"""
import array
import json
import math
import random
import wave

SR = 44100
TL = json.load(open("timeline_q.json"))
BPM = TL["bpm"]
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = TL["duration"] + 2.0
N = int(DUR * SR)
L = [0.0] * N
R = [0.0] * N
padL = [0.0] * N; padR = [0.0] * N        # pad + keys bus (pumped, reverb send)
random.seed(7)

bar_of = {s["id"]: round(s["start"] / BAR) for s in TL["scenes"]}
end_bar = round(TL["scenes"][-1]["end"] / BAR)
B_REVEAL, B_GUARD, B_OUTRO = bar_of["reveal"], bar_of["guardrails"], bar_of["outro"]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


INTRO = [[50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [48, 52, 55, 62]]       # Dm7 Bbmaj7 Fmaj7 Cadd9
GROOVE = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [46, 50, 53, 57]]      # Fmaj7 Am7 Dm7 Bbmaj7
BASS_I = [38, 34, 41, 36]
BASS_G = [41, 45, 38, 34]

cache = {}


def tone(kind, f, dur):
    key = (kind, round(f, 3), round(dur, 3))
    if key in cache:
        return cache[key]
    n = int(dur * SR)
    out = [0.0] * n
    w = 2 * math.pi * f / SR
    if kind == "pad":
        att, rel = 0.45 * SR, 1.1 * SR
        for i in range(n):
            e = min(1.0, i / att) * (1.0 if i < n - rel else max(0.0, (n - i) / rel))
            p = w * i
            out[i] = e * (math.sin(p) + .32 * math.sin(2 * p) + .11 * math.sin(3 * p) + .05 * math.sin(4 * p))
    elif kind == "keys":
        for i in range(n):
            t = i / SR
            p = w * i
            e = min(1.0, t / .004) * math.exp(-t / 1.0)
            out[i] = e * (math.sin(p) + .45 * math.exp(-t / .22) * math.sin(2 * p) + .12 * math.exp(-t / .09) * math.sin(3 * p)
                          + .04 * math.exp(-t / .03) * math.sin(7 * p))
    elif kind == "bass":
        for i in range(n):
            t = i / SR
            p = w * i
            e = min(1.0, t / .012) * (1.0 if t < dur - .06 else max(0.0, (dur - t) / .06))
            out[i] = math.tanh(1.6 * e * (math.sin(p) + .22 * math.sin(2 * p))) * .9
    cache[key] = out
    return out


def add(buf, start, data, gain, other=None, pan=0.0):
    s0 = int(start * SR)
    gl, gr = gain * (1 - max(0, pan)), gain * (1 + min(0, pan))
    for i, v in enumerate(data):
        j = s0 + i
        if j >= N:
            break
        buf[j] += v * gl
        if other is not None:
            other[j] += v * gr


def noise(n):
    return [random.uniform(-1, 1) for _ in range(n)]


def kick(t0, gain=0.62):
    n = int(.45 * SR); ph = 0.0; out = []
    for i in range(n):
        t = i / SR
        f = 46 + 70 * math.exp(-t / .035)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t / .26) + (random.uniform(-1, 1) * .3 * math.exp(-t / .002)))
    add(L, t0, out, gain, R)


def snap(t0, gain=0.15):
    n = int(.4 * SR); nz = noise(n); out = []; prev = 0.0
    for i in range(n):
        t = i / SR
        hp = nz[i] - prev; prev = nz[i]
        out.append(hp * math.exp(-t / .055) + .5 * math.sin(2 * math.pi * 190 * t) * math.exp(-t / .04) + nz[i] * .12 * math.exp(-t / .28))
    add(L, t0, out, gain, R, pan=-.08)


def hat(t0, gain=0.05, open_=False, pan=.25):
    n = int((.18 if open_ else .05) * SR); nz = noise(n + 1); out = []
    for i in range(n):
        t = i / SR
        out.append(((nz[i + 1] - nz[i]) * .7 + (nz[i] - (nz[i - 1] if i else 0)) * .3) * math.exp(-t / (.11 if open_ else .022)))
    add(L, t0, out, gain, R, pan=pan)


def riser(t0, dur, gain=0.16):
    n = int(dur * SR); nz = noise(n); out = []; y = 0.0
    for i in range(n):
        p = i / n
        a = .02 + .55 * p * p                        # opening low-pass
        y += a * (nz[i] - y)
        out.append(y * p ** 2)
    add(L, t0, out, gain, R)


def impact(t0, gain=0.55):
    n = int(1.6 * SR); nz = noise(n); out = []; ph = 0.0
    for i in range(n):
        t = i / SR
        ph += 2 * math.pi * (38 + 30 * math.exp(-t / .08)) / SR
        out.append(math.sin(ph) * math.exp(-t / .9) + nz[i] * .35 * math.exp(-t / .25))
    add(L, t0, out, gain, R)


kicks = []
for b in range(end_bar):
    t = b * BAR
    intro, breakdown, final = b < B_REVEAL, B_GUARD <= b < B_OUTRO, b == end_bar - 1
    chord = (INTRO if intro else GROOVE)[b % 4]
    bassn = (BASS_I if intro else BASS_G)[b % 4]
    if final:
        chord, bassn = GROOVE[0], BASS_G[0]
    # pad: whole bar, slight L/R detune for width
    for m in chord:
        f = hz(m)
        d = BAR + (2.5 if final else 1.1)
        add(padL, t, tone("pad", f * 1.0025, d), .045 * (.8 if intro else 1))
        add(padR, t, tone("pad", f * 0.9975, d), .045 * (.8 if intro else 1))
    if intro:
        # sparse keys: two notes per bar, getting busier in the last two bars
        notes = [(0, chord[2] + 12), (2.5, chord[3] + 12)] + ([(1.5, chord[1] + 12), (3.5, chord[0] + 24)] if b >= B_REVEAL - 3 else [])
        for beat, m in notes:
            add(padL, t + beat * BEAT, tone("keys", hz(m), 2.4), .07, padR, pan=.15)
        add(L, t, tone("bass", hz(bassn - 12), BAR * .95), .08 if b >= 2 else 0, R)
        continue
    # arpeggio (8ths), alternate pan
    arp = [chord[0], chord[1], chord[2], chord[3], chord[0] + 12, chord[3], chord[2], chord[1]]
    for k, m in enumerate(arp if not final else arp[:1]):
        add(padL, t + k * BEAT / 2, tone("keys", hz(m + 12), 1.4), .055 if not breakdown else .045, padR, pan=(-.35 if k % 2 else .35))
    if final:
        add(L, t, tone("bass", hz(bassn), BAR * 1.5), .2, R)
        kick(t)
        continue
    # bass: beat 1 (1.5 beats) + syncopated beat 3.5
    if not breakdown:
        add(L, t, tone("bass", hz(bassn), BEAT * 1.4), .21, R)
        add(L, t + 2.5 * BEAT, tone("bass", hz(bassn), BEAT * 1.2), .17, R)
        add(L, t + 3.5 * BEAT, tone("bass", hz(bassn + 12 if b % 2 else bassn + 7), BEAT * .45), .12, R)
    # drums
    if not breakdown:
        for beat in (0, 1.5, 2):
            kick(t + beat * BEAT); kicks.append(t + beat * BEAT)
        for beat in (1, 3):
            snap(t + beat * BEAT)
        for k in range(16):
            sw = (BEAT / 4) * (.18 if k % 2 else 0)            # light shuffle
            hat(t + k * BEAT / 4 + sw, gain=.026 if k % 4 == 2 else .015, open_=(k % 8 == 6), pan=.25 if k % 2 else -.15)
    else:
        if b == B_OUTRO - 1:                                   # snare roll into the outro
            for k in range(16):
                snap(t + k * BEAT / 4, gain=.05 + .12 * k / 16)
        else:
            kick(t, gain=.35); kicks.append(t)

riser(B_REVEAL * BAR - BAR * 1.0, BAR * 1.0)
impact(B_REVEAL * BAR)
riser(B_OUTRO * BAR - BAR * .5, BAR * .5, gain=.1)

# sidechain pump on the pad/keys bus
pump = [1.0] * N
for k0 in kicks:
    s0 = int(k0 * SR)
    for i in range(int(.32 * SR)):
        j = s0 + i
        if j < N:
            pump[j] = min(pump[j], 1 - .38 * math.exp(-i / SR / .1))
# simple stereo reverb/delay on the bus
taps = [(.153, .26, .21), (.307, .16, .2), (.461, .1, .12), (.692, .06, .07)]
for buf, other, side in ((padL, padR, 0), (padR, padL, 1)):
    pass
wetL = [0.0] * N; wetR = [0.0] * N
for d, gl, gr in taps:
    k = int(d * SR)
    for i in range(k, N):
        wetL[i] += padR[i - k] * gl
        wetR[i] += padL[i - k] * gr
for i in range(N):
    L[i] += (padL[i] + wetL[i]) * pump[i]
    R[i] += (padR[i] + wetR[i]) * pump[i]

# fades, soft clip, normalise
fade_in, fade_out = int(.8 * SR), int(2.2 * SR)
end = int(TL["duration"] * SR) + fade_out
peak = 1e-9
for i in range(N):
    g = min(1.0, i / fade_in) * (1.0 if i < end - fade_out else max(0.0, (end - i) / fade_out))
    L[i] = math.tanh(1.15 * L[i] * g); R[i] = math.tanh(1.15 * R[i] * g)
    peak = max(peak, abs(L[i]), abs(R[i]))
scale = .89 / peak
pcm = array.array("h", [0] * (2 * N))
for i in range(N):
    pcm[2 * i] = int(L[i] * scale * 32767); pcm[2 * i + 1] = int(R[i] * scale * 32767)
with wave.open("music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"music.wav {DUR:.1f}s · reveal bar {B_REVEAL} · breakdown {B_GUARD}-{B_OUTRO} · kicks {len(kicks)}")
