// ====== 稟議システム 設定ファイル ======
// Supabase同期を使う場合は、SupabaseのProject Settings > API からコピーして貼り付けてください。
// 空のままでもアプリは動きます(このブラウザ内だけの保存 = localStorage モード)。
// anonキーは公開前提のキーです(秘密のservice_roleキーは絶対に書かないこと)。

window.RINGI_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // 簡易パスコード。空文字 "" にするとパスコード画面をスキップします。
  // ※ 本格的な認証ではなく、社外の人が偶然開いた場合の抑止用です。
  APP_PASSCODE: "",
};
