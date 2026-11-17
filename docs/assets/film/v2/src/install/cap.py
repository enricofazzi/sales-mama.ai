"""Record a real Sales Mama install on this laptop, with timings, for the install film.
Each step's output is captured through a pty (so tools print as they would in a terminal) with a timestamp per chunk.
Usage: python3 cap.py <step-name|all>   ->  logs/<step>.json  {cmd, cwd, start, chunks:[[t, text]], code, dur}
"""
import json, os, pty, select, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE / "work"; REPO = WORK / "sales-mama.ai"; LOGS = HERE / "logs"
LOGS.mkdir(exist_ok=True); WORK.mkdir(exist_ok=True)
GITCFG = HERE / "empty.gitconfig"; GITCFG.touch()
NODE24 = Path.home() / ".nvm/versions/node/v24.18.0/bin"
ENV = dict(os.environ, GIT_CONFIG_GLOBAL=str(GITCFG), PATH=f"{NODE24}:{os.environ['PATH']}", TERM="xterm-256color",
           COLUMNS="110", LINES="40", PIP_DISABLE_PIP_VERSION_CHECK="1")
ENV.pop("MAMA_USER_EMAIL", None); ENV.pop("MAMA_ROOT", None)

def run(name, cmd, cwd, timeout=1800):
    t0 = time.time(); chunks = []
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(cwd); os.execvpe("/bin/zsh", ["/bin/zsh", "-f", "-c", cmd], ENV)
    while True:
        r, _, _ = select.select([fd], [], [], 1.0)
        if fd in r:
            try: data = os.read(fd, 65536)
            except OSError: break
            if not data: break
            chunks.append([round(time.time() - t0, 3), data.decode("utf-8", "replace")])
        if time.time() - t0 > timeout: os.kill(pid, 9); break
    _, status = os.waitpid(pid, 0)
    rec = dict(cmd=cmd, cwd=str(cwd), start=time.strftime("%Y-%m-%d %H:%M:%S"), chunks=chunks, code=os.waitstatus_to_exitcode(status), dur=round(time.time() - t0, 2))
    (LOGS / f"{name}.json").write_text(json.dumps(rec, indent=1))
    print(f"{name}: exit {rec['code']} in {rec['dur']}s, {sum(len(c[1]) for c in chunks)} chars")
    return rec

def claude(name, prompt, resume=None):
    """One Claude Code turn, headless, as stream-json events with arrival times."""
    args = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose", "--include-partial-messages",
            "--permission-mode", "acceptEdits", "--allowedTools", "Bash Read Write Edit Glob Grep Skill TodoWrite"]
    if resume: args += ["--resume", resume]
    t0 = time.time(); events = []
    p = subprocess.Popen(args, cwd=REPO, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        line = line.strip()
        if not line: continue
        try: e = json.loads(line)
        except Exception: e = {"type": "raw", "text": line}
        events.append([round(time.time() - t0, 3), e])
    p.wait()
    sid = next((e.get("session_id") for _, e in events if e.get("session_id")), None)
    (LOGS / f"{name}.json").write_text(json.dumps(dict(prompt=prompt, events=events, code=p.returncode, dur=round(time.time() - t0, 2), session=sid), indent=1))
    res = next((e for _, e in events if e.get("type") == "result"), {})
    print(f"{name}: exit {p.returncode} in {time.time() - t0:.0f}s, {len(events)} events, session {sid}, cost {res.get('total_cost_usd')}")
    print((res.get("result") or "")[:1500])
    return sid

STEPS = {
    "versions": lambda: run("versions", "git --version && python3 --version && node --version && claude --version", WORK),
    "clone": lambda: run("clone", "git clone -b console-v2 https://github.com/neam-lang/sales-mama.ai.git", WORK),
    "pip": lambda: run("pip", "python3 -m pip install --user pyyaml", REPO),
    "yaml": lambda: run("yaml", "python3 -c \"import yaml; print('PyYAML', yaml.__version__, 'ready')\"", REPO),
    "session": lambda: run("session", "python3 scripts/session_start.py", REPO),
    "profile": lambda: run("profile", "sed -n 1,21p reps/mei.md", REPO),
    "selftest": lambda: run("selftest", "python3 scripts/selftest.py", REPO),
}

def console():
    """npm run console in a pty until it is listening, then film the browser, then stop it."""
    t0 = time.time(); chunks = []; filmed = False
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(REPO); os.execvpe("/bin/zsh", ["/bin/zsh", "-f", "-c", "npm run console"], ENV)
    while time.time() - t0 < 600:
        r, _, _ = select.select([fd], [], [], .5)
        if fd in r:
            try: data = os.read(fd, 65536)
            except OSError: break
            if not data: break
            chunks.append([round(time.time() - t0, 3), data.decode("utf-8", "replace")])
        text = "".join(c[1] for c in chunks)
        if not filmed and "localhost:4173" in text:
            time.sleep(1.5); filmed = True
            chunks.append([round(time.time() - t0, 3), "\x00FILM\x00"])
            if not os.environ.get("NOFILM"): subprocess.run(["node", str(HERE / "film_console.cjs")], env=ENV)
            else: time.sleep(3)
            break
    subprocess.run(["pkill", "-f", str(REPO / "console")]); time.sleep(1)
    try: os.kill(pid, 9); os.waitpid(pid, 0)
    except (ChildProcessError, ProcessLookupError): pass
    (LOGS / "console.json").write_text(json.dumps(dict(cmd="npm run console", chunks=chunks, dur=round(time.time() - t0, 2)), indent=1))
    print("console:", "".join(c[1] for c in chunks)[-600:])

if __name__ == "__main__":
    step = sys.argv[1]
    if step == "nopush":   # not filmed: the throwaway copy can never push to GitHub
        subprocess.run(["git", "remote", "set-url", "--push", "origin", "DISABLED-for-filming"], cwd=REPO, env=ENV, check=True)
        print(subprocess.run(["git", "remote", "-v"], cwd=REPO, env=ENV, capture_output=True, text=True).stdout)
    elif step == "console":
        console()
    elif step == "claude1":
        claude("claude1", "Set me up for Sales Mama")
    elif step == "claude2":
        claude("claude2", sys.argv[3], resume=sys.argv[2])
    else:
        STEPS[step]()
