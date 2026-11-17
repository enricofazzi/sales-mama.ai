"""Synthetic stream fixtures for the film (fictional demo data only)."""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1])
ROOT = "/repo"

class F:
    def __init__(s, prompt):
        s.ev = [{"type": "film", "prompt": prompt}]; s.n = 0; s.m = 0
        s.ev.append({"type": "system", "subtype": "hook_started", "hook_name": "SessionStart:startup"})
        s.ev.append({"type": "system", "subtype": "init", "session_id": "film"})
    def id(s): s.n += 1; return f"toolu_film{s.n:03d}"
    def msg(s): s.m += 1; return f"msg_film{s.m:03d}"
    def wait(s, k):  # idle events (ignored by the builder) = k x 28 ms at speed 1
        for _ in range(k): s.ev.append({"type": "system", "subtype": "status", "status": "requesting"})
    def tool(s, name, inp, ok=True, wait=6):
        i = s.id(); s.ev.append({"type": "assistant", "message": {"id": s.msg(), "content": [{"type": "tool_use", "id": i, "name": name, "input": inp}]}})
        s.wait(wait); s.ev.append({"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": i, "content": "ok", "is_error": not ok}]}})
        return i
    def todos(s, items):
        s.ev.append({"type": "assistant", "message": {"id": s.msg(), "content": [{"type": "tool_use", "id": s.id(), "name": "TodoWrite", "input": {"todos": [{"content": c, "status": st} for c, st in items]}}]}})
    def agents(s, lanes, steps=4):
        ids = []
        for typ, desc, _ in lanes:
            i = s.id(); ids.append(i)
            s.ev.append({"type": "assistant", "message": {"id": s.msg(), "content": [{"type": "tool_use", "id": i, "name": "Agent", "input": {"subagent_type": typ, "description": desc}}]}})
            s.ev.append({"type": "system", "subtype": "task_started", "tool_use_id": i, "subagent_type": typ, "description": desc, "task_id": "t" + i})
            s.wait(2)
        for k in range(steps):
            for i, (_, _, notes) in zip(ids, lanes):
                s.ev.append({"type": "system", "subtype": "task_progress", "tool_use_id": i, "description": notes[k % len(notes)], "usage": {"tool_uses": 2 + k * 2}})
                s.wait(3)
            s.wait(4)
        for i in ids:
            s.ev.append({"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": i, "content": "done"}]}}); s.wait(5)
    def say(s, text, chunk=14):
        mid = s.msg(); s.ev.append({"type": "stream_event", "event": {"type": "message_start", "message": {"id": mid}}})
        s.ev.append({"type": "stream_event", "api_message_id": mid, "event": {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}})
        i = 0
        while i < len(text):
            # surfaces stream faster (they render as a skeleton until complete)
            step = chunk * (6 if text.rfind("```a2ui", 0, i) > text.rfind("```\n", 0, i) else 1)
            s.ev.append({"type": "stream_event", "api_message_id": mid, "event": {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text[i:i + step]}}}); i += step
        s.ev.append({"type": "stream_event", "api_message_id": mid, "event": {"type": "content_block_stop", "index": 0}})
    def end(s, ms, usd, name):
        s.ev.append({"type": "result", "subtype": "success", "duration_ms": ms, "total_cost_usd": usd, "num_turns": 9})
        (OUT / f"{name}.jsonl").write_text("\n".join(json.dumps(e) for e in s.ev) + "\n")

def surf(d): return "```a2ui\n" + json.dumps(d) + "\n```"

# 1 · Run my day (rep Mei)
f = F("Run my day")
f.tool("Skill", {"skill": "mama-day"}, wait=4)
f.todos([("Triage replies", "in_progress"), ("Research new accounts", "pending"), ("Recommend products", "pending"), ("Draft outreach", "pending"), ("Plan the send window", "pending")])
f.tool("Bash", {"command": "python3 scripts/find.py --owner me --due --json", "description": "List my due accounts"})
f.tool("Read", {"file_path": f"{ROOT}/wiki/books/mei.md"})
f.todos([("Triage replies", "completed"), ("Research new accounts", "in_progress"), ("Recommend products", "pending"), ("Draft outreach", "pending"), ("Plan the send window", "pending")])
f.agents([
    ("researcher", "Research Nimbus Clinics", ["Reading wiki/accounts/nimbus-clinics.md", "Searching the web: Nimbus Clinics new branch", "Snapshot raw/web/2026-11-16-nimbus-clinics.md", "3 cited signals, 1 new contact"]),
    ("researcher", "Research Cinder Coffee Roasters", ["Reading wiki/accounts/cinder-coffee-roasters.md", "Searching the web: Cinder Coffee second outlet", "Snapshot raw/web/2026-11-16-cinder-coffee.md", "2 cited signals"]),
    ("vam", "Refresh Mei's book", ["Applying 6 new signals", "Rescoring 17 accounts", "Next best actions for 4 accounts", "2 follow-ups pre-drafted"]),
], steps=4)
f.todos([("Triage replies", "completed"), ("Research new accounts", "completed"), ("Recommend products", "in_progress"), ("Draft outreach", "pending"), ("Plan the send window", "pending")])
f.tool("Bash", {"command": "python3 scripts/recommend.py nimbus-clinics --json", "description": "Recommend products for Nimbus Clinics"})
f.todos([("Triage replies", "completed"), ("Research new accounts", "completed"), ("Recommend products", "completed"), ("Draft outreach", "in_progress"), ("Plan the send window", "pending")])
f.tool("Grep", {"pattern": "nimbusclinics", "path": f"{ROOT}/wiki/suppression.csv"})
f.tool("Write", {"file_path": f"{ROOT}/wiki/drafts/2026-11-16-nimbus-clinics-fu1.md"})
f.todos([("Triage replies", "completed"), ("Research new accounts", "completed"), ("Recommend products", "completed"), ("Draft outreach", "completed"), ("Plan the send window", "completed")])
f.say("Your day is ready, Mei. **3 drafts** are waiting for your approval, Harbourlight Foods is hot, and Nimbus Clinics needs a follow-up before its contract ends in December.\n\n"
      + surf({"surfaceId": "day_summary", "components": [{"id": "root", "component": "DaySummaryCard", "title": "Your day, Mon 16 Nov", "agent": "mama", "drafts": 3, "send_window": "SG 09:00-11:30 tomorrow",
          "hot": [{"account": "harbourlight-foods", "delta": 0.22, "signal": "contract_win"}, {"account": "nimbus-clinics", "delta": 0.11, "signal": "new_branch_opened"}], "at_risk": 1,
          "needs_you": [{"account": "harbourlight-foods", "text": "Pilot scoping today 15:00: brief ready"}, {"account": "nimbus-clinics", "text": "Approve follow-up 1"}],
          "refs": ["wiki/books/mei.md"], "actions": [{"label": "Brief me on Harbourlight", "prompt": "/mama-brief harbourlight-foods", "style": "primary"}, {"label": "Show my book", "prompt": "/mama-book", "style": "secondary"}]}]})
      + "\n\n" + surf({"surfaceId": "draft", "components": [{"id": "root", "component": "DraftCard", "title": "Follow-up 1 · Nimbus Clinics", "agent": "writer", "account": "nimbus-clinics", "to": "ops@nimbusclinics.example", "channel": "email",
          "subject": "Before your December renewal", "body": "Hi Daniel, congratulations on the new Tampines clinic. With your current IT contract ending in December, this is a good moment to look at managed Wi-Fi across all four sites, with one support line for your front desks. Would a 20-minute call on Thursday work?",
          "signal": "new_branch_opened (2026-11-12)", "pattern": "renewal-window-fu1", "passed": ["owner ok", "not suppressed", "facts cited", "SG send window"], "send_window": "Tue 17 Nov, 09:00-11:30 SGT",
          "refs": ["wiki/accounts/nimbus-clinics.md", "knowledge/products/managed-wifi.yaml"], "actions": [{"label": "Make it shorter", "prompt": "Make the Nimbus draft shorter", "style": "secondary"}]}]}))
f.end(184000, 0.41, "film-day")

# 2 · Brief
f = F("Brief me on Harbourlight Foods")
f.tool("Skill", {"skill": "mama-brief"}, wait=3)
f.tool("Read", {"file_path": f"{ROOT}/wiki/accounts/harbourlight-foods.md"})
f.tool("Read", {"file_path": f"{ROOT}/wiki/contacts/rachel-goh-harbourlight-foods.md"})
f.tool("Read", {"file_path": f"{ROOT}/knowledge/products/it-care.yaml"})
f.say("Here's your brief for **today 15:00**. Rachel Goh agreed to scope a pilot after the catering contract win.\n\n"
      + surf({"surfaceId": "brief", "components": [{"id": "root", "component": "BriefCard", "title": "Call brief · Harbourlight Foods", "agent": "mama", "subject": "Mon 16 Nov 15:00 SGT with Rachel Goh · Pilot scoping",
          "sections": [{"heading": "Why now", "bullets": ["Won a government catering contract (28 Oct)", "Opened a new central kitchen in Jurong"]},
                       {"heading": "What to propose", "bullets": ["IT-care for the new kitchen, then all branches", "Managed Wi-Fi for the kitchen floor"]},
                       {"heading": "Questions", "bullets": ["How many sites go live by March?", "Who signs off IT spend?", "What breaks today when the network drops?"]},
                       {"heading": "Watch out", "bullets": ["Contract ends 15 Feb 2027: keep the pilot short"]}],
          "refs": ["wiki/accounts/harbourlight-foods.md", "wiki/contacts/rachel-goh-harbourlight-foods.md"], "actions": [{"label": "Log the outcome after", "prompt": "/mama-handover harbourlight-foods", "style": "secondary"}]}]}))
f.end(41000, 0.09, "film-brief")

# 3 · Week
f = F("What's on this week?")
f.tool("Skill", {"skill": "mama-schedule"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/appointments.py list --from 2026-11-16 --to 2026-11-22 --json", "description": "List this week's appointments"})
f.say("**7 appointments** this week. Heads-up: Tuesday's Evergreen demo overlaps the Quayside site visit, and Orchid Optical cancelled Friday.\n\n"
      + surf({"surfaceId": "week", "title": "This week", "agent": "mama", "dataRef": "wiki/books/mei.calendar.json", "components": [
          {"id": "root", "component": "Column", "children": ["cal", "go"]}, {"id": "cal", "component": "CalendarWeek", "calendar": {"path": "/"}, "start": "2026-11-16"},
          {"id": "go", "component": "ActionBar", "actions": [{"label": "Move Quayside to 14:00", "prompt": "/mama-schedule reschedule apt-20261117-quayside-clinic-1 to 2026-11-17 14:00"}, {"label": "Brief me on the next one", "prompt": "/mama-brief harbourlight-foods"}]}]}))
f.end(22000, 0.05, "film-week")

# 4 · Manager (Grace)
f = F("Morning cockpit")
f.tool("Skill", {"skill": "mama-manager"}, wait=3)
f.tool("Read", {"file_path": f"{ROOT}/log/briefs/2026-11-16-manager.md"})
f.tool("Bash", {"command": "python3 scripts/weekly.py --json", "description": "Team metrics"})
f.say("Good morning, Grace. The nightly run finished clean. **5 new leads** wait for your allocation and one entity match needs a decision.\n\n"
      + surf({"surfaceId": "run", "components": [{"id": "root", "component": "RunStatusCard", "title": "Last night · 02:00 SGT", "agent": "scout", "ok": True, "started": "02:00", "finished": "02:41", "markets": ["SG", "MY", "IN"], "items": 64, "linked": 21, "review": 1, "new_leads": 5, "errors": 0, "refs": ["wiki/log.md"]}]})
      + "\n\n" + surf({"surfaceId": "team", "title": "Team this week", "agent": "mama", "dataRef": "log/weekly/2026-W47.json", "components": [
          {"id": "root", "component": "Column", "children": ["k", "f"]}, {"id": "k", "component": "Grid", "min": 150, "children": ["a", "b", "c"]},
          {"id": "a", "component": "KpiTile", "label": "Meetings", "value": {"path": "/metrics/week/total/meetings"}},
          {"id": "b", "component": "KpiTile", "label": "Replies", "value": {"path": "/metrics/week/total/replies"}},
          {"id": "c", "component": "KpiTile", "label": "Meeting rate", "value": {"path": "/allocation/team_rate"}, "format": "percent"},
          {"id": "f", "component": "Funnel", "data": {"path": "/funnel/stages"}, "compareKey": "week_ago", "compareLabel": "this week"}]})
      + "\n\n" + surf({"surfaceId": "review_queue", "components": [{"id": "root", "component": "ReviewQueueCard", "title": "Entity match to confirm", "agent": "mama",
          "items": [{"n": 1, "text": "Harbour Light Foods opens Jurong central kitchen", "source": "sg-business-news", "candidate": "harbourlight-foods", "confidence": 0.84}],
          "refs": ["log/review.csv"], "actions": [{"label": "1 is a match", "prompt": "1 is harbourlight-foods", "style": "primary"}, {"label": "Review the allocation", "prompt": "/mama-allocate", "style": "secondary"}]}]}))
f.end(52000, 0.12, "film-manager")

# 5 · Send review
f = F("Send my drafts")
f.tool("Skill", {"skill": "mama-send"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/send.py --preview --json", "description": "Preview the batch with every check"})
f.say("Checked **3 drafts**. Two are ready for the SG window; Bluefin Bistro waits because the contact asked to talk after 20 Nov. Nothing goes out until you say **send 1 and 2**.\n\n"
      + surf({"surfaceId": "plan", "components": [{"id": "root", "component": "PlanCard", "title": "Ready to send · 2 of 3", "agent": "writer", "steps": [
          {"label": "1 · Nimbus Clinics · email · follow-up 1", "status": "done", "agent": "writer", "note": "suppression ok · facts cited · window 09:00-11:30"},
          {"label": "2 · Cinder Coffee Roasters · email · first", "status": "done", "agent": "writer", "note": "suppression ok · facts cited · unsubscribe line"},
          {"label": "3 · Bluefin Bistro · WhatsApp · held", "status": "failed", "agent": "writer", "note": "contact asked for after 20 Nov"}], "refs": ["log/approvals.csv"],
          "actions": [{"label": "Edit draft 2", "prompt": "Edit the Cinder Coffee draft", "style": "secondary"}]}]}))
f.end(19000, 0.04, "film-send")
print("wrote", sorted(p.name for p in OUT.glob("film-*.jsonl")))
