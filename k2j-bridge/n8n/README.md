# K2J Bridge × n8n — AI商品企画のオーケストレーション

`k2j-product-planning.json` は、ダッシュボードの「AI商品企画」生成を **n8n経由で管理** するためのワークフローです。

## n8nモードで何が変わるか

| | ダイレクトモード(既定) | n8nモード |
|---|---|---|
| APIキーの置き場所 | 各利用者のブラウザ(localStorage) | **n8nのみ**(ブラウザには一切保存されない) |
| 実行の記録 | なし | **n8nの実行履歴に全件ログ**(入力・各ステップの出力・所要時間) |
| リトライ / エラー処理 | ブラウザ任せ | n8nのリトライ・エラーフローで管理可能 |
| 処理の流れ | ブラウザ → 各API | ブラウザ → **n8n** → 楽天ランキング → Claude → **Nano Banana** → ブラウザ |
| チーム利用 | 人数分のキー設定が必要 | **URLを共有するだけ**で全員が同じ設定・同じログ基盤を利用 |

## 最速セットアップ(manexion.app.n8n.cloud 向け・約2分)

1. **URLでインポート** — n8nエディタで `Workflow → Import from URL...` を開き、次のURLを貼るだけ:
   ```
   https://raw.githubusercontent.com/manexion202604001-cell/Github/main/k2j-bridge/n8n/k2j-product-planning.json
   ```
2. **Configノード**にキーを3つ貼る(下記参照)→ 保存 → **Active** をON
3. ダッシュボードの `⚙️ n8n Orchestration Settings` で **「Use manexion n8n」ボタン → Save**(URLは自動入力されます)

または、ターミナルで1コマンド(n8nの `Settings → API` でAPIキー発行後):

```bash
./install.sh <N8N_API_KEY>
```

作成とアクティベートまで自動実行され、Webhook URL(`https://manexion.app.n8n.cloud/webhook/k2j-plan`)が表示されます。

## セットアップ(汎用・約5分)

1. **インポート** — n8nの `Workflows → Import from File` で `k2j-product-planning.json` を取り込む
2. **Configノードを編集** — 以下の値を自分のものに置き換える
   - `anthropicApiKey` — [console.anthropic.com](https://console.anthropic.com/settings/keys) で発行
   - `geminiApiKey` — [Google AI Studio](https://aistudio.google.com/app/apikey) で発行(Nano Banana = gemini-2.5-flash-image 用)
   - `rakutenAppId` — [楽天ウェブサービス](https://webservice.rakuten.co.jp/)で無料発行(空のままでもOK。その場合ライブ実データなしで生成)
   - ※本番運用ではConfigノード直書きではなく、n8nのCredentials(Header Auth等)への移行を推奨
3. **アクティベート** — ワークフローを `Active` にする
4. **URLをコピー** — Webhookノードの **Production URL**(例: `https://your-n8n.example.com/webhook/k2j-plan`)をコピー
5. **ダッシュボードに設定** — 「AI商品企画」タブ → `⚙️ n8n Orchestration Settings` → URLを貼ってSave

以後、✨ Generate ボタンはn8n経由で実行されます(失敗時はブラウザ直叩きへ自動フォールバック)。

## ワークフローの処理内容

```
Webhook(CORS対応)
  → Config(キー・モデル設定)
  → Prepare(リクエスト解析)
  → 楽天ランキングAPI(リアルタイム売れ筋 — 失敗しても続行)
  → Build Claude Request(実データを根拠に組み込んだ強化プロンプト)
  → Claude(商品企画をJSON生成)
  → Parse Plan(検証+画像コンセプト3件へ分岐)
  → Nano Banana ×3(gemini-2.5-flash-image でパッケージ画像生成)
  → Assemble(plan + images を結合)
  → Respond(JSONで返却)
```

レスポンス形式:

```json
{
  "plan": { "brandName": "...", "productName": "...", "marketEvidence": ["..."], ... },
  "images": ["data:image/png;base64,...", "...", "..."],
  "meta": { "generatedAt": "...", "orchestrator": "n8n", "liveDataUsed": true }
}
```

## 注意

- ダッシュボードはCORSプリフライトを避けるため `text/plain` でPOSTします。Webhookノードの `Allowed Origins (CORS)` は `*` に設定済みです
- 画像生成が一部失敗しても、失敗分はダッシュボード側でSVGモックに自動フォールバックします
- n8nのバージョンにより、インポート時にノードのtypeVersionが自動調整される場合があります(動作には影響しません)
