'use strict';

// ===== Data Tables =====

const RACES = {
  human:      { label: '人間',         icon: '🧑', bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, hpBonus: 0, traitPool: ['適応力', '多才', '野心的', '勤勉'] },
  elf:        { label: 'エルフ',        icon: '🧝', bonuses: { dex: 2, int: 1 },                                  hpBonus: -2, traitPool: ['優雅', '長命', '鋭敏な感覚', '魔法親和'] },
  dwarf:      { label: 'ドワーフ',      icon: '⛏️', bonuses: { con: 2, str: 1 },                                  hpBonus: 4, traitPool: ['頑健', '頑固', '職人気質', '忠義'] },
  halfling:   { label: 'ハーフリング', icon: '🌿', bonuses: { dex: 2, cha: 1 },                                  hpBonus: -1, traitPool: ['幸運', '機敏', '好奇心旺盛', '楽天的'] },
  orc:        { label: 'オーク',        icon: '💪', bonuses: { str: 2, con: 2, int: -1 },                         hpBonus: 6, traitPool: ['野性', '勇猛', '誇り高い', '直情的'] },
  dragonborn: { label: 'ドラゴンボーン',icon: '🐉', bonuses: { str: 2, cha: 1 },                                  hpBonus: 2, traitPool: ['名誉', '竜の血', '威圧感', '不屈'] },
  tiefling:   { label: 'ティーフリング',icon: '😈', bonuses: { int: 1, cha: 2 },                                  hpBonus: -1, traitPool: ['呪われし血', '神秘的', '孤高', '復讐心'] },
};

const CLASSES = {
  warrior:  { label: '戦士',       icon: '⚔️',  primary: ['str', 'con'],  hpMod: 10, mpMod: 2,  color: '#e74c3c', skillType: 'physical' },
  mage:     { label: '魔法使い',   icon: '🧙',  primary: ['int', 'wis'],   hpMod: 4,  mpMod: 12, color: '#9b59b6', skillType: 'magic' },
  rogue:    { label: '盗賊',       icon: '🗡️',  primary: ['dex', 'cha'],  hpMod: 6,  mpMod: 4,  color: '#3d3d3d', skillType: 'special' },
  paladin:  { label: '聖騎士',     icon: '🛡️',  primary: ['str', 'cha'],  hpMod: 9,  mpMod: 6,  color: '#f5c842', skillType: 'support' },
  ranger:   { label: 'レンジャー', icon: '🏹',  primary: ['dex', 'wis'],  hpMod: 7,  mpMod: 5,  color: '#2ecc71', skillType: 'physical' },
  cleric:   { label: '聖職者',     icon: '✝️',  primary: ['wis', 'cha'],  hpMod: 6,  mpMod: 10, color: '#f0e6d3', skillType: 'support' },
  bard:     { label: '吟遊詩人',   icon: '🎵',  primary: ['cha', 'dex'],  hpMod: 5,  mpMod: 7,  color: '#e67e22', skillType: 'special' },
  druid:    { label: 'ドルイド',   icon: '🌿',  primary: ['wis', 'int'],  hpMod: 6,  mpMod: 9,  color: '#27ae60', skillType: 'magic' },
};

const SKILLS = {
  physical: ['パワーアタック', '渾身の一撃', '盾ぼこ', '突進', '連続攻撃', 'カウンター', '武器投擲', 'ガードスタンス'],
  magic:    ['ファイアボール', 'ライトニング', 'ブリザード', 'アルカナミサイル', '魔力爆発', '時間停止', 'テレポート', '魔法障壁'],
  support:  ['ヒール', 'バフオーラ', 'リザレクション', '祝福', '解毒', 'バリア', 'プロテクト', '鼓舞'],
  special:  ['バックスタブ', '毒塗り', 'フェイント', '煙幕', '鍵開け', 'サイレント', 'ミスリードs', '急所突き'],
};

const NAMES_MALE = [
  'アルヴィン', 'ベルカー', 'カイン', 'ダリオン', 'エルード', 'フェルガス', 'ガレス', 'ハルウィン',
  'イザーン', 'ジャレン', 'カルロス', 'レオン', 'マルカス', 'ナタン', 'オリック', 'ペルシバル',
  'クエンタス', 'レイン', 'セイバー', 'タイガー', 'ウルファー', 'バレン', 'ウィン', 'ジャイアン',
  '剣士郎', '炎太郎', '疾風', '鋼鉄', '黒龍', '白狼',
];
const NAMES_FEMALE = [
  'アリア', 'ベレナ', 'セレスティア', 'ドーン', 'エルウィン', 'フェイ', 'グロリア', 'ハルシア',
  'イリス', 'ジュナ', 'カリン', 'ルナ', 'ミーラ', 'ネリア', 'オルガ', 'フォエン',
  'クリア', 'ロザ', 'セラフィーナ', 'テア', 'ウィロー', 'ヴィオレット', 'ゼフィラ', 'アンバー',
  '月姫', '桜花', '紅葉', '雪花', '星夜', '光凜',
];

const EPITHETS_MALE = ['剛剣の', '炎の', '鋼鉄の', '流浪の', '孤高の', '伝説の', '不屈の', '疾風の'];
const EPITHETS_FEMALE = ['銀の', '月の', '炎の', '星の', '嵐の', '永遠の', '夜明けの', '輝ける'];

const PERSONALITY_TRAITS = [
  '勇敢', '慎重', '陽気', '寡黙', '好奇心旺盛', '義理堅い', '皮肉屋',
  '楽観的', '悲観的', '情熱的', '冷静', '正直', '狡猾', '無鉄砲',
  '思いやりがある', '孤独を好む', '仲間想い', '名誉を重んじる',
];

const ALIGNMENTS = [
  '秩序にして善', '中立にして善', '混沌にして善',
  '秩序にして中立', '真の中立', '混沌にして中立',
  '秩序にして悪', '中立にして悪', '混沌にして悪',
];

const BACKSTORY_TEMPLATES = [
  (name, classLabel, raceLabel) => `${name}は${raceLabel}の小さな村で生まれた。幼い頃から${classLabel}としての才能を示し、村を守るために故郷を旅立った。その道に多くの試練が待ち受けているとは、この時まだ知る由もなかった。`,
  (name, classLabel, raceLabel) => `かつては平穏な暮らしを送っていた${raceLabel}の${name}。しかし、謎の組織による村の壊滅がすべてを変えた。復讐と真実を求め、${classLabel}として大陸を渡り歩く日々が始まった。`,
  (name, classLabel, raceLabel) => `古の予言に選ばれし者——${name}。${raceLabel}の血と${classLabel}の力を持つ彼/彼女は、封印が解かれつつある闇の勢力を前に、運命へと踏み出す覚悟を決めた。`,
  (name, classLabel, raceLabel) => `名声も財産も持たないが、誰よりも強い意志を持つ${raceLabel}の${name}。流浪の${classLabel}として辺境を旅しながら、いつか英雄譚に語られる存在になることを夢見ている。`,
  (name, classLabel, raceLabel) => `王都の名門家に生まれながらも、窮屈な貴族社会を捨てた${name}。${raceLabel}としての誇りと${classLabel}の技を武器に、自由を求めて大地を駆ける。`,
];

const WEAPONS = {
  warrior:  ['グレートソード', 'バトルアックス', 'ウォーハンマー', 'ランス', 'ブロードソード'],
  mage:     ['魔導書', '魔法の杖', 'クリスタルオーブ', 'エレメントワンド', 'ルーンスタッフ'],
  rogue:    ['ダガー×2', 'ショートソード', '毒塗りクロスボウ', 'カタナ', 'スローイングナイフ'],
  paladin:  ['聖剣', '神聖なるメイス', 'パラディンブレード', 'セイクリッドランス', '祝福の剣'],
  ranger:   ['ロングボウ', 'コンポジットボウ', 'ハンティングスピア', 'ツインダガー', 'マジックアロー'],
  cleric:   ['セイクリッドスタッフ', '聖なるシンボル', 'モーニングスター', '祈祷書', '癒しの杖'],
  bard:     ['魔法のリュート', 'ラピア', '吟遊の剣', 'エンチャントフルート', '詩人の短剣'],
  druid:    ['木の杖', '自然の鞭', 'ストーンクロー', 'ムーンシルバーシックル', '大地の槌'],
};
const ARMORS = {
  warrior:  ['プレートアーマー', 'チェインメイル', 'バトルプレート'],
  mage:     ['ローブ of Intelligence', 'マジックガーメント', '魔法の衣'],
  rogue:    ['レザーアーマー', 'シャドウスーツ', 'ライトチェイン'],
  paladin:  ['聖なる鎧', '輝く甲冑', 'セイクリッドシールドアーマー'],
  ranger:   ['スタッデッドレザー', 'フォレストアーマー', 'スカウトギア'],
  cleric:   ['チェインコート', '神聖な衣', 'テンプルガーブ'],
  bard:     ['エレガントコート', 'トラベラーズクローク', '絹のローブ'],
  druid:    ['ナチュラルアーマー', 'ウッデンプレート', '草の衣'],
};
const ACCESSORIES = ['知恵の指輪', '力の腕輪', '幸運のお守り', '回復のネックレス', '速度のブーツ', '見切りのサークレット', '魔法抵抗の指輪', '暗視のゴーグル', '不死のお守り', '守護の盾飾り'];

const RARITIES = ['common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'legendary'];
const RARITY_LABELS = { common: 'コモン', uncommon: 'アンコモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー' };

// ===== Utility =====

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (n, arr) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const modifier = (score) => Math.floor((score - 10) / 2);
const modStr = (score) => { const m = modifier(score); return (m >= 0 ? '+' : '') + m; };

function rollStat() {
  const rolls = [randInt(1, 6), randInt(1, 6), randInt(1, 6), randInt(1, 6)];
  rolls.sort((a, b) => a - b);
  return rolls.slice(1).reduce((a, b) => a + b, 0);
}

// ===== Character Generation =====

function generateCharacter(raceKey, classKey, genderKey) {
  const raceId = raceKey === 'random' ? rand(Object.keys(RACES)) : raceKey;
  const classId = classKey === 'random' ? rand(Object.keys(CLASSES)) : classKey;
  const gender = genderKey === 'random' ? rand(['male', 'female']) : genderKey;

  const race = RACES[raceId];
  const cls = CLASSES[classId];

  // Stats
  const baseStats = { str: rollStat(), dex: rollStat(), con: rollStat(), int: rollStat(), wis: rollStat(), cha: rollStat() };
  const stats = {};
  const statKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  for (const k of statKeys) {
    stats[k] = Math.min(20, baseStats[k] + (race.bonuses[k] || 0));
  }
  // Boost primary stats for the class
  for (const pk of cls.primary) { stats[pk] = Math.min(20, stats[pk] + 2); }

  const level = randInt(1, 15);
  const hp = (cls.hpMod + modifier(stats.con) + race.hpBonus) * level + randInt(0, 10);
  const mp = (cls.mpMod + modifier(stats.int)) * level + randInt(0, 5);

  const names = gender === 'male' ? NAMES_MALE : NAMES_FEMALE;
  const epithets = gender === 'male' ? EPITHETS_MALE : EPITHETS_FEMALE;
  const name = rand(names);
  const epithet = rand(epithets);

  const personality = pick(3, PERSONALITY_TRAITS);
  const raceTraits = pick(2, race.traitPool);
  const allTraits = [...new Set([...personality, ...raceTraits])];

  const skills = pick(4, SKILLS[cls.skillType]);
  const alignment = rand(ALIGNMENTS);

  const weapon = { name: rand(WEAPONS[classId] || WEAPONS.warrior), rarity: rand(RARITIES) };
  const armor  = { name: rand(ARMORS[classId] || ARMORS.warrior),  rarity: rand(RARITIES) };
  const accessory = { name: rand(ACCESSORIES), rarity: rand(RARITIES) };

  const backstory = rand(BACKSTORY_TEMPLATES)(name, cls.label, race.label);

  return {
    id: Date.now(),
    name, epithet, gender,
    raceId, classId,
    race: race.label, raceIcon: race.icon,
    class: cls.label, classIcon: cls.icon,
    level, hp: Math.max(1, hp), mp: Math.max(0, mp),
    exp: level * randInt(80, 120),
    stats, alignment, personality: allTraits,
    skills, equipment: { weapon, armor, accessory },
    backstory,
  };
}

// ===== Avatar SVG =====

function buildAvatarSVG(char) {
  const colors = {
    warrior: { skin: '#f4c89a', hair: '#4a2c0a', armor: '#7a8c9e', detail: '#c0c8d0' },
    mage:    { skin: '#f0d9c0', hair: '#2c1a6b', armor: '#4a2c8c', detail: '#9b59b6' },
    rogue:   { skin: '#d4a574', hair: '#1a1a1a', armor: '#2d2d2d', detail: '#6c6c6c' },
    paladin: { skin: '#f5deb3', hair: '#8b6914', armor: '#c0a020', detail: '#f5c842' },
    ranger:  { skin: '#c8a97a', hair: '#3d2b0a', armor: '#4a7c3f', detail: '#7ab56e' },
    cleric:  { skin: '#f8e8d0', hair: '#8b4513', armor: '#d4af7a', detail: '#f0e6d3' },
    bard:    { skin: '#f0d0a0', hair: '#c04000', armor: '#b8442a', detail: '#e67e22' },
    druid:   { skin: '#c8b890', hair: '#3d4a2a', armor: '#4a6a3a', detail: '#8fbc5a' },
  };
  const p = colors[char.classId] || colors.warrior;

  return `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgG${char.id}" cx="50%" cy="50%">
        <stop offset="0%" stop-color="${p.armor}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#0d0f1a"/>
      </radialGradient>
    </defs>
    <rect width="140" height="140" fill="url(#bgG${char.id})"/>
    <!-- Body -->
    <ellipse cx="70" cy="105" rx="28" ry="22" fill="${p.armor}"/>
    <!-- Armor detail -->
    <ellipse cx="70" cy="100" rx="20" ry="16" fill="${p.detail}" opacity="0.4"/>
    <!-- Neck -->
    <rect x="63" y="72" width="14" height="14" rx="4" fill="${p.skin}"/>
    <!-- Head -->
    <ellipse cx="70" cy="62" rx="24" ry="26" fill="${p.skin}"/>
    <!-- Hair -->
    <ellipse cx="70" cy="42" rx="24" ry="16" fill="${p.hair}"/>
    <ellipse cx="46" cy="62" rx="8" ry="14" fill="${p.hair}"/>
    <ellipse cx="94" cy="62" rx="8" ry="14" fill="${p.hair}"/>
    <!-- Eyes -->
    <ellipse cx="61" cy="62" rx="4" ry="4.5" fill="white"/>
    <ellipse cx="79" cy="62" rx="4" ry="4.5" fill="white"/>
    <circle cx="62" cy="62" r="2.5" fill="#1a1a2e"/>
    <circle cx="80" cy="62" r="2.5" fill="#1a1a2e"/>
    <circle cx="63" cy="61" r="1" fill="white"/>
    <circle cx="81" cy="61" r="1" fill="white"/>
    <!-- Eyebrows -->
    <path d="M56 56 Q61 53 66 56" stroke="${p.hair}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M74 56 Q79 53 84 56" stroke="${p.hair}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Nose -->
    <path d="M70 65 Q68 70 70 72 Q72 70 70 65" stroke="${p.skin}" stroke-width="1" fill="none" opacity="0.6"/>
    <!-- Mouth -->
    <path d="M64 76 Q70 80 76 76" stroke="#c0706a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Class icon -->
    <text x="70" y="128" text-anchor="middle" font-size="14">${char.classIcon}</text>
  </svg>`;
}

// ===== Render =====

function statClass(val) {
  if (val >= 16) return 'stat-item--high';
  if (val >= 11) return 'stat-item--mid';
  return 'stat-item--low';
}

function renderCharacter(char) {
  const card = document.getElementById('characterCard');
  card.classList.add('has-character');

  const statLabels = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const statsHTML = Object.entries(statLabels).map(([k, label]) => `
    <div class="stat-item ${statClass(char.stats[k])}">
      <div class="stat-item__name">${label}</div>
      <div class="stat-item__value">${char.stats[k]}</div>
      <div class="stat-item__modifier">${modStr(char.stats[k])}</div>
    </div>
  `).join('');

  const traitsHTML = char.personality.map(t => `<span class="trait-tag">${t}</span>`).join('');
  const skillTypeMap = { physical: 'skill-tag--physical', magic: 'skill-tag--magic', support: 'skill-tag--support', special: 'skill-tag--special' };
  const skillTagClass = skillTypeMap[CLASSES[char.classId]?.skillType] || 'skill-tag--physical';
  const skillsHTML = char.skills.map(s => `<span class="skill-tag ${skillTagClass}">${s}</span>`).join('');

  const eqHTML = (slot, icon, item) => `
    <div class="equipment-item">
      <span class="equipment-item__slot">${icon} ${slot}</span>
      <span class="equipment-item__name">${item.name}</span>
      <span class="equipment-item__rarity rarity--${item.rarity}">${RARITY_LABELS[item.rarity]}</span>
    </div>
  `;

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-portrait">
        <div class="portrait-avatar">${buildAvatarSVG(char)}</div>
        <div class="portrait-name">${char.name}</div>
        <div class="portrait-title">「${char.epithet}${char.name}」</div>
        <div class="portrait-badges">
          <div class="badge">
            <span class="badge__icon">${char.raceIcon}</span>
            <span class="badge__label">種族</span>
            <span class="badge__value">${char.race}</span>
          </div>
          <div class="badge">
            <span class="badge__icon">${char.classIcon}</span>
            <span class="badge__label">クラス</span>
            <span class="badge__value">${char.class}</span>
          </div>
          <div class="badge">
            <span class="badge__icon">${char.gender === 'male' ? '♂' : '♀'}</span>
            <span class="badge__label">性別</span>
            <span class="badge__value">${char.gender === 'male' ? '男性' : '女性'}</span>
          </div>
        </div>
      </div>

      <div class="card-body">
        <!-- Vitals -->
        <div class="card-section">
          <div class="card-section__title">基本情報</div>
          <div class="vitals">
            <div class="vital-item vital-item--level"><div class="vital-item__label">レベル</div><div class="vital-item__value">Lv. ${char.level}</div></div>
            <div class="vital-item vital-item--hp"><div class="vital-item__label">HP</div><div class="vital-item__value">${char.hp}</div></div>
            <div class="vital-item vital-item--mp"><div class="vital-item__label">MP</div><div class="vital-item__value">${char.mp}</div></div>
            <div class="vital-item vital-item--exp"><div class="vital-item__label">経験値</div><div class="vital-item__value">${char.exp}</div></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="card-section">
          <div class="card-section__title">能力値</div>
          <div class="stats-grid">${statsHTML}</div>
        </div>

        <!-- Alignment & Traits -->
        <div class="card-section">
          <div class="card-section__title">属性・性格</div>
          <div class="alignment-display" style="margin-bottom:10px">
            <span class="alignment-badge">⚖️ ${char.alignment}</span>
          </div>
          <div class="traits-list">${traitsHTML}</div>
        </div>

        <!-- Skills -->
        <div class="card-section">
          <div class="card-section__title">スキル</div>
          <div class="skills-list">${skillsHTML}</div>
        </div>

        <!-- Equipment -->
        <div class="card-section">
          <div class="card-section__title">装備</div>
          <div class="equipment-list">
            ${eqHTML('武器', '⚔️', char.equipment.weapon)}
            ${eqHTML('防具', '🛡️', char.equipment.armor)}
            ${eqHTML('装飾品', '💍', char.equipment.accessory)}
          </div>
        </div>

        <!-- Backstory -->
        <div class="card-section">
          <div class="card-section__title">バックストーリー</div>
          <div class="backstory-text">${char.backstory}</div>
        </div>
      </div>
    </div>
  `;
}

// ===== Saved Characters =====

function loadSaved() {
  try { return JSON.parse(localStorage.getItem('savedCharacters') || '[]'); }
  catch { return []; }
}

function saveToDB(char) {
  const saved = loadSaved();
  saved.unshift(char);
  if (saved.length > 20) saved.splice(20);
  localStorage.setItem('savedCharacters', JSON.stringify(saved));
  renderSavedList();
}

function deleteFromDB(id) {
  const saved = loadSaved().filter(c => c.id !== id);
  localStorage.setItem('savedCharacters', JSON.stringify(saved));
  renderSavedList();
}

function renderSavedList() {
  const saved = loadSaved();
  const section = document.getElementById('savedSection');
  const list = document.getElementById('savedList');

  if (saved.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  list.innerHTML = saved.map(c => `
    <div class="saved-item" data-id="${c.id}">
      <div class="saved-item__avatar">${c.classIcon}</div>
      <div class="saved-item__info">
        <div class="saved-item__name">${c.name}</div>
        <div class="saved-item__sub">${c.raceIcon} ${c.race} / ${c.class} Lv.${c.level}</div>
      </div>
      <button class="saved-item__delete" data-delete="${c.id}" title="削除">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.saved-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.dataset.delete) return;
      const id = Number(el.dataset.id);
      const char = loadSaved().find(c => c.id === id);
      if (char) { renderCharacter(char); showToast(`${char.name} を読み込みました`); }
    });
  });

  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.delete);
      deleteFromDB(id);
      showToast('キャラクターを削除しました');
    });
  });
}

// ===== Toast =====

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== Main =====

let currentChar = null;

document.getElementById('generateBtn').addEventListener('click', () => {
  const race = document.getElementById('raceSelect').value;
  const cls = document.getElementById('classSelect').value;
  const gender = document.getElementById('genderSelect').value;

  currentChar = generateCharacter(race, cls, gender);
  renderCharacter(currentChar);

  document.getElementById('saveBtn').disabled = false;
  document.getElementById('exportBtn').disabled = false;
  showToast(`${currentChar.name} を生成しました！`);
});

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!currentChar) return;
  saveToDB(currentChar);
  showToast(`${currentChar.name} を保存しました`);
});

document.getElementById('exportBtn').addEventListener('click', () => {
  if (!currentChar) return;
  const c = currentChar;
  const statLabels = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const statsLine = Object.entries(statLabels).map(([k, l]) => `${l}:${c.stats[k]}(${modStr(c.stats[k])})`).join(' / ');
  const text = [
    `◆ ${c.name} ／「${c.epithet}${c.name}」`,
    `種族: ${c.race}　クラス: ${c.class}　性別: ${c.gender === 'male' ? '男性' : '女性'}`,
    `レベル: ${c.level}　HP: ${c.hp}　MP: ${c.mp}`,
    `能力値: ${statsLine}`,
    `属性: ${c.alignment}`,
    `性格: ${c.personality.join('、')}`,
    `スキル: ${c.skills.join('、')}`,
    `武器: ${c.equipment.weapon.name}（${RARITY_LABELS[c.equipment.weapon.rarity]}）`,
    `防具: ${c.equipment.armor.name}（${RARITY_LABELS[c.equipment.armor.rarity]}）`,
    `装飾品: ${c.equipment.accessory.name}（${RARITY_LABELS[c.equipment.accessory.rarity]}）`,
    ``,
    c.backstory,
  ].join('\n');

  navigator.clipboard.writeText(text).then(
    () => showToast('クリップボードにコピーしました'),
    () => showToast('コピーに失敗しました'),
  );
});

renderSavedList();
