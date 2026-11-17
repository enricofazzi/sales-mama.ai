"""Five problem-led episodes, ~5 min each (130 bars at 104 BPM). Same effects template (player3 = player2 +
ask/compare/recap/title/epout) and the same score engine (music2.py).
Usage: python3 build3.py -> ep1.html … ep5.html, timeline-ep1.json …"""
import json
from pathlib import Path
from build2 import clipmap, BPM, BEAT, BAR, G, LI, RD, E
HERE = Path(__file__).parent
TOTAL = 130

def words_cold(eyebrow, lines, pains, punch):
    items = [dict(cls="eyebrow", text=eyebrow, at=.5, out=7.4, y=330)]
    for i, l in enumerate(lines): items.append(dict(cls="h1", text=l, at=2 + 2 * i, out=3.8 + 2 * i))
    items.append(dict(cls="h2", text=punch, at=24, out=31.6, y=400))
    return dict(type="words", bg="black", mus="intro", bars=8, items=items,
                pains=list(zip(pains, [180, 1060, 260, 1210, 720, 690], [210, 270, 760, 820, 130, 930])), pains_at=8.5, pains_out=22.5)

def stakes(a, b):
    return dict(type="words", bg="dark", mus="break", bars=4, items=[
        dict(cls="h2", text=a, at=.5, out=8.5, y=360), dict(cls="h3", text=b, at=8.8, out=15.7, y=420)])

def persona(name, sub):
    return dict(type="words", bg="light", mus="groove", bars=3, items=[
        dict(cls="h1", text=name, at=.3, out=11.6, y=380), dict(cls="sub", text=sub, at=1.5, out=11.6, y=560)])

def dev(media, h, sub, bars, layout="right", bg="light", mus="groove", pill=None, cam=None, spot=None):
    m = dict(still=media) if not media.startswith("@") else dict(clip=media[1:], at=.5)
    return dict(type="device", bg=bg, mus=mus, layout=layout, media=m, h=h, sub=sub, bars=bars, pill=pill, cam=cam or [], spot=spot or [], cap_at=1)

def push(x, y, z=1.6, at=3, dur=4): return [dict(at=at, dur=dur, z=z, x=x, y=y)]
def sp(r, at=4, out=None): return [dict(at=at, out=out or 99, r=r)]

def episode(n, title, cold, stk, per, steps, result, recap_h, outro_h, nxt):
    sc = [cold, stk,
          dict(type="title", bg="light", mus="groove", hit=True, bars=4, eyebrow=f"Episode {n} of 5", title=title, sub="How Sales Mama fixes it, step by step."),
          per]
    for i, st in enumerate(steps, 1):
        sc.append(dict(type="chapter", bg="black", mus="groove", hit=True, bars=1, num=f"STEP {i}", title=st["name"]))
        if st.get("prompt"):
            sc.append(dict(type="ask", bg="light", mus="groove", bars=3, who=st["who"], prompt=st["prompt"], sub=st.get("why", "")))
        for j, shot in enumerate(st["shots"]):
            shot = dict(shot); shot["pill"] = shot.get("pill") or f"Step {i} · {st['name']}"
            sc.append(shot)
    sc.append(dict(type="compare", bg="light", mus="lift", bars=8, h=result[0], before=result[1], after=result[2]))
    sc.append(dict(type="recap", bg="light", mus="groove", bars=6, eyebrow=f"Episode {n} · {title}", h=recap_h,
                   items=[(st["name"], st.get("recap", "")) for st in steps]))
    sc.append(dict(type="epout", bg="light", mus="outro", bars=6, h=outro_h, next=nxt))
    used = sum(s["bars"] for s in sc)
    # fit to exactly TOTAL bars: spread the difference over the device shots (largest first)
    diff = TOTAL - used
    shots = sorted([s for s in sc if s["type"] == "device"], key=lambda s: -s["bars"])
    k = 0
    while diff != 0 and shots:
        s = shots[k % len(shots)]
        if diff > 0: s["bars"] += 1; diff -= 1
        elif s["bars"] > 4: s["bars"] -= 1; diff += 1
        k += 1
        if k > 400: break
    return sc

EP = {}
# ---------------------------------------------------------------- 1
EP[1] = episode(1, "Where do I start?",
    words_cold("Monday · 8:40 am · Singapore", ["17 accounts.", "2 follow-ups overdue.", "A meeting at 3 pm."],
               ["Which lead is hot?", "Who's waiting on me?", "What do I say at 3 pm?", "The send window opens at 9", "Notes in five places", "Overdue follow-ups"],
               f"Where do I{'<br>'}{RD}start?{E}"),
    stakes(f"The first hour{'<br>'}{LI}sets the day.{E}", f"Spend it searching,{'<br>'}and the best leads wait."),
    persona("Meet Mei.", "Account executive · Singapore · 17 accounts"),
    [dict(name="See your day", recap="Today shows the next meeting and what needs you", shots=[
        dev("@today", f"Everything that{'<br>'}{G}needs you.{E}", "Your next meeting with a countdown, the send window, and the accounts to act on today.", 7, cam=push(402, 369, 1.7, 5, 3), spot=sp([229, 243, 575, 495], 5.5)),
        dev("today-needs", f"Only what{'<br>'}{G}matters today.{E}", "Follow-ups due, an account at risk, a brief to read. Each with one button.", 6, cam=push(720, 520, 1.35))]),
     dict(name="Let Mama do the legwork", who="Mei types", prompt="Run my day", why="One sentence. Sales Mama checks replies, refreshes every account and drafts what's due.",
          recap="Run my day: replies, accounts and drafts in one go", shots=[
        dev("@ep1-day", "It works while you get coffee.", "Replies checked, accounts refreshed, follow-ups drafted, all at once.", 8, layout="full", bg="dark", mus="lift", cam=[dict(at=7, dur=3, z=1.3, x=600, y=340), dict(at=15, dur=3, z=1, x=720, y=450)], spot=[dict(at=7.5, out=14.5, r=[251, 237, 951, 447])]),
        dev("ep1-day-end", f"A plan in{'<br>'}{G}plain words.{E}", "Start with the 3 pm meeting. Approve the Nimbus follow-up before the window opens.", 6, cam=push(600, 480, 1.45), spot=sp([240, 288, 962, 690]))]),
     dict(name="Know who needs you", who="Mei asks", prompt="Why is Nimbus at risk?", why="Ask about any account in plain English.",
          recap="Ask why: the reason, the source and the next best action", shots=[
        dev("@ep1-risk", f"The reason,{'<br>'}{G}not just a score.{E}", "Their IT contract ends on 31 December and there's no plan yet.", 6),
        dev("ep1-risk-end", f"And the{'<br>'}{LI}next best action.{E}", "Send follow-up 1 today and mention the December contract end.", 6, cam=push(600, 500, 1.6), spot=sp([250, 470, 960, 580]))]),
     dict(name="Walk in prepared", who="Mei asks", prompt="Brief me on Harbourlight Foods", why="A one-page brief before every meeting.",
          recap="A brief before every meeting", shots=[
        dev("@ep1-brief", f"Why now. What to offer.{'<br>'}{G}What to ask.{E}", "Built from the account page: the new contract, the second kitchen, the objection she raised.", 7),
        dev("ep1-brief-end", f"Even the{'<br>'}{G}watch-outs.{E}", "She said they already have a provider. Ask what they'd change.", 5, cam=push(600, 520, 1.6), spot=sp([250, 495, 960, 580]))]),
     dict(name="Send at the right time", who="Mei types", prompt="Send my drafts", why="Every draft is checked before anything goes out. You approve each one.",
          recap="Approve and send inside the market's window", shots=[
        dev("@ep1-send", f"Nothing goes out{'<br>'}{LI}until you approve.{E}", "Checked for unsubscribes, sources and the send window. The draft without a contact is held.", 6, bg="dark", mus="lift"),
        dev("ep1-send-end", f"Sent from{'<br>'}{G}your own mailbox.{E}", "Reply “send 1” and it goes at 9:05, inside the Singapore window.", 5, cam=push(600, 420, 1.5), spot=sp([240, 320, 962, 500]))])],
    ("The difference by 9 am.", ["An hour sorting the inbox", "Walking into 3 pm cold", "A follow-up that slips a week"],
     ["A plan before the send window opens", "A brief ready for 3 pm", "The follow-up approved and sent at 9"]),
    "Five steps to a better morning.", f"Start every day{'<br>'}{G}knowing where to start.{E}", "Episode 2 · Chasing the wrong leads")

# ---------------------------------------------------------------- 2
EP[2] = episode(2, "Chasing the wrong leads",
    words_cold("Prospecting · Monday", ["A list of names.", "No reason to call.", "Some don't exist."],
               ["Cold lists", "Companies that closed", "No reason to buy now", "Calling the wrong person", "Guessing who's hot", "Same list as everyone"],
               f"Who's actually{'<br>'}{RD}ready to buy?{E}"),
    stakes(f"Every wrong call{'<br>'}{LI}costs a right one.{E}", f"Time spent on dead leads is time{'<br>'}your best buyers never get."),
    persona("Mei and Grace.", "A rep and her manager · finding the next customers"),
    [dict(name="Wake up to reasons to call", who="Mei asks", prompt="What changed overnight?", why="Every night Sales Mama reads news, tenders and company registries in SG, MY and IN.",
          recap="Overnight signals, matched to your accounts", shots=[
        dev("@ep2-overnight", f"While you slept,{'<br>'}{G}the market moved.{E}", "64 updates scanned overnight. 21 matched to accounts. 5 new leads found.", 7),
        dev("ep2-overnight-end", f"Your accounts{'<br>'}{LI}that moved.{E}", "Harbourlight and Nimbus rose to the top. Everything else is quiet.", 6, cam=push(600, 500, 1.5), spot=sp([240, 400, 962, 600]))]),
     dict(name="See why a lead is hot", who="Mei asks", prompt="Why is Harbourlight hot?", why="Every score comes with its reasons, and every reason links its source.",
          recap="Why a lead is hot, with sources", shots=[
        dev("@ep2-hot", f"Real reasons{'<br>'}{G}to call now.{E}", "A new school-canteen contract and a second kitchen in Tampines.", 6),
        dev("ep2-hot-end", f"Each one{'<br>'}{LI}with a source.{E}", "Click to read the tender notice or the company's own announcement.", 6, cam=push(600, 510, 1.7), spot=sp([250, 455, 960, 560]))]),
     dict(name="Check it's a real business", who="Mei types", prompt="/company-check 197200078R", why="Type a company's UEN or name. Sales Mama checks the official registry and the web.",
          recap="Check any company before you call", shots=[
        dev("@ep2-check", f"Three checks{'<br>'}{G}at once.{E}", "Identity, people and risk, each checked in parallel on the open web.", 8, layout="full", bg="dark", mus="lift", cam=[dict(at=6, dur=3, z=1.3, x=600, y=330), dict(at=14, dur=3, z=1, x=720, y=450)]),
        dev("company", f"A clear verdict,{'<br>'}{G}every check shown.{E}", "Live with ACRA, filing on time, a real office, more than 3 staff.", 6, cam=push(480, 470, 1.5))]),
     dict(name="Find more like your best customers", who="Mei asks", prompt="How many clinics are there in Singapore, and how healthy are they?", why="Ask about a whole market and get the numbers from the official registry.",
          recap="Size a segment before you prospect it", shots=[
        dev("@ep2-segment", f"Size the market{'<br>'}{G}in seconds.{E}", "9,618 live clinics in Singapore, with filing health and growth by year.", 6),
        dev("canvas-insights", f"Know where{'<br>'}{LI}to look first.{E}", "About one in six uses a shared or virtual address: check those before calling.", 6, cam=push(1135, 430, 1.6))]),
     dict(name="Claim the right ones", who="Mei types", prompt="Get me more accounts", why="Your manager assigns the best leads. You can claim more from the pool when you have room.",
          recap="Claim more when you have room", shots=[
        dev("@ep2-target", f"Fill your book{'<br>'}{G}fairly.{E}", "23 free slots. Tier C accounts are open to claim; A and B come from your manager.", 6),
        dev("ep2-target-end", f"One line{'<br>'}{LI}to claim.{E}", "“Claim 1 and 2” and they're yours for 30 days.", 5, cam=push(600, 440, 1.5), spot=sp([240, 335, 962, 545]))])],
    ("From cold lists to ready buyers.", ["Calling names from a cold list", "Pitching companies that closed", "Guessing who's hot"],
     ["A reason to call, with a source", "Every company checked first", "Hot accounts at the top every morning"]),
    "Five steps to better leads.", f"Spend your time on buyers{'<br>'}{G}who are ready.{E}", "Episode 3 · Outreach that gets ignored")

# ---------------------------------------------------------------- 3
EP[3] = episode(3, "Outreach that gets ignored",
    words_cold("Monday · the outbox", ["“Dear Sir/Madam,”", "“Just checking in…”", "Sent at 11:48 pm."],
               ["Same email to everyone", "No reason to reply", "Wrong person", "Wrong time zone", "Unsubscribes ignored", "Replies lost in the inbox"],
               f"Why does nobody{'<br>'}{RD}reply?{E}"),
    stakes(f"Buyers answer{'<br>'}{LI}about their business.{E}", f"At the right moment,{'<br>'}from someone who did the homework."),
    persona("Mei and Arun.", "Account executives · Singapore, Malaysia and India"),
    [dict(name="Find the right person", who="Mei types", prompt="/mama-research nimbus-clinics", why="Sales Mama researches the account and saves every fact with its source.",
          recap="Research: the right person and the reason, cited", shots=[
        dev("@ep3-research", f"Homework,{'<br>'}{G}done for you.{E}", "Who runs operations, and why they'd talk now. Each fact saved with its source.", 8, layout="full", bg="dark", cam=[dict(at=6, dur=3, z=1.35, x=600, y=330), dict(at=14, dur=3, z=1, x=720, y=450)]),
        dev("ep3-research-end", f"Daniel Ong,{'<br>'}{G}Operations Manager.{E}", "The right person, and the reason: the IT contract ends on 31 December.", 5, cam=push(600, 430, 1.4))]),
     dict(name="Know what to offer", who="Mei asks", prompt="What should I offer Nimbus?", why="Sales Mama only recommends your own products, and shows why.",
          recap="Offer what fits their situation", shots=[
        dev("@ep3-pitch", f"The offer that{'<br>'}{G}fits their moment.{E}", "Contract ending → time to review support → IT Care.", 6),
        dev("ep3-pitch-end", f"With a line{'<br>'}{LI}you can say.{E}", "“Before your contract ends, let's make sure all three clinics have one helpdesk.”", 5, cam=push(600, 500, 1.6), spot=sp([250, 430, 962, 600]))]),
     dict(name="Write about them, not you", who="Mei types", prompt="Draft follow-up 1 for Nimbus", why="A draft that opens with their reason to talk, in your voice.",
          recap="Drafts that open with their reason", shots=[
        dev("@ep3-draft", f"Their reason{'<br>'}{G}in the first line.{E}", "Only facts from the account page. No invented claims.", 6),
        dev("ep3-draft-end", f"Checked before{'<br>'}{LI}you see it.{E}", "Not unsubscribed, facts cited, inside the Singapore send window.", 6, cam=push(600, 460, 1.45), spot=sp([240, 270, 965, 640]))]),
     dict(name="Right channel, right hour", who="Arun asks", prompt="Draft the proposal follow-up for Seri Kasih on WhatsApp", why="WhatsApp only for contacts who opted in, and only inside each market's window.",
          recap="WhatsApp with opt-in, in each market's window", shots=[
        dev("@ep3-wa", f"WhatsApp in Malaysia.{'<br>'}{G}With consent.{E}", "Farid opted in for business messages. It goes out between 09:30 and 11:30 MYT.", 7),
        dict(type="markets", bg="light", mus="lift", bars=5, h=f"Three markets.{'<br>'}{G}Their hours.{E}", sub="Each market's time zone, send window, holidays and channels, applied for you.")]),
     dict(name="Catch every reply", who="Mei types", prompt="Check my replies", why="Replies are read and sorted: interested, meeting request, not now, unsubscribe.",
          recap="Replies sorted, meetings one click away", shots=[
        dev("@ep3-replies", f"“Thursday 10:00{'<br>'}{G}works for me.”{E}", "Daniel wants a call. Sales Mama spotted it and suggests the booking.", 6, mus="lift"),
        dev("ep3-replies-end", f"From reply{'<br>'}{LI}to meeting.{E}", "One click books Thursday 10:00. Unsubscribes are honoured at once.", 5, cam=push(600, 430, 1.5), spot=sp([240, 300, 965, 540]))])],
    ("Messages that get answers.", ["One template for everyone", "Sent whenever, in any time zone", "Replies lost in the inbox"],
     ["Every message opens with their reason", "Sent in each market's window", "Replies sorted, meetings booked"]),
    "Five steps to replies.", f"Messages people{'<br>'}{G}want to answer.{E}", "Episode 4 · Meetings that slip")

# ---------------------------------------------------------------- 4
EP[4] = episode(4, "Meetings and follow-ups that slip",
    words_cold("“Thursday works for me.”", ["Nobody booked it.", "Two meetings at 10:30.", "A renewal date passed."],
               ["Forgotten follow-ups", "Double bookings", "Renewals missed", "No notes after the meeting", "CRM never updated", "Holidays forgotten"],
               f"Deals die{'<br>'}{RD}between meetings.{E}"),
    stakes(f"A deal moves only as fast{'<br>'}{LI}as its next step.{E}", f"Miss one, and the buyer{'<br>'}moves on."),
    persona("Mei's week.", "9 appointments · 2 follow-ups · 6 renewal dates"),
    [dict(name="Turn a reply into a meeting", who="Mei types", prompt="Book Nimbus Thursday 10:00 with Daniel", why="Sales Mama checks clashes, holidays and working hours first, then asks you.",
          recap="Book from a sentence, checked first", shots=[
        dev("@ep4-book", f"Checked before{'<br>'}{G}it's booked.{E}", "Free slot, no clash, no holiday, inside working hours. You say yes.", 6),
        dev("ep4-book-end", f"Straight onto{'<br>'}{LI}your week.{E}", "The meeting lands on your calendar and in the account's history.", 5, cam=push(600, 480, 1.4))]),
     dict(name="See your whole week", recap="One calendar for meetings, follow-ups and renewals", shots=[
        dev("@calfix", f"One calendar{'<br>'}{G}for the whole pipeline.{E}", "Meetings, follow-ups, renewal windows and holidays together.", 8, layout="full", mus="lift"),
        dev("cal-week", f"Clashes{'<br>'}{LI}flagged.{E}", "Tuesday's demo overlaps the Quayside site visit. You see it now, not at 10:30.", 6, cam=push(425, 450, 1.9), spot=sp([330, 415, 520, 490]))]),
     dict(name="Fix clashes in one line", who="Mei types", prompt="Move the Quayside visit to Tuesday 14:00", why="Or drag it on the calendar. Sales Mama checks the new slot before it moves.",
          recap="Move meetings by asking, or by dragging", shots=[
        dev("@ep4-move", f"Moved,{'<br>'}{G}clash gone.{E}", "The new time is checked for clashes and holidays first.", 6),
        dict(type="device", bg="light", mus="groove", layout="full", media=dict(clip="calendar", at=.2, from_=2.4), h="Or just drag it.", sub="Drop it on a new slot, confirm, done.", bars=6, cam=[], spot=[], cap_at=.5)]),
     dict(name="Never miss a renewal", recap="Renewals and busy times, never missed", shots=[
        dev("cal-renewal", f"Renewal windows,{'<br>'}{G}before they close.{E}", "Harbourlight's renewal window opens Tuesday. Brief me, or book the call.", 6, cam=push(1265, 260, 1.7), spot=sp([1100, 70, 1432, 430])),
        dev("cal-busy", f"Your Google Calendar,{'<br>'}{LI}busy times only.{E}", "No titles, no attendees. Sales Mama never books over your own commitments.", 6, cam=push(1265, 240, 1.7), spot=sp([1100, 70, 1432, 400]))]),
     dict(name="Log it in one line", who="Mei types", prompt="/mama-handover harbourlight-foods: pilot agreed, start with Tampines in January", why="After the meeting, one sentence updates the account, the calendar and your CRM row.",
          recap="Log the outcome; the next step is booked", shots=[
        dev("@ep4-handover", f"Outcome logged.{'<br>'}{G}Next step booked.{E}", "Meeting marked held. Proposal review already on the calendar for 24 Nov.", 7, mus="lift"),
        dev("ep4-handover-end", f"Your CRM row,{'<br>'}{LI}ready.{E}", "No retyping notes at 6 pm.", 5, cam=push(600, 470, 1.4))])],
    ("Every deal keeps moving.", ["Replies that never became meetings", "Clashes found too late", "Renewals noticed after the date"],
     ["A reply becomes a booked meeting", "Clashes flagged before you commit", "Renewals and follow-ups on your calendar"]),
    "Five steps to a pipeline that moves.", f"Keep every deal{'<br>'}{G}moving.{E}", "Episode 5 · Managing blind")

# ---------------------------------------------------------------- 5
EP[5] = episode(5, "Managing blind",
    words_cold("Friday · 5 pm", ["Who's overloaded?", "Who got the good leads?", "What's working?"],
               ["Leads handed out by gut feel", "Reports built by hand", "No view of the team's week", "Hot leads sitting idle", "Coaching by guesswork", "Three markets, three time zones"],
               f"Managing a team{'<br>'}{RD}you can't see.{E}"),
    stakes(f"Small teams win{'<br>'}{LI}on focus.{E}", f"The right lead, to the right rep,{'<br>'}at the right time."),
    persona("Meet Grace.", "Sales manager · 3 reps · Singapore, Malaysia and India"),
    [dict(name="One view every morning", who="Grace types", prompt="Morning cockpit", why="Last night's results, the team's numbers and anything that needs her decision.",
          recap="One morning view of the whole team", shots=[
        dev("@manager", f"The whole team{'<br>'}{G}before 9 am.{E}", "Last night's run, this week's funnel, and decisions waiting for her.", 7),
        dev("manager-end", f"Decide in{'<br>'}{LI}one line.{E}", "“1 is a match” confirms a news story belongs to Harbourlight Foods.", 6, cam=push(600, 560, 1.5), spot=sp([240, 440, 962, 690]))]),
     dict(name="Hand out leads fairly", who="Grace types", prompt="/mama-allocate", why="A proposal based on score, free capacity, market and each rep's track record.",
          recap="Fair allocation with a reason for every lead", shots=[
        dev("@ep5-allocate", f"Every lead,{'<br>'}{G}with a reason.{E}", "Who gets what, and why. Nothing is assigned until Grace approves.", 8, layout="full", mus="lift"),
        dev("canvas-alloc", f"Fair by design.{'<br>'}{LI}Checked every time.{E}", "Capacity, territory and suppression rules hold on every row.", 6, cam=push(1130, 420, 1.45))]),
     dict(name="See the team's week", recap="Every rep's week, clashes in red", shots=[
        dev("cal-team", f"Every rep's week.{'<br>'}{G}At a glance.{E}", "Load per day, and double bookings in red before a customer notices.", 7, cam=push(520, 330, 1.8), spot=sp([444, 360, 598, 430])),
        dev("mgr-today", f"Three markets,{'<br>'}{LI}one screen.{E}", "Live send windows for Singapore, Malaysia and India.", 5, cam=push(700, 330, 1.4))]),
     dict(name="Coach from what works", who="Grace types", prompt="/mama-weekly", why="The weekly review: funnel, reply rates and which rep converts which industry.",
          recap="A weekly review to coach from", shots=[
        dev("canvas-weekly", f"What's working,{'<br>'}{G}by rep and industry.{E}", "Coach with numbers, not guesswork.", 7, cam=push(1130, 520, 1.5)),
        dev("canvas-insights", f"Ask any question{'<br>'}{LI}of the market.{E}", "Charts and tables from your own data and official registries.", 5, cam=push(1135, 430, 1.4))]),
     dict(name="Share it in one click", recap="Every report saved and shareable", shots=[
        dev("@reports", f"Every report,{'<br>'}{G}saved.{E}", "Weekly reviews, allocations, company checks and insights, in one place.", 6, mus="lift"),
        dev("reports", f"Share as a page.{'<br>'}{LI}No spreadsheet.{E}", "Send the weekly review to the founder in one click.", 5, cam=push(500, 420, 1.35))])],
    ("A team you can see.", ["Leads handed out by gut feel", "Overloaded reps, idle leads", "Reports built by hand on Friday"],
     ["Every assignment explained and approved", "Every rep's week at a glance", "The weekly review, ready to share"]),
    "Five steps to a team you can see.", f"Lead the team{'<br>'}{G}you can see.{E}", None)

if __name__ == "__main__":
    cm = clipmap(); tpl = (HERE / "player3.html").read_text()
    for n, scs in EP.items():
        t = 0.0; out = []
        for i, s in enumerate(scs):
            s = dict(s); s.update(id=f"s{i}", key=s["type"], start=round(t, 4), end=round(t + s["bars"] * BAR, 4)); out.append(s); t += s["bars"] * BAR
        tl = {"bpm": BPM, "beat": BEAT, "bar": BAR, "duration": round(t + BAR * .5, 4), "scenes": out}
        (HERE / f"timeline-ep{n}.json").write_text(json.dumps(tl, indent=1))
        used = {s["media"].get("clip") for s in out if s.get("media")} - {None}
        (HERE / f"ep{n}.html").write_text(tpl.replace("__TIMELINE__", json.dumps(tl)).replace("__CLIPS__", json.dumps({k: v for k, v in cm.items() if k in used})))
        print(f"ep{n}: {len(out)} scenes, {sum(s['bars'] for s in out)} bars, {tl['duration']:.1f}s")
