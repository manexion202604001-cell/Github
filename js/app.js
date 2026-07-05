/* =====================================================
   古河めぐり スタンプラリー - アプリ本体
   ===================================================== */
(() => {
  "use strict";

  const STORAGE_KEY = "koga-stamp-rally-v1";
  const TOTAL = SPOTS.length;

  /* ---------- 状態管理 ---------- */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          stamps: parsed.stamps || {},
          demo: !!parsed.demo,
        };
      }
    } catch (e) {
      /* 壊れたデータは初期化 */
    }
    return { stamps: {}, demo: false };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("⚠️ データを保存できませんでした（プライベートモード？）");
    }
  }

  const state = loadState();

  const stampCount = () => Object.keys(state.stamps).length;
  const isStamped = (id) => !!state.stamps[id];

  /* ---------- ユーティリティ ---------- */

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /** 2点間距離(m) — ハバースイン公式 */
  function distanceM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function formatDistance(m) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("この端末では位置情報が利用できません"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });
    });
  }

  /** ひらがな比較用の正規化（カタカナ→ひらがな、空白除去） */
  function normalizeKeyword(s) {
    return (s || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[ァ-ヶ]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
      );
  }

  function currentRank() {
    let rank = null;
    for (const r of REWARDS) {
      if (stampCount() >= r.count) rank = r;
    }
    return rank;
  }

  function nextReward() {
    return REWARDS.find((r) => stampCount() < r.count) || null;
  }

  /* ---------- トースト ---------- */

  let toastTimer = null;
  function showToast(msg, ms = 3200) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), ms);
  }

  /* ---------- 紙吹雪 ---------- */

  function fireConfetti(big = false) {
    const canvas = $("#confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#c0392b", "#c9a227", "#2f5d8a", "#f7f4ec", "#c2547d"];
    const n = big ? 180 : 70;
    const parts = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
    }));

    const started = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - started < (big ? 4200 : 2400)) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- タブ切り替え ---------- */

  let map = null;
  let mapMarkers = {};

  function switchView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    $(`#view-${name}`).classList.add("active");
    $$(".tab").forEach((t) => {
      const active = t.dataset.view === name;
      t.classList.toggle("active", active);
      if (active) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    if (name === "map") initMap();
    window.scrollTo({ top: 0 });
  }

  /* ---------- マップ ---------- */

  function pinIcon(spot) {
    const done = isStamped(spot.id);
    return L.divIcon({
      className: "",
      html: `<div class="map-pin ${done ? "done" : "todo"}"><span>${spot.emoji}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -28],
    });
  }

  function initMap() {
    if (map) {
      map.invalidateSize();
      return;
    }
    if (typeof L === "undefined") {
      $("#map").innerHTML =
        '<p style="padding:20px;text-align:center;color:#7d7d76">地図ライブラリを読み込めませんでした。通信環境をご確認ください。</p>';
      return;
    }
    map = L.map("map").setView([36.19, 139.705], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    for (const spot of SPOTS) {
      const marker = L.marker([spot.lat, spot.lng], { icon: pinIcon(spot) }).addTo(map);
      marker.bindPopup(
        `<div class="map-popup"><strong>${spot.emoji} ${spot.name}</strong><br>` +
          `${spot.category} ${isStamped(spot.id) ? "／✅ 取得済み" : ""}<br>` +
          `<button class="btn btn-small btn-primary" data-open-spot="${spot.id}">詳細・チェックイン</button></div>`
      );
      mapMarkers[spot.id] = marker;
    }

    map.on("popupopen", (e) => {
      const btn = e.popup.getElement().querySelector("[data-open-spot]");
      if (btn) btn.addEventListener("click", () => openSpotModal(btn.dataset.openSpot));
    });
  }

  function refreshMapMarkers() {
    if (!map) return;
    for (const spot of SPOTS) {
      mapMarkers[spot.id]?.setIcon(pinIcon(spot));
    }
  }

  let userMarker = null;
  async function locateUser() {
    if (!map) return;
    try {
      showToast("📡 現在地を取得中…", 8000);
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: "#2f5d8a",
        fillOpacity: 1,
      }).addTo(map).bindPopup("現在地");
      map.setView([latitude, longitude], 14);
      showToast("📍 現在地を表示しました");
    } catch (e) {
      showToast("⚠️ 現在地を取得できませんでした");
    }
  }

  /* ---------- ホーム ---------- */

  function renderHome() {
    const count = stampCount();
    const pct = Math.round((count / TOTAL) * 100);
    $("#header-count").textContent = count;
    $("#progress-fill").style.width = `${pct}%`;
    $("#stat-count").textContent = count;
    $("#stat-percent").textContent = `${pct}%`;

    const rank = currentRank();
    $("#stat-rank").textContent = rank ? `${rank.icon}${rank.rank}` : "—";

    const next = nextReward();
    const hint = $("#next-reward-hint");
    if (next) {
      hint.innerHTML = `あと <strong>${next.count - count}個</strong> のスタンプで ${next.icon}<strong>${next.title}</strong> を獲得！`;
    } else {
      hint.innerHTML = "👑 <strong>全スタンプ制覇！</strong> スタンプ帳から認定証を発行できます。";
    }

    $("#demo-toggle").checked = state.demo;
  }

  /* ---------- スタンプ帳 ---------- */

  function renderStamps(justStampedId = null) {
    const grid = $("#stamp-grid");
    grid.innerHTML = "";
    for (const spot of SPOTS) {
      const cell = document.createElement("button");
      cell.className = "stamp-cell" + (spot.id === justStampedId ? " just-stamped" : "");
      cell.setAttribute(
        "aria-label",
        `${spot.name}: ${isStamped(spot.id) ? "取得済み" : "未取得"}`
      );
      if (isStamped(spot.id)) {
        cell.innerHTML =
          `<div class="stamp-mark" style="--stamp-color:${spot.color}">` +
          `<span class="stamp-snow">❆</span><span>${spot.emoji}</span></div>` +
          `<span class="cell-name">${spot.name}</span>` +
          `<span class="stamp-date">${formatDate(state.stamps[spot.id])}</span>`;
      } else {
        cell.innerHTML =
          `<div class="stamp-empty">？</div>` +
          `<span class="cell-name">${spot.name}</span>`;
      }
      cell.addEventListener("click", () => openSpotModal(spot.id));
      grid.appendChild(cell);
    }

    const count = stampCount();
    const msg = $("#stampbook-message");
    if (count === 0) msg.textContent = "スポットを巡ってスタンプを集めよう！";
    else if (count === TOTAL) msg.textContent = "🎉 全スポット制覇！おめでとうございます！";
    else msg.textContent = `${TOTAL}個中 ${count}個 のスタンプを集めました`;

    $("#certificate-card").hidden = count !== TOTAL;
  }

  /* ---------- スポット一覧 ---------- */

  let activeFilter = "all";
  let lastKnownPos = null;

  function renderSpotList() {
    const list = $("#spot-list");
    list.innerHTML = "";
    const spots = SPOTS.filter(
      (s) => activeFilter === "all" || s.category === activeFilter
    );
    for (const spot of spots) {
      const done = isStamped(spot.id);
      const item = document.createElement("button");
      item.className = "spot-item";
      let distHtml = "";
      if (lastKnownPos) {
        const d = distanceM(lastKnownPos.lat, lastKnownPos.lng, spot.lat, spot.lng);
        distHtml = `<span class="spot-distance">📍 約${formatDistance(d)}</span>`;
      }
      item.innerHTML =
        `<span class="spot-thumb" style="background:${spot.color}">${spot.emoji}</span>` +
        `<span class="spot-info">` +
        `<span class="spot-name">${spot.name}</span>` +
        `<span class="spot-meta"><span class="spot-badge">${spot.category}</span>${distHtml}</span>` +
        `</span>` +
        `<span class="spot-state ${done ? "done" : "todo"}">${done ? "✔" : "○"}</span>`;
      item.addEventListener("click", () => openSpotModal(spot.id));
      list.appendChild(item);
    }
  }

  /* ---------- 特典 ---------- */

  function renderRewards() {
    const wrap = $("#reward-list");
    wrap.innerHTML = "";
    const count = stampCount();
    for (const r of REWARDS) {
      const unlocked = count >= r.count;
      const div = document.createElement("div");
      div.className = "reward-item" + (unlocked ? " unlocked" : "");
      div.innerHTML =
        `<span class="reward-icon">${r.icon}</span>` +
        `<div class="reward-body">` +
        `<div class="reward-title">${r.title}</div>` +
        `<div class="reward-req">スタンプ${r.count}個で獲得</div>` +
        `<div class="reward-detail">${r.detail}</div>` +
        `</div>` +
        `<span class="reward-state">${unlocked ? "獲得済み" : `あと${r.count - count}個`}</span>`;
      wrap.appendChild(div);
    }
  }

  /* ---------- スポット詳細モーダル ---------- */

  function closeModal() {
    $("#modal").hidden = true;
    $("#modal-body").innerHTML = "";
  }

  function openSpotModal(id) {
    const spot = SPOTS.find((s) => s.id === id);
    if (!spot) return;
    const done = isStamped(id);
    const body = $("#modal-body");

    let checkinHtml;
    if (done) {
      checkinHtml =
        `<div class="modal-stamped-banner">✅ スタンプ取得済み` +
        `<small>${formatDate(state.stamps[id])} にチェックイン</small></div>`;
    } else {
      checkinHtml =
        `<div class="checkin-area">` +
        `<button class="btn btn-checkin" id="gps-checkin">📡 GPSでチェックイン</button>` +
        `<div class="checkin-status" id="checkin-status"></div>` +
        `<div class="keyword-label">GPSが使えないときは、現地掲示の「合言葉」を入力</div>` +
        `<div class="keyword-row">` +
        `<input type="text" id="keyword-input" placeholder="合言葉（ひらがな）" autocomplete="off">` +
        `<button class="btn btn-primary" id="keyword-checkin">送信</button>` +
        `</div></div>`;
    }

    body.innerHTML =
      `<div class="modal-hero">` +
      `<span class="modal-emoji" style="background:${spot.color}">${spot.emoji}</span>` +
      `<div><h3 id="modal-title">${spot.name}</h3><div class="modal-kana">${spot.kana}</div></div>` +
      `</div>` +
      `<p class="modal-desc">${spot.description}</p>` +
      `<dl class="modal-facts">` +
      `<dt>カテゴリ</dt><dd>${spot.category}</dd>` +
      `<dt>住所</dt><dd>${spot.address}</dd>` +
      `<dt>時間</dt><dd>${spot.hours}</dd>` +
      `<dt>休み</dt><dd>${spot.holiday}</dd>` +
      `</dl>` +
      checkinHtml +
      `<a class="gmap-link" href="https://www.google.com/maps/search/?api=1&query=${spot.lat}%2C${spot.lng}" target="_blank" rel="noopener">🗺️ Googleマップで経路を見る</a>`;

    if (!done) {
      $("#gps-checkin").addEventListener("click", () => gpsCheckin(spot));
      $("#keyword-checkin").addEventListener("click", () => keywordCheckin(spot));
      $("#keyword-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") keywordCheckin(spot);
      });
    }

    $("#modal").hidden = false;
  }

  /* ---------- チェックイン ---------- */

  async function gpsCheckin(spot) {
    const btn = $("#gps-checkin");
    const status = $("#checkin-status");

    if (state.demo) {
      grantStamp(spot, "デモモード");
      return;
    }

    btn.disabled = true;
    status.textContent = "📡 現在地を確認しています…";
    try {
      const pos = await getPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      lastKnownPos = { lat: latitude, lng: longitude };
      const dist = distanceM(latitude, longitude, spot.lat, spot.lng);
      // GPS誤差ぶんは訪問者に有利に扱う
      const effective = dist - Math.min(accuracy || 0, 100);
      if (effective <= spot.radius) {
        grantStamp(spot, "GPS");
      } else {
        status.textContent = `📏 スポットまで約${formatDistance(dist)}。半径${formatDistance(spot.radius)}以内でチェックインできます。`;
        btn.disabled = false;
      }
      renderSpotList();
    } catch (e) {
      status.textContent =
        "⚠️ 位置情報を取得できませんでした。設定で位置情報を許可するか、合言葉でチェックインしてください。";
      btn.disabled = false;
    }
  }

  function keywordCheckin(spot) {
    const input = $("#keyword-input");
    const status = $("#checkin-status");
    const entered = normalizeKeyword(input.value);
    if (!entered) {
      status.textContent = "合言葉を入力してください。";
      return;
    }
    if (entered === normalizeKeyword(spot.keyword)) {
      grantStamp(spot, "合言葉");
    } else {
      status.textContent = "❌ 合言葉が違います。現地の掲示をご確認ください。";
      input.select();
    }
  }

  function grantStamp(spot, method) {
    if (isStamped(spot.id)) return;
    state.stamps[spot.id] = Date.now();
    saveState();

    closeModal();
    renderAll(spot.id);
    refreshMapMarkers();

    const count = stampCount();
    const complete = count === TOTAL;
    fireConfetti(complete);

    if (complete) {
      showToast("👑 全スポット制覇！おめでとうございます！", 5000);
      switchView("stamps");
    } else {
      const justUnlocked = REWARDS.find((r) => r.count === count);
      if (justUnlocked) {
        showToast(`${justUnlocked.icon} ${spot.name} のスタンプGET！「${justUnlocked.title}」獲得！`, 4500);
      } else {
        showToast(`❆ ${spot.name} のスタンプをGET！（${method}） 残り${TOTAL - count}個`, 4000);
      }
    }
  }

  /* ---------- 認定証 ---------- */

  function drawSnowflake(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.22, -r * 0.75);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.22, -r * 0.75);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function makeCertificate() {
    const name = ($("#cert-name").value || "").trim() || "旅人";
    const canvas = $("#cert-canvas");
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // 背景
    ctx.fillStyle = "#f7f4ec";
    ctx.fillRect(0, 0, W, H);

    // 枠
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 10;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // 雪華の飾り
    drawSnowflake(ctx, 100, 100, 38, "rgba(47,93,138,0.35)");
    drawSnowflake(ctx, W - 100, 100, 38, "rgba(47,93,138,0.35)");
    drawSnowflake(ctx, 100, H - 100, 38, "rgba(47,93,138,0.35)");
    drawSnowflake(ctx, W - 100, H - 100, 38, "rgba(47,93,138,0.35)");

    ctx.textAlign = "center";
    ctx.fillStyle = "#1e3a5f";
    ctx.font = "bold 52px 'Hiragino Mincho ProN', 'Yu Mincho', serif";
    ctx.fillText("完全制覇認定証", W / 2, 140);

    ctx.font = "26px sans-serif";
    ctx.fillStyle = "#2b2b2b";
    ctx.fillText("古河めぐり こがし観光スタンプラリー", W / 2, 190);

    ctx.font = "bold 58px 'Hiragino Mincho ProN', 'Yu Mincho', serif";
    ctx.fillStyle = "#2b2b2b";
    ctx.fillText(`${name} 殿`, W / 2, 300);

    ctx.font = "26px sans-serif";
    ctx.fillStyle = "#2b2b2b";
    ctx.fillText("あなたは古河市の観光スポット12か所を巡り", W / 2, 380);
    ctx.fillText("すべてのスタンプを集めたことをここに認定します", W / 2, 424);

    const d = new Date();
    ctx.font = "24px sans-serif";
    ctx.fillText(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`, W / 2, 500);
    ctx.fillText("古河めぐり スタンプラリー実行委員会", W / 2, 545);

    // 朱印風スタンプ
    ctx.save();
    ctx.translate(W - 190, H - 165);
    ctx.rotate(-0.12);
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c0392b";
    ctx.font = "bold 34px 'Hiragino Mincho ProN', 'Yu Mincho', serif";
    ctx.fillText("古河", 0, -8);
    ctx.fillText("制覇", 0, 34);
    ctx.restore();

    // ダウンロード
    const a = document.createElement("a");
    a.download = `koga-stamp-rally-certificate.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    showToast("🎓 認定証をダウンロードしました！");
  }

  /* ---------- シェア ---------- */

  async function shareProgress() {
    const count = stampCount();
    const rank = currentRank();
    const text =
      count === TOTAL
        ? `【古河めぐり】古河市観光スタンプラリー、全${TOTAL}スポット完全制覇しました！👑❆`
        : `【古河めぐり】古河市観光スタンプラリーに挑戦中！ ${count}/${TOTAL}個のスタンプを集めました${rank ? `（${rank.icon}${rank.title}獲得）` : ""}❆`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "古河めぐり スタンプラリー", text });
      } catch (e) {
        /* ユーザーがキャンセル */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast("📋 シェア用テキストをコピーしました");
    } else {
      showToast(text, 6000);
    }
  }

  /* ---------- 再描画 ---------- */

  function renderAll(justStampedId = null) {
    renderHome();
    renderStamps(justStampedId);
    renderSpotList();
    renderRewards();
  }

  /* ---------- イベント登録 ---------- */

  function bindEvents() {
    // タブ
    $$(".tab").forEach((t) =>
      t.addEventListener("click", () => switchView(t.dataset.view))
    );
    // 「スポットを見る」等のショートカット
    $$("[data-goto]").forEach((b) =>
      b.addEventListener("click", () => switchView(b.dataset.goto))
    );

    // モーダル
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => {
      if (e.target === $("#modal")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) closeModal();
    });

    // フィルタ
    $$("#filter-row .chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        $$("#filter-row .chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter;
        renderSpotList();
      })
    );

    // デモモード
    $("#demo-toggle").addEventListener("change", (e) => {
      state.demo = e.target.checked;
      saveState();
      showToast(state.demo ? "🧪 デモモードON：どこでもチェックインできます" : "デモモードOFF");
    });

    // リセット
    $("#reset-btn").addEventListener("click", () => {
      if (stampCount() === 0) {
        showToast("スタンプはまだありません");
        return;
      }
      if (confirm("すべてのスタンプを削除します。よろしいですか？")) {
        state.stamps = {};
        saveState();
        renderAll();
        refreshMapMarkers();
        showToast("🗑️ リセットしました");
      }
    });

    // マップ現在地
    $("#locate-btn").addEventListener("click", locateUser);

    // 認定証・シェア
    $("#cert-btn").addEventListener("click", makeCertificate);
    $("#share-btn").addEventListener("click", shareProgress);
  }

  /* ---------- Service Worker ---------- */

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* オフライン対応はベストエフォート */
      });
    });
  }

  /* ---------- 起動 ---------- */

  bindEvents();
  renderAll();
})();
