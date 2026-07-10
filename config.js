// ====== 設定ファイル ======
// SupabaseのProject Settings > API からコピーして貼り付けてください。
// anonキーは公開前提のキーです(秘密のservice_roleキーは絶対に書かないこと)。

window.CONFIG = {
  SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...(anon public key)",

  // 簡易パスコード。空文字 "" にするとパスコード画面をスキップします。
  // ※ 本格的な認証ではなく、社外の人が偶然開いた場合の抑止用です。
  APP_PASSCODE: "",
};
