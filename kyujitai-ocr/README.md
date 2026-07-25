# 旧字体OCR転記ツール(kyujitai-ocr)

旧字体(舊字體)で書かれた文書の画像・PDFをOCRで読み取り、**新字体に自動変換してスプレッドシートへ転記**するツールです。

ビルド不要の静的ページ1枚(`kyujihenkan.html`)で動作します。ブラウザで開くだけで使えます。

## できること

| 機能 | 内容 |
|---|---|
| 入力 | 画像(JPG/PNG/GIF/BMP/WebP)、PDF(複数ページ対応)、クリップボード貼り付け(Ctrl+V)、テキスト直接貼り付け |
| OCR | ブラウザ内OCR(Tesseract.js)。横書き・縦書き・自動判定に対応。画像は外部サーバーへ送信されません |
| 変換 | 旧字体→新字体 約330字の標準辞書、人名異体字(髙→高、﨑→崎 など)、変体仮名(ゐ→い、ゑ→え)、カスタム辞書(語句単位も可) |
| 確認 | 表のセルを直接編集可。変換箇所はハイライト表示、行ごとにOCR信頼度を表示 |
| 出力 | **Excel(.xlsx)保存 / CSV保存 / コピーしてGoogleスプレッドシートへ貼り付け / Google Apps Script経由でシートへ直接自動転記** |

## 使い方(3ステップ)

1. **文書を読み込む** — 画像やPDFをドラッグ&ドロップ(「サンプル画像で試す」ボタンでお試し可能)
2. **OCRを実行** — 文字の向き(縦書き/横書き)を選んで「OCRを実行して表へ転記」を押す
3. **出力** — 表で内容を確認・修正し、Excel保存またはGoogleスプレッドシートへ送信

> 初回実行時のみ、OCRエンジン(約15MB)のダウンロードに少し時間がかかります。2回目以降は高速です。

## 公開方法

GitHub Pagesなどの静的ホスティングにそのまま置けます(URLは `…/kyujitai-ocr/kyujihenkan.html`)。ローカルで `kyujihenkan.html` をダブルクリックして開いても動作します(OCRエンジンの読み込みにインターネット接続が必要です)。

## Googleスプレッドシートへの直接自動転記(任意・所要5分)

ボタン1つでGoogleスプレッドシートに行を追記したい場合は、Google Apps Script(GAS)のWebアプリを1つ作成します。

1. 転記先にしたいGoogleスプレッドシートを開く
2. メニュー「**拡張機能 → Apps Script**」を開く
3. 以下のコードを貼り付けて保存

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // シートが空ならヘッダー行を追加
  if (sheet.getLastRow() === 0 && data.header) {
    sheet.appendRow(data.header);
  }
  (data.rows || []).forEach(function(row) { sheet.appendRow(row); });
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, added: (data.rows || []).length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. 右上「**デプロイ → 新しいデプロイ**」→ 種類「**ウェブアプリ**」を選択
   - 「次のユーザーとして実行」: **自分**
   - 「アクセスできるユーザー」: **全員**
5. 発行された `https://script.google.com/macros/s/…/exec` のURLをコピー
6. ツールの「ステップ4」→「Googleスプレッドシートへ直接自動転記する」を開き、URLを貼り付けて「シートへ送信」

URLはお使いのブラウザ(localStorage)にのみ保存されます。

> ⚠️ 「アクセスできるユーザー: 全員」にすると、URLを知っている人は誰でもそのシートに行を追記できます。URLは共有しないでください。

## 変換辞書について

- **標準辞書**: 常用漢字表の旧字体(康熙字典体)を中心に約330字を収録(亞→亜、學→学、體→体、圓→円 など)
- **人名異体字**(初期設定OFF): 髙→高、﨑→崎、濵→浜、邉→辺 など。人名・地名の表記を保持したい場合はOFFのままにしてください
- **変体仮名**: ゐ→い、ゑ→え、ヰ→イ、ヱ→エ
- **カスタム辞書**: 画面下部の「変換辞書を確認・カスタマイズする」から `旧字=新字` 形式で追加できます(「株式會社=株式会社」のような語句単位の登録も可能)

## OCR精度についての注意

- OCRエンジンの標準日本語モデルは旧字体の学習量が少ないため、**かすれた古文書・毛筆の崩し字は誤認識が多くなります**。活字(印刷物)の旧字体文書がもっとも高精度です
- 精度を上げるコツ: ① 300dpi以上でスキャンする ② 傾きを補正する ③ 縦書き文書は「縦書き」を明示的に選ぶ ④ 信頼度が低い行(赤・橙表示)を優先的に目視確認する
- 崩し字(くずし字)の認識が必要な場合は、国立国語研究所などが公開する専用AIモデルの利用をご検討ください

## 技術構成

| 要素 | 使用技術 |
|---|---|
| OCR | [Tesseract.js](https://github.com/naptha/tesseract.js) v5(jpn / jpn_vert モデル) |
| PDF展開 | [PDF.js](https://mozilla.github.io/pdf.js/)(各ページを画像化してOCR) |
| Excel出力 | [SheetJS](https://sheetjs.com/)(xlsx) |
| 旧新変換 | 内蔵辞書(ページ内のJavaScriptに収録、通信不要) |

すべてCDN読み込みのため、ビルド・サーバーは不要です。
