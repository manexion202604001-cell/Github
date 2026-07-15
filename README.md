# 顧客台帳(紹介者・報酬管理)

> 📌 **別サイト:** 韓国→日本の商品開発支援プラットフォーム「K2J Bridge」のサイトは [`k2j-bridge/`](k2j-bridge/) フォルダにあります。
>
> 📌 **別サイト:** 特許×企業マッチングプラットフォーム「PatentBridge」のサイトは [`patent-match/`](patent-match/) フォルダにあります。

社内3名で共有する顧客管理システム。ビルド不要の静的ページ + Supabase(無料)構成。

- 顧客ごとに複数の紹介者を登録し、%配分から報酬額を自動計算
- タイムスタンプ付きメモを随時追記
- 紹介者ごとの報酬合計サマリー
- 全員が同じデータを共有、編集はリアルタイムで他メンバーの画面に反映

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体(これ1枚で動きます) |
| `config.js` | Supabase接続情報とパスコードの設定 |
| `setup.sql` | Supabaseで最初に1回実行するSQL |

## セットアップ手順(所要15分)

### 1. Supabaseプロジェクトを作る(無料)

1. https://supabase.com にアクセスし、GitHubアカウントでサインアップ
2. 「New project」→ プロジェクト名は任意(例: `crm`)、リージョンは `Northeast Asia (Tokyo)` を選択
3. データベースパスワードを設定(控えておく)

### 2. テーブルを作る

1. 左メニューの **SQL Editor** を開く
2. このリポジトリの `setup.sql` の中身を貼り付けて **Run**

### 3. 接続情報を config.js に書く

1. 左メニューの **Project Settings → API** を開く
2. 「Project URL」と「anon public」キーをコピー
3. `config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` に貼り付け
4. `APP_PASSCODE` を好きな文字列に変更(3人だけに伝える合言葉)

### 4. GitHubにpushしてPagesで公開

```bash
git init
git add .
git commit -m "顧客台帳 初期コミット"
git branch -M main
git remote add origin https://github.com/<あなたのアカウント>/<リポジトリ名>.git
git push -u origin main
```

1. GitHubのリポジトリページ → **Settings → Pages**
2. 「Source」で `Deploy from a branch` を選択、Branch は `main` / `/ (root)` を指定して Save
3. 数分後に `https://<アカウント名>.github.io/<リポジトリ名>/` で公開されます

### 5. 3人にURLとパスコードを共有

以上で完了です。ログイン不要、各自のブラウザ(PC・スマホ)で開くだけで同じデータを見られます。

## セキュリティに関する注意

- anonキーはブラウザに公開される前提のキーです(問題ありません)。ただし **service_role キーは絶対に config.js に書かない** でください
- パスコードは簡易的な抑止であり、本格的な認証ではありません。URLとリポジトリは社外に共有しないでください
- リポジトリは **Private** にすることを推奨します(PrivateリポジトリでもGitHub Pagesは公開されます ※無料プランではPublicリポジトリのみPages利用可の場合があります。その場合は顧客名など機密情報はコードに含まれていないため実害は限定的ですが、気になる場合はVercelでの公開に切り替えてください)
- より強固にしたい場合は、Supabase Auth(メールログイン)への切り替えが可能です

## Vercelで公開する場合(代替手段)

GitHub Pagesの代わりにVercelでも公開できます。

1. https://vercel.com にGitHubアカウントでログイン
2. 「Add New → Project」でこのリポジトリをインポート
3. 設定はそのままDeploy(静的ファイルなのでビルド設定不要)

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| 「データの読み込みに失敗」と出る | `config.js` のURL・キーが正しいか / `setup.sql` を実行したか |
| 「○ 同期オフライン」のまま | `setup.sql` 最後の `alter publication` 行が実行されているか(Supabase側のRealtime設定) |
| 保存されない | ブラウザのコンソール(F12)のエラーを確認 |
