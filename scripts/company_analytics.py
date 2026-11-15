"""Company insights: statistics, charts and summaries on the registry index (generative UI for chat).

    python3 scripts/company_analytics.py company 197200078R          # one company: profile, checks, peers, evidence
    python3 scripts/company_analytics.py segment --industry clinics  # or --ssic 86 / --district 52 / --name kopi
    python3 scripts/company_analytics.py book --owner me             # or --pool / --file leads.csv
    python3 scripts/company_analytics.py compare 197200078R 199701833R 201900002D
  prints the report data as JSON; add --out <path> to also save it for the console.

Every number is computed here from company-check/data/registry.sqlite (ACRA, BCA, GeBIZ, HDB open data,
as of the ACRA data date), saved reports and evidence. The model only explains; it never invents figures.
This script is a tool: it returns data sections, never charts or layout. The console draws them as A2UI
surfaces bound to the saved file; plain chat gets markdown written by the agent (ADR-0009, docs/UI.md).

Output: {title, summary[], as_of, licence, order[], sections{id: section}}. Section kinds:
  metrics  items[{key, label, value, unit?, note?, status: good|warn|risk|neutral}]
  series   dimension time|ordinal|category, unit, items[{label, value}], note?
  rows     columns[{key, label, numeric?}], rows[], next[{label, prompt}]?
  company  uen, status, verdict, score, facts{}, groups[{name, checks[]}]
  compare  companies[{uen, name, verdict, score}], rows[{check, values[{result, text}]}]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import company_check as cc  # noqa: E402
import mama_common as mc  # noqa: E402
import registry_data as rd  # noqa: E402

GROUPS = (("Registry", ("G", "C")), ("Address", ("P",)), ("People", ("E",)), ("Outside signals", ("A",)),
          ("Red flags", ("R",)))
AGE_BANDS = ((0, 1, "< 1 yr"), (1, 3, "1–3 yrs"), (3, 5, "3–5 yrs"), (5, 10, "5–10 yrs"), (10, 20, "10–20 yrs"),
             (20, 999, "20+ yrs"))
NO_AR = cc.NO_AR


# ----------------------------------------------------------------------------
# Data helpers
# ----------------------------------------------------------------------------
class Ctx:
    def __init__(self, root: Path):
        self.root = root
        self.cfg = rd.config(root)
        self.con = cc.connect(root)
        meta = dict(self.con.execute("SELECT key, value FROM meta").fetchall())
        self.as_of = mc.to_date(str(meta.get("acra_updated") or "")[:10]) or mc.today()
        self.f = self.cfg.get("filters") or {}
        self._hdb = None
        self._gebiz = None
        self._bca = None

    @property
    def hdb(self) -> set[str]:
        if self._hdb is None:
            self._hdb = {r[0] for r in self.con.execute(
                "SELECT key FROM hdb WHERE residential LIKE 'Y%' AND commercial NOT LIKE 'Y%'")}
        return self._hdb

    @property
    def gebiz(self) -> set[str]:
        if self._gebiz is None:
            since = (self.as_of - dt.timedelta(days=365 * int(self.f.get("gebiz_years", 3)))).isoformat()
            self._gebiz = {r[0] for r in self.con.execute("SELECT DISTINCT name_norm FROM gebiz WHERE award_date >= ?",
                                                         (since,))}
        return self._gebiz

    @property
    def bca(self) -> set[str]:
        if self._bca is None:
            self._bca = {r[0] for r in self.con.execute("SELECT DISTINCT uen FROM bca WHERE expiry >= ?",
                                                       (self.as_of.isoformat(),))}
        return self._bca

    def licence(self) -> str:
        return rd.LICENCE.format(what="ACRA, BCA, GeBIZ and HDB datasets", date=self.as_of.isoformat())


def rows_where(ctx: Ctx, where: str, params: list) -> list[dict]:
    sql = ("SELECT l.*, COALESCE(a.n, 0) AS same_addr FROM live l LEFT JOIN address_counts a ON a.key = "
           "(l.postal || '|' || UPPER(LTRIM(l.level, '0')) || '|' || UPPER(LTRIM(l.unit, '0'))) WHERE " + where)
    return [dict(r) for r in ctx.con.execute(sql, params)]


def age_years(ctx: Ctx, r: dict) -> float | None:
    d = mc.to_date(r.get("reg_date"))
    return (ctx.as_of - d).days / 365.25 if d else None


def files_on_time(ctx: Ctx, r: dict) -> bool | None:
    """True/False for companies that file annual returns; None when not applicable (sole props, new)."""
    if any(x in (r.get("entity_type") or "").lower() for x in NO_AR):
        return None
    age = age_years(ctx, r)
    if age is not None and age * 12 < float(ctx.f.get("new_company_months", 19)):
        return None
    ar = mc.to_date(r.get("ar_date"))
    return bool(ar and (ctx.as_of - ar).days / 30.44 <= float(ctx.f.get("annual_return_months", 13)))


def is_home(ctx: Ctx, r: dict) -> bool:
    return bool(r.get("block") and r.get("street")) and \
        (rd.norm_block(r["block"]) + "|" + rd.norm_street(r["street"])) in ctx.hdb


def pct(n: int, d: int) -> float:
    return round(100.0 * n / d, 1) if d else 0.0


def metrics(ctx: Ctx, rows: list[dict]) -> dict:
    ages = [a for a in (age_years(ctx, r) for r in rows) if a is not None]
    filing = [x for x in (files_on_time(ctx, r) for r in rows) if x is not None]
    shared = int(ctx.f.get("shared_address_warn", 20))
    return {"count": len(rows),
            "median_age": round(statistics.median(ages), 1) if ages else None,
            "on_time_pct": pct(sum(filing), len(filing)), "filers": len(filing),
            "shared_pct": pct(sum(1 for r in rows if r["same_addr"] >= shared), len(rows)),
            "home_pct": pct(sum(1 for r in rows if is_home(ctx, r)), len(rows)),
            "gebiz": sum(1 for r in rows if r["name_norm"] in ctx.gebiz),
            "bca": sum(1 for r in rows if r["uen"] in ctx.bca),
            "median_officers": statistics.median([r["officers"] or 0 for r in rows]) if rows else None}


def status(value: float, good: float, warn: float, higher_is_good: bool = True) -> str:
    if higher_is_good:
        return "good" if value >= good else ("warn" if value >= warn else "risk")
    return "good" if value <= good else ("warn" if value <= warn else "risk")


# ----------------------------------------------------------------------------
# Section builders (data only; the console chooses how to draw them)
# ----------------------------------------------------------------------------
def section(kind: str, title: str, refs: list[str] | None = None, **fields) -> dict:
    return {"kind": kind, "title": title, **fields, "refs": refs or ["company-check/README.md"]}


def series(title: str, dimension: str, items: list[dict], unit: str = "companies", **extra) -> dict:
    return section("series", title, dimension=dimension, unit=unit, items=items, **extra)


def rows_section(title: str, columns: list[tuple], rows: list[dict], **extra) -> dict:
    """columns: (key, label) or (key, label, numeric)."""
    cols = [{"key": c[0], "label": c[1], **({"numeric": True} if len(c) > 2 and c[2] else {})} for c in columns]
    return section("rows", title, columns=cols, rows=rows, **extra)


def spec_of(title: str, summary: list[str], parts: list[tuple[str, dict]]) -> dict:
    return {"title": title, "summary": summary, "order": [k for k, _ in parts], "sections": dict(parts)}


def metrics_section(ctx: Ctx, title: str, m: dict, subtitle: str = "") -> dict:
    items = [{"key": "count", "label": "Live companies", "value": m["count"], "status": "neutral"},
             {"key": "median_age", "label": "Median age", "value": m["median_age"], "unit": "yrs", "status": "neutral"},
             {"key": "on_time_pct", "label": "Filing on time", "value": m["on_time_pct"], "unit": "%",
              "note": f"of {m['filers']:,} that file annual returns", "status": status(m["on_time_pct"], 85, 70)},
             {"key": "shared_pct", "label": "Shared / virtual address", "value": m["shared_pct"], "unit": "%",
              "status": status(m["shared_pct"], 10, 25, higher_is_good=False)},
             {"key": "home_pct", "label": "Home-based (HDB)", "value": m["home_pct"], "unit": "%", "status": "neutral"},
             {"key": "gebiz", "label": "GeBIZ suppliers", "value": m["gebiz"], "note": "award in 3 yrs",
              "status": "good" if m["gebiz"] else "neutral"},
             {"key": "bca", "label": "BCA contractors", "value": m["bca"], "status": "good" if m["bca"] else "neutral"}]
    return section("metrics", title, subtitle=subtitle or f"ACRA data as of {ctx.as_of}", items=items)


def by_year_chart(ctx: Ctx, rows: list[dict], title: str) -> dict:
    years = list(range(ctx.as_of.year - 9, ctx.as_of.year + 1))
    counts = {y: 0 for y in years}
    for r in rows:
        d = mc.to_date(r.get("reg_date"))
        if d and d.year in counts:
            counts[d.year] += 1
    return series(title, "time", [{"label": str(y), "value": counts[y]} for y in years],
                  note=f"still live today, by year registered ({ctx.as_of.year} is year to date)")


def age_chart(ctx: Ctx, rows: list[dict]) -> dict:
    counts = [0] * len(AGE_BANDS)
    for r in rows:
        a = age_years(ctx, r)
        if a is None:
            continue
        for i, (lo, hi, _) in enumerate(AGE_BANDS):
            if lo <= a < hi:
                counts[i] += 1
                break
    return series("How old are they?", "ordinal", [{"label": b[2], "value": c} for b, c in zip(AGE_BANDS, counts)])


def mix_series(rows: list[dict], key: str, title: str, top: int = 6) -> dict:
    counts: dict[str, int] = {}
    for r in rows:
        k = r.get(key) or "(blank)"
        counts[k] = counts.get(k, 0) + 1
    items = sorted(counts.items(), key=lambda x: -x[1])
    out = [{"label": k, "value": v} for k, v in items[:top]]
    if len(items) > top:
        out.append({"label": "Other", "value": sum(v for _, v in items[top:])})
    return series(title, "category", out, share_of_total=True)


def ssic_series(rows: list[dict], top: int = 8) -> dict:
    """Group by SSIC code (descriptions are often blank or vary); label with the most common description."""
    counts: dict[str, int] = {}
    descs: dict[str, dict[str, int]] = {}
    for r in rows:
        code = r.get("ssic") or "?"
        counts[code] = counts.get(code, 0) + 1
        if r.get("ssic_desc"):
            d = descs.setdefault(code, {})
            d[r["ssic_desc"]] = d.get(r["ssic_desc"], 0) + 1
    items = sorted(counts.items(), key=lambda x: -x[1])
    def name(code: str) -> str:
        d = descs.get(code)
        return f"{code} {max(d, key=d.get).title()}" if d else f"SSIC {code}"
    out = [{"label": name(k)[:60], "value": v} for k, v in items[:top]]
    if len(items) > top:
        out.append({"label": "Other", "value": sum(v for _, v in items[top:])})
    return series("Top activities (primary SSIC)", "category", out)


def district_series(rows: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for r in rows:
        p = r.get("postal") or ""
        if len(p) >= 2:
            counts[p[:2]] = counts.get(p[:2], 0) + 1
    items = sorted(counts.items(), key=lambda x: -x[1])[:10]
    return series("Where they are (postal sector)", "category", [{"label": f"Sector {k}", "value": v} for k, v in items],
                  note="first two digits of the registered postal code")


# ----------------------------------------------------------------------------
# Questions
# ----------------------------------------------------------------------------
def latest_report(root: Path, uen: str) -> dict | None:
    files = sorted((root / "company-check" / "reports").glob(f"*-{uen}.json"))
    if not files:
        return None
    try:
        return json.loads(mc.read_text(files[-1])) | {"report_file": mc.rel_posix(files[-1].with_suffix(".md"), root)}
    except ValueError:
        return None


def evidence_list(root: Path, uen: str) -> list[dict]:
    out = []
    for p in sorted((root / "company-check" / "evidence" / uen).glob("*.md")) if uen else []:
        text = mc.read_text(p)
        head = re.search(r"^#\s+(.+)$", text, re.M)
        date = re.search(r"^- Date:\s*(.+)$", text, re.M)
        sup = re.search(r"^- Supports:\s*(.+)$", text, re.M)
        out.append({"date": (date.group(1) if date else "")[:20], "headline": (head.group(1) if head else p.stem)[:90],
                    "supports": (sup.group(1) if sup else "")[:40], "file": mc.rel_posix(p, root)})
    return out


def company_section(res: dict) -> dict:
    by = {c["id"]: c for c in res.get("checks", [])}
    groups = []
    for name, prefixes in GROUPS:
        checks = [{"id": c["id"], "check": c["check"], "result": c["result"], "detail": c["detail"][:160]}
                  for cid, c in by.items() if cid[0] in prefixes]
        if checks:
            groups.append({"name": name, "checks": checks})
    vend = (res.get("evidence") or {}).get("vendor") or []
    facts = {"Entity type": res.get("entity_type", ""), "Registered": res.get("registered", ""),
             "Activity": res.get("ssic", ""), "Address": res.get("address", "")}
    if vend:
        facts["Vendor headcount"] = f"{vend[0].get('employees', '')} ({vend[0].get('name', '')}, estimate)"
    refs = [x for x in [res.get("report_file"), "company-check/README.md"] if x]
    return section("company", res.get("name") or res.get("query", ""), refs=refs, uen=res.get("uen", ""),
                status=res.get("status", ""), verdict=res["verdict"], score=res["score"], facts=facts, groups=groups,
                subtitle=res.get("dataset", ""))


def q_company(ctx: Ctx, query: str) -> dict:
    found = cc.lookup(ctx.con, query, ctx.cfg)
    uen = (found.get("match") or {}).get("uen", "")
    saved = latest_report(ctx.root, uen) if uen else None
    res = saved or cc.run_check(ctx.root, ctx.con, ctx.cfg, query)
    if not res.get("uen") or res["verdict"] in ("Not found", "Ambiguous", "Not active"):
        parts = [("company", company_section(res))] if res.get("uen") else []
        if res.get("candidates"):
            parts.append(("candidates", rows_section("Possible matches", [("uen", "UEN"), ("name", "Name"),
                                                                          ("conf", "Match", True)],
                                                     res["candidates"][:10])))
        return spec_of(res.get("name") or query, [f"{res['verdict']}"], parts)
    row = dict(ctx.con.execute("SELECT * FROM live WHERE uen = ?", (res["uen"],)).fetchone())
    peers = rows_where(ctx, "l.ssic = ?", [row["ssic"]])
    m = metrics(ctx, peers)
    parts = [("company", company_section(res)),
             ("peers", metrics_section(ctx, f"Peers: SSIC {row['ssic']} {row['ssic_desc'] or ''}".strip()[:120], m,
                                       subtitle=f"{m['count']:,} live companies with the same primary activity, "
                                                f"as of {ctx.as_of}"))]
    age = age_years(ctx, row) or 0
    parts.append(("vs_peers", section("comparison", "This company vs its peers", items=[
        {"measure": "Age (yrs)", "this": round(age, 1), "peer_median": m["median_age"] or 0},
        {"measure": "Officers", "this": row["officers"] or 0, "peer_median": m["median_officers"] or 0}])))
    ev = evidence_list(ctx.root, res["uen"])
    if ev:
        parts.append(("evidence", rows_section("Web evidence", [("date", "Date"), ("headline", "What"),
                                                                ("supports", "Supports")], ev[:12],
                                               refs=[e["file"] for e in ev[:6]])))
    c1 = next((c for c in res.get("checks", []) if c["id"] == "C1"), {})
    summary = [f"{res['name']} ({res['uen']}): {res['verdict']}, {res['score']}/100.",
               f"{round(age, 1)} years old vs a peer median of {m['median_age']} among {m['count']:,} live peers.",
               f"Annual return: {c1.get('result', '?')}: {c1.get('detail', '')}."]
    return spec_of(res["name"], summary, parts)


def segment_filter(ctx: Ctx, args) -> tuple[str, list, str]:
    where, params, label = ["1=1"], [], []
    if args.industry:
        fit = mc.load_icp(ctx.root)["fit"].get("SG") or {}
        pre = [str(p) for p in mc.as_list((fit.get("ssic_prefixes") or {}).get(args.industry))]
        if not pre:
            raise SystemExit(f"no SSIC prefixes for industry `{args.industry}` in knowledge/icp.md")
        where.append("(" + " OR ".join("l.ssic LIKE ?" for _ in pre) + ")")
        params += [p + "%" for p in pre]
        label.append(args.industry.replace("_", " "))
    if args.ssic:
        where.append("l.ssic LIKE ?")
        params.append(args.ssic + "%")
        label.append(f"SSIC {args.ssic}*")
    if args.district:
        where.append("l.postal LIKE ?")
        params.append(args.district[:2] + "%")
        label.append(f"postal sector {args.district[:2]}")
    if args.name:
        where.append("l.name_norm LIKE ?")
        params.append("%" + cc.norm_name(args.name) + "%")
        label.append(f"name contains “{args.name}”")
    if args.type:
        where.append("l.entity_type = ?")
        params.append(args.type)
        label.append(args.type)
    return " AND ".join(where), params, ", ".join(label) or "all live companies"


def q_segment(ctx: Ctx, args) -> dict:
    where, params, label = segment_filter(ctx, args)
    rows = rows_where(ctx, where, params)
    if not rows:
        return spec_of(label, [f"No live companies match {label}."], [])
    m = metrics(ctx, rows)
    title = f"Singapore {label}".strip()
    parts = [("overview", metrics_section(ctx, title[:120], m)),
             ("by_year", by_year_chart(ctx, rows, "New companies per year")), ("age", age_chart(ctx, rows)),
             ("entity_types", mix_series(rows, "entity_type", "Entity types")), ("districts", district_series(rows)),
             ("activities", ssic_series(rows))]
    if args.industry:
        leads = cc.find_leads(ctx.root, ctx.con, ctx.cfg, [args.industry], 15)
        if leads:
            parts.append(("leads", rows_section(
                "Best new leads in this segment", [("name", "Company"), ("reg_id", "UEN"), ("why", "Why"), ("rank", "Rank", True)],
                [{k: x[k] for k in ("name", "reg_id", "why", "rank")} for x in leads],
                next=[{"label": "Save these leads", "prompt": f"/company-check leads --industries {args.industry}"}])))
    summary = [f"{m['count']:,} live companies ({label}), median age {m['median_age']} years.",
               f"{m['on_time_pct']}% file their annual return on time; {m['shared_pct']}% use a shared or virtual "
               f"address; {m['home_pct']}% are home-based.",
               f"{m['gebiz']:,} won a government contract in 3 years; {m['bca']:,} are BCA contractors."]
    return spec_of(title, summary, parts)


def q_book(ctx: Ctx, args) -> dict:
    results = []
    for label, q in cc.batch_queries(ctx.root, args):
        found = cc.lookup(ctx.con, q, ctx.cfg)
        uen = (found.get("match") or {}).get("uen", "")
        res = (latest_report(ctx.root, uen) if uen else None) or cc.run_check(ctx.root, ctx.con, ctx.cfg, q)
        results.append((label, res))
    if not results:
        return spec_of("Book", ["No SG accounts to check."], [])
    order = ["Verified", "Likely legitimate", "Registry OK - needs web check", "Caution", "Red flag", "Not active",
             "Not found", "Ambiguous"]
    mix = {v: sum(1 for _, r in results if r["verdict"] == v) for v in order}
    ok = mix["Verified"] + mix["Likely legitimate"] + mix["Registry OK - needs web check"]
    scores = [r["score"] for _, r in results if r.get("uen")]
    items = [{"key": "checked", "label": "Companies checked", "value": len(results), "status": "neutral"},
             {"key": "clean_pct", "label": "Clean registry", "value": pct(ok, len(results)), "unit": "%",
              "status": status(pct(ok, len(results)), 80, 60)},
             {"key": "caution", "label": "Caution / red flag", "value": mix["Caution"] + mix["Red flag"],
              "status": "risk" if mix["Caution"] + mix["Red flag"] else "good"},
             {"key": "inactive", "label": "Not active / not found", "value": mix["Not active"] + mix["Not found"],
              "status": "risk" if mix["Not active"] + mix["Not found"] else "good"},
             {"key": "avg_score", "label": "Average score", "value": round(statistics.mean(scores)) if scores else 0,
              "unit": "/100", "status": "neutral"}]
    who = "My book" if args.owner == "me" else ("Pool" if args.pool else (args.file or args.owner or "Companies"))
    parts = [("overview", section("metrics", f"{who}: company checks", subtitle=f"ACRA data as of {ctx.as_of}", items=items)),
             ("verdicts", series("Verdicts", "category", [{"label": k, "value": v} for k, v in mix.items() if v],
                                 share_of_total=True))]
    issues = [{"company": r.get("name") or label, "verdict": r["verdict"],
               "issue": "; ".join(r.get("reasons", [])[:2])[:140] or r.get("status", "")}
              for label, r in results if r["verdict"] in ("Caution", "Red flag", "Not active", "Not found", "Ambiguous")]
    if issues:
        parts.append(("attention", rows_section("Needs attention", [("company", "Company"), ("verdict", "Verdict"),
                                                                    ("issue", "Why")], issues[:25])))
    best = sorted([(r["score"], r) for _, r in results if r["verdict"] in order[:3]], key=lambda x: -x[0])[:10]
    if best:
        parts.append(("cleanest", rows_section("Cleanest to work first", [("company", "Company"), ("verdict", "Verdict"),
                                                                          ("score", "Score", True)],
                                               [{"company": r["name"], "verdict": r["verdict"], "score": s}
                                                for s, r in best])))
    summary = [f"{len(results)} companies: {ok} clean on the registry, {mix['Caution'] + mix['Red flag']} need a look, "
               f"{mix['Not active'] + mix['Not found']} not active or not found."]
    return spec_of(f"{who}: company checks", summary, parts)


def q_compare(ctx: Ctx, queries: list[str]) -> dict:
    res = []
    for q in queries[:5]:
        found = cc.lookup(ctx.con, q, ctx.cfg)
        uen = (found.get("match") or {}).get("uen", "")
        res.append((latest_report(ctx.root, uen) if uen else None) or cc.run_check(ctx.root, ctx.con, ctx.cfg, q))
    ids = [c for c in ("C1", "C3", "P2", "P3", "E1", "A1", "A2", "A3", "A4", "R1", "R2")]
    names = {"C1": "Annual return", "C3": "Age", "P2": "Physical or virtual", "P3": "Home-based", "E1": "Employees > 3",
             "A1": "BCA contractor", "A2": "GeBIZ supplier", "A3": "Website identity", "A4": "Recent activity",
             "R1": "Adverse media", "R2": "Shell-like"}
    rows = [{"check": "Status", "values": [{"result": "pass" if r.get("status", "").startswith("Live") else "fail",
                                            "text": r.get("status", r["verdict"])} for r in res]}]
    for cid in ids:
        vals = []
        for r in res:
            c = next((x for x in r.get("checks", []) if x["id"] == cid), None)
            vals.append({"result": c["result"], "text": c["detail"][:70]} if c else {"result": "n/a", "text": ""})
        rows.append({"check": names[cid], "values": vals})
    comp = section("compare", "Side by side", refs=[r["report_file"] for r in res if r.get("report_file")] or None,
                companies=[{"uen": r.get("uen", ""), "name": r.get("name") or r.get("query", ""), "verdict": r["verdict"],
                            "score": r["score"]} for r in res], rows=rows)
    best = max(res, key=lambda r: r["score"])
    return spec_of("Compare: " + " · ".join((r.get("name") or r.get("query", ""))[:30] for r in res),
                   [f"Highest score: {best.get('name') or best.get('query')} ({best['verdict']}, {best['score']}/100)."],
                   [("compare", comp)])


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Company insights: statistics, charts and summaries on the registry index.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("company", help="one company: profile, checks, peers, evidence")
    c.add_argument("query")
    s = sub.add_parser("segment", help="a slice of live companies")
    s.add_argument("--industry", help="ICP industry (knowledge/icp.md), e.g. clinics")
    s.add_argument("--ssic", help="SSIC code prefix, e.g. 86")
    s.add_argument("--district", help="postal sector, e.g. 52")
    s.add_argument("--name", help="name contains")
    s.add_argument("--type", help="exact entity type, e.g. 'Local Company'")
    b = sub.add_parser("book", help="verdict mix for a book, the pool or a CSV")
    g = b.add_mutually_exclusive_group(required=True)
    g.add_argument("--owner")
    g.add_argument("--pool", action="store_true")
    g.add_argument("--file")
    cp = sub.add_parser("compare", help="2–5 companies side by side")
    cp.add_argument("queries", nargs="+")
    for p in (c, s, b, cp):
        p.add_argument("--json", action="store_true", help="print JSON (the default; kept for old callers)")
        p.add_argument("--out", help="also save the data to this path (e.g. company-check/reports/insights-<slug>.json)")
    args = ap.parse_args(argv)
    mc.setup_stdout()
    if mc.yaml is None:
        print(mc.YAML_MISSING)
        return 1
    ctx = Ctx(mc.repo_root())
    if args.cmd == "company":
        spec = q_company(ctx, args.query)
    elif args.cmd == "segment":
        spec = q_segment(ctx, args)
    elif args.cmd == "book":
        spec = q_book(ctx, args)
    else:
        if len(args.queries) < 2:
            ap.error("compare needs 2 to 5 companies")
        spec = q_compare(ctx, args.queries)
    spec["as_of"] = ctx.as_of.isoformat()
    spec["licence"] = ctx.licence()
    if args.out:
        p = Path(args.out)
        p = p if p.is_absolute() else ctx.root / p
        p.parent.mkdir(parents=True, exist_ok=True)
        mc.write_text(p, json.dumps(spec, indent=2, ensure_ascii=False, default=str) + "\n")
        spec["data"] = mc.rel_posix(p, ctx.root)
    print(json.dumps(spec, indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
