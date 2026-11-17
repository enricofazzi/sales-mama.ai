#!/usr/bin/env bash
# Vanilla Claude Code harness: no sales kit, just TASK.md and the sandbox.
#   python -m shb.run --adapter adapters/claude_code.sh --model <model-id> ...
# Isolation: only project settings and no MCP servers are loaded. Run on a clean user or in a
# container so no user-level CLAUDE.md, memory or plugins leak into the harness under test.
set -euo pipefail
BOX="$1"; HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$BOX"
claude -p "$(cat TASK.md)" \
  --output-format json \
  ${SHB_MODEL:+--model "$SHB_MODEL"} \
  --setting-sources project --strict-mcp-config \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Bash(mama-tool:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(python3:*)" \
  > .shb_transcript.json || true
python3 "$HERE/_usage_from_claude_json.py" .shb_transcript.json .shb_usage.json  # exits 75 on API/network errors
