#!/usr/bin/env bash
# K2J Bridge — n8n workflow one-command installer
#
# Creates and activates the "AI Product Planning" workflow on your n8n
# instance via the n8n public REST API, then prints the webhook URL.
#
# Usage:
#   ./install.sh <N8N_API_KEY> [instance-url]
#
#   <N8N_API_KEY>  n8n の Settings → API で発行した APIキー
#   [instance-url] 省略時: https://manexion.app.n8n.cloud
#
# After running: open the workflow in n8n, paste your keys into the
# Config node (Anthropic / OpenRouter / Rakuten), and save.

set -euo pipefail

KEY="${1:?Usage: ./install.sh <N8N_API_KEY> [instance-url]}"
BASE="${2:-https://manexion.app.n8n.cloud}"
BASE="${BASE%/}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/k2j-product-planning.json"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found" >&2
  exit 1
fi

# The public API accepts only name / nodes / connections / settings
BODY=$(python3 - "$SRC" <<'PY'
import json, sys
w = json.load(open(sys.argv[1]))
print(json.dumps({k: w[k] for k in ("name", "nodes", "connections", "settings")}))
PY
)

echo "→ Creating workflow on $BASE …"
CREATE_RES=$(curl -sS -X POST "$BASE/api/v1/workflows" \
  -H "X-N8N-API-KEY: $KEY" \
  -H "content-type: application/json" \
  -d "$BODY")

ID=$(printf '%s' "$CREATE_RES" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(d.get("id") or d.get("data", {}).get("id") or "")
except Exception:
    print("")')

if [ -z "$ID" ]; then
  echo "error: could not create the workflow. API response:" >&2
  printf '%s\n' "$CREATE_RES" >&2
  exit 1
fi
echo "✓ Created workflow (id: $ID)"

echo "→ Activating …"
curl -sS -X POST "$BASE/api/v1/workflows/$ID/activate" \
  -H "X-N8N-API-KEY: $KEY" >/dev/null
echo "✓ Activated"

echo ""
echo "Webhook URL:  $BASE/webhook/k2j-plan"
echo ""
echo "Next steps:"
echo "  1. Open the workflow in n8n and paste your keys into the Config node"
echo "     (anthropicApiKey / openrouterApiKey / rakutenAppId), then Save."
echo "  2. In the dashboard's '⚙️ n8n Orchestration Settings', click"
echo "     'Use manexion n8n' (or paste the URL above) and Save."
