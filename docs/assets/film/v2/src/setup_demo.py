"""Build a fictional demo copy of Sales Mama for filming: demo data + the fictional 50-company CRM export."""
import os, shutil, subprocess, sys
from pathlib import Path
SRC = Path("/Users/praveengovindaraj/Public/sales-mama/sales-mama.ai")
DST = Path(sys.argv[1])
sys.path.insert(0, str(SRC / "scripts"))
import selftest
base_ignore = selftest._ignore
def ignore(src_root):
    inner = base_ignore(src_root)
    def f(dirpath, names):
        skip = inner(dirpath, names)
        rel = Path(dirpath).resolve().relative_to(src_root).as_posix()
        if rel == "console": skip |= {"node_modules", "dist"}
        if rel == "docs/assets": skip |= {"film", "film2"}
        return skip
    return f
selftest._ignore = ignore
if DST.exists(): shutil.rmtree(DST)
selftest.setup(SRC, DST)
selftest.git_init(DST)
os.symlink(SRC / "console" / "node_modules", DST / "console" / "node_modules")
# public open data for company check / insights (never personal data)
(DST / "company-check").mkdir(exist_ok=True)
if (DST / "company-check" / "data").exists(): shutil.rmtree(DST / "company-check" / "data")
os.symlink(SRC / "company-check" / "data", DST / "company-check" / "data")
shutil.copytree(SRC / "company-check" / "reports", DST / "company-check" / "reports", dirs_exist_ok=True)
for ev in (SRC / "wiki" / "events").glob("*.md"): shutil.copy(ev, DST / "wiki" / "events" / ev.name)
(DST / "raw" / "crm").mkdir(parents=True, exist_ok=True)
shutil.copy(SRC / "raw" / "crm" / "2026-11-01-demo-export-50.csv", DST / "raw" / "crm" / "2026-11-01-demo-export-50.csv")
print("demo repo at", DST)
