# studio N — コミュニティ型学習プラットフォーム 要件定義書

**Version:** 1.0
**Date:** 2026-09-09
**Owner:** studio N
**Status:** 開発着手可（Claude Code 実装用）

---

## 0. このドキュメントの読み方

このドキュメントは Claude Code に渡して、そのまま実装を開始できることを目的に書かれている。

- **§1〜§4** … プロダクトの「なぜ・誰に・何を」
- **§5〜§8** … 画面・機能・データ・API の詳細仕様（実装の正）
- **§9** … デザインシステム（色・文字・余白・コンポーネント）
- **§10〜§12** … 技術スタック・非機能要件・フェーズ計画
- **§13** … 未決事項（実装前に確認すべき点）

迷ったら **§4 設計原則** と **§9 デザインシステム** に戻ること。

---

## 1. プロジェクト概要

### 1.1 目的

studio N が保有する IT・DX・開発系の教材（動画・スライド・テキスト）を、**受講生同士が学び合えるコミュニティ型の学習プラットフォーム**として提供する。

主目的は **既存顧客の学習サポートと学習状況の管理**。継続率・満足度の向上、口コミ／紹介につながる関係性の構築を狙う。

### 1.2 プロダクトの位置づけ

- 一般公開のマーケットプレイスではなく、**既存顧客向けのクローズドな学習コミュニティ**
- 新規顧客は studio N が招待する（招待制）
- 決済機能は初期スコープ外（契約は既にオフラインで成立している前提）

### 1.3 成功指標（KPI）

| 指標 | 目標 |
|---|---|
| コース完了率 | 60% 以上 |
| 週間アクティブ率（WAU / 全会員） | 50% 以上 |
| Q&A 平均一次回答時間 | 24 時間以内 |
| オフィスアワー参加率 | 会員の 30% 以上 |

---

## 2. ターゲットユーザー

### 2.1 受講生（Student）

- **スキルレベル：** 初心者〜上級者まで全レベル
- **属性：** studio N の既存顧客（個人）。IT・DX・開発を学びたい社会人が中心
- **規模：** 月間アクティブ約 100 人
- **利用環境：** PC とスマートフォンの両方。通勤中にスマホで動画視聴、自宅で PC でハンズオン、という使い方を想定

### 2.2 講師（Instructor）

- studio N のスタッフ
- Q&A への公式回答、オフィスアワーの開催、コース・レッスンの管理を行う

### 2.3 管理者（Admin）

- studio N の運営責任者
- 会員招待、ロール管理、バッジ・お知らせの管理、全体の閲覧・編集権限

---

## 3. 提供コンテンツ

### 3.1 既存教材

- **カテゴリ例：** AI 活用、n8n（ワークフロー自動化）、その他 IT・DX・開発系
- **形式：** 動画（YouTube にホスティング済み）、スライド、テキスト
- **今後：** 継続的にコースを追加していく（管理画面から追加できること）

### 3.2 コース設計の単位

```
コース（Course）          … 例「n8n で業務自動化 入門」
 └ セクション（Section）   … 例「第1週：基礎」「第2週：実践」
    └ レッスン（Lesson）    … 動画 / スライド / テキスト / 小テスト
```

- 1 コースの想定学習期間：**2 週間**
- 1 レッスンの想定所要時間：5〜20 分
- 各コースには **難易度（初級 / 中級 / 上級）** と **カテゴリ** を付与

---

## 4. 設計原則

1. **静けさを保つ。** 通知・演出・色はすべて控えめに。学びに集中できる場であること。
2. **"公式" と "雑談" を明確に分ける。** 講師が回答する Q&A と、受講生が自由に話すコミュニティは別空間。
3. **進捗が一目で分かる。** 「今どこまで来ていて、次に何をすればいいか」を常に提示する。
4. **モバイルで動画が見やすい。** 動画レッスン画面はスマホ最優先で設計する。
5. **運営の手間を最小に。** コース追加・会員招待・Q&A 対応が管理画面で完結すること。
6. **小さく作って育てる。** 月間 100 人規模。過剰な分散設計はせず、単一の Next.js + Supabase で完結させる。

---

## 5. 機能要件

### 5.1 認証・会員管理

| ID | 機能 | 詳細 |
|---|---|---|
| AUTH-01 | 招待制登録 | 管理者が発行した招待リンク（トークン付き URL）からのみ登録可能。招待は有効期限 7 日、1 回限り |
| AUTH-02 | ログイン | メールアドレス + パスワード。Google ログインは任意（Phase 2 以降） |
| AUTH-03 | パスワードリセット | メールによるリセットリンク送信 |
| AUTH-04 | プロフィール | 表示名、アバター画像、自己紹介（200 字）、自己申告レベル（初級／中級／上級）、公開／非公開設定 |
| AUTH-05 | ロール | `student` / `instructor` / `admin` の 3 種。管理者のみ変更可 |
| AUTH-06 | 退会 | 本人による退会申請 → 管理者承認 → データは匿名化して保持（投稿は「退会ユーザー」表示） |

### 5.2 学習ゾーン

| ID | 機能 | 詳細 |
|---|---|---|
| LEARN-01 | コース一覧 | カテゴリ・難易度でフィルタ。各カードに進捗バーを表示。「受講中」「未着手」「完了」でソート可 |
| LEARN-02 | コース詳細 | 概要、到達目標、対象レベル、所要期間、セクション／レッスン一覧、講師情報。「受講を開始」ボタン |
| LEARN-03 | レッスン視聴（動画） | YouTube 埋め込み（privacy-enhanced mode: `youtube-nocookie.com`）。動画の 90% 以上視聴、または「完了にする」ボタンで完了。最終再生位置を保存し次回レジューム |
| LEARN-04 | レッスン閲覧（スライド） | PDF を埋め込み表示（PDF.js）+ ダウンロードリンク。最後のページ到達または「完了にする」で完了 |
| LEARN-05 | レッスン閲覧（テキスト） | Markdown レンダリング（コードブロックのシンタックスハイライト必須）。「完了にする」で完了 |
| LEARN-06 | 小テスト | 単一選択／複数選択。合格ライン（デフォルト 80%）。何度でも再挑戦可。合格で完了 |
| LEARN-07 | 順序制御 | デフォルトは自由順。コース単位で「順番に受講必須」に切替可能 |
| LEARN-08 | 進捗管理 | レッスン単位の完了状態を保存。コース進捗率 = 完了レッスン数 / 全レッスン数 |
| LEARN-09 | コース完了 | 全レッスン完了で自動的にコース完了。修了証発行 + バッジ付与 + XP 加算 |
| LEARN-10 | 資料ダウンロード | レッスンに添付されたファイル（PDF / ZIP など）をダウンロード可。会員限定の署名付き URL |
| LEARN-11 | レッスン内メモ | 各レッスンに自分だけのメモを残せる（Markdown、自動保存） |
| LEARN-12 | 「続きから学ぶ」 | ダッシュボードに最後に見たレッスンへのショートカット |

### 5.3 Q&A フォーラム（講師公式回答エリア）

| ID | 機能 | 詳細 |
|---|---|---|
| QA-01 | 質問投稿 | タイトル、本文（Markdown）、関連コース／レッスン（任意）、画像添付（最大 3 枚、各 5MB） |
| QA-02 | 講師回答 | `instructor` / `admin` ロールのみ回答可。回答には「公式回答」バッジが付く |
| QA-03 | 追加質問 | 質問者は自分のスレッド内で追加コメント可（受講生同士の回答は不可＝コミュニティへ誘導） |
| QA-04 | ステータス | `open`（未回答） / `answered`（回答済） / `resolved`（解決・質問者が閉じる） |
| QA-05 | FAQ 化 | 講師が「FAQ に追加」を押すと、公開 FAQ ページに掲載（質問者名は匿名化） |
| QA-06 | 検索 | タイトル・本文の全文検索。コース・ステータスで絞り込み |
| QA-07 | 未回答通知 | 24 時間未回答の質問を講師に通知（メール + ダッシュボード） |
| QA-08 | 公開範囲 | 会員全員に公開（他の人の質問も学びになるため）。投稿時に「非公開で質問」を選べる |

### 5.4 コミュニティスペース（受講生交流エリア）

| ID | 機能 | 詳細 |
|---|---|---|
| COM-01 | チャンネル | 初期チャンネル：`自己紹介` / `雑談` / `事例共有` / `つまずき相談`（受講生同士で助け合う場） / `作ったもの`。管理者が追加・並び替え可 |
| COM-02 | 投稿 | 本文（Markdown）、画像添付（最大 4 枚）、リンクの OGP プレビュー |
| COM-03 | コメント | 投稿へのコメント（1 階層のみ。スレッドのネストはしない） |
| COM-04 | リアクション | 絵文字リアクションは **4 種に固定**（👏 / 💡 / 🙏 / 🔥）。静けさを保つため増やさない |
| COM-05 | メンション | `@表示名` でメンション → 通知 |
| COM-06 | ピン留め | 講師／管理者は投稿をチャンネル上部にピン留め可 |
| COM-07 | 通報・モデレーション | 投稿の通報 → 管理者に通知。管理者は非表示・削除可 |
| COM-08 | フィード | 「すべて」「フォロー中のチャンネル」の 2 タブ。時系列（新しい順） |

### 5.5 オフィスアワー（月 1 回のライブ Q&A）

| ID | 機能 | 詳細 |
|---|---|---|
| OH-01 | 開催予定 | 次回の日時、テーマ、参加リンク（YouTube Live または Zoom URL）を表示。カレンダー追加（.ics ダウンロード） |
| OH-02 | 事前質問 | 開催前に質問を投稿・他の人の質問に「聞きたい」投票。講師は投票数順に確認できる |
| OH-03 | リマインド | 開催 24 時間前・1 時間前にメール通知 |
| OH-04 | アーカイブ | 終了後、録画 URL（YouTube）とタイムスタンプ付きの要約を掲載。過去回一覧 |
| OH-05 | 参加記録 | 参加ボタンを押した記録を保存（バッジ条件・KPI 用） |

### 5.6 ゲーミフィケーション

| ID | 機能 | 詳細 |
|---|---|---|
| GAME-01 | XP（経験値） | 行動に応じて XP を付与（下表）。累計 XP でレベル表示 |
| GAME-02 | バッジ | 条件達成で自動付与。プロフィールとランキングに表示 |
| GAME-03 | ランキング | 「今週」「今月」「累計」の 3 タブ。XP 順。上位 20 名 + 自分の順位。表示名とアバターのみ（本名・メールは出さない）。**ランキングからのオプトアウト設定あり** |
| GAME-04 | 修了証 | コース完了時に PDF を自動生成。固有の検証コードを持ち、公開検証ページ（ログイン不要）で真正性を確認可 |
| GAME-05 | 学習ストリーク | 連続学習日数を表示。途切れても罰則的な演出はしない（静けさの原則） |

**XP 付与テーブル（初期値、管理画面で変更可）**

| 行動 | XP |
|---|---|
| レッスン完了 | 10 |
| 小テスト合格 | 20 |
| コース完了 | 100 |
| Q&A で質問 | 5 |
| コミュニティに投稿 | 5 |
| コミュニティにコメント | 2 |
| リアクションを受け取る | 1（1 日上限 20） |
| オフィスアワー参加 | 30 |

**初期バッジ（管理画面で追加可）**

| バッジ | 条件 |
|---|---|
| はじめの一歩 | 初めてレッスンを完了 |
| 修了 | 初めてコースを完了 |
| 三冠 | コースを 3 つ完了 |
| 探究者 | Q&A で 5 回質問 |
| 語り部 | コミュニティに 10 回投稿 |
| 皆勤 | オフィスアワーに 3 回参加 |
| 七日間 | 7 日連続で学習 |
| 認定エンジニア（カテゴリ別） | 該当カテゴリの全コースを完了（例：「n8n 認定」） |

### 5.7 ダッシュボード（ログイン後トップ）

表示要素（上から順）：

1. あいさつ + 学習ストリーク（小さく）
2. **「続きから学ぶ」** カード（最後に見たレッスン）
3. 受講中コースの進捗（最大 3 件）
4. 次回オフィスアワーの案内
5. 最新のお知らせ（管理者投稿）
6. 自分への通知（Q&A 回答、メンション）
7. 新着コース

### 5.8 通知

| チャネル | 対象イベント |
|---|---|
| アプリ内（ベルアイコン） | Q&A に回答がついた、メンションされた、バッジ獲得、コース完了、お知らせ |
| メール | Q&A に回答がついた、新コース公開、オフィスアワーのリマインド、招待、週間サマリー（任意） |

- 通知設定画面で、メール通知を項目ごとに ON/OFF できる
- 週間サマリーはデフォルト OFF

### 5.9 管理画面（`/admin`）

| ID | 機能 |
|---|---|
| ADM-01 | コース CRUD（下書き／公開、並び替え、サムネイル、カテゴリ、難易度） |
| ADM-02 | セクション・レッスン CRUD（ドラッグで並び替え、YouTube ID・PDF・Markdown の登録、添付ファイル） |
| ADM-03 | 小テスト作成（問題・選択肢・正解・解説） |
| ADM-04 | 会員管理（一覧、検索、ロール変更、招待リンク発行、一括招待 CSV、退会処理） |
| ADM-05 | 受講状況（会員ごとのコース進捗、最終ログイン、CSV エクスポート） |
| ADM-06 | Q&A 管理（未回答一覧、回答、FAQ 化、非公開化） |
| ADM-07 | コミュニティ管理（チャンネル CRUD、通報対応、ピン留め） |
| ADM-08 | オフィスアワー管理（予定作成、事前質問の確認、録画 URL 登録） |
| ADM-09 | バッジ・XP 設定 |
| ADM-10 | お知らせ投稿 |
| ADM-11 | ダッシュボード（WAU、コース完了率、未回答質問数、今週の新規投稿数） |

### 5.10 公開ページ（ログイン不要）

| パス | 内容 |
|---|---|
| `/` | ランディング（studio N の世界観を伝える静かな 1 ページ。「会員の方はログイン」導線） |
| `/login` `/signup?token=` `/reset-password` | 認証 |
| `/verify/[code]` | 修了証の真正性検証 |
| `/faq` | FAQ（Q&A から FAQ 化されたもの）※公開／会員限定は設定で切替 |
| `/terms` `/privacy` | 規約・プライバシーポリシー |

---

## 6. 画面一覧・ルーティング

Next.js App Router 前提。`(auth)` は認証必須グループ。

```
app/
├── (public)/
│   ├── page.tsx                      # / ランディング
│   ├── login/page.tsx
│   ├── signup/page.tsx               # ?token=
│   ├── reset-password/page.tsx
│   ├── verify/[code]/page.tsx        # 修了証検証
│   ├── faq/page.tsx
│   ├── terms/page.tsx
│   └── privacy/page.tsx
│
├── (auth)/
│   ├── dashboard/page.tsx
│   ├── courses/
│   │   ├── page.tsx                  # 一覧
│   │   └── [slug]/
│   │       ├── page.tsx              # コース詳細
│   │       └── lessons/[lessonId]/page.tsx   # レッスン視聴
│   ├── qa/
│   │   ├── page.tsx                  # 一覧
│   │   ├── new/page.tsx
│   │   └── [threadId]/page.tsx
│   ├── community/
│   │   ├── page.tsx                  # フィード
│   │   ├── [channelSlug]/page.tsx
│   │   └── posts/[postId]/page.tsx
│   ├── office-hours/
│   │   ├── page.tsx                  # 次回 + 過去一覧
│   │   └── [id]/page.tsx
│   ├── ranking/page.tsx
│   ├── badges/page.tsx               # 自分のバッジ + 全バッジ一覧
│   ├── certificates/page.tsx         # 自分の修了証一覧
│   ├── members/[userId]/page.tsx     # 公開プロフィール
│   ├── notifications/page.tsx
│   └── settings/
│       ├── profile/page.tsx
│       ├── notifications/page.tsx
│       └── account/page.tsx
│
└── (admin)/admin/
    ├── page.tsx                      # 管理ダッシュボード
    ├── courses/...
    ├── members/...
    ├── qa/...
    ├── community/...
    ├── office-hours/...
    ├── badges/...
    └── announcements/...
```

### 6.1 主要画面のレイアウト指針

**レッスン視聴画面（最重要・モバイル最優先）**

```
[PC]
┌──────────────────────────────────┬───────────────┐
│  動画 / スライド / テキスト        │ コース目次     │
│  (16:9, 最大幅 960px)             │ ・レッスン1 ✓  │
│                                   │ ・レッスン2 ●  │
│  レッスンタイトル                  │ ・レッスン3    │
│  [完了にする]  [← 前] [次 →]       │               │
│                                   │ 進捗 40%      │
│  ─ 説明 / 資料 / メモ (タブ) ─     │               │
└──────────────────────────────────┴───────────────┘

[Mobile]
┌────────────────────┐
│ 動画 (画面上部固定)  │
├────────────────────┤
│ タイトル             │
│ [完了にする]         │
│ [← 前]      [次 →]  │
│ ─ 説明/資料/メモ ─   │
│ …                  │
│ ▼ コース目次 (折畳)  │
└────────────────────┘
```

**共通ナビゲーション**

- PC：左サイドバー（ダッシュボード / コース / Q&A / コミュニティ / オフィスアワー / ランキング）+ 右上にベル・アバター
- モバイル：下部タブバー 5 つ（ホーム / コース / Q&A / コミュニティ / その他）
- サイドバー・タブバーは Main Black `#111110` 背景、文字は Warm White。アクティブ項目のみ Muted Bronze の細い縦線（PC）／下線（モバイル）で示す

---

## 7. データモデル

Supabase（PostgreSQL）。すべてのテーブルに RLS を設定する。

```sql
-- ========== ユーザー ==========
create type user_role as enum ('student', 'instructor', 'admin');
create type skill_level as enum ('beginner', 'intermediate', 'advanced');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,
  avatar_url    text,
  bio           text check (char_length(bio) <= 200),
  role          user_role not null default 'student',
  level         skill_level,
  is_public     boolean not null default true,
  hide_from_ranking boolean not null default false,
  total_xp      integer not null default 0,
  streak_days   integer not null default 0,
  last_active_on date,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text not null unique,
  role        user_role not null default 'student',
  invited_by  uuid references profiles(id),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ========== コース ==========
create type course_status as enum ('draft', 'published', 'archived');
create type lesson_type  as enum ('video', 'slide', 'text', 'quiz');

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order integer not null default 0
);

create table courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  goals         text[],                       -- 到達目標
  category_id   uuid references categories(id),
  level         skill_level not null,
  thumbnail_url text,
  duration_weeks integer not null default 2,
  is_sequential boolean not null default false,
  status        course_status not null default 'draft',
  sort_order    integer not null default 0,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table sections (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(id) on delete cascade,
  title      text not null,
  sort_order integer not null default 0
);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  section_id       uuid not null references sections(id) on delete cascade,
  title            text not null,
  type             lesson_type not null,
  youtube_video_id text,            -- type = video
  slide_url        text,            -- type = slide (Supabase Storage path)
  body_md          text,            -- type = text
  duration_min     integer,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create table lesson_attachments (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references lessons(id) on delete cascade,
  file_name   text not null,
  storage_path text not null,
  size_bytes  integer
);

-- ========== 小テスト ==========
create table quizzes (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null unique references lessons(id) on delete cascade,
  pass_percent  integer not null default 80
);

create table quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  question    text not null,
  explanation text,
  is_multiple boolean not null default false,
  sort_order  integer not null default 0
);

create table quiz_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false,
  sort_order  integer not null default 0
);

create table quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  score_percent integer not null,
  passed      boolean not null,
  answers     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ========== 進捗 ==========
create table enrollments (
  user_id      uuid not null references profiles(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);

create type progress_status as enum ('not_started', 'in_progress', 'completed');

create table lesson_progress (
  user_id          uuid not null references profiles(id) on delete cascade,
  lesson_id        uuid not null references lessons(id) on delete cascade,
  status           progress_status not null default 'not_started',
  last_position_sec integer default 0,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table lesson_notes (
  user_id    uuid not null references profiles(id) on delete cascade,
  lesson_id  uuid not null references lessons(id) on delete cascade,
  body_md    text,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ========== Q&A（講師公式） ==========
create type qa_status as enum ('open', 'answered', 'resolved');

create table qa_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_id   uuid references courses(id),
  lesson_id   uuid references lessons(id),
  title       text not null,
  body_md     text not null,
  status      qa_status not null default 'open',
  is_private  boolean not null default false,
  is_faq      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table qa_replies (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references qa_threads(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  body_md       text not null,
  is_official   boolean not null default false,   -- instructor/admin の回答
  created_at    timestamptz not null default now()
);

-- ========== コミュニティ ==========
create table channels (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 0
);

create table posts (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references channels(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  body_md     text not null,
  is_pinned   boolean not null default false,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body_md    text not null,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);

create type reaction_kind as enum ('clap', 'idea', 'thanks', 'fire');

create table reactions (
  user_id    uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','qa_thread','qa_reply')),
  target_id  uuid not null,
  kind       reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id, kind)
);

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post','qa_thread','qa_reply')),
  target_id   uuid not null,
  storage_path text not null,
  created_at  timestamptz not null default now()
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type text not null,
  target_id   uuid not null,
  reason      text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ========== オフィスアワー ==========
create table office_hours (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  theme         text,
  scheduled_at  timestamptz not null,
  duration_min  integer not null default 60,
  join_url      text,
  recording_url text,
  summary_md    text,
  created_at    timestamptz not null default now()
);

create table office_hour_questions (
  id              uuid primary key default gen_random_uuid(),
  office_hour_id  uuid not null references office_hours(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create table office_hour_question_votes (
  question_id uuid not null references office_hour_questions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  primary key (question_id, user_id)
);

create table office_hour_attendance (
  office_hour_id uuid not null references office_hours(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  primary key (office_hour_id, user_id)
);

-- ========== ゲーミフィケーション ==========
create table xp_rules (
  action  text primary key,        -- 'lesson_complete', 'course_complete', ...
  xp      integer not null,
  daily_cap integer
);

create table xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  action     text not null references xp_rules(action),
  xp         integer not null,
  ref_type   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index on xp_events (user_id, created_at);

create table badges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,                 -- lucide アイコン名 or storage path
  criteria    jsonb not null,       -- {"type":"course_complete","count":3} など
  sort_order  integer not null default 0
);

create table user_badges (
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_id   uuid not null references badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table certificates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_id   uuid not null references courses(id) on delete cascade,
  verify_code text not null unique,   -- 例: SN-2026-7F3K9Q
  pdf_path    text,
  issued_at   timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ========== 通知・お知らせ ==========
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at, created_at desc);

create table notification_settings (
  user_id                uuid primary key references profiles(id) on delete cascade,
  email_qa_reply         boolean not null default true,
  email_new_course       boolean not null default true,
  email_office_hour      boolean not null default true,
  email_mention          boolean not null default true,
  email_weekly_summary   boolean not null default false
);

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body_md    text not null,
  published_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
```

### 7.1 RLS の基本方針

| テーブル | 読み | 書き |
|---|---|---|
| `profiles` | 認証済み全員（`is_public=false` の場合は本人と admin のみ詳細） | 本人（role 以外）/ admin |
| `courses` `sections` `lessons` | `status='published'` は認証済み全員。draft は instructor/admin | instructor/admin |
| `lesson_progress` `lesson_notes` `enrollments` | 本人 / admin | 本人 |
| `qa_threads` | `is_private=false` は全員。private は本人 + instructor/admin | 本人が作成、instructor/admin が status/is_faq 更新 |
| `qa_replies` | スレッドと同じ | 質問者（本人スレッドのみ）/ instructor/admin |
| `posts` `comments` | `is_hidden=false` は全員 | 本人 / admin |
| `xp_events` `user_badges` `certificates` | 本人 / admin（ランキング用集計は view 経由） | サーバー（service role）のみ |
| `admin` 系 | admin のみ | admin のみ |

### 7.2 DB 側の自動処理（トリガー / 関数）

- `lesson_progress` が `completed` になったら → `xp_events` に加算 → `profiles.total_xp` 更新 → コース全レッスン完了判定 → `enrollments.completed_at` セット → `certificates` 生成 → バッジ判定
- `qa_replies` に `is_official=true` が挿入されたら → `qa_threads.status='answered'` → 質問者に通知
- `profiles.last_active_on` を日次で更新し、ストリークを計算
- ランキングは `ranking_weekly` / `ranking_monthly` / `ranking_total` の **materialized view**（5 分ごと refresh、`hide_from_ranking=true` を除外）

---

## 8. API / サーバー処理

Next.js Server Actions + Route Handlers。外部公開 API は不要。

### 8.1 Server Actions（主要）

```
auth/
  acceptInvitation(token, password, displayName)
  requestPasswordReset(email)

learn/
  enrollCourse(courseId)
  updateLessonProgress(lessonId, { positionSec?, complete? })
  saveLessonNote(lessonId, bodyMd)
  submitQuiz(quizId, answers)

qa/
  createThread(input)
  replyThread(threadId, bodyMd)          // is_official は role から自動判定
  updateThreadStatus(threadId, status)   // instructor/admin
  toggleFaq(threadId)                    // instructor/admin

community/
  createPost / updatePost / deletePost
  createComment / deleteComment
  toggleReaction(targetType, targetId, kind)
  reportContent(targetType, targetId, reason)
  pinPost(postId, pinned)                // instructor/admin

officeHours/
  submitQuestion(officeHourId, body)
  voteQuestion(questionId)
  markAttendance(officeHourId)

settings/
  updateProfile / updateNotificationSettings / requestDeletion

admin/
  courses.*, lessons.*, members.*, invitations.create(emails[]), ...
```

### 8.2 Route Handlers

| パス | 用途 |
|---|---|
| `POST /api/webhooks/supabase` | DB トリガーからのメール送信フック（Q&A 回答通知など） |
| `GET /api/certificates/[id]/pdf` | 修了証 PDF 生成（`@react-pdf/renderer`）。生成後 Storage にキャッシュ |
| `GET /api/office-hours/[id].ics` | カレンダー用 ICS |
| `GET /api/cron/reminders` | Vercel Cron：オフィスアワーリマインド・未回答質問アラート・週間サマリー |
| `GET /api/cron/refresh-ranking` | Vercel Cron：ランキング materialized view refresh |
| `POST /api/upload` | 画像・添付のアップロード（サイズ・MIME 検証 → Storage） |

### 8.3 メール（Resend）

| テンプレート | 送信タイミング |
|---|---|
| `invitation` | 管理者が招待発行 |
| `qa-answered` | 公式回答がついた |
| `new-course` | コースが published になった |
| `office-hour-reminder-24h` / `-1h` | Cron |
| `weekly-summary` | 月曜 8:00 JST（オプトイン者のみ） |
| `certificate-issued` | コース完了 |

すべてのメールは §9 のトーンに従い、HTML は Warm White 背景 + Charcoal テキスト + Muted Bronze の細線のみ。画像やボタンの多用はしない。

---

## 9. デザインシステム

### 9.1 コンセプト

**「日本的な静けさ × 現代的なラグジュアリー × ハイブランド」**

墨・和紙・黒檀・燻した金属・古美銅を連想させる質感。ホテル、ギャラリー、高級旅館、ファッションブランドのような **無機質で静かな高級感** を優先する。エルメス的な暖色感には寄せすぎない。

- 全体的に低彩度
- コントラストはしっかり取るが、純黒 × 純白の強すぎる印象にはしない
- 派手なグラデーション・原色・ネオンカラーは使用しない
- 人物・イラスト・和柄の再現は不要。参考にするのは色合い・明度・彩度・空気感のみ

### 9.2 カラーパレット

| Token | Name | HEX | 用途 |
|---|---|---|---|
| `ink-900` | Main Black | `#111110` | メインセクション背景、CTA、ナビ |
| `ink-800` | Soft Black | `#1C1B19` | ダークカード背景 |
| `ink-700` | Charcoal | `#292723` | 通常テキスト、ダーク面の階調 |
| `ink-600` | Dark Brown | `#39352F` | CTA hover |
| `stone-500` | Taupe | `#665F54` | 補足テキスト、ボーダー基色 |
| `stone-400` | Greige | `#938A7C` | プレースホルダー、無効状態 |
| `stone-300` | Warm Gray | `#B8AFA1` | 区切り、非アクティブアイコン |
| `paper-200` | Ivory | `#E8E3D9` | カード背景、セクション背景 |
| `paper-100` | Warm White | `#F3F0E9` | ページ背景、黒背景上の文字 |
| `bronze-500` | Muted Bronze | `#B18A68` | アクセント、アクティブ状態、アクセントボタン |
| `bronze-400` | Copper Beige | `#C39B7B` | アクセント hover、バッジ |

**使用割合**

- 60%：`paper-100` / `paper-200` / `stone-*`（背景・余白）
- 25%：`ink-*`（メインセクション・テキスト）
- 10%：`stone-500` / `stone-300`（補足）
- 5%：`bronze-*`（アクセント）

**適用ルール**

| 要素 | 値 |
|---|---|
| ページ背景 | `#F3F0E9`（または `#E8E3D9`） |
| メインセクション（ヒーロー、ナビ、フッター） | `#111110` |
| 黒背景上の文字 | `#F3F0E9` |
| 通常テキスト | `#292723` |
| 補足テキスト | `#665F54` |
| カード背景 | `#E8E3D9`（明）/ `#1C1B19`（暗） |
| ボーダー | `rgba(102, 95, 84, 0.25)` |
| アクセント | `#B18A68` |
| CTA ボタン | bg `#111110` / text `#F3F0E9` / hover bg `#39352F` |
| アクセントボタン | bg `#B18A68` / text `#111110` / hover bg `#C39B7B` |
| リンク | `#292723` + 下線 `#B18A68`（hover で文字色も `#B18A68`） |
| フォーカスリング | `#B18A68` 1px + offset 2px |
| 成功 / 警告 / エラー | `#6F7D5E` / `#A98B4A` / `#8C5A4E`（いずれも低彩度・パレットの空気感に合わせる） |

**グラデーション**（使う場合のみ、極めて微細に）

- 明：`#F3F0E9 → #DDD6CA`
- 暗：`#111110 → #292723`

**Tailwind 設定**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    { 900: '#111110', 800: '#1C1B19', 700: '#292723', 600: '#39352F' },
        stone:  { 500: '#665F54', 400: '#938A7C', 300: '#B8AFA1' },
        paper:  { 200: '#E8E3D9', 100: '#F3F0E9' },
        bronze: { 500: '#B18A68', 400: '#C39B7B' },
        state:  { success: '#6F7D5E', warning: '#A98B4A', danger: '#8C5A4E' },
      },
      borderColor: { DEFAULT: 'rgba(102, 95, 84, 0.25)' },
      fontFamily: {
        serif: ['"Shippori Mincho"', '"Noto Serif JP"', 'serif'],
        sans:  ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { wide: '0.04em', wider: '0.08em', widest: '0.16em' },
      borderRadius: { DEFAULT: '2px', md: '4px', lg: '6px' },
      transitionDuration: { DEFAULT: '220ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
```

### 9.3 タイポグラフィ

**明朝体を基調とする。**

| 用途 | フォント | サイズ / 行間 / 字間 |
|---|---|---|
| 見出し H1 | Shippori Mincho（Medium） | 32–40px / 1.4 / 0.04em |
| 見出し H2 | Shippori Mincho（Medium） | 24–28px / 1.5 / 0.04em |
| 見出し H3 | Shippori Mincho（Medium） | 18–20px / 1.6 / 0.02em |
| 本文 | Shippori Mincho（Regular） | 16px / 1.9 / 0.02em |
| UI ラベル・ボタン・ナビ・表 | Noto Sans JP（Regular / Medium） | 13–14px / 1.5 / 0.06em |
| キャプション・メタ情報 | Noto Sans JP | 12px / 1.5 / 0.04em / `stone-500` |
| 英字の小見出し（"COURSES" 等） | Noto Sans JP（Light） | 11px / 大文字 / 0.16em / `stone-400` |
| コード | JetBrains Mono | 13–14px / 1.7 |

- 本文は **横幅 640–720px** を上限にし、余白で読ませる
- 数字は `font-variant-numeric: tabular-nums`（進捗率・XP・ランキング）
- 太字は使いすぎない。強調は字間・色（`bronze-500`）・余白で行う
- Google Fonts から `next/font` で読み込み、`display: swap`

### 9.4 スペーシング・レイアウト

- 基本単位 **8px**。セクション間は 64–96px（PC）、40–56px（モバイル）
- コンテナ最大幅：**1200px**、本文は 720px
- カードは影を使わず、**1px ボーダー（`rgba(102,95,84,0.25)`）+ 背景色差**で面を分ける
- 角丸は **2px（デフォルト）**。ピル型・大きな角丸は使わない
- 区切り線は 1px、`stone-300` またはボーダー色。太いディバイダーは使わない

### 9.5 コンポーネント仕様

**Button**

| Variant | 通常 | Hover | Disabled |
|---|---|---|---|
| `primary` | bg `ink-900` / text `paper-100` | bg `ink-600` | opacity 0.4 |
| `accent` | bg `bronze-500` / text `ink-900` | bg `bronze-400` | opacity 0.4 |
| `outline` | border 1px `ink-700` / text `ink-700` / bg transparent | bg `paper-200` | opacity 0.4 |
| `ghost` | text `ink-700` | text `bronze-500` | opacity 0.4 |

- 高さ 44px（md）/ 36px（sm）。横パディング 24px。字間 0.06em。角丸 2px
- アイコンは lucide-react、stroke 1.5

**Card**

- 明：bg `paper-200`、border 1px、padding 24–32px
- 暗：bg `ink-800`、border `rgba(243,240,233,0.08)`、text `paper-100`
- hover でボーダーのみ `bronze-500` に変化（影・拡大はしない）

**Progress Bar**

- 高さ 2px。トラック `stone-300`（30% opacity）、バー `bronze-500`
- 数字は右端に `tabular-nums` で `stone-500`

**Badge / Tag**

- カテゴリ・難易度：border 1px `stone-400`、text `stone-500`、11px、大文字英字 or 和文、字間 0.08em
- 「公式回答」：bg `bronze-500`、text `ink-900`
- 未読・新着ドット：`bronze-500` 6px

**Input / Textarea**

- bg `paper-100`、border 1px、focus で border `bronze-500`。角丸 2px、高さ 44px
- ラベルは上に 12px Noto Sans JP `stone-500`

**Navigation**

- PC サイドバー：幅 240px、bg `ink-900`、項目は 14px `paper-100` 70% opacity → アクティブは 100% + 左に 2px `bronze-500` の縦線
- モバイル下部タブ：高さ 56px、bg `ink-900`、アイコン + 10px ラベル

**Avatar**

- 円形は許容（人物のため）。ボーダー 1px `stone-300`。初期アバターは `paper-200` 背景 + イニシャル（Shippori Mincho）

**Empty State**

- 中央に短い明朝体の一文（例「まだ質問はありません。」）と ghost ボタン 1 つ。イラストは置かない

**Toast / Notification**

- 画面下中央、bg `ink-800`、text `paper-100`、border `bronze-500` 1px（左辺のみ）。3 秒で消える。音・バイブなし

### 9.6 モーション

- 基本 220ms、`cubic-bezier(0.22, 1, 0.36, 1)`
- フェードと 4–8px の縦移動のみ。バウンス・スケール・パララックスは使わない
- ページ遷移はクロスフェード 160ms
- `prefers-reduced-motion` を尊重

### 9.7 ダークモード

- 独立したダークモードは作らない（ブランドとして明・暗を意図的に配置しているため）
- ナビ・ヒーロー・フッターが暗、コンテンツ面が明、というリズムを全ページで一貫させる

### 9.8 アイコン・画像

- アイコン：lucide-react、stroke 1.5、色は `stone-500`（アクティブ `bronze-500`）
- 写真を使う場合：低彩度・暗めのトーンに調整（CSS `filter: saturate(0.7)` など）。人物写真は原則不使用
- 装飾は「細い線」「余白」「字間」で表現する。図形・パターンを散らさない

---

## 10. 技術スタック

| レイヤー | 採用 | 理由 |
|---|---|---|
| フレームワーク | **Next.js 15（App Router）+ TypeScript** | SSR/RSC、Server Actions で API 層を薄く |
| UI | **Tailwind CSS + shadcn/ui（Radix）** | shadcn はトークンを §9 に全面差し替えて使用 |
| DB / Auth / Storage | **Supabase**（PostgreSQL / Auth / Storage / Realtime） | 月 100 人規模に十分。RLS で権限を DB 層で担保 |
| ORM | **Drizzle ORM** | 型安全、マイグレーションを Git 管理 |
| 動画 | **YouTube 埋め込み**（`react-youtube` / IFrame API） | 既存資産。限定公開（unlisted）動画を使用 |
| スライド | Supabase Storage（PDF）+ **PDF.js** | |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` | テキスト教材・投稿 |
| メール | **Resend** + `react-email` | |
| PDF 生成 | `@react-pdf/renderer` | 修了証 |
| バリデーション | `zod` | Server Actions の入力検証 |
| フォーム | `react-hook-form` | |
| 状態管理 | RSC + `nuqs`（URL state）。クライアント状態は最小限 | |
| テスト | **Vitest**（単体）+ **Playwright**（E2E 主要フロー） | |
| ホスティング | **Vercel**（Cron 含む） | |
| 監視 | Vercel Analytics + Sentry | |
| Lint / Format | ESLint + Prettier + Biome（任意） | |

### 10.1 リポジトリ構成

```
studio-n-lms/
├── app/                    # §6 参照
├── components/
│   ├── ui/                 # shadcn ベース（トークン差替済）
│   ├── learn/              # VideoPlayer, LessonNav, ProgressBar, ...
│   ├── qa/
│   ├── community/
│   ├── gamification/       # XPBadge, RankingTable, CertificateCard
│   └── layout/             # Sidebar, MobileTabBar, Header
├── lib/
│   ├── supabase/           # client / server / admin
│   ├── db/                 # drizzle schema, queries
│   ├── actions/            # Server Actions（§8.1）
│   ├── email/              # react-email templates
│   ├── xp.ts               # XP ルール・バッジ判定
│   └── utils.ts
├── drizzle/                # migrations
├── supabase/
│   ├── migrations/         # RLS, triggers, functions, views
│   └── seed.sql
├── emails/
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
├── CLAUDE.md
├── REQUIREMENTS.md         # このファイル
└── .env.example
```

### 10.2 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=
EMAIL_FROM="studio N <noreply@studio-n.example>"
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
SENTRY_DSN=
```

---

## 11. 非機能要件

| 項目 | 要件 |
|---|---|
| レスポンシブ | 360px〜1440px。ブレークポイント：`sm 640` / `md 768` / `lg 1024` / `xl 1280` |
| パフォーマンス | LCP < 2.5s、CLS < 0.1（Vercel Analytics で計測）。画像は `next/image`、フォントは `next/font` |
| アクセシビリティ | WCAG 2.1 AA。コントラスト比：`ink-700` on `paper-100` = 12.6:1、`stone-500` on `paper-100` = 5.3:1（補足テキストとして AA 合格）、`paper-100` on `ink-900` = 17.8:1。キーボード操作・フォーカスリング必須 |
| セキュリティ | 全テーブル RLS。Storage は署名付き URL（有効 1 時間）。CSRF は Server Actions 標準。レート制限（投稿系：1 分 10 回）。画像アップロードは MIME・サイズ検証 + 拡張子ホワイトリスト |
| プライバシー | メールアドレスは本人と admin 以外に露出しない。ランキング・プロフィールは表示名のみ |
| データ保持 | 退会後は個人情報を匿名化、投稿は「退会ユーザー」表示で保持 |
| バックアップ | Supabase の PITR（日次）。 |
| SEO | 公開ページ（`/`, `/faq`, `/verify`）のみ。会員ページは `noindex` |
| i18n | 日本語のみ。日付は JST、`YYYY年M月D日（曜）` 表記 |
| ブラウザ | 最新 2 バージョンの Chrome / Safari / Edge / Firefox、iOS Safari 16+ |
| ログ | Server Actions のエラーは Sentry。監査ログ：ロール変更・退会・コンテンツ非表示は `audit_logs` に記録（admin 閲覧） |

---

## 12. フェーズ計画

各フェーズの終わりに **受け入れ基準** を満たすこと。

### Phase 1 — 基盤（4〜6 週）

**スコープ：** 認証（招待制）、プロフィール、コース／セクション／レッスン、動画・スライド・テキスト視聴、進捗、ダッシュボード、管理画面（コース・会員）、デザインシステム実装

**受け入れ基準**
- [ ] 管理者が招待リンクを発行し、受講生が登録・ログインできる
- [ ] 管理画面からコース・レッスン（3 形式）を作成・公開できる
- [ ] 受講生がレッスンを視聴し、進捗が保存・レジュームされる
- [ ] コース完了でダッシュボードに反映される
- [ ] PC / モバイルで §6.1 のレイアウトになっている
- [ ] Lighthouse：Performance 90+ / Accessibility 95+
- [ ] §9 のトークンのみで実装されている（任意の HEX が直書きされていない）

### Phase 2 — コミュニティ（3〜4 週）

**スコープ：** Q&A フォーラム、コミュニティ（チャンネル・投稿・コメント・リアクション・メンション）、通知（アプリ内 + メール）、オフィスアワー

**受け入れ基準**
- [ ] 質問 → 講師回答 → 質問者にメール + アプリ内通知が届く
- [ ] Q&A とコミュニティが UI 上明確に分かれている（色・見出し・導線）
- [ ] 通報 → 管理者が非表示にできる
- [ ] オフィスアワーの予定・事前質問・投票・録画掲載が動く
- [ ] リマインドメールが Cron で送られる

### Phase 3 — ゲーミフィケーション（2〜3 週）

**スコープ：** XP、バッジ、ランキング、修了証 PDF + 検証ページ、小テスト、ストリーク

**受け入れ基準**
- [ ] 各行動で XP が加算され、materialized view でランキングが更新される
- [ ] オプトアウトした会員がランキングに出ない
- [ ] コース完了で修了証 PDF が生成され、`/verify/[code]` で検証できる
- [ ] バッジ条件（§5.6）が全て自動判定される
- [ ] 小テスト合格で完了扱いになる

### Phase 4 — 仕上げ（2〜3 週）

**スコープ：** ランディングページ、FAQ 公開ページ、週間サマリー、E2E テスト、監視、既存コンテンツ投入、リリース

**受け入れ基準**
- [ ] Playwright で「招待 → 登録 → 受講 → 完了 → 修了証」の E2E が通る
- [ ] Sentry にエラーが流れる
- [ ] 既存の AI / n8n コースが投入済み
- [ ] 本番ドメインで HTTPS 稼働

---

## 13. 未決事項（実装前に確認）

| # | 項目 | 選択肢 / 仮置き |
|---|---|---|
| 1 | サービス名・ロゴ | 仮：「studio N」。ロゴデータの有無 |
| 2 | ドメイン | 例：`learn.studio-n.jp` |
| 3 | 決済 | 初期スコープ外（招待制）。将来 Stripe を追加する可能性あり → `enrollments` に `source` 列を残しておく |
| 4 | Google ログイン | Phase 2 で追加するか |
| 5 | オフィスアワーの配信手段 | YouTube Live か Zoom か（`join_url` はどちらでも対応） |
| 6 | FAQ ページの公開範囲 | 一般公開 / 会員限定 |
| 7 | 修了証のデザイン | 縦か横か、押印（studio N 印）の有無、英語併記の有無 |
| 8 | 既存コンテンツの一覧 | コース名・レッスン構成・YouTube ID の一覧表（投入用 CSV） |
| 9 | 利用規約・プライバシーポリシー | 文面の用意 |
| 10 | 送信元メールアドレス | ドメイン認証（SPF/DKIM）の設定 |

---

*End of document.*
