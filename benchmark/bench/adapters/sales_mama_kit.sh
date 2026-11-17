#!/usr/bin/env bash
# Claude Code + the sales-mama.ai kit (AGENTS.md, CLAUDE.md, skills, subagents, scripts, templates).
#   SALES_MAMA_ROOT=/path/to/sales-mama.ai python -m shb.run --adapter adapters/sales_mama_kit.sh --model <id> ...
# The kit's hooks (.claude/settings.json: session start/stop git sync) are NOT copied: a benchmark run
# must not pull, push or commit. Same isolation as claude_code.sh.
set -euo pipefail
BOX="$1"; HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="${SALES_MAMA_ROOT:-$(cd "$HERE/../../.." && pwd)}"
cp "$KIT/AGENTS.md" "$KIT/CLAUDE.md" "$BOX/"
mkdir -p "$BOX/.claude"
cp -R "$KIT/.claude/skills" "$KIT/.claude/agents" "$BOX/.claude/" 2>/dev/null || true
cp -R "$KIT/scripts" "$KIT/templates" "$BOX/" 2>/dev/null || true
printf 'AGENTS.md\nCLAUDE.md\n.claude/*\nscripts/*\ntemplates/*\n' > "$BOX/.shb_ignore"
cd "$BOX"
claude -p "$(cat TASK.md)" \
  --output-format json \
  ${SHB_MODEL:+--model "$SHB_MODEL"} \
  --setting-sources project --strict-mcp-config \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Task" "Skill" "Bash(mama-tool:*)" "Bash(python3:*)" "Bash(ls:*)" "Bash(cat:*)" \
  > .shb_transcript.json || true
python3 "$HERE/_usage_from_claude_json.py" .shb_transcript.json .shb_usage.json  # exits 75 on API/network errors
