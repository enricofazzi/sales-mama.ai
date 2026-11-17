"""Install film: real terminal logs (logs/*.json, recorded on this laptop) replayed in the film template.
Privacy: paths, the existing manager's name and email are replaced before anything is rendered.
Usage: python3 build_install.py -> install.html, timeline-install.json"""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
FILM = HERE.parent / "film2"
sys.path.insert(0, str(FILM))
from build2 import BPM, BEAT, BAR, G, LI, RD, E          # noqa: E402
import build3                                              # noqa: E402

WORK = str(HERE / "work")
SCRUB = [(WORK + "/sales-mama.ai", "~/code/sales-mama.ai"), (WORK, "~/code"), (str(HERE), "~/code"),
         ("/private/tmp/", "/tmp/"), (str(Path.home()), "~"),
         ("praveengovi.analytics@gmail.com", "grace@example.com"), ("Praveen Govindaraj", "Grace Lim"),
         ("Praveen", "Grace"), ("praveen", "grace"), ("DISABLED-for-filming", "(push off for filming)")]
def scrub(s):
    for a, b in SCRUB: s = s.replace(a, b)
    return s
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][A-Z0-9]")

COLS, ROWS = 104, 31
PROMPT = '<span class="pm">mei@laptop</span> <span class="pd">~/code{}</span> <span class="pa">❯</span> '

def hl(line):
    e = html.escape(line)
    if re.search(r"\d+/\d+ passed", e): return f'<b class="ok2">{e}</b>'
    e = re.sub(r"\bPASS\b", '<span class="ok">PASS</span>', e)
    e = re.sub(r"\bFAIL\b", '<span class="bad">FAIL</span>', e)
    e = re.sub(r"\b(warn|WARN)\b", r'<span class="wn">\1</span>', e)
    e = re.sub(r"(Sales Mama ready.*)", r'<span class="lm">\1</span>', e)
    e = re.sub(r"(Sales Mama Console → )(http://localhost:\d+)", r'\1<span class="lm">\2</span>', e)
    e = re.sub(r"^(\s*)(⏺)", r'\1<span class="dot">\2</span>', e)
    e = re.sub(r"^(\s*)(⎿)", r'\1<span class="mu">\2</span>', e)
    e = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", e)
    e = re.sub(r"`([^`]+)`", r'<span class="cd">\1</span>', e)
    return e

class Term:
    """A tiny terminal: \\r returns to column 0, \\n starts a line, lines wrap at COLS. Snapshots are (t, html)."""
    def __init__(s, lines=None): s.lines = list(lines or [""]); s.snaps = []; s.badges = []
    def write(s, text, raw=False):
        text = scrub(ANSI.sub("", text)).replace("\r\n", "\n")
        for ch in text:
            if ch == "\n": s.lines.append("")
            elif ch == "\r": s.lines[-1] = "\x00CR\x00" + s.lines[-1]   # mark: next char overwrites
            elif ch in "\x07\x08\x00": continue
            else:
                cur = s.lines[-1]
                if cur.startswith("\x00CR\x00"): cur = ""                 # progress line: redraw
                if len(cur) >= COLS: s.lines.append(""); cur = ""
                s.lines[-1] = cur + ch
        s.lines = s.lines[-400:]
    def html_lines(s, raw_prefix=None):
        out = []
        for l in s.lines[-ROWS:]:
            l = l.replace("\x00CR\x00", "")
            out.append(l if l.startswith("\x01") else hl(l))
        return "\n".join(x.lstrip("\x01") for x in out)
    def snap(s, t): s.snaps.append([round(t, 3), s.html_lines()])
    def prompt_line(s, cmd_typed, cwd="", caret=True):
        s.lines[-1] = "\x01" + PROMPT.format(cwd) + html.escape(cmd_typed) + ('<span class="car"></span>' if caret else "")

def shell_scene(term, steps, t0=0.6):
    """steps: [(logname, display_cmd, cwd, speed)] -> snapshots relative to the scene start; returns end time."""
    t = t0
    for log, cmd, cwd, speed in steps:
        term.prompt_line("", cwd); term.snap(t); t += .45
        for i in range(1, len(cmd) + 1):
            term.prompt_line(cmd[:i], cwd); term.snap(t); t += .045 if len(cmd) < 40 else .03
        t += .35; term.prompt_line(cmd, cwd, caret=False); term.lines.append(""); term.snap(t)
        if log:
            d = json.loads((HERE / "logs" / f"{log}.json").read_text())
            last = -1
            start = t
            for ct, text in d["chunks"]:
                if "\x00FILM\x00" in text: continue
                term.write(text)
                tt = start + ct / speed
                if tt - last >= 1 / 24: term.snap(tt); last = tt
            if speed > 1.5: term.badges.append([round(start, 2), round(start + d["chunks"][-1][0] / speed, 2), f"×{speed:g}"])
            t = start + (d["chunks"][-1][0] / speed if d["chunks"] else 0) + .5
            term.snap(t)
            if term.lines[-1] != "": term.lines.append("")
    term.prompt_line("", steps[-1][2]); term.snap(t)
    return t

def wrap(text, width=COLS - 4):
    out = []
    for para in text.split("\n"):
        if not para: out.append(""); continue
        ind = "  "
        while len(para) > width:
            cut = para.rfind(" ", 0, width)
            if cut < 20: cut = width
            out.append(para[:cut]); para = "  " + para[cut:].lstrip() if para.lstrip().startswith(("-", "1", "2", "3", "4", ">")) else para[cut:].lstrip()
        out.append(para)
    return out

def claude_scene(term, log, prompt, speed, first=False, t0=.5):
    """Replay one real Claude Code turn: the prompt, tool calls (⏺ Tool(args) / ⎿ done) and streamed text."""
    d = json.loads((HERE / "logs" / f"{log}.json").read_text())
    t = t0
    if first:
        for i in range(1, 7):
            term.prompt_line("claude"[:i], "/sales-mama.ai"); term.snap(t); t += .07
        t += .3; term.prompt_line("claude", "/sales-mama.ai", caret=False)
        term.lines += ["\x01" + '<span class="cc">╭───────────────────────────────────────────────╮</span>',
                       "\x01" + '<span class="cc">│ ✻ Claude Code                                 │</span>',
                       "\x01" + '<span class="cc">│   ~/code/sales-mama.ai                        │</span>',
                       "\x01" + '<span class="cc">╰───────────────────────────────────────────────╯</span>', "",
                       "\x01" + '<span class="mu">SessionStart hook: Sales Mama · unknown user, run mama-setup</span>', ""]
        term.snap(t); t += .8
    for i in range(0, len(prompt) + 1, 2):
        term.lines[-1] = "\x01" + '<span class="you">&gt; </span>' + html.escape(prompt[:i]) + '<span class="car"></span>'; term.snap(t); t += .03
    term.lines[-1] = "\x01" + '<span class="you">&gt; </span><span class="yt">' + html.escape(prompt) + "</span>"; term.lines.append(""); term.snap(t); t += .4
    start = t; texts = {}; order = []; tools = {}
    def render():
        # rebuild the lines after the prompt from the turn's items
        body = []
        for kind, key in order:
            if kind == "text":
                tx = texts[key].strip()
                if not tx: continue
                ws = wrap(scrub(tx))
                body.append("⏺ " + ws[0]); body += ["  " + w for w in ws[1:]]; body.append("")
            else:
                name, arg, done = tools[key]
                body.append(f"⏺ {name}({arg})"); body.append("  ⎿  " + ("done" if done else "running…")); body.append("")
        return body
    base = len(term.lines)
    last = -1
    for et, e in d["events"]:
        typ = e.get("type")
        if typ == "stream_event":
            ev = e.get("event", {}); mid = e.get("api_message_id") or (ev.get("message") or {}).get("id")
            if ev.get("type") == "content_block_start" and ev.get("content_block", {}).get("type") == "text":
                k = f"{mid}:{ev.get('index')}"; texts[k] = ""; order.append(("text", k))
            elif ev.get("type") == "content_block_delta" and ev.get("delta", {}).get("type") == "text_delta":
                k = f"{mid}:{ev.get('index')}"
                if k not in texts: texts[k] = ""; order.append(("text", k))
                texts[k] += ev["delta"]["text"]
        elif typ == "assistant":
            for c in e["message"]["content"]:
                if c["type"] == "tool_use" and c["id"] not in tools:
                    inp = c["input"]; arg = inp.get("command") or inp.get("file_path") or inp.get("pattern") or inp.get("skill") or ""
                    arg = scrub(str(arg)).split("\n")[0]; arg = arg[:70] + ("…" if len(arg) > 70 else "")
                    tools[c["id"]] = [c["name"], arg, False]; order.append(("tool", c["id"]))
        elif typ == "user":
            for c in (e.get("message") or {}).get("content", []):
                if isinstance(c, dict) and c.get("type") == "tool_result" and c.get("tool_use_id") in tools: tools[c["tool_use_id"]][2] = True
        elif typ == "result":
            for k in tools: tools[k][2] = True
        else:
            continue
        term.lines = term.lines[:base] + render() + [""]
        tt = start + et / speed
        if tt - last >= 1 / 20: term.snap(tt); last = tt
    t = start + d["events"][-1][0] / speed + .4
    term.lines = term.lines[:base] + render() + [""]
    term.lines[-1] = "\x01" + '<span class="you">&gt; </span><span class="car"></span>'; term.snap(t)
    if speed > 1.2: term.badges.append([round(start, 2), round(t, 2), f"×{speed:g}"])
    return t

def T(h, sub, pill, snaps, badges, bars, mus="groove", note=None):
    return dict(type="term", bg="dark", mus=mus, bars=bars, h=h, sub=sub, pill=pill, snaps=snaps, badges=badges, note=note)

def need_bars(t): return max(2, int(-(-(t + 1.2) // BAR)))

def build():
    sc = []
    sc.append(build3.words_cold("Day one · new laptop", ["A new rep.", "A new laptop.", "A Monday."],
        ["Install guides that break", "Missing tools", "Which accounts are mine?", "Who am I in the CRM?", "Waiting for IT", "A week before the first call"],
        f"How fast can she{'<br>'}{RD}start selling?{E}"))
    sc.append(build3.stakes(f"Every hour of setup{'<br>'}{LI}is an hour not selling.{E}", f"So we recorded a real install,{'<br>'}on a real laptop, start to finish."))
    sc.append(dict(type="title", bg="light", mus="groove", hit=True, bars=4, eyebrow="Getting started", title="Install and set up Sales Mama", sub="Recorded on a laptop, step by step. Real logs, nothing staged."))
    sc.append(build3.persona("Meet Mei.", "New account executive · Singapore · day one"))
    steps = []
    # 1 · prerequisites
    tm = Term(); end = shell_scene(tm, [("versions", "git --version && python3 --version && node --version && claude --version", "", 1)])
    steps.append(("Check what you need", [T(f"Four tools.{'<br>'}{G}That's all.{E}", "Git, Python 3.10+, Node 20+ and Claude Code. Most laptops already have the first three.", "Step 1 · Check what you need", tm.snaps, tm.badges, max(5, need_bars(end)))],
                  "Git, Python, Node and Claude Code"))
    # 2 · clone
    tm = Term(tm.lines); end = shell_scene(tm, [("clone", "git clone -b console-v2 https://github.com/neam-lang/sales-mama.ai.git", "", 1)])
    steps.append(("Get Sales Mama", [T(f"One command{'<br>'}{G}to download it.{E}", "The whole system is a folder: your team's knowledge, accounts and tools, kept in git.", "Step 2 · Get Sales Mama", tm.snaps, tm.badges, max(5, need_bars(end)))],
                  "One git clone"))
    # 3 · check
    tm = Term([""]); end = shell_scene(tm, [("yaml", "python3 -c \"import yaml; print('PyYAML', yaml.__version__, 'ready')\"", "/sales-mama.ai", 1),
                                            ("selftest", "python3 scripts/selftest.py", "/sales-mama.ai", 2.5)])
    steps.append(("Check it works", [T(f"213 checks.{'<br>'}{LI}All green.{E}", "The self-test runs every rule and tool on a copy: sending, privacy, scoring, calendar, everything.", "Step 3 · Check it works", tm.snaps, tm.badges, need_bars(end), mus="lift")],
                  "213 automatic checks"))
    # 4 · Claude Code setup (three real turns)
    tm = Term([""]); shots = []
    e1 = claude_scene(tm, "claude1", "Set me up for Sales Mama", 1.0, first=True)
    shots.append(T(f"Just say{'<br>'}{G}“Set me up.”{E}", "Claude Code checks your tools, then asks who you are. One question at a time.", "Step 4 · Set yourself up", tm.snaps, tm.badges, need_bars(e1)))
    tm = Term(tm.lines); e2 = claude_scene(tm, "claude2a", "I'm a new rep: Mei Chen, mei@example.com", 1.0)
    shots.append(T(f"It learns{'<br>'}{G}who you are.{E}", "Your work email becomes your identity. Your accounts, your drafts, your calendar.", "Step 4 · Set yourself up", tm.snaps, tm.badges, need_bars(e2)))
    tm = Term(tm.lines)
    a3 = "SG. To save time, here's the rest: English; F&B and clinics; central and east; companies of 10 to 200 staff; 15 messages a day; up to 40 active accounts; 8 meetings a month; tone warm and brief; signature: Mei Chen, Account Executive"
    e3 = claude_scene(tm, "claude2b", a3, 1.6)
    shots.append(T(f"Your territory,{'<br>'}{G}your rules.{E}", "Markets, industries, quota, tone and signature. Then a safety check: nothing can send without you.", "Step 4 · Set yourself up", tm.snaps, tm.badges, need_bars(e3) + 2, mus="lift",
                   note="Push is switched off in this filming copy, so the final sync note is expected."))
    tm = Term([""]); e4 = shell_scene(tm, [("profile", "sed -n 1,21p reps/mei.md", "/sales-mama.ai", 1)])
    shots.append(T(f"Her profile,{'<br>'}{LI}in plain text.{E}", "reps/mei.md: readable, versioned, and only hers to change.", "Step 4 · Set yourself up", tm.snaps, tm.badges, max(5, need_bars(e4))))
    steps.append(("Set yourself up with Claude Code", shots, "Say “Set me up”; answer a few questions"))
    # 5 · console
    tm = Term([""]); e5 = shell_scene(tm, [("session", "python3 scripts/session_start.py", "/sales-mama.ai", 1), ("console", "npm run console", "/sales-mama.ai", 2)])
    steps.append(("Open the console", [
        T(f"Your day,{'<br>'}{G}one command away.{E}", "The first run installs the console. Then open localhost in your browser.", "Step 5 · Open the console", tm.snaps, tm.badges, need_bars(e5)),
        dict(type="device", bg="light", mus="lift", layout="right", media=dict(clip="first-open", at=.3), pill="Step 5 · Open the console",
             h=f"Good afternoon,{'<br>'}{G}Mei.{E}", sub="Her own Today page: send window, an empty book ready for accounts, one button to run her day.", bars=6, cam=[], spot=[]),
        dict(type="device", bg="light", mus="groove", layout="full", media=dict(clip="first-tour", at=.2), h="Ready on day one.", sub="Chat, calendar and book are all hers. The manager allocates accounts next.", bars=6, cam=[], spot=[], cap_at=.5)],
        "npm run console"))
    for i, (name, shots, recap) in enumerate(steps, 1):
        sc.append(dict(type="chapter", bg="black", mus="groove", hit=True, bars=1, num=f"STEP {i}", title=name))
        sc += shots
    sc.append(dict(type="compare", bg="light", mus="lift", bars=8, h="Day one, done.", before=["A day of setup and IT tickets", "Not sure the tools even work", "Waiting to be told which accounts are hers"],
                   after=["Installed and checked in minutes", "213 automatic checks passed", "Her own profile, territory and Today page"]))
    sc.append(dict(type="recap", bg="light", mus="groove", bars=6, eyebrow="Getting started · Install and set up", h="Five steps. One morning.", items=[(n, r) for n, _, r in steps]))
    sc.append(dict(type="epout", bg="light", mus="outro", bars=6, h=f"Ready to sell{'<br>'}{G}on day one.{E}", next="Episode 1 · Where do I start?"))
    return sc

if __name__ == "__main__":
    scs = build()
    total = sum(s["bars"] for s in scs)
    t = 0.0; out = []
    for i, s in enumerate(scs):
        s = dict(s); s.update(id=f"s{i}", key=s["type"], start=round(t, 4), end=round(t + s["bars"] * BAR, 4)); out.append(s); t += s["bars"] * BAR
    tl = {"bpm": BPM, "beat": BEAT, "bar": BAR, "duration": round(t + BAR * .5, 4), "scenes": out}
    (HERE / "timeline-install.json").write_text(json.dumps(tl))
    clips = {}
    for c in ("first-open", "first-tour"):
        meta = json.loads((HERE / "clips" / c / "frames.json").read_text()); fr = meta["frames"]; n = int(meta["duration"] * 30) + 1; k = 0; lst = []
        for i in range(n):
            while k + 1 < len(fr) and fr[k + 1]["t"] <= i / 30: k += 1
            lst.append(fr[k]["file"])
        clips[c] = lst
    page = (HERE / "player4.html").read_text().replace("__TIMELINE__", json.dumps(tl)).replace("__CLIPS__", json.dumps(clips))
    (HERE / "install.html").write_text(page)
    print(f"install: {len(out)} scenes, {total} bars, {tl['duration']:.1f}s")
    for s in out: print(f"  {s['type']:8} {s['bars']:3} bars  {s.get('h', s.get('title', ''))[:50]!r}")
    # leak check
    blob = json.dumps(tl)
    for bad in ("praveengovi", "Praveen", "/Users/", "scratchpad", "claude-501"):
        if bad in blob: print("LEAK:", bad)
