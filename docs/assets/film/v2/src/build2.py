"""Build the film timelines (two cuts) and their player pages. No voice: music + on-screen words.
Usage: python3 build2.py  ->  film-short.html, film-long.html, timeline-short.json, timeline-long.json
"""
import json, math
from pathlib import Path
HERE = Path(__file__).parent
BPM = 104; BEAT = 60 / BPM; BAR = 4 * BEAT
CLIPS = HERE / "clips"

def clipmap():
    out = {}
    for d in sorted(p for p in CLIPS.iterdir() if p.is_dir()):
        meta = json.loads((d / "frames.json").read_text())
        fr = meta["frames"]; n = max(1, math.ceil(meta["duration"] * 30)); k = 0; lst = []
        for i in range(n):
            t = i / 30
            while k + 1 < len(fr) and fr[k + 1]["t"] <= t: k += 1
            lst.append(fr[k]["file"])
        out[d.name] = lst
    return out

def at(clip, sec, cm):  # a single frame of a clip as a still path
    return f"{clip}/{cm[clip][min(len(cm[clip]) - 1, int(sec * 30))]}"

G = '<span class="grad">'; LI = '<span class="lime">'; RD = '<span class="red">'; E = '</span>'

def scenes(cm):
    S = {}
    S["open"] = dict(type="words", bg="black", mus="intro", items=[
        dict(cls="eyebrow", text="Monday · 8:40 am · Singapore", at=.5, out=7.4, y=330),
        dict(cls="h1", text="17 accounts.", at=2, out=3.8), dict(cls="h1", text="3 markets.", at=4, out=5.8),
        dict(cls="h1", text="1 inbox.", at=6, out=7.8),
        dict(cls="h2", text=f"Where do you{'<br>'}{RD}even start?{E}", at=9, out=15.6, y=400)])
    S["open_long"] = dict(type="words", bg="black", mus="intro", items=[
        dict(cls="eyebrow", text="Monday · 8:40 am · Singapore", at=.5, out=7.4, y=330),
        dict(cls="h1", text="17 accounts.", at=2, out=3.8), dict(cls="h1", text="3 markets.", at=4, out=5.8),
        dict(cls="h1", text="1 inbox.", at=6, out=7.8),
        dict(cls="h2", text=f"Where do you{'<br>'}{RD}even start?{E}", at=17, out=23.6, y=400)],
        pains=[("Leads go cold in the CRM", 180, 210), ("Research eats the morning", 1060, 270), ("Follow-ups slip", 260, 760),
               ("Meetings clash", 1210, 820), ("Generic messages", 720, 130), ("Is this company even real?", 690, 930)], pains_at=8.5, pains_out=16.5)
    S["reveal"] = dict(type="reveal", bg="light", mus="groove", hit=True, media=dict(clip="today", at=7))
    for i, (k, n, t) in enumerate([("ch1", "01", "Morning"), ("ch2", "02", "Ask"), ("ch3", "03", "Engage"),
                                   ("ch4", "04", "Schedule"), ("ch5", "05", "Lead"), ("ch6", "06", "Trust")]):
        S[k] = dict(type="chapter", bg="black", mus="groove", hit=True, num=n, title=t)
    S["today"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(still="today"),
        pill="Today", h=f"Your day,{'<br>'}{G}already planned.{E}",
        sub="Your next meeting, live send windows for SG · MY · IN, and only what needs you.",
        cam=[dict(at=5, dur=4, z=1.75, x=402, y=369), dict(at=11, dur=3, z=1.5, x=930, y=380)],
        spot=[dict(at=5.5, out=10.6, r=[229, 243, 575, 495]), dict(at=11.4, out=15.5, r=[590, 243, 1283, 495])])
    S["overnight"] = dict(type="stats", bg="dark", mus="groove", pill="● 02:00 · overnight", h="While you slept.",
        sub="Scouts scanned news, tenders and registries. Virtual account managers rescored every book.",
        items=[dict(n=64, label="signals scanned"), dict(n=21, label="linked to accounts"),
               dict(n=17, label="accounts rescored"), dict(n=2, label="follow-ups pre-drafted")])
    S["chat"] = dict(type="device", bg="dark", mus="lift", layout="full", media=dict(clip="chatday", from_=.2),
        h="Just ask.", sub="Agents research, score and draft for you, in parallel.", cap_at=1,
        cam=[dict(at=7, dur=3, z=1.32, x=600, y=340), dict(at=15, dur=3, z=1.0, x=720, y=450)],
        spot=[dict(at=7.5, out=14.5, r=[251, 237, 951, 447])])
    S["slash"] = dict(type="device", bg="light", mus="groove", layout="left", media=dict(clip="slash", at=1),
        pill="/ and @", h=f"Type less.{'<br>'}{G}Do more.{E}", sub="/ for skills, @ for accounts. Fuzzy search finds the rest.",
        cam=[dict(at=2, dur=3, z=1.45, x=575, y=700)])
    S["palette"] = dict(type="device", bg="dark", mus="groove", layout="right", media=dict(clip="palette", at=.5),
        pill="⌘K", h=f"Anything,{'<br>'}{LI}instantly.{E}", sub="Accounts, skills, reports and views, one keystroke away.",
        cam=[dict(at=2, dur=2.5, z=1.6, x=720, y=180)])
    S["brief"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(clip="brief", at=.5),
        pill="/mama-brief", h=f"Walk in{'<br>'}{G}prepared.{E}", sub="A one-page brief before every call: why now, what to propose, what to ask.",
        cam=[dict(at=7, dur=3, z=1.35, x=600, y=430)])
    S["draft"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(still="chatday-end"),
        pill="Grounded", h=f"Every word,{'<br>'}{G}cited.{E}", sub="Drafts use only facts with a source, and wait for your approval.",
        cam=[dict(at=2.5, dur=4, z=1.5, x=600, y=470)], spot=[dict(at=3.5, out=15.5, r=[240, 265, 962, 687])])
    S["send"] = dict(type="device", bg="dark", mus="groove", layout="right", media=dict(clip="send", at=.3),
        pill="/mama-send", h=f"Nothing sends{'<br>'}{LI}until you approve.{E}", sub="Every draft is checked: suppression, sources, send window.",
        cam=[dict(at=6, dur=3, z=1.45, x=420, y=470)])
    S["markets"] = dict(type="markets", bg="light", mus="groove", h=f"Three markets.{'<br>'}{G}One buddy.{E}",
        sub="Local time, send windows, holidays and channels for Singapore, Malaysia and India.")
    S["calendar"] = dict(type="device", bg="light", mus="lift", layout="full", media=dict(clip="calendar", at=1, from_=.2),
        h="Your week, one calendar.", sub="Meetings, follow-ups, renewals and holidays, plus your Google busy times.", cap_at=.5)
    S["busy"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(still="cal-busy"),
        pill="Google Calendar", h=f"Busy times.{'<br>'}{G}Nothing else.{E}",
        sub="Start and end only: no titles, no attendees. It never changes your calendar.",
        cam=[dict(at=3, dur=4, z=1.7, x=1265, y=240)], spot=[dict(at=4, out=15.5, r=[1100, 70, 1432, 400])])
    S["calviews"] = dict(type="trio", bg="dark", mus="groove", h=f"Day. Week. Month.{'<br>'}{LI}Even in chat.{E}",
        imgs=["cal-month", "weekchat-end", "cal-day"])
    S["manager"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(clip="manager", at=.5),
        pill="For managers", h=f"See the team.{'<br>'}{G}Approve every lead.{E}",
        sub="Last night's run, team metrics and entity matches in one morning cockpit.",
        cam=[dict(at=9, dur=3, z=1.4, x=600, y=560)])
    S["team"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(still="cal-team"),
        pill="Team view", h=f"Every rep's week.{'<br>'}{G}Clashes flagged.{E}", sub="Load per day at a glance, with double bookings in red.",
        cam=[dict(at=3, dur=4, z=1.8, x=520, y=330)], spot=[dict(at=4, out=15.5, r=[444, 360, 598, 430])])
    S["alloc"] = dict(type="device", bg="light", mus="groove", layout="right", media=dict(still="canvas-alloc"),
        pill="/mama-allocate", h=f"Fair allocation,{'<br>'}{G}explained.{E}",
        sub="Score, capacity, territory and fit. The manager approves every assignment.",
        cam=[dict(at=3, dur=4, z=1.45, x=1130, y=420)])
    S["reports"] = dict(type="trio", bg="light", mus="lift", h=f"Reports that{'<br>'}{G}build themselves.{E}",
        sub="Generative UI: charts, tables and verdicts bound to your data.", imgs=["canvas-weekly", "canvas-insights", "canvas-alloc"])
    S["company"] = dict(type="check", bg="light", mus="groove", media=dict(still="company"),
        pill="/company-check", h=f"Is this company {G}real?{E}",
        checks=["Live with ACRA", "Annual return on time", "A real office, not a virtual one", "More than 3 staff"],
        cam=[dict(at=3, dur=4, z=1.5, x=480, y=470)])
    S["insights"] = dict(type="insights", bg="light", mus="groove", media=dict(still="canvas-insights"),
        pill="/company-insights", h="Ask. Get a report.", q="“Clinics in Singapore”",
        kpis=[dict(n=9618, label="live clinics", color="#6D28D9"), dict(n=92.7, dec=1, unit="%", label="file their annual return on time", color="#15803D"),
              dict(n=15.9, dec=1, unit="%", label="use a shared or virtual address", color="#B45309")],
        cam=[dict(at=3, dur=4, z=1.6, x=1135, y=430)])
    S["guard"] = dict(type="guard", bg="black", mus="break", h=f"Guardrails, {LI}built in.{E}", rules=[
        ("Approve, then send", "nothing goes out on its own"), ("Every fact cited", "no source, no claim"),
        ("Manager assigns leads", "fair and explainable"), ("Suppression first", "unsubscribes honoured at once"),
        ("Send windows", "and holidays, per market"), ("PDPA-aware", "business data only")])
    S["repo"] = dict(type="words", bg="dark", mus="groove", items=[
        dict(cls="h2", text=f"Your data lives in{'<br>'}{LI}your repo.{E}", at=.5, out=5.6, y=380),
        dict(cls="h2", text=f"Every change,{'<br>'}{G}a git commit.{E}", at=6, out=10.6, y=380),
        dict(cls="h3", text=f"Python tools do the work.{'<br>'}{LI}Generative UI shows it.{E}", at=11, out=15.7, y=410)])
    S["fast"] = dict(type="split", bg="dark", mus="groove", a="palette", b="today-dark",
        h=f"Light or dark.{'<br>'}{LI}Your call.{E}")
    S["phones"] = dict(type="phones", bg="light", mus="groove", h=f"In your pocket,{G} too.{E}",
        imgs=["phone-cal", "phone-today", "phone-brief"])
    S["bento"] = dict(type="bento", bg="light", mus="lift", h="Everything a rep needs.", tiles=[
        dict(src="today", crop=[229, 243, 346, 252], label="Your day", span=2),
        dict(src=at("chatday", 4.3, cm), crop=[251, 237, 700, 210], label="Agents in parallel", span=2),
        dict(src="chatday-end", crop=[240, 265, 722, 420], label="Cited drafts", span=1),
        dict(src="cal-week", crop=[66, 85, 640, 330], label="One calendar", span=1),
        dict(src="canvas-insights", crop=[1040, 60, 400, 420], label="Generative reports", span=1),
        dict(src="cal-team", crop=[760, 80, 680, 240], label="Team view", span=1)])
    S["outro"] = dict(type="outro", bg="light", mus="outro")
    return S

CUTS = {
    "short": [("open", 4), ("reveal", 4), ("today", 4), ("chat", 6), ("draft", 4), ("send", 3), ("calendar", 5), ("manager", 4),
              ("reports", 4), ("fast", 3), ("guard", 4), ("bento", 3), ("outro", 4)],
    "long": [("open_long", 6), ("reveal", 5), ("ch1", 1), ("today", 5), ("overnight", 4), ("ch2", 1), ("chat", 8), ("slash", 4),
             ("palette", 3), ("brief", 4), ("ch3", 1), ("draft", 4), ("send", 4), ("markets", 4), ("ch4", 1), ("calendar", 7),
             ("busy", 4), ("calviews", 4), ("ch5", 1), ("manager", 6), ("team", 4), ("alloc", 4), ("reports", 6), ("company", 4),
             ("insights", 4), ("ch6", 1), ("guard", 6), ("repo", 4), ("fast", 4), ("phones", 4), ("bento", 6), ("outro", 6)],
}

if __name__ == "__main__":
    cm = clipmap(); S = scenes(cm)
    tpl = (HERE / "player2.html").read_text()
    for name, cut in CUTS.items():
        t = 0.0; out = []
        for i, (key, bars) in enumerate(cut):
            sc = dict(S[key]); sc.update(id=f"s{i}", key=key, bars=bars, start=round(t, 4), end=round(t + bars * BAR, 4))
            out.append(sc); t += bars * BAR
        tl = {"bpm": BPM, "beat": BEAT, "bar": BAR, "duration": round(t + BAR * .5, 4), "scenes": out}
        (HERE / f"timeline-{name}.json").write_text(json.dumps(tl, indent=1))
        used = {s["media"].get("clip") for s in out if s.get("media")} - {None}
        page = tpl.replace("__TIMELINE__", json.dumps(tl)).replace("__CLIPS__", json.dumps({k: v for k, v in cm.items() if k in used}))
        (HERE / f"film-{name}.html").write_text(page)
        print(f"{name}: {len(out)} scenes, {sum(b for _, b in cut)} bars, {tl['duration']:.1f}s")
