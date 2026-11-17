"""Synthetic chat streams for the five problem-led episodes. Fictional demo data; every fact below is on the
demo account pages (wiki/accounts, wiki/contacts) or in knowledge/."""
import json, sys
from pathlib import Path
src = (Path(__file__).parent / "fixtures.py").read_text()
exec(src[:src.index("# 1 ·")].replace("OUT = Path(sys.argv[1])", "OUT = Path(sys.argv[1])"))  # F, surf, ROOT, OUT

def card(sid, comp, **kw): return surf({"surfaceId": sid, "components": [dict(id="root", component=comp, **kw)]})
def view(sid, title, ref, comps, agent="mama"): return surf({"surfaceId": sid, "title": title, "agent": agent, "dataRef": ref, "components": comps})
HL = dict(account_id="harbourlight-foods", name="Harbourlight Foods Pte Ltd", market="SG")
NB = dict(account_id="nimbus-clinics", name="Nimbus Clinics Pte Ltd", market="SG")

# ---------------- Episode 1 · Where do I start?
f = F("Run my day")
f.tool("Skill", {"skill": "mama-day"}, wait=4)
f.todos([("Check replies", "in_progress"), ("Refresh my accounts", "pending"), ("Plan follow-ups", "pending"), ("Draft messages", "pending"), ("Line up the send window", "pending")])
f.tool("Bash", {"command": "python3 scripts/find.py --owner me --due --json", "description": "My accounts due today"})
f.tool("Read", {"file_path": f"{ROOT}/wiki/books/mei.md"})
f.todos([("Check replies", "completed"), ("Refresh my accounts", "in_progress"), ("Plan follow-ups", "pending"), ("Draft messages", "pending"), ("Line up the send window", "pending")])
f.agents([
    ("researcher", "Check Nimbus Clinics", ["Reading wiki/accounts/nimbus-clinics.md", "Contract ends 31 Dec", "Found Daniel Ong, Operations Manager", "1 contact, 2 sources"]),
    ("researcher", "Check Harbourlight Foods", ["Reading wiki/accounts/harbourlight-foods.md", "School-canteen contract, 28 Oct", "Second kitchen in Tampines", "Meeting today 15:00"]),
    ("vam", "Watch Mei's book", ["17 accounts checked", "Nimbus: contract ending, no plan", "Harbourlight: hot", "1 follow-up pre-drafted"]),
], steps=4)
f.todos([("Check replies", "completed"), ("Refresh my accounts", "completed"), ("Plan follow-ups", "completed"), ("Draft messages", "in_progress"), ("Line up the send window", "pending")])
f.tool("Grep", {"pattern": "nimbusclinics", "path": f"{ROOT}/wiki/suppression.csv"})
f.tool("Write", {"file_path": f"{ROOT}/wiki/drafts/2026-11-16-nimbus-clinics-fu1.md"})
f.todos([("Check replies", "completed"), ("Refresh my accounts", "completed"), ("Plan follow-ups", "completed"), ("Draft messages", "completed"), ("Line up the send window", "completed")])
f.say("Here's your day, Mei. Start with **Harbourlight Foods**: your meeting is at 15:00 and the brief is ready. Then approve the **Nimbus Clinics** follow-up before the 09:00 window: their IT contract ends on 31 December.\n\n"
      + card("day", "DaySummaryCard", title="Your day, Mon 16 Nov", agent="mama", drafts=1, send_window="SG 09:00-11:30",
             hot=[{"account": "harbourlight-foods", "delta": 0.22, "signal": "contract_win"}], at_risk=1,
             needs_you=[{"account": "harbourlight-foods", "text": "Meeting 15:00 with Rachel Goh: brief ready"}, {"account": "nimbus-clinics", "text": "Approve follow-up 1 (contract ends 31 Dec)"}],
             refs=["wiki/books/mei.md"], actions=[{"label": "Brief me on Harbourlight", "prompt": "/mama-brief harbourlight-foods", "style": "primary"}, {"label": "Why is Nimbus at risk?", "prompt": "Why is Nimbus at risk?", "style": "secondary"}])
      + "\n\n" + card("draft", "DraftCard", title="Follow-up 1 · Nimbus Clinics", agent="writer", account="nimbus-clinics", to="daniel.ong@nimbusclinics.example", channel="email",
             subject="Before your IT contract ends in December", body="Hi Daniel, with your current IT contract ending on 31 December, this is a good moment to look at support for all three clinics before the new year. IT Care gives your front desks one helpdesk, device setup and backups. Would a 20-minute call next week help?",
             signal="contract_ending (2026-10-20)", pattern="renewal-window-fu1", passed=["owner ok", "not suppressed", "facts cited", "SG send window"], send_window="Mon 16 Nov, 09:00-11:30 SGT",
             refs=["wiki/accounts/nimbus-clinics.md", "wiki/contacts/daniel-ong-nimbus-clinics.md", "knowledge/products/it-care.yaml"]))
f.end(176000, 0.38, "ep1-day")

f = F("Why is Nimbus at risk?")
f.tool("Read", {"file_path": f"{ROOT}/wiki/accounts/nimbus-clinics.md"}, wait=5)
f.say("Nimbus is a tier A account, but its **IT contract ends on 31 December** and there's no plan yet: the first email on 30 Oct got no reply. Send follow-up 1 this morning and offer a short call.\n\n"
      + card("acc", "AccountCard", title="Nimbus Clinics", agent="vam", **NB, tier="A", score=0.73, stage="contacted", owner="mei",
             score_parts={"fit": 0.9, "intent": 0.8, "propensity": 0.55, "engagement": 0.4},
             signals=[{"term": "contract_ending", "evidence": "Current contract ends 2026-12-31", "date": "2026-10-20", "ref": "raw/crm/2026-10-20-demo-export.csv"}],
             recommendation={"chain": ["contract_ending", "renewal_window"], "product": "IT Care"},
             next={"action": "Send follow-up 1, mention the December contract end", "due": "today"},
             refs=["wiki/accounts/nimbus-clinics.md"], actions=[{"label": "Show me the draft", "prompt": "Show the Nimbus draft", "style": "primary"}]))
f.end(14000, 0.03, "ep1-risk")

f = F("Brief me on Harbourlight Foods")
f.tool("Skill", {"skill": "mama-brief"}, wait=3)
f.tool("Read", {"file_path": f"{ROOT}/wiki/accounts/harbourlight-foods.md"})
f.tool("Read", {"file_path": f"{ROOT}/wiki/contacts/rachel-goh-harbourlight-foods.md"})
f.tool("Read", {"file_path": f"{ROOT}/knowledge/products/it-care.yaml"})
f.say("Your brief for **today 15:00** with Rachel Goh, Managing Director. They're growing fast: open with the new contract and the second kitchen.\n\n"
      + card("brief", "BriefCard", title="Call brief · Harbourlight Foods", agent="mama", subject="Mon 16 Nov 15:00 SGT · Rachel Goh, Managing Director · pilot scoping",
             sections=[{"heading": "Why now", "bullets": ["Won a school-canteen supply contract (28 Oct)", "Second kitchen opening in Tampines (announced 20 Oct)"]},
                       {"heading": "What to propose", "bullets": ["IT Care: one helpdesk as orders grow", "Managed WiFi for the new Tampines kitchen"]},
                       {"heading": "Questions to ask", "bullets": ["When does the Tampines kitchen open?", "Who signs off IT spend?", "What slows the back office today?"]},
                       {"heading": "Watch out", "bullets": ["She said they already have a provider (1 Nov): ask what they'd change"]}],
             refs=["wiki/accounts/harbourlight-foods.md", "wiki/contacts/rachel-goh-harbourlight-foods.md"], actions=[{"label": "Log the outcome after", "prompt": "/mama-handover harbourlight-foods", "style": "secondary"}]))
f.end(38000, 0.08, "ep1-brief")

f = F("Send my drafts")
f.tool("Skill", {"skill": "mama-send"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/send.py --preview --json", "description": "Check every draft before sending"})
f.say("2 drafts checked. **1 is ready** for the SG window. The Bluefin Bistro note is held: there's no contact on the account page yet. Reply **send 1** and it goes from your own mailbox.\n\n"
      + card("plan", "PlanCard", title="Ready to send · 1 of 2", agent="writer", steps=[
          {"label": "1 · Nimbus Clinics · email · follow-up 1", "status": "done", "agent": "writer", "note": "not suppressed · facts cited · window 09:00-11:30 · unsubscribe line"},
          {"label": "2 · Bluefin Bistro · email · first", "status": "failed", "agent": "writer", "note": "held: no contact on the account page"}], refs=["log/approvals.csv"],
          actions=[{"label": "Find a contact at Bluefin", "prompt": "/mama-research bluefin-bistro", "style": "secondary"}]))
f.end(17000, 0.04, "ep1-send")

# ---------------- Episode 2 · Chasing the wrong leads
f = F("What changed overnight?")
f.tool("Read", {"file_path": f"{ROOT}/wiki/log.md"}, wait=4)
f.tool("Bash", {"command": "python3 scripts/find.py --owner me --changed 1 --json", "description": "My accounts that changed overnight"})
f.say("While you slept, Sales Mama scanned news, tenders and company registries in SG, MY and IN. **Two of your accounts moved**; everything else is quiet.\n\n"
      + card("run", "RunStatusCard", title="Overnight · 02:00 SGT", agent="scout", ok=True, started="02:00", finished="02:41", markets=["SG", "MY", "IN"], items=64, linked=21, review=1, new_leads=5, errors=0, refs=["wiki/log.md"])
      + "\n\n" + view("moved", "Your accounts that moved", "wiki/books/mei.json", [
          {"id": "root", "component": "Column", "children": ["t", "go"]},
          {"id": "t", "component": "DataTable", "rows": {"path": "/hot"}, "columns": [{"key": "name", "label": "Account"}, {"key": "tier", "label": "Tier", "format": "tier"}, {"key": "score", "label": "Score", "numeric": True}, {"key": "stage", "label": "Stage", "format": "status"}]},
          {"id": "go", "component": "ActionBar", "actions": [{"label": "Why is Harbourlight hot?", "prompt": "Why is Harbourlight hot?"}]}]))
f.end(21000, 0.05, "ep2-overnight")

f = F("Why is Harbourlight hot?")
f.tool("Read", {"file_path": f"{ROOT}/wiki/accounts/harbourlight-foods.md"}, wait=5)
f.say("Two fresh reasons to buy, both with a source: a **new school-canteen contract** and a **second kitchen in Tampines**. Growth like this strains the back office, so the timing is right.\n\n"
      + card("acc", "AccountCard", title="Harbourlight Foods", agent="vam", **HL, tier="A", score=0.93, stage="meeting", owner="mei",
             score_parts={"fit": 1.0, "intent": 0.92, "propensity": 0.71, "engagement": 1.0},
             signals=[{"term": "contract_win", "evidence": "Awarded a school-canteen supply contract", "date": "2026-10-28", "ref": "raw/signals/2026-10-28/sg-gov-procurement/harbourlight-foods-award.md"},
                      {"term": "new_branch_opened", "evidence": "Second kitchen opening in Tampines announced", "date": "2026-10-20", "ref": "raw/research/harbourlight-foods/2026-10-20-site.md"}],
             recommendation={"chain": ["contract_win", "scale_up"], "product": "IT Care"}, next={"action": "Prep the brief for today's 15:00 meeting", "due": "today"},
             refs=["wiki/accounts/harbourlight-foods.md"]))
f.end(12000, 0.03, "ep2-hot")

f = F("/company-check 197200078R")
f.tool("Skill", {"skill": "company-check"}, wait=3)
f.tool("Bash", {"command": "python3 company-check/check.py 197200078R --json", "description": "Registry checks: ACRA, filings, address, staff"})
f.agents([
    ("verifier", "Identity: SINGAPORE AIRLINES LIMITED", ["Searching the web: official site and address", "Registered office matches the registry", "3 sources saved"]),
    ("verifier", "People: SINGAPORE AIRLINES LIMITED", ["Searching the web: annual report headcount", "Staff well above 3", "2 sources saved"]),
    ("verifier", "Risk: SINGAPORE AIRLINES LIMITED", ["Searching the web: fraud and scam warnings", "Only impersonation warnings, no adverse findings", "4 sources saved"]),
], steps=3)
f.say("**Likely legitimate, 80/100.** Live with ACRA since 1972, a real office, a large workforce. One warning: this year's annual return isn't in the latest registry data yet.\n\n"
      + view("verdict", "SINGAPORE AIRLINES LIMITED", "company-check/reports/2026-11-05-197200078R.json", [
          {"id": "root", "component": "Column", "children": ["v", "c"]},
          {"id": "v", "component": "Verdict", "verdict": {"path": "/verdict"}, "score": {"path": "/score"}, "subtitle": {"path": "/dataset"}},
          {"id": "c", "component": "CheckList", "checks": {"path": "/checks"}}], agent="researcher"))
f.end(64000, 0.21, "ep2-check")

f = F("How many clinics are there in Singapore, and how healthy are they?")
f.tool("Skill", {"skill": "company-insights"}, wait=3)
f.tool("Bash", {"command": "python3 company-check/insights.py segment clinics --json", "description": "Clinic segment from the company registry"})
f.say("**9,618 live clinics** in Singapore. Most file on time, and about one in six uses a shared or virtual address: check those before you call.\n\n"
      + view("seg", "Singapore clinics", "company-check/reports/insights-clinics-2026-11-16.json", [
          {"id": "root", "component": "Column", "children": ["m", "y"]},
          {"id": "m", "component": "StatGrid", "items": {"path": "/sections/overview/items"}},
          {"id": "y", "component": "LineChart", "data": {"path": "/sections/by_year/items"}, "area": True}], agent="researcher"))
f.end(26000, 0.06, "ep2-segment")

f = F("Get me more accounts")
f.tool("Skill", {"skill": "mama-target"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/claim.py --list --tier C --json", "description": "Open tier C accounts I may claim"})
f.say("You have **23 free slots**. Grace has already allocated your A and B accounts; these tier C accounts in SG are free to claim. Say **claim 1 and 2** and they're yours for 30 days.\n\n"
      + card("pool", "PlanCard", title="Free to claim · tier C · SG", agent="allocator", steps=[
          {"label": "1 · Lantern Lane Bakery · F&B · score 0.30", "status": "pending", "agent": "allocator"},
          {"label": "2 · Fernhill Tutors · services · score 0.32", "status": "pending", "agent": "allocator"},
          {"label": "3 · Dovetail Movers · logistics · score 0.32", "status": "pending", "agent": "allocator"}], refs=["knowledge/allocation.yaml"],
          actions=[{"label": "Claim 1 and 2", "prompt": "claim 1 and 2", "style": "primary"}]))
f.end(15000, 0.03, "ep2-target")

# ---------------- Episode 3 · Outreach that gets ignored
f = F("/mama-research nimbus-clinics")
f.tool("Skill", {"skill": "mama-research"}, wait=3)
f.agents([("researcher", "Research Nimbus Clinics", ["Reading wiki/accounts/nimbus-clinics.md", "Searching the web: nimbusclinics.example team", "Snapshot raw/research/nimbus-clinics/2026-11-16-team-page.md", "Contact: Daniel Ong, Operations Manager"])], steps=4)
f.tool("Edit", {"file_path": f"{ROOT}/wiki/accounts/nimbus-clinics.md"})
f.tool("Write", {"file_path": f"{ROOT}/wiki/contacts/daniel-ong-nimbus-clinics.md"})
f.say("Done. **Daniel Ong** runs operations for the three clinics: the right person for an IT conversation. The reason to reach out now: their **IT contract ends on 31 December**. Both facts link their source.\n\n"
      + card("acc", "AccountCard", title="Nimbus Clinics · researched", agent="researcher", **NB, tier="A", score=0.73, stage="contacted", owner="mei",
             signals=[{"term": "contract_ending", "evidence": "Current contract ends 2026-12-31", "date": "2026-10-20", "ref": "raw/crm/2026-10-20-demo-export.csv"}],
             next={"action": "Contact Daniel Ong, Operations Manager"},
             refs=["wiki/accounts/nimbus-clinics.md", "wiki/contacts/daniel-ong-nimbus-clinics.md", "raw/research/nimbus-clinics/2026-11-16-team-page.md"]))
f.end(58000, 0.14, "ep3-research")

f = F("What should I offer Nimbus?")
f.tool("Bash", {"command": "python3 scripts/recommend.py nimbus-clinics --json", "description": "Match the account's situation to our products"}, wait=6)
f.say("Offer **IT Care**. Their contract is ending, so they're reviewing support anyway; IT Care gives the three front desks one helpdesk, device setup and backups.\n\n"
      + card("rec", "AccountCard", title="What to offer", agent="vam", **NB, tier="A", score=0.73,
             recommendation={"chain": ["contract_ending", "renewal_window"], "product": "IT Care", "talk_track": "Before your contract ends, let's make sure all three clinics have one helpdesk and backups in place."},
             refs=["knowledge/products/it-care.yaml", "knowledge/ontology.yaml"], actions=[{"label": "Draft the follow-up", "prompt": "Draft follow-up 1 for Nimbus", "style": "primary"}]))
f.end(16000, 0.03, "ep3-pitch")

f = F("Draft follow-up 1 for Nimbus")
f.tool("Skill", {"skill": "mama-draft"}, wait=3)
f.tool("Grep", {"pattern": "nimbusclinics", "path": f"{ROOT}/wiki/suppression.csv"})
f.tool("Read", {"file_path": f"{ROOT}/wiki/responses/patterns"})
f.tool("Write", {"file_path": f"{ROOT}/wiki/drafts/2026-11-16-nimbus-clinics-fu1.md"})
f.say("Draft saved. It opens with **their** reason to talk, names only facts from the account page, and waits for you to approve it.\n\n"
      + card("draft", "DraftCard", title="Follow-up 1 · Nimbus Clinics", agent="writer", account="nimbus-clinics", to="daniel.ong@nimbusclinics.example", channel="email",
             subject="Before your IT contract ends in December", body="Hi Daniel, with your current IT contract ending on 31 December, this is a good moment to look at support for all three clinics before the new year. IT Care gives your front desks one helpdesk, device setup and backups. Would a 20-minute call next week help?",
             signal="contract_ending (2026-10-20)", pattern="renewal-window-fu1", passed=["owner ok", "not suppressed", "facts cited", "SG send window"], send_window="Tue 17 Nov, 09:00-11:30 SGT",
             refs=["wiki/accounts/nimbus-clinics.md", "wiki/contacts/daniel-ong-nimbus-clinics.md"], actions=[{"label": "Make it shorter", "prompt": "Make it shorter", "style": "secondary"}]))
f.end(31000, 0.07, "ep3-draft")

f = F("Draft the proposal follow-up for Seri Kasih on WhatsApp")
f.tool("Skill", {"skill": "mama-draft"}, wait=3)
f.tool("Read", {"file_path": f"{ROOT}/wiki/contacts/farid-rahman-seri-kasih-catering.md"})
f.tool("Read", {"file_path": f"{ROOT}/knowledge/markets.yaml"})
f.tool("Write", {"file_path": f"{ROOT}/wiki/drafts/2026-11-16-seri-kasih-catering-proposal.md"})
f.say("Farid opted in to WhatsApp for business, so this goes on **WhatsApp, in Malaysia's send window**. It follows up on the Klang outlet you discussed on 31 Oct.\n\n"
      + card("wa", "DraftCard", title="Proposal follow-up · Seri Kasih Catering", agent="writer", account="seri-kasih-catering", to="Farid Rahman · WhatsApp (opt-in)", channel="whatsapp",
             body="Hi Farid, thank you for Friday. As promised, here is the outline for the Klang outlet: Managed WiFi for both sites, set up before opening. Shall I walk you through it this week?",
             signal="new_branch_opened (2026-10-25)", pattern="proposal-follow-up", passed=["owner ok", "WhatsApp opt-in recorded", "facts cited", "MY send window"], send_window="Tue 17 Nov, 09:30-11:30 MYT",
             refs=["wiki/accounts/seri-kasih-catering.md", "wiki/contacts/farid-rahman-seri-kasih-catering.md"]))
f.end(29000, 0.06, "ep3-wa")

f = F("Check my replies")
f.tool("Skill", {"skill": "mama-replies"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/replies.py --json", "description": "Read new replies to my messages"})
f.say("1 new reply, sorted for you. **Daniel at Nimbus wants a call** and suggested Thursday 10:00.\n\n"
      + card("reply", "ReplyCard", title="Meeting request · Nimbus Clinics", agent="mama", account="nimbus-clinics", **{"from": "daniel.ong@nimbusclinics.example"}, **{"class": "meeting_request"},
             summary="Thanks for the note. Yes, let's talk before the renewal. Thursday 10:00 works for me.",
             refs=["wiki/accounts/nimbus-clinics.md"], actions=[{"label": "Book Thursday 10:00", "prompt": "/mama-schedule book @nimbus-clinics Thu 19 Nov 10:00 with Daniel Ong", "style": "primary"}]))
f.end(18000, 0.04, "ep3-replies")

# ---------------- Episode 4 · Meetings and follow-ups that slip
f = F("Book Nimbus Thursday 10:00 with Daniel")
f.tool("Skill", {"skill": "mama-schedule"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/appointments.py add --account nimbus-clinics --contact daniel-ong-nimbus-clinics --start \"2026-11-19 10:00\" --minutes 30 --kind call --dry-run --json", "description": "Check the slot first"})
f.say("Thu 19 Nov **10:00–10:30 SGT** is free: no clash, no holiday, inside working hours. Book it?\n\n"
      + view("slot", "Thursday 19 Nov", "wiki/books/mei.calendar.json", [
          {"id": "root", "component": "Column", "children": ["a", "go"]},
          {"id": "a", "component": "CalendarWeek", "calendar": {"path": "/"}, "start": "2026-11-16"},
          {"id": "go", "component": "ActionBar", "actions": [{"label": "Yes, book it", "prompt": "yes"}, {"label": "Make it 45 minutes", "prompt": "make it 45 minutes"}]}]))
f.end(15000, 0.03, "ep4-book")

f = F("Move the Quayside visit to Tuesday 14:00")
f.tool("Skill", {"skill": "mama-schedule"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/appointments.py reschedule apt-20261117-quayside-clinic-1 --start \"2026-11-17 14:00\" --dry-run --json", "description": "Check the new time"})
f.say("Tuesday 14:00 is clear, and it **fixes the clash** with the Evergreen demo at 10:00. Say yes and I'll move it.\n\n"
      + card("move", "PlanCard", title="Reschedule · Quayside Clinic", agent="mama", steps=[
          {"label": "Was Tue 17 Nov 10:30 · overlaps Evergreen Dental demo", "status": "failed", "agent": "mama"},
          {"label": "New Tue 17 Nov 14:00–14:45 · no clash, no holiday", "status": "done", "agent": "mama"}], refs=["log/appointments.csv"],
          actions=[{"label": "Yes, move it", "prompt": "yes", "style": "primary"}]))
f.end(12000, 0.03, "ep4-move")

f = F("/mama-handover harbourlight-foods: pilot agreed, start with Tampines in January")
f.tool("Skill", {"skill": "mama-handover"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/appointments.py held apt-20261116-harbourlight-foods-1 --json", "description": "Mark the meeting held"})
f.tool("Edit", {"file_path": f"{ROOT}/wiki/accounts/harbourlight-foods.md"})
f.tool("Bash", {"command": "python3 scripts/handover.py harbourlight-foods --json", "description": "Write the handover and CRM row"})
f.say("Logged. The meeting is marked **held**, the account page has the outcome, and your CRM update row is ready. The proposal review is already booked for **Tue 24 Nov 15:00**.\n\n"
      + card("ho", "BriefCard", title="Handover · Harbourlight Foods", agent="mama", subject="Meeting held Mon 16 Nov · Rachel Goh, Managing Director",
             sections=[{"heading": "Outcome", "bullets": ["Pilot agreed in principle", "Start with the Tampines kitchen in January"]},
                       {"heading": "Next steps", "bullets": ["Send the pilot outline by Fri 20 Nov", "Proposal review Tue 24 Nov 15:00 (booked)"]},
                       {"heading": "For the CRM", "bullets": ["Product: IT Care, then Managed WiFi"]}],
             refs=["wiki/accounts/harbourlight-foods.md", "log/appointments.csv"], actions=[{"label": "Draft the pilot outline", "prompt": "Draft the pilot outline for Harbourlight", "style": "primary"}]))
f.end(33000, 0.07, "ep4-handover")

# ---------------- Episode 5 · Managing blind
f = F("/mama-allocate")
f.tool("Skill", {"skill": "mama-allocate"}, wait=3)
f.tool("Bash", {"command": "python3 scripts/allocate.py --json", "description": "Propose a fair allocation"})
f.say("**5 new leads**, spread by score, free capacity, market and each rep's track record. Every row says why. Nothing is assigned until you approve.\n\n"
      + view("alloc", "Allocation · 16 Nov", "log/allocation/2026-11-16-2.json", [
          {"id": "root", "component": "Column", "children": ["g", "t", "go"]},
          {"id": "g", "component": "BarChart", "data": {"path": "/per_rep"}, "x": "rep", "y": ["A", "B", "C"], "stacked": True, "orientation": "horizontal", "height": 120},
          {"id": "t", "component": "DataTable", "rows": {"path": "/rows"}, "columns": [{"key": "name", "label": "Lead"}, {"key": "rep", "label": "To"}, {"key": "tier", "label": "Tier", "format": "tier"}, {"key": "reason", "label": "Why"}]},
          {"id": "go", "component": "ActionBar", "actions": [{"label": "Approve all", "prompt": "approve all"}, {"label": "Give row 3 to Mei", "prompt": "give row 3 to mei"}]}], agent="allocator"))
f.end(24000, 0.05, "ep5-allocate")
print("wrote", len(list(OUT.glob("ep*.jsonl"))), "episode fixtures")
