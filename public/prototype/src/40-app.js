/* ==========================================================================
   CineCoin Prototype · 交互逻辑
   对齐 PRD v2.4.12；所有金额为演示构造数据
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 一键清空本机数据（#reset / ?reset）
     原型只有 4 个键会落盘，清完这 4 个就等于「刚装好的新机」：
       cc_unlocked_v1   已解锁的集数
       cc_device_id     设备 ID（首次冷启生成）
       cc_wd_bucket_v1  提现页 A/B 分组（落盘 30 天）
       cc.lang          语言偏好（zh / pt）
     用法：在地址后加 #reset（或 ?reset=1）打开一次，页面清完数据会自己重载成干净冷启。
     清完先把 hash 抹掉再 reload，避免「每刷一次清一次」的死循环。 */
  var WIPE_KEYS = ['cc_unlocked_v1', 'cc_device_id', 'cc_wd_bucket_v1', 'cc.lang'];

  function wipeAll() {
    var n = 0;
    WIPE_KEYS.forEach(function (k) {
      try {
        if (window.localStorage && localStorage.getItem(k) !== null) { localStorage.removeItem(k); n++; }
      } catch (e) { }
    });
    try { sessionStorage.clear(); } catch (e) { }
    return n;
  }

  function wipeAndReload() {
    wipeAll();
    /* 把 reset 参数 / hash 一起抹掉，否则重载后又命中一次，变成无限刷新 */
    var clean = location.pathname;
    var q = location.search.replace(/^\?/, '').split('&').filter(function (p) {
      return p && !/^reset(=|$)/.test(p);
    });
    if (q.length) clean += '?' + q.join('&');
    try { history.replaceState(null, '', clean); } catch (e) { }
    location.reload();
  }

  if (/[#&?]reset\b/.test(location.hash + location.search)) { wipeAndReload(); return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------------------------------------------------------------- 数据 */
  /* 演示数据：仅在 35-data.js 的接口快照与实时数据都不可用时兜底 */
  var DEMO_DRAMAS = [
    { id: 'd1', title: 'A Herdeira Bilionária', cat: 'Romance', eps: 60, seen: 12, cur: 3, views: '4,2 mi', cls: 'v1', fig: 'fig-a', desc: 'Ela foi trocada ao nascer e cresceu longe da família bilionária. Quando a verdade vem à tona, precisa enfrentar a irmã que ocupou seu lugar — e o noivo que sempre foi dela.' },
    { id: 'd2', title: 'A Noite em que Ele Voltou', cat: 'Suspense', eps: 48, seen: 0, cur: 1, views: '2,8 mi', cls: 'v2', fig: 'fig-b', desc: 'Sete anos depois do acidente, ele aparece na porta com a mesma roupa daquele dia. Ninguém acredita nela — até a segunda testemunha desaparecer.' },
    { id: 'd3', title: 'Renascida para Vingar', cat: 'Vingança', eps: 72, seen: 5, cur: 6, views: '6,1 mi', cls: 'v3', fig: 'fig-c', desc: 'Ela morreu traída pela própria família. Voltou 10 anos antes, com todas as memórias — e uma lista de nomes.' },
    { id: 'd4', title: 'Contrato de Amor', cat: 'CEO', eps: 56, seen: 0, cur: 1, views: '3,4 mi', cls: 'v4', fig: 'fig-a', desc: 'Um contrato de 90 dias, uma cláusula secreta e um CEO que nunca perdeu uma negociação. Até ela aparecer.' },
    { id: 'd5', title: 'A Segunda Chance', cat: 'Segunda chance', eps: 64, seen: 0, cur: 1, views: '1,9 mi', cls: 'v2', fig: 'fig-b', desc: 'Dez anos de casamento terminaram numa frase. No dia seguinte, ele acorda no primeiro encontro — e decide não repetir os mesmos erros.' },
    { id: 'd6', title: 'Herdeiro por Acidente', cat: 'Família', eps: 52, seen: 0, cur: 1, views: '2,2 mi', cls: 'v3', fig: 'fig-a', desc: 'Um entregador recebe a notícia de que é o único herdeiro de um império. A família não vai aceitar tão fácil.' },
    { id: 'd7', title: 'O Divórcio da Herdeira', cat: 'Romance', eps: 66, seen: 0, cur: 1, views: '1,7 mi', cls: 'v4', fig: 'fig-b', desc: 'No dia do divórcio, ela descobre que assinou um acordo que a deixa com metade do império — e o ex-marido com metade do arrependimento.' },
    { id: 'd8', title: 'Meu Marido é o Chefão', cat: 'CEO', eps: 58, seen: 0, cur: 1, views: '3,9 mi', cls: 'v1', fig: 'fig-a', desc: 'Ela achava que tinha casado com um motorista de aplicativo. Ele era o dono da cidade — e o contrato de casamento tinha cláusulas.' },
    { id: 'd9', title: 'A Vingança da Empregada', cat: 'Vingança', eps: 74, seen: 0, cur: 1, views: '5,3 mi', cls: 'v3', fig: 'fig-c', desc: 'Ela limpou o chão daquela casa por dez anos. Agora a família precisa dela para não perder tudo.' },
    { id: 'd10', title: 'Voltei para Salvar Meu Filho', cat: 'Família', eps: 50, seen: 0, cur: 1, views: '2,6 mi', cls: 'v2', fig: 'fig-b', desc: 'Ela recebeu uma segunda chance de viver o dia em que perdeu tudo. Desta vez, não vai confiar nas pessoas erradas.' },
    { id: 'd11', title: 'Amor em Dose Dupla', cat: 'Segunda chance', eps: 44, seen: 0, cur: 1, views: '1,2 mi', cls: 'v4', fig: 'fig-a', desc: 'Dois irmãos gêmeos, um nome só no contrato de trabalho. E uma chefe que nunca errou um rosto.' },
    { id: 'd12', title: 'A Testemunha Silenciosa', cat: 'Suspense', eps: 62, seen: 0, cur: 1, views: '2,1 mi', cls: 'v1', fig: 'fig-c', desc: 'A única testemunha do crime não fala. Mas escreve — e alguém está apagando as páginas.' }
  ];
  /* ---------- 真实数据接入（35-data.js；不可用时退回演示数据） ---------- */
  var CC = window.CCData;
  var DRAMAS = (CC && CC.dramas && CC.dramas.length) ? CC.dramas : DEMO_DRAMAS;

  function demoFeed() {
    return DEMO_DRAMAS.slice(0, 4).map(function (d) {
      return { drama: d, ep: { no: d.cur, duration: 90, free: true, locked: false }, video: '', poster: '', fallback: false };
    });
  }

  var FEED_ITEMS = (CC && CC.feed && CC.feed.length) ? CC.feed : demoFeed();
  /* 只渲染前 8 屏视频元素，避免 31 个 <video> 同时占资源 */
  var FEED_SLIDES = FEED_ITEMS.slice(0, 8);
  var FEED_ORDER = FEED_SLIDES.map(function (f) { return f.drama.id; });

  /* 每部剧的封面构图微调：位置/大小/景别，避免 12 张封面像同一张图 */
  var FIG_TUNE = {
    d1: { x: 0,   w: 84, y: -11, s: 1.04 },
    d2: { x: 6,   w: 78, y: -6,  s: 1.02 },
    d3: { x: -5,  w: 92, y: -16, s: 1.06 },
    d4: { x: 3,   w: 74, y: -4,  s: 1.00 },
    d5: { x: -7,  w: 88, y: -13, s: 1.05 },
    d6: { x: 2,   w: 80, y: -8,  s: 1.03 },
    d7: { x: -3,  w: 86, y: -14, s: 1.05 },
    d8: { x: 5,   w: 76, y: -5,  s: 1.01 },
    d9: { x: -6,  w: 90, y: -15, s: 1.06 },
    d10:{ x: 4,   w: 82, y: -9,  s: 1.03 },
    d11:{ x: -2,  w: 88, y: -12, s: 1.04 },
    d12:{ x: 7,   w: 72, y: -3,  s: 1.00 }
  };

  var state = {
    region: 'BR',
    tf: 'A',
    /* v1.18：真买冷启余额 = 0。新用户唯一的初始金币来自新人礼包（50.000，且冻结）。
       以前默认 4,20 是「演示老用户」的种子（为了让评审看到进度条 84% 与催领态），
       但它与冷启链（礼包→首页）语义冲突，会让评审误读成「新人额外赠送」——
       现在改成显式开关：#seed 注入 42.000（= R$ 4,20）演示余额。 */
    bal: 0,
    pending: 0,
    goal: 100,
    adsToday: 3,
    adCap: 15,
    wheelFree: 3,           /* 每天凭广告免费转的次数（v1.16 与激励额度解耦） */
    wheelUsed: 0,
    /* v1.16 风控：新人礼包给的金币先冻结，完成第一部剧才解冻可提。
       旧口径「注册送 5.000 = 最低档 R$5 可提」，等于开闸放羊毛党。 */
    lockedCoins: 0,
    seriesDone: false,
    tier: 5,
    seenEps: 12,
    adsThisSession: 0,
    lastWheel: 0,
    firstRun: true,
    promiseSeen: false,
    wdIntroSeen: false,
    pixSaved: false,
    muted: false,
    soundOn: true,
    tab: 'inicio',
    feedIdx: 0,
    ep: 3,
    playPct: 0,     /* 首屏从 0 开始播：金币也才是 0，随播放涨 */
    liked: false,
    saved: false,
    histSeen: true,
    histPainted: false,
    gridSeen: false,
    stSeen: false,
    interBusy: false,
    rolling: false,
    adFailRate: 0.06,       /* 模拟激励视频拉取失败概率（selftest 置 0） */
    lang: 'pt',
    paused: false,
    speed: 1,

    /* ================= v1.6 金币唯一资产 =================
       coins 是唯一资产与唯一记账单位，界面只出现 moedas；
       bal 只是 coins 的现金派生值（coins / 10000），仅提现页展示换算结果。
       v1.17 重定标（老板 2026-11-15 拍板 A 案）：
         10.000 moedas = R$ 1,00（汇率 ×10），行为产出币数一律不动 →
         单机兑付 R$ 降 10 倍；提现四档币数 ×10 保 R$ 5/10/30/50 不变。 */
    coins: 0,               /* 真实冷启为 0；演示余额走 #seed 注入 42.000（= R$ 4,20） */
    pendingCoins: 0,        /* 看剧累积、还没领取的金币（从 0 随播放时长涨，满 100 才可领） */
    epEarned: 0,            /* 本集已按播放进度计过的数量，防重复计（0–100） */
    coinCost: 20,           /* 一次转盘消耗（v1.8.2：500 → 20，小额高频） */
    doubleLeft: 3,          /* 每日可翻倍次数（看完激励再补一条广告） */
    newbieSeen: false,
    wdFreeDays: 0,          /* v1.9.3：新人礼包不再送提现加速天数（礼包只送金币） */
    payMethod: 'bank',
    ck: {
      idx: 3,               /* 今天是 7 天签到的第 4 格（0 起） */
      signed: [true, false, true, false, false, false, false],
      doubled: [false, false, false, false, false, false, false],  /* 哪几天已翻倍领取 */
      reward: [100, 150, 200, 250, 300, 400, 800],
      missed: 1             /* 待补签的格子，补完置 null */
    },
    tasks: [
      { id: 'watch3', icon: 'film', title: 'Assista 3 episódios', goal: 3, cur: 1, reward: 300 },
      /* v1.9.7：删掉「看 5 个激励 → +300」这条任务。看激励的奖励统一进阶梯卡：
         第 1 个 +5（自动）、第 3 个 +20、第 15 个 +200，不再在任务列表里重复发。 */
      { id: 'share1', icon: 'share', title: 'Compartilhe 1 série', goal: 1, cur: 0, reward: 200 },
      { id: 'ck', icon: 'check', title: 'Faça o check-in de hoje', goal: 1, cur: 0, reward: 150 },
      { id: 'invite1', icon: 'user', title: 'Convide 1 amigo', goal: 1, cur: 0, reward: 2000 }
    ],
    /* v1.9.7 广告阶梯（Vídeos de hoje）：一轮 0–15 个视频，
       1 → +5（自动，无按钮）、3 → +20（可领）、15 → +200（可领）。
       三档都领完 → n 归零、标记清空，重新开始一轮（与当天已看多少条无关）。 */
    adLad: { n: 0, c1: false, c3: false, c15: false, rounds: 0 },
    claimed: {},
    /* v1.9.4：邀请加速只认「本次新产生的有效邀请」且只能用 1 次。
       fresh=false 的是历史邀请（老用户/上一版就有的），只发金币，不参与加速。 */
    invites: {
      code: 'LUCA-8F3A',
      /* v1.9.6：被邀请方兑付记录 —— 自己是「邀请人」，这里一般是 null；
         演示时用 #page=invite + 填码可以看到好友视角的入账。 */
      bound: null,
      list: [
        { n: 'Ana Paula', when: 'há 2 dias', st: 'ok', fresh: false, sped: false },
        { n: 'Rafael Lima', when: 'há 5 dias', st: 'ok', fresh: false, sped: false },
        { n: 'Bruno Costa', when: 'assistindo agora', st: 'wait', fresh: false, sped: false }
      ]
    },
    /* 提现加速额度：广告 1 次（-1 天）+ 邀请 1 次（-3 天），合计最多 4 天。
       free 已废弃（新人礼包不再送加速天数），保留字段只为老存档兼容。 */
    wd: { amount: 5, days: 15, spedAd: 0, spedInv: 0, free: 0, adToday: 0, at: 0 },

    /* 已解锁集：'<dramaId>|<ep>' → 解锁时间戳。真机由服务端 entitlement 下发，
       原型用 localStorage 模拟，杀进程重开不丢（解锁是买到的东西，不能重开就没了） */
    unlocked: {},
    wdPage: null,        /* 提现页版本：wp_br_a / wp_br_b，由分桶决定 */
    bucket: null
  };

  /* v1.9.7 广告阶梯口径（Vídeos de hoje）：第 1 个 +5（自动）、第 3 个 +20、第 15 个 +200。
     常量放这里，奖励弹窗与阶梯卡共用同一组数字。 */
  var LAD_FIRST = 5;
  var LAD_MID = 20;
  var LAD_TOP = 200;
  var LAD_MAX = 15;

  /* ---------------------------------------------------------------- 解锁凭据 */
  var UNLOCK_KEY = 'cc_unlocked_v1';
  function loadUnlocks() {
    try {
      var raw = window.localStorage && localStorage.getItem(UNLOCK_KEY);
      if (raw) state.unlocked = JSON.parse(raw) || {};
    } catch (e) { state.unlocked = state.unlocked || {}; }
  }
  function unlockKey(id, ep) { return id + '|' + ep; }
  function isUnlocked(id, ep) { return !!(state.unlocked && state.unlocked[unlockKey(id, ep)]); }
  function markUnlocked(id, ep) {
    if (!state.unlocked) state.unlocked = {};
    if (state.unlocked[unlockKey(id, ep)]) return;
    state.unlocked[unlockKey(id, ep)] = Date.now();
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(state.unlocked)); } catch (e) { }
  }
  loadUnlocks();

  /* ---------------------------------------------------------------- 音频 */
  var Sfx = {
    ctx: null,
    init: function () {
      if (this.ctx) return this.ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    },
    ok: function () { return state.soundOn && this.ctx; },
    tone: function (freq, dur, type, gain, delay) {
      var ctx = this.init(); if (!ctx) return;
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    /* 金币计数音：两个泛音 + 快速衰减（BF-05-06） */
    coin: function () {
      if (!state.soundOn) return;
      this.tone(1180, 0.075, 'triangle', 0.10, 0);
      this.tone(1760, 0.09, 'sine', 0.055, 0.045);
    },
    tick: function () {
      if (!state.soundOn) return;
      this.tone(2200, 0.028, 'square', 0.035, 0);
    },
    win: function () {
      if (!state.soundOn) return;
      var self = this;
      [523, 659, 784, 1046].forEach(function (f, i) { self.tone(f, 0.16, 'triangle', 0.085, i * 0.075); });
    },
    err: function () {
      if (!state.soundOn) return;
      this.tone(196, 0.14, 'square', 0.05, 0);
      this.tone(147, 0.18, 'square', 0.045, 0.1);
    },
    click: function () {
      if (!state.soundOn) return;
      this.tone(880, 0.03, 'sine', 0.028, 0);
    }
  };

  /* ---------------------------------------------------------------- 格式化 */
  function fmt(v) {
    var s = v.toFixed(2).replace('.', ',');
    var p = s.split(',');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return p.join(',');
  }
  /* 5.15 区域配置：币种、提现通道、文案随区域走（数值仍为演示构造） */
  var REGIONS = {
    BR: { sym: 'R$', method: 'PIX', mSub: 'em até 1 dia útil', ic: '#i-pix',
          altSub: 'indisponível no Brasil', title: 'Dados de recebimento', fx: 5.00, hint: 'até 15 dias úteis' },
    MX: { sym: 'MX$', method: 'SPEI', mSub: 'CLABE · até 1 dia útil', ic: '#i-wallet',
          altSub: 'indisponível no México', title: 'Datos de cobro', fx: 17.5, hint: 'até 15 dias úteis' }
  };
  function RG() { return REGIONS[state.region] || REGIONS.BR; }
  function money(v) { return RG().sym + ' ' + fmt(v); }

  /* ----------------------------------------------------------------
     v1.6 · 统一金币口径（用户 2026-11-14 拍板）
     界面**只显示 moedas**，金币是唯一资产与唯一记账单位；
     现金只在提现页出现，由金币按固定汇率换算，不参与任何计算。
     v1.17：10.000 moedas = 1 unidade da moeda local（BR: R$ 1,00 / MX: MX$ 1,00）
     汇率 ×10、产出币数不变 ⇒ 同样 R$ 需要 10 倍金币，单机兑付 ÷10。
     ---------------------------------------------------------------- */
  var COIN_RATE = 10000;
  var COINS_PER_EP = 100;                /* 看完一集累计 100 moedas（= R$ 0,01） */
  function coinsOf(v) { return Math.round(v * COIN_RATE); }
  function cashOf(c) { return c / COIN_RATE; }
  function fmtInt(n) {
    return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function moedas(n) { return fmtInt(n) + ' moedas'; }
  function cc(v) { return fmtInt(coinsOf(v)); }        /* 现金 → 金币字符串（静态文案用） */

  /* 所有余额落点只有一个入口：传金币数，金币与现金派生值同步刷新 */
  function paintBal(coins) {
    coins = Math.max(0, Math.round(coins));
    var c = fmtInt(coins), cash = cashOf(coins);
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('feedBalNum', c);
    set('wdBalNum', c);
    set('pfBal', c);
    var sub = document.getElementById('feedBalSub');
    if (sub) sub.textContent = '≈ ' + money(cash);
    var u = document.getElementById('wdUsd');
    if (u) u.textContent = '= ' + money(cash) + ' · ≈ US$ ' + (cash / RG().fx).toFixed(2).replace('.', ',');
    set('unBal', c);
    set('cBal', c);
    set('plBal', c);        /* 看剧页顶栏提现胶囊里的余额（同源，唯一写入口） */
  }

  /* 可用金币 = 总金币 − 冻结金币。所有「能不能提」「还差多少」一律走这里，
     顶部余额仍然展示总数（用户得看见自己确实赚到了），只是暂时不能提。 */
  function availCoins() { return Math.max(0, (state.coins || 0) - (state.lockedCoins || 0)); }
  function availCash() { return availCoins() / COIN_RATE; }

  function unlockLocked(reason) {
    var n = state.lockedCoins || 0;
    if (n <= 0) return;
    state.lockedCoins = 0;
    state.seriesDone = true;
    renderGoal(); paintLockNote();
    toast(fmtInt(n) + ' moedas liberadas para saque' + (reason ? ' · ' + reason : ''));
    Sfx.win();
  }

  /* 余额旁边的小锁：有冻结时才出现，点一下说明解锁条件 */
  function paintLockNote() {
    var n = state.lockedCoins || 0;
    var tag = document.getElementById('feedLock');
    if (tag) {
      tag.style.display = n > 0 ? '' : 'none';
      tag.title = n > 0 ? fmtInt(n) + ' moedas bloqueadas · libera ao concluir a 1ª série' : '';
    }
    var wn = document.getElementById('wdLockNote');
    if (wn) {
      wn.style.display = n > 0 ? '' : 'none';
      var wv = wn.querySelector('b');
      if (wv) wv.textContent = fmtInt(n);
    }
  }

  var VIEW = $('#viewport');

  /* 调试开关（截图与评审直达）：#nosplash / #page=ganhar / #freeze / #annot */
  var DBG = {
    nosplash: /nosplash/.test(location.hash),
    freeze: /freeze/.test(location.hash),
    annot: /annot/.test(location.hash),
    page: (location.hash.match(/page=([a-z]+)/) || [])[1] || null,
    mask: (location.hash.match(/mask=([A-Za-z]+)/) || [])[1] || null,
    feed: (location.hash.match(/feed=(\d+)/) || [])[1] || null,
    region: (location.hash.match(/region=([A-Z]{2})/) || [])[1] || null,
    skel: (location.hash.match(/skel=(\w+)/) || [])[1] || null,
    nopromise: /nopromise/.test(location.hash),  /* 截图/评审：跳过首开承诺弹窗 */
    nonewbie: /nonewbie/.test(location.hash),    /* 截图/评审：跳过新人礼包弹窗 */
    sub: (location.hash.match(/sub=(\w+)/) || [])[1] || null,  /* 直达设置子页 */
    pg: (location.hash.match(/\bpg=([\w-]+)/) || [])[1] || null,  /* 直达二级页（sac / invite / wd-status / pix-form） */
    offline: /\boffline\b/.test(location.hash),  /* 演示断网态 */
    seed: /(^|[#&])seed\b/.test(location.hash),  /* 演示：注入 R$ 4,20 = 42.000 moedas 既有余额（否则真实冷启 0） */
    adfail: /\badfail\b/.test(location.hash),    /* 演示广告加载失败态 */
    detail: /detail/.test(location.hash),        /* 截图/评审：直达首条剧详情 */
    player: /(^|[#&])player\b/.test(location.hash),  /* 截图/评审：直达看剧页（首剧 EP03） */
    search: /search/.test(location.hash),        /* 截图/评审：直达搜索页 */
    tf: (location.hash.match(/\btf=(a|b|auto)\b/) || [])[1] || null,  /* 提现页 A/B 面对照 */
    unlock: (location.hash.match(/unlock=(\d+)/) || [])[1] || null   /* 预置某剧已解锁集数，便于验证回调 */
  };

  /* ---------------------------------------------------------------- 缩放 */
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var wide = vw > 1120;
    var availW = vw - (wide ? 330 : 24);
    var availH = vh - 28;
    var z = Math.min(availW / 380, availH / 820, 1.12);
    document.documentElement.style.setProperty('--zoom', Math.max(0.42, z).toFixed(3));
  }
  window.addEventListener('resize', fit);

  /* ---------------------------------------------------------------- Toast */
  /* ---------------------------------------------------------------- 交互锁
     凡是"点一下会异步跑一会儿"的按钮都过这里：执行期间挂 is-locked，
     重复点击直接丢弃。以前各处手写标志位，漏一处就能连点两次。
     guard(key, el, ms) 返回 false = 这次点击被吃掉，调用方直接 return。 */
  var locks = {};
  function guard(key, el, ms) {
    if (locks[key]) return false;
    locks[key] = true;
    if (el) el.classList.add('is-locked');
    if (ms) setTimeout(function () { unlock(key, el); }, ms);
    return true;
  }
  function unlock(key, el) {
    locks[key] = false;
    if (el) el.classList.remove('is-locked');
  }

  /* ---------------------------------------------------------------- Toast
     同屏最多 2 条，超出的把最旧那条挤掉；同文案 1.2s 内去重。
     旧实现每个 toast 各挂一个定时器，连点时会在屏幕上叠成一列。 */
  var toastLast = { msg: '', at: 0 };
  function toast(msg, ms) {
    var host = $('#toastHost');
    if (!host || !msg) return;
    var now = Date.now();
    if (msg === toastLast.msg && now - toastLast.at < 1200) return;
    toastLast = { msg: msg, at: now };
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    var all = host.querySelectorAll('.toast:not(.out)');
    if (all.length > 2) dismissToast(all[0]);
    setTimeout(function () { dismissToast(el); }, ms || 1800);
  }
  function dismissToast(el) {
    if (!el || !el.parentNode || el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.remove(); }, 240);
  }

  /* ---------------------------------------------------------------- 余额与进度 */
  /* 5.16 分段缓动：前段快、后段慢，但达标瞬间必须 100%（红线 14）。
     两套提现页各用一条系数（PRD 允许进度条样式差异），末端都收敛到 1。 */
  var progLast = { v: -1, at: 0 };
  function visualProgress(real, variant) {
    if (real >= 1) return 1;
    var p = clamp(real, 0, 1), v;
    if (variant === 'linear') {
      /* B 面：接近线性、略压前段，数值上更"稳"，适合先讲差额的文案顺序 */
      v = p < 0.5 ? p * 0.86 : 0.43 + (p - 0.5) * 1.14;
    } else {
      /* A 面：PRD 5.16 的三段系数，末段快速补到 1，避免 99%→100% 的跳跃 */
      if (p < 0.40) v = p / 1.6;
      else if (p < 0.75) v = 0.25 + (p - 0.40);
      else if (p < 0.95) v = 0.60 + (p - 0.75) * 1.2;
      else v = 0.84 + (p - 0.95) * 3.2;
    }
    return Math.min(v, 0.99);
  }
  /* 进度条不许回退：余额被冲正时先停在原位 3s，再回落一次 */
  function holdProgress(p) {
    var now = Date.now();
    if (progLast.v < 0 || p >= progLast.v - 1e-6) { progLast = { v: p, at: now }; return p; }
    if (now - progLast.at < 3000) return progLast.v;
    progLast = { v: p, at: now };
    return p;
  }

  /* 目标 = 下一个未达成的提现档位（BF-06-02：进度条服务于"能不能提"，不是营销数字） */
  var TIERS = [5, 10, 30, 50];
  var PER_EP = COINS_PER_EP / COIN_RATE;   /* 单集产出，单位现金；换算集数用金币算更准 */

  /* v1.18：目标档位按「可用金币」算（冻结中的礼包不算已达成）。
     否则新用户刚领礼包（5 万全冻结）就会被当成已过首档，目标直接跳到 R$10 档，
     而进度条仍是 0% —— 余额与进度两个数字打架。 */
  function nextTier() {
    var a = availCash();
    for (var i = 0; i < TIERS.length; i++) if (a < TIERS[i]) return TIERS[i];
    return TIERS[TIERS.length - 1];
  }

  /* v1.18 差额文案双口径：小额（≤20 集）说集数，大额改说钱。
     汇率 ×10 后同样的 R$ 需要 10 倍集数（首提从 8 集变 80 集），
     「faltam 80 eps」对用户是劝退项，而「faltam R$ 0,80」既真实又是可兑现的硬通货。 */
  function gapVal(gapCoins, suf) {
    gapCoins = Math.max(0, Math.round(gapCoins));
    var eps = Math.ceil(gapCoins / COINS_PER_EP);
    return eps > 20 ? money(cashOf(gapCoins)) : eps + ' ' + suf;
  }
  function gapText(gapCoins, suf) { return 'faltam ' + gapVal(gapCoins, suf); }

  function renderGoal() {
    var target = nextTier();
    state.goal = target;
    var real = clamp(availCash() / target, 0, 1);
    var p = holdProgress(visualProgress(real, wdCfg().seg));
    var pct = (p * 100).toFixed(2) + '%';
    ['goalBar', 'wdGoalBar'].forEach(function (id) {
      var bar = document.getElementById(id);
      if (!bar) return;
      bar.querySelector('i').style.width = pct;
      bar.classList.toggle('is-full', real >= 1);
    });
    /* 差额按金币算：目标金币 − 现有可用金币，再交给 gapVal 决定用集数还是金额说 */
    var gap = Math.max(0, coinsOf(target) - availCoins());
    var set = function (id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; };
    set('goalTarget', fmtInt(coinsOf(target)));
    set('goalEps', real >= 1 ? 'pode trocar' : gapText(gap, 'eps'));
    set('wdGoalEps', real >= 1 ? 'pode sacar' : gapText(gap, 'eps'));
    set('cProg', (real * 100).toFixed(1).replace('.', ',') + '%');
    /* 余额卡目标文案：金币口径 */
    var mt = document.querySelector('.bal-card .bal-goal .txt b');
    if (mt) mt.textContent = fmtInt(coinsOf(target));
  }

  /* 余额滚动：1.2s ease-out，串行队列（BF-05-06）
     参数 to 仍是现金（历史调用点太多），内部一律换算成金币做动画与落盘：
     state.coins 立即到终值（保证并发加金币不会算错），滚动只影响视觉。 */
  var rollQueue = Promise.resolve();
  function setBalance(to, opts) {
    opts = opts || {};
    var fromC = state.coins;
    var toC = coinsOf(to);
    state.bal = to;
    state.coins = toC;
    if (toC === fromC) { paintBal(toC); renderGoal(); renderConsole(); return Promise.resolve(); }
    rollQueue = rollQueue.then(function () {
      return new Promise(function (resolve) {
        var dur = opts.dur || 1200;
        if (opts.silent) {
          paintBal(toC);
          renderGoal(); renderConsole(); renderWallet(); renderCoins();
          resolve(); return;
        }
        state.rolling = true;
        Sfx.coin();
        state.soundOn && Sfx.init();
        var settled = false;
        function finish() {
          if (settled) return;
          settled = true;
          paintBal(toC);
          var cv = document.querySelector('.cash-val');
          if (cv && toC > fromC) { cv.classList.remove('flash'); void cv.offsetWidth; cv.classList.add('flash'); }
          state.rolling = false;
          renderGoal(); renderConsole(); renderWallet(); renderCoins();
          resolve();
        }
        var t0 = performance.now();
        function tick(now) {
          if (settled) return;
          var p = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(1 - p, 3);
          paintBal(Math.round(fromC + (toC - fromC) * e));
          if (p < 1) requestAnimationFrame(tick);
          else finish();
        }
        requestAnimationFrame(tick);
        /* 兜底：页面不可见 / 无合成器时 rAF 可能不跑，到点强制收敛 */
        setTimeout(finish, dur + 200);
      });
    });
    renderGoal(); renderConsole();
    return rollQueue;
  }
  function renderNever() { }
  /* 演示场景/重置用：直接改余额时，金币与现金派生值必须一起改 */
  function seedBal(v) { state.bal = v; state.coins = coinsOf(v); }

  /* ---------------------------------------------------------------- 路由 */
  var TABS = ['inicio', 'dramas', 'ganhar', 'historico', 'perfil'];
  function goTab(name, silent) {
    if (TABS.indexOf(name) < 0) return;
    state.tab = name;
    $$('.tabpage').forEach(function (p) {
      p.classList.toggle('on', p.dataset.page === name);
    });
    $$('.tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.tab === name);
    });
    document.body.dataset.tab = name;   /* 供样式按 Tab 收敛挂件（如首页收集球） */
    syncFeedVideo();                    /* 离开首页暂停视频，回到首页续播 */
    $('#tabbar').classList.remove('is-hidden');
    $('#cPage').textContent = name;
    if (!silent) Sfx.click();
    if (name === 'ganhar') {
      /* v1.5：中间 Tab 是任务中心（签到 / 任务 / 邀请）；提现收进二级页 openSac() */
      renderTasks();
    }
    if (name === 'historico') {
      renderHistory({ skeleton: !state.histPainted });
      state.histPainted = true;
      state.histSeen = true;
      $('#histDot').style.display = 'none';
    }
    if (name === 'perfil') {
      /* MZ-04-07：冷启后首访 Perfil 出插屏 */
      if (!state.perfilSeen && !DBG.page) { state.perfilSeen = true; setTimeout(function () { showInterstitial(function () { }); }, 520); }
      else state.perfilSeen = true;
    }
    if (name === 'dramas') {
      renderGrid({ skeleton: !state.gridSeen && !DBG.page });
      state.gridSeen = true;
    }
  }

  /* 看剧页里点 Sacar 时记下来源：返回键要回到播放器，而不是掉到 tab 首页 */
  var sacBackTo = null;

  function openPage(name) {
    var p = document.querySelector('.page[data-page="' + name + '"]');
    if (!p) return;
    if (name !== 'sac' && name !== 'player') sacBackTo = null;
    /* 同时只允许一个二级页：避免两页都在 on 时按 DOM 顺序互相盖住 */
    $$('.page.on').forEach(function (x) { if (x !== p) x.classList.remove('on'); });
    p.classList.add('on');
    $('#tabbar').classList.add('is-hidden');
  }
  function closePage(sel) {
    var p = typeof sel === 'string' ? document.querySelector('.page[data-page="' + sel + '"]') : sel;
    if (!p) return;
    p.classList.remove('on');
    $('#tabbar').classList.remove('is-hidden');
  }

  /* ---------------------------------------------------------------- 设置子页（v1.3）
     Perfil 的每一项在真机上都是一个独立二级页，这里用一份通用容器 + 配置表承载，
     避免 7 份几乎相同的 DOM。openSub(key) 渲染并打开，返回键走通用 data-back。 */
  function subIco(name, size) {
    var s = size || 16;
    return '<svg style="width:' + s + 'px;height:' + s + 'px"><use href="#i-' + name + '"/></svg>';
  }
  function group(title, inner) {
    return '<div class="pf-group">' + (title ? '<div class="gt">' + title + '</div>' : '') +
      '<div class="list">' + inner + '</div></div>';
  }
  function rowHTML(o) {
    var tag = o.act ? 'button' : 'div';
    var attr = o.act ? ' data-act="' + o.act + '"' : '';
    return '<' + tag + ' class="row"' + attr + '>' +
      '<span class="ic">' + subIco(o.icon) + '</span>' +
      '<span class="tx"><b>' + o.title + '</b><span>' + o.sub + '</span></span>' +
      '<span class="rt">' + (o.right || '') +
      '<svg class="chev" style="width:14px;height:14px"><use href="#i-chev-r"/></svg></span>' +
      '</' + tag + '>';
  }

  var SUB_DEFS = {
    /* --- 安全 --- */
    sec: {
      title: 'Segurança',
      html: function () {
        return '<div class="sub-wrap">' +
          '<div class="sub-hero"><span class="ico">' + subIco('shield', 20) + '</span>' +
          '<div class="tt"><b>Conta protegida</b><span>E-mail verificado · 2 dispositivos conectados</span></div></div>' +
          group('Dispositivos',
            '<div class="dev"><span class="dv">' + subIco('user', 16) + '</span>' +
            '<div class="dm"><b>Este dispositivo</b><span>Android 15 · São Paulo, BR</span></div>' +
            '<span class="now">agora</span></div>' +
            '<div class="dev"><span class="dv">' + subIco('user', 16) + '</span>' +
            '<div class="dm"><b>Xiaomi Redmi Note 12</b><span>Último acesso 09/11 · 21:40</span></div>' +
            '<button class="mini-btn" data-act="kick">Sair</button></div>') +
          group('Login',
            rowHTML({ icon: 'shield', title: 'E-mail', sub: 'l***@gmail.com', right: '<span class="tag tag-g">verificado</span>' }) +
            rowHTML({ icon: 'lock', act: 'pwd', title: 'Alterar senha', sub: 'Última troca há 3 meses' }) +
            '<div class="row"><span class="ic">' + subIco('shield') + '</span>' +
            '<span class="tx"><b>Verificação em duas etapas</b><span>Recomendado para saques altos</span></span>' +
            '<span class="rt"><span class="sw" id="sw2fa" style="width:38px;height:22px;border-radius:11px;background:#33333E;position:relative;display:inline-block"><i style="position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s"></i></span></span></div>') +
          '<div class="pf-group"><button class="btn btn-dim btn-block" data-act="logoutall">Sair de todos os dispositivos</button></div>' +
          '</div>';
      }
    },

    /* --- 提现记录 + 提现规则 ---
       首页流水的「Ver tudo」和提现须知弹窗的「Ver regras」都落在这里：
       同一个页面两个段，不再各自 toast 一句「em breve」。 */
    payouts: {
      title: 'Meus saques',
      html: function () {
        var items = [
          { v: '10,00', when: 'Hoje · 09:12 · PIX ***.4471', st: 'pend', txt: 'Em análise' },
          { v: '20,00', when: '05/11 · 14:03 · PIX ***.4471', st: 'paid', txt: 'Pago' },
          { v: '14,00', when: '28/10 · 20:11 · PIX ***.4471', st: 'fail', txt: 'Falhou' },
          { v: '14,00', when: '27/10 · 08:55 · PIX ***.4471', st: 'paid', txt: 'Pago' }
        ];
        var min = money(state.tier || 5);
        return '<div class="sub-wrap">' +
          '<div class="sub-hero"><span class="ico">' + subIco('wallet', 20) + '</span>' +
          '<div class="tt"><b>R$ 34,00 sacados</b><span>4 solicitações · saldo devolvido em saques que falham</span></div></div>' +
          '<div class="sub-seg" data-seg="list">' +
          group('Solicitações', items.map(function (it) {
            return '<button class="wd-item" data-act="wdinfo"><div class="wl">' +
              '<div class="amount">R$ ' + it.v + '</div><span>' + it.when + '</span></div>' +
              '<span class="st ' + it.st + '">' + it.txt + '</span></button>';
          }).join('')) +
          '</div>' +
          '<div class="sub-seg" data-seg="rules">' +
          group('Regras do saque',
            rowHTML({ icon: 'wallet', title: 'Valor mínimo', sub: min + ' por solicitação' }) +
            rowHTML({ icon: 'clock', title: 'Prazo', sub: '1º saque até 4 dias úteis · depois até 1 dia útil' }) +
            rowHTML({ icon: 'pix', title: 'Taxa', sub: 'Sem taxa · PIX no CPF do titular da conta' }) +
            rowHTML({ icon: 'shield', title: 'Se falhar', sub: 'O valor volta ao saldo em até 24h' })) +
          '</div>' +
          '<p class="sub-note">Saque mínimo de ' + min + '. Pedidos em análise não podem ser cancelados; se falharem, o valor volta ao saldo em até 24h.</p>' +
          '</div>';
      }
    },

    /* --- 完整流水 ---
       提现页只有 3 条迷你流水，「Ver tudo」进这里。
       注意它和「Meus saques」不是一回事：流水是余额的所有进出，提现记录只有申请。 */
    extrato: {
      title: 'Extrato completo',
      html: function () {
        var rows = [
          { g: 'Hoje', t: 'Recompensa de anúncio', s: '21:04 · TX 8F3A', v: 0.005, in: true },
          { g: 'Hoje', t: 'Coleta de moedas', s: '20:51 · 3 episódios', v: 0.03, in: true },
          { g: 'Hoje', t: 'Bônus de episódio', s: '20:12 · EP 3', v: 0.01, in: true },
          { g: 'Ontem', t: 'Saque via PIX', s: '09:12 · em análise', v: -10.00, in: false },
          { g: 'Ontem', t: 'Recompensa de anúncio', s: '21:40 · TX 2C77', v: 0.005, in: true },
          { g: '08/11', t: 'Saque via PIX', s: '22:48 · concluído', v: -5.00, in: false },
          { g: '05/11', t: 'Bônus de boas-vindas', s: '10:12 · 1ª série', v: 5.00, in: true }
        ];
        var groups = [];
        rows.forEach(function (r) {
          if (!groups.length || groups[groups.length - 1].g !== r.g) groups.push({ g: r.g, items: [] });
          groups[groups.length - 1].items.push(r);
        });
        return '<div class="sub-wrap">' +
          '<div class="pf-group"><div class="gt">Movimentações</div>' +
          groups.map(function (grp) {
            return '<div class="ex-g">' + grp.g + '</div>' + grp.items.map(function (r) {
              return '<div class="ex-row"><span class="ex-ic ' + (r.in ? 'in' : 'out') + '">' +
                subIco(r.in ? 'coin' : 'wallet', 13) + '</span>' +
                '<span class="ex-m"><b>' + r.t + '</b><span>' + r.s + '</span></span>' +
                '<span class="ex-v ' + (r.in ? 'in' : 'out') + '">' + (r.in
                  ? '+' + fmtInt(coinsOf(Math.abs(r.v)))
                  : '− ' + money(Math.abs(r.v))) + '</span></div>';
            }).join('');
          }).join('') + '</div>' +
          '<p class="sub-note">Só entra no extrato o que já foi creditado. Valores em análise aparecem como saque pendente no saldo.</p>' +
          '</div>';
      }
    },

    /* --- 语言 --- */
    lang: {
      title: 'Idioma',
      html: function () {
        var langs = [
          { k: 'pt', n: 'Português (Brasil)', d: 'Padrão do app' },
          { k: 'zh', n: '中文（简体）', d: '界面切换为中文' },
          { k: 'en', n: 'English (US)', d: 'Interface em inglês' },
          { k: 'es', n: 'Español (Latinoamérica)', d: 'Interfaz en español' }
        ];
        return '<div class="sub-wrap">' +
          group('Idioma do app', langs.map(function (l) {
            return '<button class="opt' + (state.lang === l.k ? ' on' : '') + '" data-lang="' + l.k + '">' +
              '<span class="ol"><b>' + l.n + '</b><span>' + l.d + '</span></span>' +
              '<span class="rd"><i></i></span></button>';
          }).join('')) +
          '<p class="sub-note">Títulos e sinopses seguem o idioma original do catálogo. A troca de idioma nesta demonstração não recarrega o app.</p>' +
          '</div>';
      }
    },

    /* --- 帮助 --- */
    help: {
      title: 'Ajuda e suporte',
      html: function () {
        var faqs = [
          ['Quando recebo meu PIX?', 'O primeiro saque leva até 4 dias úteis para análise. Depois disso, pedidos seguem em até 1 dia útil. Você recebe uma notificação quando o valor cair.'],
          ['Por que o anúncio não carrega?', 'A disponibilidade de anúncios depende da rede e do estoque do provedor. Se nenhum vídeo estiver disponível, o saldo não é cobrado e você pode tentar de novo em alguns minutos.'],
          ['Quanto posso ganhar por dia?', 'O limite é de 12 anúncios por dia, além do sorteio e das tarefas diárias. O contador fica no topo da aba Ganhar.'],
          ['Como excluo minha conta?', 'Perfil → Excluir conta. O saldo precisa estar acima de R$ 5,00 para saque antes da exclusão; depois disso os dados são apagados em 30 dias.'],
          ['O que é a esfera de coleta?', 'A esfera acumula uma fração do valor de cada anúncio. Toque nela para transferir para o saldo — o valor aparece antes de coletar.']
        ];
        return '<div class="sub-wrap">' +
          group('Perguntas frequentes', faqs.map(function (f) {
            return '<div class="faq"><button>' + '<b>' + f[0] + '</b>' + subIco('chev-r', 13) + '</button>' +
              '<div class="ans"><div><p>' + f[1] + '</p></div></div></div>';
          }).join('')) +
          group('Falar com a gente',
            rowHTML({ icon: 'help', act: 'chat', title: 'Chat de suporte', sub: 'Resposta em até 24h · seg a sáb' }) +
            rowHTML({ icon: 'globe', act: 'mail', title: 'E-mail', sub: 'suporte@cinecoin.app' })) +
          '</div>';
      }
    },

    /* --- 隐私 --- */
    privacy: {
      title: 'Privacidade',
      html: function () {
        return '<div class="sub-wrap"><div class="doc">' +
          '<div class="upd">Atualizado em 05/11/2026 · LGPD (Lei 13.709/2018)</div>' +
          '<h3>1. Quais dados coletamos</h3>' +
          '<p>Para pagar seus saques precisamos de: nome completo, CPF, chave PIX, e-mail e o identificador do aparelho. Também registramos os episódios assistidos e os anúncios exibidos, porque é isso que gera o saldo.</p>' +
          '<h3>2. Para que usamos</h3>' +
          '<ul><li>Calcular e creditar o saldo com base em anúncios efetivamente exibidos;</li>' +
          '<li>Enviar o PIX ao banco pelo nome e CPF informados;</li>' +
          '<li>Prevenir fraude — múltiplas contas, automação e emuladores;</li>' +
          '<li>Melhorar recomendações de séries dentro do app.</li></ul>' +
          '<h3>3. Com quem compartilhamos</h3>' +
          '<p>Provedores de anúncios (para exibir e medir o vídeo), processador de pagamentos (para o PIX) e serviços de análise de fraude. Não vendemos dados pessoais.</p>' +
          '<h3>4. Por quanto tempo guardamos</h3>' +
          '<p>Dados de conta e histórico financeiro: 5 anos, por exigência fiscal. Identificador de publicidade: 13 meses. Após exclusão da conta, o resto é apagado em 30 dias.</p>' +
          '<h3>5. Seus direitos</h3>' +
          '<p>Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento em Perfil → Excluir conta, ou pelo e-mail abaixo. Respondemos em até 15 dias.</p>' +
          '<h3>6. Contato do encarregado</h3>' +
          '<p>dpo@cinecoin.app — Encarregado de Proteção de Dados (DPO).</p>' +
          '</div></div>';
      }
    },

    /* --- 关于 --- */
    about: {
      title: 'Sobre',
      html: function () {
        return '<div class="sub-wrap">' +
          '<div class="sub-hero" style="flex-direction:column;text-align:center;gap:9px;padding:22px 14px">' +
          '<span class="ico" style="width:56px;height:56px;border-radius:17px;background:linear-gradient(135deg,#F5C451,#E9A23B);color:#1A1206">' +
          subIco('film', 26) + '</span>' +
          '<div class="tt" style="text-align:center"><b style="font-size:17px">CineCoin</b>' +
          '<span>Versão 1.0.0 · build 100</span></div></div>' +
          group('',
            rowHTML({ icon: 'shield', act: 'terms', title: 'Termos de uso', sub: 'Regras do programa de recompensas' }) +
            rowHTML({ icon: 'help', act: 'licenses', title: 'Licenças de código aberto', sub: 'Media3, OkHttp, Coil' }) +
            rowHTML({ icon: 'spark', act: 'rate', title: 'Avaliar na Play Store', sub: 'Leva menos de um minuto' })) +
          group('', rowHTML({ icon: 'film', title: 'Pacote', sub: 'com.cinecoin.drama' })) +
          '<p class="sub-note" style="text-align:center">© 2026 CineCoin · Feito para quem gosta de série curta</p>' +
          '</div>';
      }
    },

    /* --- 删除账号 --- */
    delacc: {
      title: 'Excluir conta',
      html: function () {
        return '<div class="sub-wrap">' +
          '<div class="danger-card"><div class="dh">' + subIco('trash', 16) + '<b>Esta ação não pode ser desfeita</b></div>' +
          '<ul><li>Saldo atual de <b>' + fmtInt(state.coins) + ' moedas</b> será perdido</li>' +
          '<li>Histórico de episódios e séries salvas</li>' +
          '<li>Chave PIX e dados de pagamento</li></ul></div>' +
          '<button class="chk" id="delChk"><span class="bx">' + subIco('check', 11) + '</span>' +
          '<span>Entendo que perco o saldo e o histórico, e que os dados serão apagados em 30 dias.</span></button>' +
          '<button class="btn btn-danger btn-block" id="delBtn" disabled>Excluir minha conta</button>' +
          '<p class="sub-note">Se seu saldo for maior que R$ 5,00, saque antes de excluir — depois da exclusão não é possível recuperar.</p>' +
          '</div>';
      }
    }
  };

  function openSub(key, seg) {
    var def = SUB_DEFS[key];
    if (!def) return;
    $('#subTitle').textContent = def.title;
    var body = $('#subBody');
    body.innerHTML = def.html(seg);
    body.scrollTop = 0;
    openPage('sub');
    bindSub(body, key);
    /* 同一页的两个段：Ver tudo 落记录段，Ver regras 落规则段，不各做一份页面 */
    if (seg) {
      var t = body.querySelector('.sub-seg[data-seg="' + seg + '"]');
      if (t) body.scrollTop = Math.max(0, t.offsetTop - 12);
    }
  }
  window.__CCAPI__ = window.__CCAPI__ || {};
  window.__CCAPI__.openSub = openSub;

  /* 子页内的交互：只绑当前渲染出来的节点，不污染全局 */
  function bindSub(body, key) {
    if (key === 'sec') {
      var sw = $('#sw2fa', body);
      if (sw) sw.addEventListener('click', function () {
        var on = sw.classList.toggle('on');
        sw.style.background = on ? '#22C55E' : '#33333E';
        sw.querySelector('i').style.transform = on ? 'translateX(16px)' : 'none';
        toast(on ? 'Verificação em duas etapas ativada' : 'Verificação desativada');
        Sfx.click();
      });
    }
    if (key === 'lang') {
      $$('.opt', body).forEach(function (o) {
        o.addEventListener('click', function () {
          $$('.opt', body).forEach(function (x) { x.classList.remove('on'); });
          o.classList.add('on');
          state.lang = o.dataset.lang;
          /* v1.7：中文走运行时语言包（45-i18n.js）；葡语是原始语言，切回即原位还原 */
          if (window.__CC_I18N__ && (state.lang === 'zh' || state.lang === 'pt')) {
            window.__CC_I18N__.setLang(state.lang);
            $$('.opt', body).forEach(function (x) {
              x.classList.toggle('on', x.dataset.lang === state.lang);
            });
          }
          toast(state.lang === 'pt' ? 'Idioma: Português (Brasil)'
            : state.lang === 'zh' ? 'Idioma: Chinês (Simplificado)'
            : state.lang === 'en' ? 'Language: English (US)' : 'Idioma: Español');
          Sfx.click();
        });
      });
    }
    if (key === 'help') {
      $$('.faq', body).forEach(function (f) {
        f.querySelector('button').addEventListener('click', function () {
          f.classList.toggle('open');
          Sfx.click();
        });
      });
    }
    if (key === 'delacc') {
      var chk = $('#delChk', body);
      var btn = $('#delBtn', body);
      if (chk) chk.addEventListener('click', function () {
        var on = chk.classList.toggle('on');
        btn.disabled = !on;
        Sfx.click();
      });
      if (btn) btn.addEventListener('click', function () {
        if (btn.disabled) return;
        if (btn.dataset.arm !== '1') {
          btn.dataset.arm = '1';
          btn.textContent = 'Confirmar exclusão definitiva';
          toast('Toque novamente para confirmar');
          return;
        }
        toast('Solicitação registrada · dados apagados em 30 dias');
        setTimeout(function () { closePage('sub'); }, 700);
      });
    }
  }

  /* 子页里所有 data-act 的行为（演示级，不连后端） */
  var SUB_ACTS = {
    pwd: 'Enviamos um link de redefinição para l***@gmail.com',
    kick: 'Dispositivo desconectado',
    logoutall: 'Todas as outras sessões foram encerradas',
    wdinfo: 'Detalhes do saque · em breve',
    chat: 'Chat aberto · atendimento em até 24h',
    mail: 'Abrindo o app de e-mail…',
    terms: 'Termos completos · em breve',
    licenses: 'Licenças de código aberto · em breve',
    rate: 'Obrigado! Isso ajuda muito',
    signout: 'Sessão encerrada · demonstração sem login'
  };

  /* ---------------------------------------------------------------- 弹层 */
  /* 遮罩栈：返回键/ Esc 只关最上层，且关闭动画期间不会重复触发 */
  var maskStack = [];
  function openMask(id) {
    var m = document.getElementById(id);
    if (!m) return;
    if (m.classList.contains('on')) {          /* 已开就不重复入栈 */
      if (id === 'mReward') renderRewardPop();
      if (id === 'mNewbie') renderNewbie();
      if (id === 'mShort') renderShort();
      if (id === 'mDone') renderDone();
      return;
    }
    m.classList.add('on');
    m.classList.remove('closing');
    maskStack.push(id);
    syncFeedVideo();
    if (id === 'mReward') { renderRewardPop(); }
    if (id === 'mNewbie') { renderNewbie(); }
    if (id === 'mShort') { renderShort(); }
    if (id === 'mDone') { renderDone(); }
    if (id === 'mWheel') { $('#wheelOut').innerHTML = '<div class="t">Toque em GIRAR para começar</div>'; }
  }
  function closeMask(id) {
    var m = document.getElementById(id);
    if (!m) return;
    if (!m.classList.contains('on')) return;
    if (m.classList.contains('closing')) return;   /* 收尾动画中，忽略重复关闭 */
    /* 立刻出栈：Esc 连按不会关两次 */
    var at = maskStack.lastIndexOf(id);
    if (at >= 0) maskStack.splice(at, 1);
    var dlg = m.querySelector('.dlg, .bottomsheet');
    if (dlg) {
      m.classList.add('closing');
      dlg.classList.add('closing');
      setTimeout(function () {
        m.classList.remove('on', 'closing');
        dlg.classList.remove('closing');
        syncFeedVideo();
      }, 200);
    } else { m.classList.remove('on'); syncFeedVideo(); }
  }
  function topMask() { return maskStack.length ? maskStack[maskStack.length - 1] : null; }
  /* 全局点击节流（捕获阶段）：同一个可点元素 300ms 内只响应一次。
     以前每个异步动作各自写标志位，漏一处就能连点两次 —— 重复领奖、重复下单、
     转盘连抽。放在捕获阶段统一拦，比在十几个 handler 里补判断牢靠。 */
  var lastTap = new WeakMap();
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [role="button"], .dcard, .hrow, .tier, .wm-card, .ck-cell');
    if (!t || t.disabled) return;
    var now = Date.now();
    var prev = lastTap.get(t) || 0;
    if (now - prev < 300) { e.stopPropagation(); e.preventDefault(); return; }
    lastTap.set(t, now);
  }, true);

  /* 返回键（测试环境用 Esc 模拟 Android 硬件返回）：
     遮罩优先 → 二级页其次 → 最后回首页，逐层退，不会一次退两层 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.metaKey || e.ctrlKey) return;
    var mid = topMask();
    if (mid) {
      e.preventDefault();
      if (mid === 'mReward') pendingUnlock = null;
      closeMask(mid);
      Sfx.click();
      return;
    }
    var pg = document.querySelector('.page.on');
    if (pg) {
      e.preventDefault();
      var backName = pg.dataset.page;
      closePage(pg);
      if (backName === 'sac' && sacBackTo === 'player' && plCur) {
        sacBackTo = null;
        openPage('player');
        var pv = document.getElementById('plVideo');
        if (pv) { var pp = pv.play(); if (pp && pp.catch) pp.catch(function () { }); }
      }
      Sfx.click();
      return;
    }
    if (state.tab !== 'inicio') { e.preventDefault(); goTab('inicio'); }
  });

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) {
      /* 关掉激励前置弹窗 = 放弃这次解锁，别让下一次普通激励误把某一集解开 */
      if (c.dataset.close === 'mReward') pendingUnlock = null;
      closeMask(c.dataset.close); Sfx.click();
    }
    var b = e.target.closest('[data-back]');
    if (b) {
      var pg = b.closest('.page');
      if (pg) {
        var backName = pg.dataset.page;
        closePage(pg);
        if (backName === 'sac' && sacBackTo === 'player' && plCur) {
          sacBackTo = null;
          openPage('player');                 /* 只把播放器放回前台，进度与计币都不重置 */
          var pv = document.getElementById('plVideo');
          if (pv) { var pp = pv.play(); if (pp && pp.catch) pp.catch(function () { }); }
        }
      }
      Sfx.click();
      return;
    }
    /* 设置子页入口（Perfil 各行） */
    var sb = e.target.closest('[data-sub]');
    if (sb) { openSub(sb.dataset.sub); Sfx.click(); return; }
    /* 子页内的演示动作 */
    var ac = e.target.closest('[data-act]');
    if (ac) {
      var k = ac.dataset.act;
      if (SUB_ACTS[k]) toast(SUB_ACTS[k]);
      Sfx.click();
    }
  });

  /* ---------------------------------------------------------------- Tabbar */
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      goTab(t.dataset.tab);
      if (t.dataset.tab === 'ganhar') {
        /* 中间凸起：直达提现页顶部 */
        var body = document.querySelector('.tabpage[data-page="ganhar"] .page-body');
        if (body) body.scrollTop = 0;
      }
    });
  });

  /* 三处入口（顶部 Sacar / 首页进度条 / 任务页余额卡）→ 统一进提现二级页 */
  ['btnSacarTop', 'goalBar', 'goalNow'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () { Sfx.click(); openSac(); });
  });

  /* ---------------------------------------------------------------- Feed 滑动（v1.2：跟手拖动 + 回弹） */
  var track = $('#feedTrack');
  var slides = [];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 按 /home-feed 真实数据渲染首页竖屏（video 失败/加载中时下面仍是 CSS 剪影） */
  function feedSlideHTML(f, i) {
    var d = f.drama;
    var sub = (d.desc || d.title || '').replace(/\s+/g, ' ').trim();
    if (sub.length > 92) sub = sub.slice(0, 90).replace(/[,;.，；]$/, '') + '…';
    var media = '';
    if (d.cover) media += '<img class="fstill" src="' + esc(d.cover) + '" alt="" onerror="this.style.display=\'none\'">';
    if (f.video) {
      /* 视频未解码前是黑底，先透明，解码出首帧后再淡入（下面始终有封面兜底） */
      media += '<video class="fvid" muted loop playsinline preload="' + (i === state.feedIdx ? 'auto' : 'none') + '"' +
        (f.poster ? ' poster="' + esc(f.poster) + '"' : '') +
        ' src="' + esc(f.video) + '"></video>';
    }
    return '<article class="feed-slide' + (i === state.feedIdx ? ' on' : '') + '" data-idx="' + i + '" data-drama="' + esc(d.id) + '">' +
      '<div class="vid ' + d.cls + '"' + tuneStyle(d.id) + '><div class="vid-bg"></div><div class="vid-bars"><i></i><i></i><i></i></div>' +
      '<div class="vid-fig"><span class="lay glow"><svg viewBox="0 0 200 320"><use href="#' + d.fig + '"/></svg></span>' +
      '<span class="lay body"><svg viewBox="0 0 200 320"><use href="#' + d.fig + '"/></svg></span></div>' +
      '<div class="vid-floor"></div><div class="vid-grain"></div><div class="vid-vig"></div></div>' +
      media +
      '<div class="subtitle"><span>' + esc(sub) + '</span></div>' +
      '</article>';
  }

  function renderFeedSlides() {
    track.innerHTML = FEED_SLIDES.map(feedSlideHTML).join('');
    slides = $$('.feed-slide', track);
    slides.forEach(function (s) {
      var v = s.querySelector('video');
      if (!v) return;
      /* 真片自带硬字幕，再叠一层剧情简介就会压字——有画面时把简介淡出 */
      var ready = function () { v.classList.add('ready'); s.classList.add('has-video'); };
      v.addEventListener('loadeddata', ready);
      v.addEventListener('playing', ready);
      /* v1.7.4 素材比例自适应：横屏/方形视频若按 cover 塞进竖屏，左右会被裁掉只剩中间一块。
         比容器明显宽（> 1.35 倍）就切 contain 完整显示，上下用封面做模糊填充（16-earn.css）。
         竖屏素材比例接近容器，仍走 cover 满屏，不受影响。 */
      var fitRatio = function () {
        if (!v.videoWidth || !v.videoHeight) return;
        var vr = v.videoWidth / v.videoHeight;
        var cr = (VIEW.clientWidth || 360) / (VIEW.clientHeight || 800);
        s.classList.toggle('is-wide', vr > cr * 1.35);
      };
      v.addEventListener('loadedmetadata', fitRatio);
      v.addEventListener('resize', fitRatio);   /* 换清晰度源后重算 */
      if (v.readyState >= 1) fitRatio();
      /* 接口历史上出现过不带清晰度后缀的 /play（404）——失败时补一次 _720p.mp4，
         避免整屏黑着只剩剪影，也免得为一条失效地址重抓快照 */
      v.addEventListener('error', function () {
        var src = v.getAttribute('src') || '';
        if (!v.dataset.retried && /\/play$/.test(src)) {
          v.dataset.retried = '1';
          v.src = src + '_720p.mp4';
          v.load();
        }
      });
    });
    syncFeedVideo();
  }

  /* 只有当前屏播放；切 Tab / 弹层遮挡 / 滑走 / 进入看剧页都暂停 */
  function syncFeedVideo() {
    var blocked = !!document.querySelector('.mask.on, .fullmask.on, .interstitial.on')
      || !!document.querySelector('.page[data-page="player"].on');
    slides.forEach(function (s, i) {
      var v = s.querySelector('video');
      if (!v) return;
      var active = (i === state.feedIdx) && state.tab === 'inicio' && !blocked && !state.paused;
      if (active) {
        v.muted = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () { });
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  renderFeedSlides();

  /* 调试：`#wide` 强制把所有首页视频按「横屏素材」处理，便于截图验收 contain 效果 */
  if (/#wide\b/.test(location.hash)) {
    slides.forEach(function (s) { s.classList.add('is-wide', 'has-video'); });
  }

  var swipeLock = 0;
  var feedBusy = false;

  function slideH() { return track.clientHeight || 640; }
  function setT(el, ty) { el.style.transform = 'translateY(' + ty + 'px)'; }
  function resetSlide(el) { el.style.transform = ''; el.classList.remove('ghost', 'dragging', 'sliding'); }

  function afterSwap(cur, nb) {
    setTimeout(function () {
      cur.classList.remove('on');
      nb.classList.add('on');
      resetSlide(cur); resetSlide(nb);
      feedBusy = false;
    }, 400);
  }

  function onSlideEnd() {
    state.playPct = 0;
    if (state.paused) setPaused(false);
    if (state.speed !== 1) setSpeed(1);
    Sfx.tick();
    hideHint();
  }

  /* 完整滑屏（自动播完 / 滚轮 / 拖拽提交共用） */
  function slideTo(n) {
    if (n === state.feedIdx || n < 0 || n >= slides.length || feedBusy) return false;
    feedBusy = true;
    var cur = slides[state.feedIdx], nb = slides[n];
    var dir = n > state.feedIdx ? 1 : -1;
    var h = slideH();
    nb.classList.add('ghost', 'dragging');
    setT(nb, dir * h);
    void nb.offsetHeight;
    nb.classList.remove('dragging'); nb.classList.add('sliding');
    cur.classList.add('sliding');
    setT(nb, 0); setT(cur, -dir * h);
    state.feedIdx = n;
    syncFeedMeta();
    resetEpEarn();
    onSlideEnd();
    syncFeedVideo();
    afterSwap(cur, nb);
    return true;
  }

  /* 边界回弹：到头了轻轻弹一下提示 */
  function bump(dir) {
    if (feedBusy) return;
    feedBusy = true;
    var cur = slides[state.feedIdx];
    cur.classList.add('dragging'); setT(cur, -dir * 42);
    void cur.offsetHeight;
    cur.classList.remove('dragging'); cur.classList.add('sliding');
    setT(cur, 0);
    setTimeout(function () { resetSlide(cur); feedBusy = false; }, 400);
  }

  function nextSlide(dir) {
    var now = Date.now();
    if (now - swipeLock < 560) return;
    swipeLock = now;
    var n = state.feedIdx + dir;
    if (n < 0 || n >= slides.length) {
      bump(dir);
      if (n < 0) toast('Você está no primeiro episódio');
      else toast('Fim do feed — volte para Dramas');
      return;
    }
    slideTo(n);
  }

  function feedItem(i) { return FEED_SLIDES[i] || FEED_SLIDES[0] || { drama: DRAMAS[0], ep: { no: 1, duration: 90 } }; }

  function syncFeedMeta() {
    var it = feedItem(state.feedIdx);
    var d = it.drama;
    var epNo = it.ep && it.ep.no ? it.ep.no : d.cur;
    var dur = (it.ep && it.ep.duration) ? it.ep.duration : 90;
    $('#feedTitle').textContent = d.title;
    $('#feedTitle').title = d.rawTitle || d.title;   /* 单行省略，完整名放 title */
    $('#feedSub').textContent = d.cat + ' · ' + d.eps + ' eps · ' + (d.views === '—' ? d.heat : d.views) + ' views';
    $('#feedEp').textContent = String(epNo).padStart(2, '0');
    $('#epPillNum').textContent = String(epNo).padStart(2, '0');
    $('#epTime').textContent = Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0');
    state.ep = epNo;
    /* 文案换屏时淡入，避免硬切 */
    var bar = document.querySelector('.epbar');
    if (bar) { bar.classList.remove('meta-in'); void bar.offsetWidth; bar.classList.add('meta-in'); }
    renderGoal();
  }

  /* 播放某剧的某集：优先复用首页已有的那一屏，不在前 8 屏就插一屏。
     播放地址由 CCData.videoFor 三级回退（本集原片 → 同剧片段 → 全局演示片段）；
     分集接口只给元数据，所以控制台会标出这条源是哪一级，自测也按级断言。 */
  var lastPlayKind = 'none';
  function playEpisode(id, epNo) {
    var d = DRAMAS.find(function (x) { return x.id === id; });
    if (!d) d = (feedItem(state.feedIdx) || {}).drama;
    if (!d) return false;
    epNo = Math.max(1, parseInt(epNo, 10) || d.cur || 1);

    var src = (window.CCData && CCData.videoFor)
      ? CCData.videoFor(d.apiId, epNo)
      : { url: '', kind: 'none' };
    lastPlayKind = src.kind;

    var idx = -1;
    for (var i = 0; i < FEED_SLIDES.length; i++) {
      if (FEED_SLIDES[i].drama && FEED_SLIDES[i].drama.id === d.id) { idx = i; break; }
    }
    var redraw = false;
    if (idx < 0) {
      /* 目录里 101 部剧只有 12 部在首页视频流里：插到当前屏之后，滑走即可继续看原流 */
      idx = Math.min(state.feedIdx + 1, FEED_SLIDES.length);
      FEED_SLIDES.splice(idx, 0, {
        drama: d,
        ep: { no: epNo, duration: 90, free: epNo <= (d.free || 3), locked: false },
        video: src.url, poster: d.cover || '', fallback: false, injected: true
      });
      redraw = true;
    } else {
      var it = FEED_SLIDES[idx];
      it.ep = it.ep || {};
      it.ep.no = epNo;
      if (src.url && it.video !== src.url) { it.video = src.url; redraw = true; }
    }

    d.cur = epNo;
    state.ep = epNo;
    state.playPct = 0;
    if (state.paused) { state.paused = false; var ic = $('#pauseIc'); if (ic) { ic.querySelector('use').setAttribute('href', '#i-pause'); ic.classList.remove('on'); } }
    if (state.speed !== 1) { state.speed = 1; var tip = $('#speedTip'); if (tip) tip.classList.remove('on'); }

    state.feedIdx = idx;
    if (redraw) renderFeedSlides();
    syncFeedMeta();
    /* 从任何二级页（详情 / 提现记录）发起播放，都要先退出那一层再回首页 */
    $$('.page.on').forEach(function (p) { p.classList.remove('on'); });
    goTab('inicio');

    var v = slides[idx] && slides[idx].querySelector('video');
    if (v) {
      try { v.currentTime = 0; } catch (e) { }
      v.muted = true;
      var p = v.play(); if (p && p.catch) p.catch(function () { });
    }
    renderConsole();
    return true;
  }
  (window.__CCAPI__ = window.__CCAPI__ || {}).playEpisode = playEpisode;

  /* ---------------------------------------------------------------- 看剧页（v1.8 / data-page="player"）
     首页信息流只负责「刷到哪部、想不想看」；点某一集进本页，整集播放、看剧计币、
     领金币、切上下集都在这里完成。计币池 state.pendingCoins 与首页共用，
     两处收集球只是同一个池子的两个入口。 */
  var plCur = null;            /* { drama, ep } 当前在看什么 */
  var plFrom = 'feed';         /* 返回时回到哪一层：detail | feed */

  function plEl(id) { return document.getElementById(id); }
  function plOpen() {
    var p = document.querySelector('.page[data-page="player"]');
    return !!(p && p.classList.contains('on'));
  }

  function openPlayer(id, epNo, from) {
    var d = DRAMAS.find(function (x) { return x.id === id; }) || feedItem(state.feedIdx).drama;
    if (!d) return false;
    epNo = Math.max(1, parseInt(epNo, 10) || d.cur || 1);
    if (epNo > (d.eps || 1)) epNo = d.eps || 1;
    plCur = { drama: d, ep: epNo };
    plFrom = from || plFrom || 'feed';
    d.cur = epNo;
    state.ep = epNo;
    state.playPct = 0;       /* 新一集从 0 开始计币 */
    state.epEarned = 0;
    state.paused = false;

    var src = (window.CCData && CCData.videoFor) ? CCData.videoFor(d.apiId, epNo) : { url: '', kind: 'none' };
    lastPlayKind = src.kind;
    /* 手势层复位：任何入口（详情页选集 / 直接调用）进来都从静止位置开始 */
    var sl = plEl('plSlide');
    if (sl) { sl.style.transition = 'none'; sl.style.transform = ''; }
    var gh = plEl('plGhost');
    if (gh) {
      gh.style.transition = 'none'; gh.style.opacity = '';
      gh.classList.remove('cover', 'is-next', 'is-prev');
      gh.style.transform = '';
    }
    var bg = plEl('plBgfill');
    if (bg) bg.style.backgroundImage = d.cover ? 'url("' + d.cover + '")' : 'none';
    var v = plEl('plVideo');
    if (v) {
      if (d.cover) v.poster = d.cover;
      if (src.url) {
        if (v.getAttribute('src') !== src.url) v.src = src.url;
        v.style.display = '';
        v.muted = true;
        try { v.currentTime = 0; } catch (e) { }
        var p = v.play(); if (p && p.catch) p.catch(function () { });
      } else {
        /* 没有播放源（接口断链/无授权）时不留黑屏，靠 poster + 下方剧名兜底 */
        v.removeAttribute('src');
        v.style.display = 'none';
      }
    }

    var ep2 = String(epNo).padStart(2, '0');
    plEl('plTitle').textContent = d.title;
    plEl('plSub').textContent = 'EP ' + ep2 + ' · ' + (d.cat || 'Drama');
    plEl('plFootTitle').textContent = d.title;
    plEl('plFootSub').textContent = (d.cat || 'Drama') + ' · ' + d.eps + ' eps · ' + (d.views || '—') + ' views';
    plEl('plProg').style.width = '0%';
    /* v1.19：底部 pl-nav（EP anterior / Próximo EP / 集号）已移除，切集走上下滑（plGo） */
    /* v1.20：播放页计时胶囊（contando Ns）已移除，进度由底部进度条 + 收集球进度环表达 */
    renderPlLike();

    syncFeedVideo();         /* 信息流在后台停播，避免两路同时出声 */
    openPage('player');
    syncCollect();
    renderConsole();
    return true;
  }

  function closePlayer() {
    var v = plEl('plVideo');
    if (v) { try { v.pause(); } catch (e) { } }
    closePage('player');
    if (plFrom === 'detail') openPage('detail');
    syncFeedVideo();
  }

  function renderPlLike() {
    var b = plEl('plLike');
    if (!b) return;
    b.classList.toggle('liked', !!state.liked);
    b.querySelector('use').setAttribute('href', state.liked ? '#i-heart-f' : '#i-heart');
    plEl('plLikeN').textContent = state.liked ? '12k' : '11k';
    var s = plEl('plSave');
    if (s) {
      s.classList.toggle('liked', !!state.saved);
      s.querySelector('use').setAttribute('href', state.saved ? '#i-bookmark-f' : '#i-bookmark');
    }
  }

  /* ---- 上下滑动切集（v1.8.1）---------------------------------------
     和首页信息流同一套手势语言：上滑下一集、下滑上一集。拖动时内容层跟手
     位移、对侧 ghost 用目标集封面顶上；松手过阈值才提交，否则回弹。
     桌面调试用滚轮，逻辑与手指一致。 */
  var plDrag = null, plCommitLock = 0, plDragEndAt = 0;

  function plTotal() { return plCur ? (plCur.drama.eps || 1) : 1; }
  function plStageH() { var s = plEl('plStage'); return (s && s.clientHeight) || 640; }
  function plInRange(dir) { return !!plCur && plCur.ep + dir >= 1 && plCur.ep + dir <= plTotal(); }

  function plSetT(el, ty, dur) {
    if (!el) return;
    el.style.transition = dur ? 'transform ' + dur + 'ms cubic-bezier(.22,.9,.28,1)' : 'none';
    el.style.transform = 'translateY(' + ty + 'px)';
  }

  function plGo(dir) {
    if (!plCur) return false;
    if (plCur.ep + dir < 1) { toast('Você está no primeiro episódio'); return false; }
    if (plCur.ep + dir > plTotal()) { toast('Você chegou ao último episódio'); return false; }
    openPlayer(plCur.drama.id, plCur.ep + dir, plFrom);
    return true;
  }

  function plGhostPaint(dir) {
    var g = plEl('plGhost');
    if (!g || !plCur) return;
    var d = plCur.drama, next = plCur.ep + dir;
    g.classList.toggle('is-next', dir > 0);
    g.classList.toggle('is-prev', dir < 0);
    var bg = plEl('plGhostBg');
    if (bg) bg.style.backgroundImage = d.cover ? 'url("' + d.cover + '")' : 'none';
    plEl('plGhostTag').textContent = dir > 0 ? 'Próximo EP' : 'EP anterior';
    plEl('plGhostTitle').textContent = d.title;
    plEl('plGhostSub').textContent = 'EP ' + String(next).padStart(2, '0') + ' / ' + plTotal();
  }

  function plGhostRest() {
    var g = plEl('plGhost');
    if (!g) return;
    g.style.transition = 'none';
    g.style.opacity = '';
    g.classList.remove('cover');
    plSetT(g, (g.classList.contains('is-prev') ? -1 : 1) * plStageH(), 0);
  }

  /* 没过阈值：内容层与 ghost 一起弹回原位 */
  function plResetDrag() {
    plSetT(plEl('plSlide'), 0, 200);
    var g = plEl('plGhost');
    if (g) {
      g.classList.remove('cover');
      plSetT(g, (g.classList.contains('is-prev') ? -1 : 1) * plStageH(), 200);
    }
  }

  /* 提交：先把内容层推走、ghost 顶到正中（ghost 封面 = 目标集封面），
     再让真播放器在下面接住 —— 中途不会出现空白或回弹。 */
  function plCommit(dir) {
    if (Date.now() - plCommitLock < 420) return;
    if (!plInRange(dir)) {
      plResetDrag();
      toast(dir > 0 ? 'Você chegou ao último episódio' : 'Você está no primeiro episódio');
      return;
    }
    plCommitLock = Date.now();
    var g = plEl('plGhost'), s = plEl('plSlide'), H = plStageH();
    plSetT(s, -dir * H, 240);
    if (g) { g.classList.add('cover'); plSetT(g, 0, 240); }
    setTimeout(function () {
      plGo(dir);                      /* 真内容接管，poster 仍是那张封面 */
      plSetT(s, 0, 0);
      if (g) { g.style.transition = 'opacity 190ms linear'; g.style.opacity = '0'; }
      setTimeout(plGhostRest, 210);
    }, 230);
  }

  function plDragStart(e) {
    if (!plOpen() || plDrag) return;
    if (Date.now() - plCommitLock < 420) return;
    if (e.target.closest && e.target.closest('button')) return;   /* 按钮上的手势留给按钮 */
    var t = e.touches ? e.touches[0] : e;
    if (!t) return;
    plDrag = { x: t.clientX, y: t.clientY, dy: 0, axis: null, t0: Date.now(), h: plStageH() };
  }

  function plDragMove(e) {
    if (!plDrag) return;
    var t = e.touches ? e.touches[0] : e;
    if (!t) return;
    var dx = t.clientX - plDrag.x, dy = t.clientY - plDrag.y;
    if (!plDrag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      plDrag.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
      if (plDrag.axis === 'y') {
        var dir = dy < 0 ? 1 : -1;
        if (!plInRange(dir)) {                 /* 已经到头：交给页面滚动/点击，不跟手 */
          plDrag.axis = 'x';
          toast(dir > 0 ? 'Você chegou ao último episódio' : 'Você está no primeiro episódio');
          return;
        }
        plGhostPaint(dir);
      }
    }
    if (plDrag.axis !== 'y') return;
    if (e.cancelable) e.preventDefault();
    var d = Math.max(-plDrag.h * 0.42, Math.min(plDrag.h * 0.42, dy * 0.55));
    plDrag.dy = dy;
    plSetT(plEl('plSlide'), d, 0);
    var g = plEl('plGhost');
    if (g) {
      g.classList.remove('cover');
      plSetT(g, (dy < 0 ? 1 : -1) * plDrag.h + d, 0);
    }
  }

  function plDragEnd() {
    if (!plDrag) return;
    var d = plDrag, dy = d.dy, dt = Math.max(1, Date.now() - d.t0);
    plDrag = null;
    plDragEndAt = Date.now();
    if (d.axis !== 'y') return;
    var fast = Math.abs(dy) / dt > 0.45;
    if (Math.abs(dy) > 72 || (fast && Math.abs(dy) > 34)) plCommit(dy < 0 ? 1 : -1);
    else plResetDrag();
  }

  (function bindPlayer() {
    if (!plEl('plPage')) return;
    plEl('plBack').addEventListener('click', closePlayer);

    /* v1.19：底部切集按钮已移除（上下滑即可切集，手势与 plGo 同源） */

    /* 看剧途中直接 Sacar（BF-10-08 的第三个入口，返回时回到播放器） */
    if (plEl('plSacar')) {
      plEl('plSacar').addEventListener('click', function () {
        if (!plCur) { openSac(); return; }
        Sfx.click();
        sacBackTo = 'player';
        openSac();
      });
    }

    /* 左上角转盘入口（v1.8.2）：看剧途中随手转一把，边看边回本 */
    if (plEl('plWheel')) {
      plEl('plWheel').addEventListener('click', function () { Sfx.click(); openWheel(); });
    }

    /* 手势与滚轮 */
    var st = plEl('plStage');
    if (st) {
      st.addEventListener('touchstart', plDragStart, { passive: true });
      st.addEventListener('touchmove', plDragMove, { passive: false });
      st.addEventListener('touchend', plDragEnd);
      st.addEventListener('touchcancel', plDragEnd);
      var wLock = 0;
      st.addEventListener('wheel', function (e) {
        if (!plOpen() || Math.abs(e.deltaY) < 10) return;
        if (Date.now() - wLock < 560) return;
        wLock = Date.now();
        plCommit(e.deltaY > 0 ? 1 : -1);
      }, { passive: true });
    }

    plEl('plCollect').addEventListener('click', function () { Sfx.init(); openClaim(); });

    plEl('plLike').addEventListener('click', function () {
      state.liked = !state.liked;
      renderPlLike();
      $('#likeBtn').classList.toggle('liked', state.liked);
      $('#likeBtn svg use').setAttribute('href', state.liked ? '#i-heart-f' : '#i-heart');
      $('#likeN').textContent = state.liked ? '12k' : '11k';
      Sfx.tick();
    });
    plEl('plSave').addEventListener('click', function () {
      state.saved = !state.saved;
      renderPlLike();
      $('#saveBtn').classList.toggle('liked', state.saved);
      $('#saveBtn svg use').setAttribute('href', state.saved ? '#i-bookmark-f' : '#i-bookmark');
      toast(state.saved ? 'Salvo em Minha lista' : 'Removido da lista');
      Sfx.click();
    });
    plEl('plShare').addEventListener('click', function () {
      toast('Link copiado'); Sfx.click(); bumpTask('share1', 1);
    });
    /* 选集：回详情页挑，挑完又直接进本页 —— 循环始终停在「看剧」这一层 */
    plEl('plPick').addEventListener('click', function () {
      if (!plCur) return;
      var v = plEl('plVideo');
      if (v) { try { v.pause(); } catch (e) { } }
      openDetail(plCur.drama.id);
      plFrom = 'detail';
    });

    /* 点画面暂停/继续（按钮区域除外；刚滑动完的那一下不算点击） */
    document.querySelector('.pl-page .pl-stage').addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      if (Date.now() - plDragEndAt < 300) return;
      var v = plEl('plVideo');
      if (!v) return;
      if (v.paused) {
        state.paused = false;
        var p = v.play(); if (p && p.catch) p.catch(function () { });
      } else {
        state.paused = true;
        v.pause();
      }
    });
  })();

  (window.__CCAPI__ = window.__CCAPI__ || {}).openPlayer = openPlayer;
  (window.__CCAPI__ = window.__CCAPI__ || {}).closePlayer = closePlayer;
  (window.__CCAPI__ = window.__CCAPI__ || {}).plGo = plGo;
  (window.__CCAPI__ = window.__CCAPI__ || {}).plCommit = plCommit;
  (window.__CCAPI__ = window.__CCAPI__ || {}).plCur = function () { return plCur; };

  var wheelLock = 0;
  $('#feed').addEventListener('wheel', function (e) {
    if (state.tab !== 'inicio') return;
    if (Math.abs(e.deltaY) < 10) return;
    if (Date.now() - wheelLock < 460) return;
    wheelLock = Date.now();
    nextSlide(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  /* --- 跟手拖动（pointer 统一鼠标/触摸） --- */
  var drag = null;
  var holdTimer = null;

  function curVideo() {
    var s = slides[state.feedIdx];
    return s ? s.querySelector('video') : null;
  }
  /* 长按 2× 倍速：只改当前 video 的 playbackRate，松手复位 */
  function setSpeed(x) {
    if (state.speed === x) return;
    state.speed = x;
    var v = curVideo();
    if (v) { try { v.playbackRate = x; } catch (err) { } }
    var tip = $('#speedTip');
    if (tip) {
      tip.textContent = x + '× ▶▶';
      tip.classList.toggle('on', x > 1);
    }
  }
  function setPaused(p) {
    state.paused = p;
    var v = curVideo();
    if (v) {
      if (p) v.pause();
      else { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); }
    }
    var ic = $('#pauseIc');
    if (ic) {
      ic.querySelector('use').setAttribute('href', p ? '#i-play' : '#i-pause');
      ic.classList.toggle('on', p);
    }
  }
  function togglePlay() { setPaused(!state.paused); Sfx.click(); }

  function paintDrag(dy) {
    var cur = slides[state.feedIdx];
    var dir = dy < 0 ? 1 : -1;
    var n = state.feedIdx + dir;
    var atEdge = n < 0 || n >= slides.length;
    var h = slideH();
    cur.classList.add('dragging');
    /* 边界橡皮筋：只跟手 32% */
    setT(cur, atEdge ? dy * 0.32 : dy);
    var nb = atEdge ? null : slides[n];
    if (drag.nb !== nb) {
      if (drag.nb) resetSlide(drag.nb);
      drag.nb = nb; drag.nbDir = dir;
      if (nb) {
        nb.classList.add('ghost', 'dragging');
        setT(nb, dy < 0 ? h + dy : -h + dy);
      }
    } else if (nb) {
      setT(nb, dy < 0 ? h + dy : -h + dy);
    }
  }

  $('#feed').addEventListener('pointerdown', function (e) {
    if (state.tab !== 'inicio') return;
    if (feedBusy || drag) return;
    /* 按钮/资产区/互动栏/底栏不启动拖拽 */
    if (e.target.closest('button, .rail, .assets, .epbar, .play-prog')) return;
    drag = { id: e.pointerId, y0: e.clientY, ly: e.clientY, lt: performance.now(),
             dy: 0, v: 0, moved: false, nb: null, nbDir: 0 };
    /* 长按 420ms 未移动 → 2× 倍速（与真机短视频一致） */
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      holdTimer = null;
      if (!drag || drag.moved) return;
      setSpeed(2);
      suppressClick = true;
    }, 420);
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 8) drag.moved = true;
    if (drag.moved) {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (state.speed !== 1) setSpeed(1);
    }
    drag.dy = dy;
    var now = performance.now(), dt = now - drag.lt;
    if (dt > 16) { drag.v = drag.v * 0.7 + (e.clientY - drag.ly) / dt * 0.3; drag.ly = e.clientY; drag.lt = now; }
    if (drag.moved) paintDrag(dy);
  });
  function dragEnd(e) {
    clearTimeout(holdTimer); holdTimer = null;
    if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if (d.moved) suppressClick = true;
    if (state.speed !== 1) { setSpeed(1); suppressClick = true; }
    var cur = slides[state.feedIdx];
    var dy = d.dy, dir = dy < 0 ? 1 : -1;
    var n = state.feedIdx + dir;
    var h = slideH();
    var commit = d.moved && n >= 0 && n < slides.length &&
      (Math.abs(dy) > h * 0.22 || Math.abs(d.v) > 0.55);
    if (commit) {
      feedBusy = true;
      var nb = d.nb || slides[n];
      nb.classList.remove('dragging'); nb.classList.add('sliding');
      cur.classList.remove('dragging'); cur.classList.add('sliding');
      setT(nb, 0); setT(cur, -dir * h);
      state.feedIdx = n;
      syncFeedMeta();
      onSlideEnd();
      syncFeedVideo();
      afterSwap(cur, nb);
    } else {
      /* 回弹：当前屏归位，邻屏退回 */
      cur.classList.remove('dragging'); cur.classList.add('sliding');
      setT(cur, 0);
      if (d.nb) {
        var nb2 = d.nb;
        nb2.classList.remove('dragging'); nb2.classList.add('sliding');
        setT(nb2, d.nbDir * h);
        setTimeout(function () { resetSlide(nb2); }, 400);
      }
    }
  }
  window.addEventListener('pointerup', dragEnd);
  window.addEventListener('pointercancel', dragEnd);

  /* 单击暂停 / 双击点赞（260ms 判定窗口，与真机一致） */
  var lastTap = 0;
  var suppressClick = false;
  var tapTimer = null;
  $('#feed').addEventListener('click', function (e) {
    if (suppressClick) { suppressClick = false; return; }
    if (e.target.closest('button, .play-prog')) return;
    var now = Date.now();
    if (now - lastTap < 320) {
      if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
      var h = $('#bigHeart');
      h.classList.remove('go'); void h.offsetWidth; h.classList.add('go');
      if (!state.liked) { state.liked = true; $('#likeBtn').classList.add('liked'); $('#likeBtn svg use').setAttribute('href', '#i-heart-f'); $('#likeN').textContent = '12k'; }
      Sfx.tick();
      lastTap = 0;
      return;
    }
    lastTap = now;
    tapTimer = setTimeout(function () { tapTimer = null; togglePlay(); }, 260);
  });

  $('#likeBtn').addEventListener('click', function () {
    state.liked = !state.liked;
    this.classList.toggle('liked', state.liked);
    this.querySelector('use').setAttribute('href', state.liked ? '#i-heart-f' : '#i-heart');
    $('#likeN').textContent = state.liked ? '12k' : '11k';
    Sfx.tick();
  });
  $('#saveBtn').addEventListener('click', function () {
    state.saved = !state.saved;
    this.classList.toggle('liked', state.saved);
    this.querySelector('use').setAttribute('href', state.saved ? '#i-bookmark-f' : '#i-bookmark');
    toast(state.saved ? 'Salvo em Minha lista' : 'Removido da lista');
    Sfx.click();
  });
  /* 分享动作抽成函数：首页分享键与任务列表「Fazer agora」共用同一路径 */
  function doShare() {
    toast('Link copiado'); Sfx.click();
    bumpTask('share1', 1);
  }
  $('#shareBtn').addEventListener('click', doShare);
  /* 首页轮盘入口（v1.8.3）：金币球下面那颗球，点开 20 格金币盘 */
  var feedWheel = $('#feedWheel');
  if (feedWheel) feedWheel.addEventListener('click', function () { Sfx.click(); openWheel(); });
  /* 选集只剩一个入口：底部胶囊（带集号与时长）。右侧栏原来还有一个同样的按钮，已删。 */
  $('#epPicker').addEventListener('click', function () { openDetail(FEED_ORDER[state.feedIdx]); });

  function hideHint() { var h = document.getElementById('swipeHint'); if (h) h.classList.remove('show'); }
  setTimeout(hideHint, 5200);

  /* 播放计时（模拟服务端计时，图 12） */
  var beatSec = 12;
  var beatTimer = setInterval(function () {
    /* 播放发生在两处：首页信息流（刷到就播）与看剧页（主动点进来看整集）。
       两侧共用 state.playPct 与同一个待领池，进入任一侧前都会被重置为 0。 */
    var inPlayer = plOpen();
    if (!inPlayer && state.tab !== 'inicio') return;
    var paused = document.querySelector('.mask.on, .fullmask.on, .interstitial.on');
    if (paused || state.paused) return;
    beatSec++;
    state.playPct += 2.4 * state.speed;
    accrueEarn();     /* 边看边涨，满 100 封顶、等用户手动领 */

    if (inPlayer) {
      if (state.playPct >= 100) {
        state.playPct = 0;
        state.seenEps++;
        /* 播完自动进下一集（同一部剧内），到最后一集就停在结尾 */
        var pd = plCur && plCur.drama;
        if (pd && plCur.ep < (pd.eps || 1)) { openPlayer(pd.id, plCur.ep + 1, plFrom); return; }
        state.playPct = 100;
      }
      plEl('plProg').style.width = Math.min(100, state.playPct).toFixed(1) + '%';
      return;
    }

    $('#beatTxt').textContent = 'contando ' + beatSec + 's';
    if (state.playPct >= 100) {
      state.playPct = 0;
      state.seenEps++;
      /* 播完只换集，钱已经在进度里涨进待领池，不再自动发放 */
      if (state.feedIdx < slides.length - 1) nextSlide(1);
    }
    $('#playProg').style.width = state.playPct.toFixed(1) + '%';
    var kn = $('#progKnob');
    if (kn) kn.style.left = state.playPct.toFixed(1) + '%';
  }, 1000);

  /* 断网 / 加载失败态（真机必有）：重试走 1.1s 加载 → 恢复 */
  function showOffline(on) {
    var el = $('#offline');
    if (!el) return;
    el.classList.toggle('on', on);
    if (on) setPaused(true);
    syncFeedVideo();
  }
  var ofRetry = $('#ofRetry');
  if (ofRetry) {
    ofRetry.addEventListener('click', function () {
      var b = this;
      if (b.classList.contains('is-loading')) return;
      b.classList.add('is-loading');
      setTimeout(function () {
        b.classList.remove('is-loading');
        showOffline(false);
        setPaused(false);
        toast('Conectado · catálogo atualizado');
      }, 1100);
    });
  }
  window.__CCAPI__ = window.__CCAPI__ || {};
  window.__CCAPI__.showOffline = showOffline;

  /* 进度条拖动 seek（真机短视频都支持，拖动时暂停自动推进） */
  var progWrap = $('#playProgWrap');
  var scrubbing = false;
  function progSeek(e) {
    var r = progWrap.getBoundingClientRect();
    if (!r.width) return;
    var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    state.playPct = p * 100;
    $('#playProg').style.width = state.playPct.toFixed(1) + '%';
    var kn = $('#progKnob');
    if (kn) kn.style.left = state.playPct.toFixed(1) + '%';
    var v = curVideo();
    if (v && v.duration && isFinite(v.duration)) {
      try { v.currentTime = p * v.duration; } catch (err) { }
    }
  }
  if (progWrap) {
    progWrap.addEventListener('pointerdown', function (e) {
      scrubbing = true;
      progWrap.classList.add('scrub');
      try { progWrap.setPointerCapture(e.pointerId); } catch (err) { }
      progSeek(e);
    });
    progWrap.addEventListener('pointermove', function (e) { if (scrubbing) progSeek(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      progWrap.addEventListener(ev, function () {
        if (!scrubbing) return;
        scrubbing = false;
        progWrap.classList.remove('scrub');
        suppressClick = true;
      });
    });
  }

  /* ---------------------------------------------------------------- 看剧领金币（v1.5 / BF-11-12）
     点开 → 未达当日激励上限可以看广告翻倍，达上限只能直接领。
     这里给的是金币（行为货币），不是现金；现金只从转盘与任务奖励进账。 */
  var collectN = 0;   /* 保留变量名：控制台重置与自测都在用 */
  $('#collectBtn').addEventListener('click', function () {
    Sfx.init();
    openClaim();
  });

  function flyCoin(targetEl) {
    var vp = VIEW.getBoundingClientRect();
    var t = targetEl.getBoundingClientRect();
    var sx = vp.left + 40 + Math.random() * (vp.width - 120);
    var sy = vp.top + vp.height * 0.58 + Math.random() * 90;
    var el = document.createElement('div');
    el.className = 'fly-coin';
    el.textContent = 'C';
    el.style.left = (sx - vp.left) + 'px';
    el.style.top = (sy - vp.top) + 'px';
    VIEW.appendChild(el);
    var dx = (t.left + t.width / 2) - sx;
    var dy = (t.top + t.height / 2) - sy;
    var a = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + (dx * 0.32) + 'px,' + (dy * 0.18 - 46) + 'px) scale(1.12)', opacity: 1, offset: 0.42 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.5)', opacity: .9 }
    ], { duration: 700, easing: 'cubic-bezier(.32,.06,.42,1)', fill: 'forwards' });
    a.onfinish = function () {
      el.remove();
      targetEl.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
      Sfx.tick();
    };
  }

  /* ---------------------------------------------------------------- 激励广告（MZ-03） */
  var pendingReward = 0.05;   /* = 50 moedas */
  var pendingUnlock = null;   /* {id, ep}：这一条激励是用来解锁某集的 */
  var pendingPlay = null;     /* 解锁已落地、等 mDone 关掉再开播 */

  function renderRewardPop() {
    /* v1.9.7：看激励的奖励只有阶梯一处口径 —— 每个视频 +5 金币，不再是 R$0,05 */
    $('#rewardVal').textContent = '+ ' + fmtInt(LAD_FIRST) + ' moedas';
    $('#quotaTxt').textContent = state.adsToday + ' de ' + state.adCap;
    var dots = '';
    var shown = Math.min(15, state.adCap);
    for (var i = 0; i < shown; i++) dots += '<i class="' + (i < state.adsToday ? 'on' : '') + '"></i>';
    $('#quotaDots').innerHTML = dots;
    var full = state.adsToday >= state.adCap;
    var btn = $('#rewardWatch');
    btn.textContent = full ? 'Limite diário atingido' : 'Assistir agora';
    btn.classList.toggle('is-disabled', full);
  }

  function openReward() {
    if (state.adsToday >= state.adCap) {
      pendingUnlock = null;
      toast('Limite diário atingido · volte amanhã');
      Sfx.err();
      return;
    }
    /* 弹窗里的文案要跟着用途走：解锁集数 vs 单纯加钱 */
    renderRewardPop();
    var t = $('#rewardTitle'), dsc = $('#rewardDesc');
    if (t) t.textContent = pendingUnlock ? 'Desbloquear EP ' + String(pendingUnlock.ep).padStart(2, '0') : 'Ganhe assistindo';
    if (dsc) dsc.textContent = pendingUnlock
      ? 'Assista ao vídeo completo para liberar este episódio. Ele fica liberado para sempre.'
      : 'Assista ao vídeo completo e o valor cai direto no seu saldo.';
    Sfx.init();
    openMask('mReward');
  }
  /* 首页底部「+50 moedas」永远是纯加钱入口，不能继承上一条解锁意图 */
  $('#adPill').addEventListener('click', function () { pendingUnlock = null; openReward(); });
  $('#shortWatch').addEventListener('click', function () {
    closeMask('mShort');
    pendingUnlock = null;
    setTimeout(openReward, 260);
  });

  $('#rewardWatch').addEventListener('click', function () {
    if (state.adsToday >= state.adCap) return;
    closeMask('mReward');
    setTimeout(function () { playAd(false); }, 220);
  });

  /* ---------------------------------------------------------------- 激励视频
     v1.16：加载 → 播放 → 结算，中间要能失败、能重试。
     旧版三个问题：① 没有失败分支，永远"加载成功"；② playAd 可重入，
     720ms 的 setTimeout 没存句柄也清不掉，快速双击会起两个计时器、
     倒计时一秒跳 2；③ 播放中没有任何按钮锁。 */
  var AD_TOTAL = 5;   /* 演示时长；正式版 30s，埋点与文案都读这个常量 */
  var adTimer = null, adLoadTimer = null, adBusy = false;
  var adIntent = 'reward';   /* reward | wheelad | ckdouble | makeup | claimdouble | newbiedouble | doublereward | wdaccel */

  function adFailRate() {
    if (DBG.adfail) return 1;
    if (DBG.offline) return 1;
    return state.adFailRate == null ? 0 : state.adFailRate;
  }

  function adReset() {
    adBusy = false;
    clearInterval(adTimer);
    clearTimeout(adLoadTimer);
    var o = $('#adPlay');
    if (o) o.classList.remove('on', 'loading', 'failed');
    var load = $('#adLoad'); if (load) load.classList.remove('on');
    var fail = $('#adFail'); if (fail) fail.classList.remove('on');
    var cl = $('#adClose'); if (cl) cl.classList.remove('ready');
    syncFeedVideo();
  }

  function adShowFail() {
    clearInterval(adTimer);
    clearTimeout(adLoadTimer);
    adBusy = true;                       /* 仍占着会话：重试或关闭才放行 */
    var o = $('#adPlay');
    o.classList.remove('loading');
    o.classList.add('failed');
    var load = $('#adLoad'); if (load) load.classList.remove('on');
    var fail = $('#adFail'); if (fail) fail.classList.add('on');
    Sfx.err();
  }

  function playAd(intent) {
    if (intent === true) intent = 'wheel';
    if (intent === false || !intent) intent = 'reward';
    if (adBusy) return;                  /* 已在播放/加载，重复触发直接丢弃 */
    adBusy = true;
    adIntent = intent;

    var overlay = $('#adPlay');
    var fail = $('#adFail'); if (fail) fail.classList.remove('on');
    var cl = $('#adClose'); if (cl) cl.classList.remove('ready');
    overlay.classList.remove('failed');
    overlay.classList.add('on', 'loading');
    syncFeedVideo();

    var total = AD_TOTAL, left = total;
    $('#adBrand').textContent = 'Anúncio · ' + total + 's';
    $('#adCd').textContent = left;
    $('#adRing').setAttribute('stroke-dashoffset', '0');
    $('#adBar').style.width = '0%';
    $('#adCta').textContent = 'Saiba mais';
    clearInterval(adTimer);
    clearTimeout(adLoadTimer);
    var load = $('#adLoad');
    if (load) load.classList.add('on');

    /* 真实激励视频一定有拉素材阶段；720ms 让「加载→播放」的节奏成立。
       拉不到素材就进失败态：不扣额度、不推进阶梯、不丢用户的这次机会。 */
    adLoadTimer = setTimeout(function () {
      if (Math.random() < adFailRate()) { adShowFail(); return; }
      if (load) load.classList.remove('on');
      overlay.classList.remove('loading');
      adTimer = setInterval(function () {
        left--;
        $('#adCd').textContent = Math.max(0, left);
        var prog = (total - left) / total;
        $('#adBar').style.width = (prog * 100) + '%';
        $('#adRing').setAttribute('stroke-dashoffset', String(106.8 * prog));
        Sfx.tick();
        if (left <= 0) {
          clearInterval(adTimer);
          $('#adCd').textContent = '×';
          /* 播完要让关闭钮明确变成「可领取」，否则用户不知道该点哪 */
          if (cl) cl.classList.add('ready');
          var tip = document.querySelector('#adPlay .tip');
          if (tip) tip.textContent = 'Recompensa pronta · toque em × para receber';
          Sfx.win();
        }
      }, 1000);
    }, 720);
  }

  $('#adRetry').addEventListener('click', function () {
    Sfx.click();
    var again = adIntent;
    adReset();
    playAd(again);
  });
  $('#adSkip').addEventListener('click', function () {
    Sfx.click();
    adReset();
    toast('Anúncio indisponível · tente de novo em instantes');
  });

  $('#adClose').addEventListener('click', function () {
    var overlay = $('#adPlay');
    if (!overlay.classList.contains('on')) return;
    var finished = $('#adBar').style.width === '100%';
    if (!finished) { toast('Assista até o fim para receber'); return; }
    if (locks.adsettle) return;          /* 结算只允许走一次 */
    locks.adsettle = true;
    clearInterval(adTimer);
    var intent = adIntent;
    adIntent = 'reward';
    adReset();
    var tip = document.querySelector('#adPlay .tip');
    if (tip) tip.textContent = 'Recompensa liberada ao final do vídeo';
    var overCap = state.adsToday >= state.adCap;   /* 防御：超额看完不再推进阶梯 */
    state.adsToday++;
    state.adsThisSession++;
    /* v1.9.7：看激励的奖励只有阶梯卡一处 —— 第 1 个 +5 自动到账，3/15 档要手动领 */
    if (!overCap) adLadderTick();
    /* 解锁型激励：先落授权（幂等、持久），看完 mDone 再进播放，避免两件事同时发生 */
    if (pendingUnlock) {
      markUnlocked(pendingUnlock.id, pendingUnlock.ep);
      pendingPlay = pendingUnlock;
      pendingUnlock = null;
    }
    renderConsole();
    setTimeout(function () { locks.adsettle = false; }, 400);
    /* 一条广告有 8 种用途，到账方式各不相同，必须按意图分派 */
    if (intent === 'wheelad') { doSpin('ad'); return; }
    if (intent === 'wheel') { openWheel(); return; }
    if (intent === 'wdaccel') { accelByAd(); return; }
    if (intent === 'ckdouble') { ckDoubleDone(); return; }
    if (intent === 'makeup') { ckMakeupDone(); return; }
    if (intent === 'claimdouble') { claimDone(true); return; }
    if (intent === 'newbiedouble') { grantNewbie('double'); return; }
    if (intent === 'doublereward') { doubleRewardDone(); return; }
    ladderDone();
  });

  function renderDone(override, doubled) {
    var a = override != null ? override : (state.lastReward || 0.05);
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('doneAmt', (doubled ? '2× ' : '') + '+ ' + moedas(coinsOf(a)));
    set('doneBal', moedas(state.coins));
    set('doneTx', 'TX ' + randTx() + ' · ' + nowStr());
    var dbl = $('#doneDouble');
    if (dbl) {
      var canDouble = !doubled && state.doubleLeft > 0 && state.adsToday < state.adCap;
      dbl.style.display = canDouble ? '' : 'none';
      var dt = $('#doneDoubleTxt');
      if (dt) dt.textContent = 'Dobrar com outro anúncio (' + Math.max(0, state.doubleLeft) + ')';
    }
    var fine = $('#doneFine');
    if (fine) fine.textContent = doubled ? 'Moedas dobradas já no seu saldo.' : 'As moedas já estão no seu saldo.';
  }
  function grantReward(amount, quiet) {
    var before = state.bal;
    setBalance(before + amount).then(function () {
      if (quiet) { toast('+ ' + moedas(coinsOf(amount))); return; }
      state.lastReward = amount;
      renderDone();
      openMask('mDone');
      Sfx.win();
    });
  }
  /* v1.9.7：普通激励看完的结果弹窗。
     奖励已由阶梯卡发放（每个视频 +5 自动到账），这里只展示，不再二次加钱 ——
     避免「看一次 5 金币」和旧的 R$0,05 两套口径同时生效。 */
  function ladderDone() {
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('doneAmt', '+ ' + fmtInt(LAD_FIRST));
    set('doneBal', fmtInt(state.coins));
    set('doneTx', 'TX ' + randTx() + ' · ' + nowStr());
    var dbl = $('#doneDouble');
    if (dbl) dbl.style.display = 'none';   /* 阶梯不叠加翻倍，口径保持单一 */
    var fine = $('#doneFine');
    if (fine) fine.textContent = 'As moedas já estão no seu saldo.';
    openMask('mDone');
    Sfx.win();
  }

  function randTx() {
    var h = '0123456789ABCDEF';
    var s = '';
    for (var i = 0; i < 4; i++) s += h[Math.floor(Math.random() * 16)];
    for (var j = 0; j < 3; j++) {
      s += '-';
      for (var k = 0; k < 4; k++) s += h[Math.floor(Math.random() * 16)];
    }
    return s;
  }
  function nowStr() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  $('#doneOk').addEventListener('click', function () {
    closeMask('mDone');
    /* 解锁流程优先：看完广告的下一步是把这集放起来，不是再塞一个转盘 */
    if (pendingPlay) {
      var q = pendingPlay;
      pendingPlay = null;
      setTimeout(function () { openPlayer(q.id, q.ep, 'detail'); }, 160);
      return;
    }
  });

  /* 翻倍领取：到账弹窗上的第二颗按钮，再看一条广告金额 ×2（每日 3 次） */
  $('#doneDouble').addEventListener('click', function () {
    if (state.doubleLeft <= 0) { toast('Você já dobrou 3 vezes hoje'); Sfx.err(); return; }
    if (state.adsToday >= state.adCap) { toast('Limite de vídeos de hoje atingido'); Sfx.err(); return; }
    state.doubleLeft--;
    closeMask('mDone');
    setTimeout(function () { playAd('doublereward'); }, 220);
  });
  function doubleRewardDone() {
    var a = state.lastReward || 0.05;
    setBalance(state.bal + a, { dur: 800 }).then(function () {
      state.lastReward = a * 2;
      renderDone(a * 2, true);
      openMask('mDone');
      Sfx.win();
    });
  }

  /* ---------------------------------------------------------------- 转盘 */
  /* v1.8.2 20 格金币盘（用户定义）：20 格 = 10 格 ×5 / 5 格 ×10 / 4 格 ×20 / 1 格 ×100，
     每格等概率（各 5%），投入 20 金币，期望返还 (10·5+5·10+4·20+1·100)/20 = 14 金币（70%）。
     100 金币只有一格，是最亮的那格；实物奖（BRINDE）下线。 */
  var WHEEL_POOL = [5, 5, 10, 20, 5, 10, 5, 20, 5, 10, 100, 5, 10, 20, 5, 10, 5, 20, 5, 5];
  var PRIZES = WHEEL_POOL.map(function (v) {
    return { t: 'coin', v: v, label: String(v), w: 1 };
  });
  var wheelRot = 0, spinning = false, wheelUsed = 0, wheelBuilt = false;
  var SEG_ANGLES = [];        /* 每个扇区的中心角，标签反向旋转要用 */
  var labelOff = 0;           /* 标签累计补偿角（见 straightenLabels） */
  var labelTimer = null, labelRaf = 0;

  /* 面盘：20 个扇区由同一份 WHEEL_POOL 生成，中奖索引与视觉永远一致 */
  function renderWheelFace() {
    if (wheelBuilt) return;
    var w = $('#wheel'), ring = $('#wheelRing');
    if (!w) return;
    wheelBuilt = true;
    var n = WHEEL_POOL.length, step = 360 / n, bands = [];
    var html = '<div class="wheel-ticks"></div>';   /* 刻度带放最底层，跟着盘一起转 */
    w.dataset.n = String(n);
    SEG_ANGLES.length = 0;
    for (var i = 0; i < n; i++) {
      var a = i * step + step / 2;
      SEG_ANGLES[i] = a;
      html += '<div class="seg' + (WHEEL_POOL[i] === 100 ? ' is-hi' : '') + '"' +
        ' style="--a:' + a.toFixed(2) + 'deg;transform:rotate(' + a.toFixed(2) + 'deg)">' +
        '<i></i><b>' + WHEEL_POOL[i] + '</b></div>';
      var c = WHEEL_POOL[i] === 100 ? '#FFC02E' : (i % 2 ? '#0E8C39' : '#1FB457');   /* v1.10 Verde：深浅绿交替，大奖金格 */
      bands.push(c + ' ' + (i * step).toFixed(2) + 'deg ' + ((i + 1) * step).toFixed(2) + 'deg');
    }
    w.innerHTML = html;
    /* v1.21：扇区色带必须挂在会转的 .wheel 上（原来挂在静止的 .wheel-ring，
       盘一转数字就跑到别的颜色格里，金色 100 那格永远停在原地）。
       .wheel-ring 只留金边与刻度，底色给一个兜底绿。 */
    w.style.background = 'conic-gradient(from 0deg,' + bands.join(',') + ')';
    if (ring) ring.style.background = '#0E8C39';
  }

  /* v1.21 修「数字乱摇摆」：
     标签原来只反向旋转 -a（扇区角），没有抵消盘面整体角度 wheelRot，
     所以每次中奖停盘后（wheelRot 恒为 -中奖格中心角，绝不是 360 的整数倍），
     20 个金额会一起歪成 -19°/-99°/-171° 这类随机角度，看着像乱摆。
     现在：转速期间标签跟盘刚性旋转（自然），停盘前用 rAF 把它们统一拧回水平。
     屏幕上的文字角度 = wheelRot + labelOff，令其 ≡ 0 即为水平。 */
  function labelAngles(off) {
    var bs = document.querySelectorAll('#wheel .seg b');
    for (var i = 0; i < bs.length; i++) {
      bs[i].style.transition = 'none';   /* 自己插值，不交给 CSS transition（会被打断/停摆） */
      bs[i].style.transform = 'rotate(' + (-(SEG_ANGLES[i] || 0) + off).toFixed(2) + 'deg)';
    }
    return bs.length;
  }

  function straightenLabels(ms) {
    if (!$('#wheel')) return;
    var from = labelOff;
    /* 取与当前补偿角最近的等价角，避免整圈倒转 */
    var d = ((-wheelRot - from) % 360 + 540) % 360 - 180;
    labelOff = from + d;
    cancelAnimationFrame(labelRaf);
    clearTimeout(labelTimer);
    if (!ms || !d) { labelAngles(labelOff); return; }

    var t0 = 0;
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms);
      labelAngles(from + d * (1 - Math.pow(1 - p, 3)));   /* easeOutCubic */
      if (p < 1) labelRaf = requestAnimationFrame(tick);
    }
    labelRaf = requestAnimationFrame(tick);
    /* 兜底：rAF 被节流/暂停时也保证落到终值（幂等） */
    labelTimer = setTimeout(function () {
      cancelAnimationFrame(labelRaf);
      labelAngles(labelOff);
    }, ms + 80);
  }

  function pickSeg() {
    var total = PRIZES.reduce(function (a, p) { return a + p.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < PRIZES.length; i++) {
      r -= PRIZES[i].w;
      if (r <= 0) return i;
    }
    return 0;
  }

  function spinWheel(mode) {
    if (spinning) return;
    /* 广告模式：先播一条激励，看完由 adClose 分派回来自动开转（不扣金币） */
    if (mode === 'ad') {
      if (wheelAdLeft() <= 0) {
        toast('Limite de vídeos de hoje · gire por ' + state.coinCost + ' moedas');
        Sfx.err();
        return;
      }
      playAd('wheelad');
      return;
    }
    if (state.coins < state.coinCost) {
      toast('Faltam ' + (state.coinCost - state.coins) + ' moedas · complete as tarefas');
      Sfx.err();
      return;
    }
    addCoins(-state.coinCost, { silent: true });   /* 先扣费再转，避免连点白嫖 */
    doSpin('coin');
  }

  function doSpin(mode) {
    if (spinning) return;
    spinning = true;
    wheelUsed++;
    if (mode === 'ad') state.wheelUsed = (state.wheelUsed || 0) + 1;   /* 只有广告模式吃免费额度 */
    Sfx.init();
    var idx = pickSeg();
    var seg = 360 / PRIZES.length;
    var center = idx * seg + seg / 2;
    var target = wheelRot + 360 * 5;
    target += (360 - ((target + center) % 360)) % 360;
    wheelRot = target;
    var w = $('#wheel');
    w.style.transition = 'transform 5s cubic-bezier(.14,.86,.06,1)';
    w.style.transform = 'rotate(' + target + 'deg)';

    /* 转动咔哒声 */
    var ticks = 0;
    var tk = setInterval(function () { Sfx.tick(); ticks++; if (ticks > 34) clearInterval(tk); }, 145);

    /* v1.21：盘面停稳前（5s 转完）把这 20 个金额拧回水平，与盘面减速同时收尾 */
    setTimeout(function () { straightenLabels(700); }, 4300);

    $('#wheelOut').innerHTML = '<div class="t">Girando…</div>';

    setTimeout(function () {
      spinning = false;
      var p = PRIZES[idx];
      addCoins(p.v, { silent: true });
      $('#wheelOut').innerHTML = '<div class="t">Você ganhou</div>' +
        '<div class="v pop">+' + fmtInt(p.v) + ' moedas</div>' +
        (p.v >= 100 ? '<div class="fine">Prêmio máximo!</div>' : '');
      Sfx.win();
      renderWheel();
    }, 5200);
  }
  function wheelTap() { spinWheel(wheelAdLeft() > 0 ? 'ad' : 'coin'); }
  $('#wheelSpin').addEventListener('click', function () { wheelTap(); });
  $('#wheelHub').addEventListener('click', function () { wheelTap(); });

  $('#notifOn').addEventListener('click', function () {
    closeMask('mNotif');
    toast('Notificações ativadas');
  });

  /* 30s 后自动提示一次转盘（MZ-11-01） */
  var wheelPromptTimer = setTimeout(function () {
    if (state.tab === 'inicio' && !document.querySelector('.mask.on')) {
      toast('Sorteio disponível · toque para girar');
      var tab = document.querySelector('.tab-mid');
      if (tab) tab.querySelector('.midbtn').animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
        { duration: 800, iterations: 2 }
      );
    }
  }, 30000);

  /* ---------------------------------------------------------------- 插屏（MZ-04） */
  var intTimer = null;
  function showInterstitial(cb) {
    if (state.interBusy) return;
    state.interBusy = true;
    var el = $('#interstitial');
    el.classList.add('on');
    syncFeedVideo();
    var card = el.querySelector('.card-ad');
    /* 插屏同样有素材加载阶段：先骨架 440ms，再出画面与倒计时 */
    if (card) card.classList.add('ld');
    var tip = el.querySelector('.int-bottom .tip');
    if (tip) tip.textContent = 'Carregando anúncio…';
    $('#intClose').classList.add('ldring');
    $('#intCd').textContent = '';
    $('#intRing').setAttribute('stroke-dashoffset', '0');
    clearInterval(intTimer);
    var total = AD_TOTAL, left = total;   /* 修复：v1.1 重构时丢失声明导致倒计时死锁、插屏无法关闭 */
    setTimeout(function () {
      if (card) card.classList.remove('ld');
      $('#intClose').classList.remove('ldring');
      if (tip) tip.textContent = 'Fecha em ' + total + 's · o vídeo continua de onde parou';
      $('#intCd').textContent = total;
      intTimer = setInterval(function () {
      left--;
      $('#intCd').textContent = Math.max(0, left);
      var prog = (total - left) / total;
      $('#intRing').setAttribute('stroke-dashoffset', String(106.8 * prog));
      if (left <= 0) {
        clearInterval(intTimer);
        $('#intCd').textContent = '×';
      }
      }, 1000);
    }, 440);
    el._cb = cb;
  }
  $('#intClose').addEventListener('click', function () {
    var el = $('#interstitial');
    /* 加载中不可关（真实插屏也是素材就绪后才出现倒计时） */
    if (el.querySelector('.card-ad').classList.contains('ld')) return;
    var cd = $('#intCd').textContent;
    if (cd !== '' && cd !== '×') { toast('Fecha em ' + cd + 's'); return; }
    clearInterval(intTimer);
    el.classList.remove('on');
    state.interBusy = false;
    syncFeedVideo();
    var cb = el._cb; el._cb = null;
    if (cb) cb();
  });

  /* ---------------------------------------------------------------- 骨架屏工具 */
  function skGrid(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="sk-card"><div class="sk sk-cov"></div>' +
        '<div class="sk sk-l sk-l1"></div><div class="sk sk-l sk-l2"></div>' +
        '<div class="sk sk-l sk-l3"></div></div>';
    }
    return h;
  }
  function skHrows(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="sk-hrow"><div class="sk sk-thumb"></div>' +
        '<div class="sk-mid"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div>';
    }
    return h;
  }
  function skRows(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="sk-row"><div class="sk sk-ic"></div>' +
        '<div class="sk-mid"><div class="sk"></div><div class="sk"></div></div>' +
        '<div class="sk sk-amt"></div></div>';
    }
    return h;
  }

  /* ---------------------------------------------------------------- Dramas 网格 */
  var catFilter = 'Todos';
  var GRID_PAGE = 6;
  var gridShown = GRID_PAGE;
  var gridBusy = false;

  function currentList() {
    var list = DRAMAS.filter(function (d) {
      if (catFilter === 'Todos') return true;
      if (d.cats && d.cats.length) return d.cats.indexOf(catFilter) >= 0 || d.cat === catFilter;
      return d.cat === catFilter;
    });
    return list.length ? list : DRAMAS;
  }

  function tuneStyle(id) {
    var t = FIG_TUNE[id];
    if (!t) {
      /* 真实数据没有手调参数：按 id 做稳定散列，避免 101 张封面构图雷同 */
      var n = 0;
      for (var k = 0; k < id.length; k++) n = (n * 31 + id.charCodeAt(k)) % 997;
      t = { x: (n % 15) - 7, w: 72 + (n % 20), y: -3 - (n % 14), s: 1 + (n % 7) / 100 };
    }
    return ' style="--fx:' + t.x + '%;--fw:' + t.w + '%;--fy:' + t.y + '%;--fs:' + t.s + '"';
  }

  function cardHTML(d, i) {
    var prog = d.seen > 0 ? Math.round(d.cur / d.eps * 100) : 0;
    return '<button class="dcard" style="--i:' + Math.min(i, 6) + '" data-drama="' + d.id + '">' +
      '<div class="cov">' +
      '<div class="vid ' + d.cls + '"' + tuneStyle(d.id) + '><div class="vid-bg"></div>' +
      '<div class="vid-fig"><span class="lay glow"><svg viewBox="0 0 200 300"><use href="#' + d.fig + '"/></svg></span>' +
      '<span class="lay body"><svg viewBox="0 0 200 300"><use href="#' + d.fig + '"/></svg></span></div>' +
      '<div class="vid-grain"></div><div class="vid-vig"></div></div>' +
      (d.cover ? '<img class="covimg" loading="lazy" src="' + esc(d.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      (i === 0 ? '<span class="hot"><svg style="width:9px;height:9px"><use href="#i-fire"/></svg>TOP</span>' : '') +
      '<span class="ep-n">EP ' + d.cur + '/' + d.eps + '</span>' +
      (prog > 0 ? '<div class="watched"><i style="width:' + prog + '%"></i></div>' : '') +
      '</div>' +
      '<h4>' + esc(d.title) + '</h4>' +
      '<div class="m"><span>' + esc(d.cat) + '</span><span>·</span><span>' + esc(d.views) + '</span></div>' +
      '</button>';
  }

  /* 列表尾部：还有 → 加载点；到底 → 结束语（不给假无限滚动） */
  function footHTML(total) {
    if (gridShown < total) {
      return '<div class="more" id="gridMore"><span class="dots"><i></i><i></i><i></i></span>' +
        '<span>Carregando mais</span></div>';
    }
    return '<div class="more end" id="gridMore">Você chegou ao fim · ' + total + ' séries</div>';
  }

  function bindCards() {
    $$('.dcard', $('#dramaGrid')).forEach(function (c) {
      c.addEventListener('click', function () { openDetail(c.dataset.drama); });
    });
  }

  function paintGrid() {
    if (window.__SKEL_FREEZE__) return;   /* 评审用：定格骨架 */
    var list = currentList();
    $('#dramaGrid').innerHTML = list.slice(0, gridShown).map(cardHTML).join('') + footHTML(list.length);
    bindCards();
  }

  function renderGrid(opts) {
    opts = opts || {};
    var body = $('#dramaGrid');
    body.classList.add('stagger');
    gridShown = GRID_PAGE;
    if (opts.skeleton) {
      /* 首次进入：骨架停留 ~520ms，避免"闪一下"的假加载 */
      body.innerHTML = skGrid(GRID_PAGE);
      setTimeout(paintGrid, 520);
      return;
    }
    paintGrid();
  }

  function loadMore() {
    var list = currentList();
    if (gridBusy || gridShown >= list.length) return;
    gridBusy = true;
    var more = $('#gridMore');
    if (more) more.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span>Carregando mais</span>';
    /* 尾部骨架占位：拉下一页时不留空白 */
    $('#dramaGrid').insertAdjacentHTML('beforeend', skGrid(2));
    setTimeout(function () {
      $('#dramaGrid').querySelectorAll('.sk-card').forEach(function (el) { el.remove(); });
      var from = gridShown;
      gridShown = Math.min(gridShown + GRID_PAGE, list.length);
      if (more && more.parentNode) more.parentNode.removeChild(more);
      $('#dramaGrid').insertAdjacentHTML('beforeend',
        list.slice(from, gridShown).map(function (d, i) { return cardHTML(d, i); }).join('') +
        footHTML(list.length));
      bindCards();
      gridBusy = false;
      Sfx.click();
    }, 640);
  }

  $('#dramaGrid').addEventListener('click', function (e) {
    if (e.target.closest('#gridMore')) loadMore();
  });

  $('#dramaGrid').addEventListener('scroll', function () {
    var g = this;
    var th = document.querySelector('.tabpage[data-page="dramas"] .th');
    if (th) th.classList.toggle('scrolled', g.scrollTop > 6);
    if (g.scrollTop + g.clientHeight >= g.scrollHeight - 180) loadMore();
  });

  /* 分类 chip：用 /categories 的真实分类（按剧目数取前 9），code 作为筛选键 */
  function wireChips() {
    $$('#cats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        if (c.classList.contains('on')) return;
        $$('#cats .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        catFilter = c.dataset.cat || c.textContent.trim();
        gridShown = GRID_PAGE;
        renderGrid();
        Sfx.click();
      });
    });
  }

  function renderChips() {
    var box = $('#cats');
    if (!box) return;
    var cats = (CC && CC.cats && CC.cats.length) ? CC.cats.slice(0, 9) : [];
    if (!cats.length) { wireChips(); return; }   /* 没有真实分类时保留 HTML 里的静态分类 */
    box.innerHTML = '<button class="chip on" data-cat="Todos">Todos</button>' +
      cats.map(function (c) {
        return '<button class="chip" data-cat="' + esc(c.code) + '">' + esc(c.name) + '</button>';
      }).join('');
    wireChips();
  }

  renderChips();

  /* ---------------------------------------------------------------- 剧集详情 */
  var curDrama = null;
  function openDetail(id) {
    var d = DRAMAS.find(function (x) { return x.id === id; }) || feedItem(state.feedIdx).drama || DRAMAS[0];
    curDrama = d;
    $('#dtTitle').textContent = d.title;
    $('#dtTitleTop').textContent = 'Detalhes';
    $('#dtViews').textContent = d.views + (d.heat && d.heat !== d.views ? ' · ' + d.heat : '');
    $('#dtDesc').textContent = d.desc || 'Sem sinopse disponível.';
    var hero = $('#heroVid');
    hero.className = 'vid ' + d.cls;
    $('#heroFig').setAttribute('href', '#' + d.fig);
    var hImg = $('#heroImg');
    if (hImg) {
      hImg.onerror = function () { this.style.display = 'none'; };
      if (d.cover) { hImg.src = d.cover; hImg.style.display = ''; }
      else { hImg.removeAttribute('src'); hImg.style.display = 'none'; }
    }
    $('#dtPlay').innerHTML = '<svg style="width:15px;height:15px"><use href="#i-play"/></svg>Assistir EP ' + String(d.cur).padStart(2, '0');
    $('#epsCnt').textContent = d.eps + ' eps · ' + (d.free || 0) + ' grátis';

    /* 分集：优先用 /dramas/{id}/episodes 的真实 free/locked，未返回时按演示规则兜底 */
    function paintEps(meta) {
      var html = '';
      /* 全部集数一次渲染（真机也是这样滚到底），仅对异常大的集数设保护上限 */
      var total = Math.min(d.eps || 0, 200);
      for (var i = 1; i <= total; i++) {
        var m = meta ? meta[i - 1] : null;
        /* 免费判定以接口为准：free / unlocked 任一为真即开；本地已解锁的覆盖接口的 locked */
        var open = m ? (m.unlocked || m.free || !m.locked) : (i <= (d.free || 3));
        var locked = !open && !isUnlocked(d.id, i);
        var cls = locked ? 'lock' : (i < d.cur ? 'seen' : (i === d.cur ? 'cur' : ''));
        html += '<button class="ep-cell ' + cls + '" data-ep="' + i + '">' +
          (cls === 'lock' ? '<svg><use href="#i-lock"/></svg>' : '') +
          i + (cls === 'lock' ? '' : '<small>EP</small>') + '</button>';
      }
      $('#epsGrid').innerHTML = html;
      $$('.ep-cell', $('#epsGrid')).forEach(function (c) {
        c.addEventListener('click', function () {
          var n = parseInt(c.dataset.ep, 10);
          if (c.classList.contains('lock')) {
            /* 锁着的集：看一段激励视频换解锁，看完直接播这一集（不是只给钱） */
            pendingUnlock = { id: d.id, ep: n };
            pendingReward = 0.02;
            openReward();
          } else {
            openPlayer(d.id, n, 'detail');
            toast('EP ' + String(n).padStart(2, '0') + ' · ' + d.title);
          }
        });
      });
    }
    var cached = (window.CCData && d.apiId && CCData.epCache[d.apiId]) || null;
    paintEps(cached);
    if (window.CCData && d.apiId && !cached) {
      CCData.episodes(d.apiId).then(function (list) {
        if (curDrama === d) paintEps(list);
      }).catch(function () { });
    }
    openPage('detail');
    Sfx.click();
  }
  $('#dtSave').addEventListener('click', function () {
    this.classList.toggle('liked');
    toast('Salvo em Minha lista');
  });
  $('#dtPlay').addEventListener('click', function () {
    var d = curDrama || DRAMAS[0];
    if (!d) return;
    var ep = Math.max(1, d.cur || 1);
    var meta = (window.CCData && d.apiId && CCData.epCache[d.apiId]) || null;
    var m = meta ? meta[ep - 1] : null;
    var open = m ? (m.unlocked || m.free || !m.locked) : (ep <= (d.free || 3));
    if (!open && !isUnlocked(d.id, ep)) {
      pendingUnlock = { id: d.id, ep: ep };
      pendingReward = 0.02;
      openReward();
      return;
    }
    openPlayer(d.id, ep, 'detail');
  });
  $('#dtMore').addEventListener('click', function () {
    var d = $('#dtDesc');
    var c = d.classList.toggle('clamp');
    this.textContent = c ? 'Ler mais' : 'Ler menos';
  });

  /* ---------------------------------------------------------------- Histórico */
  /* 历史记录：取首页真实剧目的前 4 条（剧名/封面/集号都来自接口） */
  function buildHistory() {
    var picks = [
      { g: 'Hoje', i: 0, pct: 32, tm: '21:04' },
      { g: 'Ontem', i: 1, pct: 71, tm: '19:22' },
      { g: 'Ontem', i: 2, pct: 12, tm: '09:15' },
      { g: '08/11', i: 3, pct: 100, tm: '22:48' }
    ];
    if (FEED_SLIDES.length) {
      return picks.map(function (p) {
        var f = FEED_SLIDES[p.i % FEED_SLIDES.length];
        return { g: p.g, id: f.drama.id, ep: (f.ep && f.ep.no) || 1, pct: p.pct, tm: p.tm };
      });
    }
    return [
      { g: 'Hoje', id: 'd1', ep: 3, pct: 32, tm: '21:04' },
      { g: 'Ontem', id: 'd3', ep: 6, pct: 71, tm: '19:22' },
      { g: 'Ontem', id: 'd2', ep: 1, pct: 12, tm: '09:15' },
      { g: '08/11', id: 'd4', ep: 1, pct: 100, tm: '22:48' }
    ];
  }
  var HISTORY = buildHistory();
  function renderHistory(opts) {
    opts = opts || {};
    var body = $('#histBody');
    if (opts.skeleton) {
      body.innerHTML = skHrows(4);
      setTimeout(paintHistory, 460);
      return;
    }
    paintHistory();
  }
  function paintHistory() {
    if (window.__SKEL_FREEZE__) return;
    var body = $('#histBody');
    body.classList.add('stagger');
    if (state.histEmpty) {
      body.innerHTML = '<div class="empty"><div class="art"><svg><use href="#i-history"/></svg></div>' +
        '<h4>Nada por aqui ainda</h4><p>Os episódios que você assistir aparecem aqui para continuar de onde parou.</p>' +
        '<button class="btn btn-primary btn-sm" style="margin-top:6px" onclick="document.querySelector(\'[data-tab=inicio]\').click()">Ver dramas</button></div>';
      return;
    }
    var groups = [];
    HISTORY.forEach(function (h) {
      if (!groups.length || groups[groups.length - 1].g !== h.g) groups.push({ g: h.g, items: [] });
      groups[groups.length - 1].items.push(h);
    });
    var html = '';
    var rowIdx = 0;
    groups.forEach(function (grp) {
      html += '<div class="hgroup"><div class="gt">' + grp.g + '</div>';
      grp.items.forEach(function (h) {
        var d = DRAMAS.find(function (x) { return x.id === h.id; }) || DRAMAS[0];
        html += '<button class="hrow" style="--i:' + (rowIdx++) + '" data-h="' + h.id + '">' +
          '<div class="cov"><div class="vid ' + d.cls + '"><div class="vid-bg"></div>' +
          '<div class="vid-fig"><span class="lay glow"><svg viewBox="0 0 200 300"><use href="#' + d.fig + '"/></svg></span>' +
        '<span class="lay body"><svg viewBox="0 0 200 300"><use href="#' + d.fig + '"/></svg></span></div>' +
          '<div class="vid-vig"></div></div>' +
          (d.cover ? '<img class="covimg" loading="lazy" src="' + esc(d.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
          '<div class="pb"><i style="width:' + h.pct + '%"></i></div></div>' +
          '<div class="mid"><h4>' + esc(d.title) + '</h4>' +
          '<div class="ep">EP ' + String(h.ep).padStart(2, '0') + ' · ' + d.eps + ' eps</div>' +
          '<div class="prog"><span class="bar"><i style="width:' + h.pct + '%"></i></span><span>' + h.pct + '%</span></div></div>' +
          '<div class="rt"><span class="tm">' + h.tm + '</span>' +
          '<span class="go"><svg><use href="#i-play"/></svg></span></div>' +
          '</button>';
      });
      html += '</div>';
    });
    body.innerHTML = html;
    $$('.hrow', body).forEach(function (r) {
      r.addEventListener('click', function () {
        var id = r.dataset.h;
        /* MZ-04-06：点击历史条目触发插屏 */
        showInterstitial(function () {
          var d = DRAMAS.find(function (x) { return x.id === id; });
          var idx = FEED_ORDER.indexOf(id);
          if (idx >= 0) {
            slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
            state.feedIdx = idx; syncFeedMeta();
          }
          goTab('inicio');
          state.playPct = 0;
          toast('Continuando ' + d.title);
        });
      });
    });
  }
  $('#clearHist').addEventListener('click', function () {
    state.histEmpty = !state.histEmpty;
    renderHistory();
    toast(state.histEmpty ? 'Histórico limpo' : 'Histórico restaurado');
  });

  /* ---------------------------------------------------------------- 提现页多套（BF-11-04）

     分桶规则与 PRD 一致：bucket = hash(device_id + exp_id) % 100 → 服务端下发 page_id，
     同一设备 30 天内不换桶，关实验回落默认面，客户端不本地随机。
     原型没有服务端，用同一套哈希在本地算一次并落盘来模拟「下发」，
     控制台把 bucket / page_id 显示出来，评审可以直接核对两面。

     允许差异：布局顺序、档位横排/竖排、插画有无、进度条系数、CTA 与提示语措辞。
     禁止差异：金额、门槛、汇率、SLA、手续费。所以数值一律由 renderWallet() 统一生成，
     两面只是拼接顺序不同 —— 这样「两面 diff = 0」是可以被自测逐字比出来的。 */
  var WD_EXP = 'wd_page_v1';
  var WD_CYCLE = 30 * 24 * 3600 * 1000;
  var WD_DEFAULT = 'wp_br_a';
  var WD_PAGES = {
    wp_br_a: { id: 'wp_br_a', name: 'A', layout: 'stack', seg: 'drama', art: true },
    wp_br_b: { id: 'wp_br_b', name: 'B', layout: 'row', seg: 'linear', art: false }
  };

  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
  function ccDeviceId() {
    var k = 'cc_device_id', v = '';
    try { v = localStorage.getItem(k) || ''; } catch (e) { }
    if (!v) {
      v = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem(k, v); } catch (e) { }
    }
    return v;
  }
  function loadBucket() {
    var key = 'cc_wd_bucket_v1', rec = null;
    try { rec = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
    if (rec && rec.exp === WD_EXP && rec.at && (Date.now() - rec.at) < WD_CYCLE && WD_PAGES[rec.page]) {
      state.bucket = rec.bucket; state.wdPage = rec.page;
      return rec;
    }
    var b = fnv1a(ccDeviceId() + '|' + WD_EXP) % 100;
    var page = b < 50 ? 'wp_br_a' : 'wp_br_b';
    rec = { exp: WD_EXP, bucket: b, page: page, at: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(rec)); } catch (e) { }
    state.bucket = b; state.wdPage = page;
    return rec;
  }
  function wdCfg() { return WD_PAGES[state.wdPage] || WD_PAGES[WD_DEFAULT]; }

  function applyWdPage(pageId) {
    if (!WD_PAGES[pageId]) pageId = WD_DEFAULT;
    state.wdPage = pageId;
    document.body.dataset.wdpage = pageId;
    /* 换面是重新渲染，不是余额冲正：清掉"不许回退"的锁，否则 B 面会沿用 A 面的进度 */
    progLast = { v: -1, at: 0 };
    $$('.cbtn[data-p="tf"]').forEach(function (x) {
      var v = x.dataset.v;
      var on = (v === 'A' && pageId === 'wp_br_a') || (v === 'B' && pageId === 'wp_br_b');
      x.classList.toggle('on', on);
    });
    var cb = $('#cBucket');
    if (cb) cb.textContent = 'bucket ' + state.bucket + ' · ' + pageId;
    renderWallet();
  }

  loadBucket();

  /* ---------------------------------------------------------------- 提现页 */
  function renderWallet() {
    /* 提现页是全 App 唯一出现现金的地方：上面是金币，下面是换算结果 */
    paintBal(state.coins);
    /* 提现通道随区域：BR=PIX / MX=SPEI */
    var wm = document.querySelector('.page[data-page="sac"] .wm');
    if (wm) {
      wm.innerHTML =
        '<button class="wm-card on" data-method="pix"><span class="ok"><svg><use href="#i-check"/></svg></span>' +
          '<span class="nm">' + RG().method + '</span><span class="sl">' + RG().mSub + '</span></button>' +
        '<button class="wm-card dis" data-method="paypal"><span class="nm">PayPal</span>' +
          '<span class="sl">' + RG().altSub + '</span></button>';
    }
    var ph = document.querySelector('.page[data-page="pix-form"] h2');
    if (ph) ph.textContent = RG().title;
    var amtEm = document.querySelector('.bal-card .amt em');
    if (amtEm) amtEm.textContent = 'MOEDAS';
    var taxaLb = document.querySelector('.page[data-page="sac"] .sec-t .more');
    if (taxaLb) taxaLb.textContent = 'taxa ' + money(0);

    /* 提示语：SLA / 手续费这一段两面必须逐字一致，只允许在它前面加差额（B 面先讲差多少） */
    var sla = 'até 15 dias úteis · sem taxa · via ' + RG().method;
    var gap = Math.max(0, state.tier - availCash());
    var gapLb = gapVal(coinsOf(gap), 'eps');
    var hintLb = document.querySelector('.page[data-page="sac"] .hint');
    if (hintLb) {
      /* A 面先讲怎么走（步骤 → 时效），B 面先讲还差多少（差额 → 集数/金额 → 时效） */
      hintLb.innerHTML = (gap > 0 && wdCfg().layout === 'row')
        ? '<b style="color:var(--gold)">Faltam ' + moedas(coinsOf(gap)) + '</b> · ' + gapLb + '<br>' + sla
        : sla;
    }
    var pend = $('#pendChip');
    if (state.pending > 0) {
      pend.style.display = 'inline-flex';
      $('#pendTxt').textContent = moedas(coinsOf(state.pending)) + ' em análise';
    } else pend.style.display = 'none';

    /* 档位可提状态 */
    $$('#tiers .tier').forEach(function (t) {
      var v = parseFloat(t.dataset.tier);
      var st = t.querySelector('.st');
      var vEl = t.querySelector('.v');
      if (vEl) vEl.textContent = money(v);
      var can = availCash() >= v;
      t.classList.toggle('locked', !can);
      st.className = 'st ' + (can ? 'ok' : 'no');
      st.textContent = can ? 'liberado' : 'faltam ' + fmtInt(coinsOf(v - availCash()));
    });
    /* CTA 文案：两面金额、通道逐字一致，B 面用「Continuar」而不是「Sacar」 */
    var btn = $('#wdSubmit');
    var can = availCash() >= state.tier;
    var lead = wdCfg().layout === 'row' ? 'Continuar' : 'Sacar';
    btn.innerHTML = '<svg style="width:16px;height:16px"><use href="' + RG().ic + '"/></svg>' +
      (can ? lead + ' · ' + money(state.tier) + ' via ' + RG().method
           : (wdCfg().layout === 'row' ? 'Continuar' : 'Sacar via ' + RG().method));
    renderGoal();
  }

  $$('#tiers .tier').forEach(function (t) {
    t.addEventListener('click', function () {
      state.tier = parseFloat(t.dataset.tier);
      $$('#tiers .tier').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      renderWallet();
      Sfx.click();
    });
  });

  /* BF-06-13：余额不足文案永远按当前真实差额算，任何入口打开都一致 */
  function renderShort() {
    var need = state.tier;
    var gap = Math.max(0, need - availCash());
    var t = $('#shortTitle'), d = $('#shortDesc'), f = $('#shortFine');
    if (t) t.textContent = 'Faltam ' + moedas(coinsOf(gap));
    if (d) d.textContent = 'Você precisa de ' + moedas(coinsOf(need)) +
      ' para trocar por ' + money(need) + '. Assista um vídeo para acelerar.';
    if (f) f.textContent = 'Hoje você ainda pode ver ' + Math.max(0, state.adCap - state.adsToday) + ' vídeos.';
  }

  $('#wdSubmit').addEventListener('click', function () {
    var need = state.tier;
    if (availCash() < need) {
      renderShort();
      Sfx.err();
      openMask('mShort');
      return;
    }
    if (!state.pixSaved) { openPage('pix-form'); return; }
    /* 提交：先走 900ms 处理态，避免"按了立刻跳走"的假感 */
    var self = this;
    if (self.classList.contains('is-loading')) return;
    self.classList.add('is-loading');
    Sfx.click();
    setTimeout(function () {
      self.classList.remove('is-loading');
      setBalance(state.bal - need, { dur: 900 }).then(function () {
        /* 每一笔提现独立计 15 个工作日，加速额度也按笔计算（v1.5） */
        state.wd = {
          amount: need, days: 15, spedAd: 0, spedInv: 0,
          free: 0, adToday: 0, at: Date.now()
        };
        state.wdFreeDays = 0;
        /* 每一笔提现都重新给 1 次广告 + 1 次邀请加速；历史邀请记录不跨笔带入 */
        renderWdStatus();
        openPage('wd-status');
        Sfx.win();
        toast('Saque solicitado · ' + money(need));
      });
    }, 900);
  });

  $('#pixSave').addEventListener('click', function () {
    state.pixSaved = true;
    closePage('pix-form');
    toast(state.payMethod === 'pix' ? 'Dados do PIX salvos' : 'Conta bancária salva');
    Sfx.win();
    renderWdStatus();
  });

  /* 流水 */
  var ST = [
    /* v1.18：金额按当前口径重算（激励 50 moedas / 单集 100 moedas / 礼包 R$ 5,00），
       旧值是旧汇率遗留（0,05 = 500 币），会与现在的「看一条 +50」自相矛盾 */
    { t: 'Recompensa de anúncio', s: 'Hoje 21:04 · TX 8F3A', v: 0.005, dir: 'in' },
    { t: 'Coleta de moedas', s: 'Hoje 20:51 · 3 episódios', v: 0.03, dir: 'in' },
    { t: 'Saque via PIX', s: '08/11 22:48 · concluído', v: -5.00, dir: 'out' },
    { t: 'Bônus de boas-vindas', s: '05/11 10:12 · 1ª série', v: 5.00, dir: 'in' }
  ];
  function renderStatements(opts) {
    opts = opts || {};
    var box = $('#stMini');
    if (opts.skeleton) {
      box.classList.remove('stagger');
      box.innerHTML = skRows(3);
      setTimeout(paintStatements, 460);
      return;
    }
    paintStatements();
  }
  function paintStatements() {
    if (window.__SKEL_FREEZE__) return;
    var box = $('#stMini');
    box.classList.add('stagger');
    box.innerHTML = ST.slice(0, 3).map(function (r, i) {
      return '<div class="st-row" style="--i:' + i + '"><span class="ic"><svg><use href="' +
        (r.v > 0 ? '#i-coin' : '#i-pix') + '"/></svg></span>' +
        '<div class="tx"><b>' + r.t + '</b><span>' + r.s + '</span></div>' +
        '<span class="vv ' + r.dir + '">' + (r.v > 0
          ? '+ ' + fmtInt(coinsOf(r.v))
          : '− ' + money(Math.abs(r.v))) + '</span></div>';
    }).join('');
  }
  $('#allSt').addEventListener('click', function () { Sfx.click(); openSub('extrato'); });

  /* v1.15：首开承诺弹窗（mPromise）已整张删除，相关监听与倒计时一并移除 */

  /* ---------------------------------------------------------------- 设置开关 */
  $('#swSound').addEventListener('click', function () {
    this.classList.toggle('on');
    state.soundOn = this.classList.contains('on');
    $('#swSoundCtl').classList.toggle('on', state.soundOn);
    if (state.soundOn) { Sfx.init(); Sfx.coin(); }
  });
  $('#swNotif').addEventListener('click', function () {
    this.classList.toggle('on');
    if (this.classList.contains('on')) setTimeout(function () { openMask('mNotif'); }, 200);
  });

  /* ---------------------------------------------------------------- 控制台 */
  function renderConsole() {
    $('#cBal').textContent = fmtInt(state.coins);
    var cc = $('#cCoins'); if (cc) cc.textContent = fmtInt(state.coins);
    $('#cAds').textContent = state.adsToday + ' / ' + state.adCap;
    $('#cPage').textContent = state.tab;
    var cd = $('#cData');
    if (cd) {
      var src = window.CCData ? CCData.source : 'none';
      var name = src === 'api' ? 'API ao vivo' : (src === 'snapshot' ? 'snapshot da API' : 'demo');
      cd.textContent = name + ' · ' + DRAMAS.length + ' séries';
      cd.title = window.CCData && CCData.fetchedAt ? 'atualizado ' + CCData.fetchedAt : '';
    }
    /* 播放源级别：exact=这一集的原片；drama=同剧另一集；demo=无源剧的演示片段 */
    var cs = $('#cSrc');
    if (cs) {
      var kindTxt = { exact: '这集原片', drama: '同剧片段', demo: '演示片段', none: '无源' }[lastPlayKind] || '—';
      cs.textContent = (lastPlayKind === 'none') ? '—' : kindTxt;
      cs.title = 'videoFor() 回退层级：exact / drama / demo / none';
    }
  }

  $$('.cbtn[data-p]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.dataset.p, v = b.dataset.v;
      if (p === 'bal') {
        var target = parseFloat(v);
        $$('.cbtn[data-p="bal"]').forEach(function (x) { x.classList.toggle('on', x === b); });
        setBalance(target, { silent: false });
      }
      if (p === 'region') {
        $$('.cbtn[data-p="region"]').forEach(function (x) { x.classList.toggle('on', x === b); });
        state.region = v;
        document.body.dataset.region = v;
        renderAll();
        toast('Região: ' + (v === 'BR' ? 'Brasil · PIX' : 'México · SPEI'));
        if (v === 'MX') {
          $('#wdUsd').textContent = '≈ MXN 42,80 · câmbio fixo';
        } else {
          renderWallet();
        }
      }
      if (p === 'tf') {
        /* auto = 回到这台设备被分到的真实桶；A / B = 模拟服务端下发另一面，便于并排比对 */
        if (v === 'auto') {
          var rec = loadBucket();
          applyWdPage(rec.page);
          toast('分桶自动 · bucket ' + rec.bucket + ' → ' + rec.page);
        } else {
          applyWdPage(v === 'B' ? 'wp_br_b' : 'wp_br_a');
          toast('提现页 ' + v + ' 面（临时覆盖，刷新回到分桶结果）');
        }
      }
    });
  });

  $$('.cbtn[data-scene]').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.dataset.scene;
      if (s === 'coldstart') {
        seedBal(4.2); state.pending = 0; renderAll();
        goTab('inicio');
      }
      if (s === 'reward') {
        goTab('inicio');
        pendingReward = 0.02;
        setTimeout(openReward, 300);
      }
      if (s === 'wearn') {
        goTab('ganhar');
        wheelUsed = 0;
        openWheel();
      }
      if (s === 'withdraw') {
        seedBal(18.3); state.pixSaved = true; renderAll();
        state.wdIntroSeen = true;
        openSac();
      }
      if (s === 'short') {
        seedBal(2.47); state.tier = 5; renderAll();
        state.wdIntroSeen = true;
        openSac();
        setTimeout(function () { $('#wdSubmit').click(); }, 500);
      }
      if (s === 'tasks') {
        goTab('ganhar');
        var tb = document.getElementById('taskBody');
        if (tb) tb.scrollTop = 0;
      }
      if (s === 'claim') {
        goTab('inicio');
        /* 演示场景：直接把待领池补满到可领态，否则只会弹「还差 N 个」 */
        state.pendingCoins = COINS_PER_EP;
        state.epEarned = Math.min(COINS_PER_EP, Math.floor(state.playPct));
        syncCollect();
        setTimeout(openClaim, 320);
      }
      if (s === 'newbie') {
        goTab('inicio');
        setTimeout(function () { openMask('mNewbie'); }, 300);
      }
      if (s === 'invite') {
        setTimeout(openInvite, 300);
      }
      if (s === 'wdstatus') {
        state.wd = { amount: 5, days: 15, spedAd: 0, spedInv: 0, free: 0, adToday: 0, at: Date.now() };
        renderWdStatus();
        openPage('wd-status');
      }
      if (s === 'launcher') {
        goTab('inicio');
        openLauncher();
      }
      if (s === 'uninstall') {
        seedBal(4.2); renderAll();
        renderUninstall();
        openPage('uninstall');
      }
      if (s === 'interstitial') {
        goTab('historico');
        setTimeout(function () { showInterstitial(function () { }); }, 300);
      }
      if (s === 'empty') {
        state.histEmpty = true;
        goTab('historico');
      }
    });
  });

  /* 标注模式 */
  var annot = false;
  /* 只给"静态定位"的元素补 position:relative，避免把 tabbar 这类绝对定位元素打散 */
  function setAnnot(on) {
    annot = on;
    if (on) {
      $$('[data-req]').forEach(function (el) {
        if (getComputedStyle(el).position === 'static') el.classList.add('pos-rel');
      });
    }
    document.body.dataset.annot = on ? 'on' : 'off';
  }
  window.__CC_ANNOT__ = setAnnot;
  $('#swAnnot').addEventListener('click', function () {
    setAnnot(!annot);
    this.classList.toggle('on', annot);
  });
  $('#swSoundCtl').addEventListener('click', function () {
    this.classList.toggle('on');
    state.soundOn = this.classList.contains('on');
    $('#swSound').classList.toggle('on', state.soundOn);
    if (state.soundOn) { Sfx.init(); Sfx.coin(); }
  });

  $('#resetAll').addEventListener('click', function () {
    seedBal(4.20); state.pending = 0; state.adsToday = 3; state.tier = 5;
    state.adsThisSession = 0; state.promiseSeen = false; state.wdIntroSeen = false;
    state.pixSaved = false; state.histEmpty = false; state.seenEps = 12;
    state.feedIdx = 0; state.ep = 3; state.playPct = 0;
    /* v1.5：金币、签到、任务、邀请、提现加速一起回到初始态 */
    state.coins = 0; state.bal = 0; state.lockedCoins = 0;
    state.pendingCoins = 0; state.epEarned = 0; state.doubleLeft = 3;
    state.newbieSeen = false; state.wdFreeDays = 0; state.payMethod = 'bank';
    state.ck = { idx: 3, signed: [true, false, true, false, false, false, false],
      reward: [100, 150, 200, 250, 300, 400, 800], missed: 1 };
    state.tasks.forEach(function (t) {
      t.cur = { watch3: 1, share1: 0, ck: 0, invite1: 0 }[t.id] || 0;
    });
    state.adLad = { n: 0, c1: false, c3: false, c15: false, rounds: 0 };
    state.claimed = {};
    state.invites.bound = null;
    state.invites.list = [
      { n: 'Ana Paula', when: 'há 2 dias', st: 'ok', fresh: false, sped: false },
      { n: 'Rafael Lima', when: 'há 5 dias', st: 'ok', fresh: false, sped: false },
      { n: 'Bruno Costa', when: 'assistindo agora', st: 'wait', fresh: false, sped: false }
    ];
    state.wd = { amount: 5, days: 15, spedAd: 0, spedInv: 0, free: 0, adToday: 0, at: 0 };
    slides.forEach(function (s, i) { s.classList.toggle('on', i === 0); });
    collectN = 0;
    renderAll();
    goTab('inicio', true);
    toast('Dados resetados');
  });

  /* 一键清到底：清 4 个落盘键 + 抹 hash/参数 + 重载，等于「刚装好的新机」
     （resetAll 只是把内存态拨回初值，解锁集数 / A/B 分桶 / 语言仍在）*/
  var wipeBtn = $('#wipeAll');
  if (wipeBtn) wipeBtn.addEventListener('click', function () {
    if (!window.confirm('清空本机所有原型数据（解锁集数 / 设备 ID / 分桶 / 语言），并从冷启重新开始？')) return;
    wipeAndReload();
  });

  $('#ctToggle').addEventListener('click', function () {
    $('#console').classList.toggle('is-collapsed');
  });

  /* 搜索按钮 */
  /* ---------------------------------------------------------------- 搜索（真实剧目，本地检索） */
  function normQ(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function searchHTML(list, q) {
    if (!list.length) {
      return '<div class="empty"><div class="art"><svg><use href="#i-search"/></svg></div>' +
        '<h4>Nada encontrado</h4><p>Tente outro título ou tema — o catálogo tem ' + DRAMAS.length + ' séries.</p></div>';
    }
    return (q ? '<div class="shead">' + list.length + ' resultado' + (list.length > 1 ? 's' : '') + '</div>'
              : '<div class="shead">Populares agora</div>') +
      list.map(function (d) {
        return '<button class="srow" data-drama="' + d.id + '">' +
          (d.cover ? '<img class="scov" loading="lazy" src="' + esc(d.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="scov"></div>') +
          '<div class="smid"><h4>' + esc(d.title) + '</h4>' +
          '<div class="smeta">' + esc(d.cat) + ' · ' + d.eps + ' eps · ' + esc(d.views) + '</div>' +
          '<p>' + esc((d.desc || '').slice(0, 110)) + '</p></div>' +
          '</button>';
      }).join('');
  }

  function renderSearch(kw) {
    var q = normQ(kw).trim();
    var list = !q ? DRAMAS.slice(0, 10)
      : DRAMAS.filter(function (d) {
          return normQ(d.title).indexOf(q) >= 0 || normQ(d.cat).indexOf(q) >= 0 ||
            normQ(d.desc).indexOf(q) >= 0;
        }).slice(0, 30);
    var body = $('#sBody');
    if (!body) return;
    body.innerHTML = searchHTML(list, q);
    var clr = $('#sClear');
    if (clr) clr.style.visibility = q ? 'visible' : 'hidden';
    $$('.srow', body).forEach(function (r) {
      r.addEventListener('click', function () {
        closePage('search');                 /* 先收起搜索页，避免与详情页叠层 */
        openDetail(r.dataset.drama);
        Sfx.click();
      });
    });
  }

  function openSearch() {
    openPage('search');
    var inp = $('#sInput');
    if (inp) {
      inp.value = '';
      renderSearch('');
      setTimeout(function () { inp.focus(); }, 280);
    }
    Sfx.click();
  }

  $('#searchBtn').addEventListener('click', openSearch);
  $('#sInput').addEventListener('input', function () { renderSearch(this.value); });
  $('#sClear').addEventListener('click', function () {
    var inp = $('#sInput');
    inp.value = '';
    renderSearch('');
    inp.focus();
  });
  $('#wdHelp').addEventListener('click', function () { openMask('mWdIntro'); });
  $('#wdRulesBtn').addEventListener('click', function () {
    closeMask('mWdIntro');
    openSub('payouts', 'rules');
  });
  $('#wdSupport').addEventListener('click', function () { closeMask('mWdIntro'); openSub('help'); });
  $('#clearHist');


  /* ==================================================================
     v1.5 · 金币 / 签到 / 任务 / 邀请 / 提现加速
     规则边界：
     - 金币是行为货币，不进现金；唯一出口是转盘（coinCost），不设汇率
     - 签到 7 天循环，翻倍与补签都要看广告，同样受 adsToday / adCap 约束
     - 提现基础 15 个工作日：广告 -1/天（上限 5）、邀请 -3/人（上限 6）、新人 +3
     ================================================================== */


  /* ---------------------------------------------------------------- 金币 */
  function renderCoins() {
    ['thCoins', 'taskCoins', 'wheelCoins'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.textContent = fmtInt(state.coins);
    });
    var c = $('#cCoins');
    if (c) c.textContent = money(cashOf(state.coins));   /* 控制台对照：现金等价 */
  }

  function addCoins(n, opts) {
    opts = opts || {};
    var to = Math.max(0, state.coins + n);
    setBalance(cashOf(to), { silent: true, dur: 520 }).then(function () {
      renderTasks();
      renderWdStatus();
    });
    if (opts.silent) return;
    Sfx.coin();
    floatCoins(n, opts.anchor);
  }

  /* 金币飘字：挂在设备框里，位置按锚点算，关掉弹窗也不会残留 */
  function floatCoins(n, anchorSel) {
    var host = document.querySelector('.device') || document.body;
    var a = anchorSel ? document.querySelector(anchorSel) : null;
    var hr = host.getBoundingClientRect();
    var r = a ? a.getBoundingClientRect() : null;
    var el = document.createElement('div');
    el.className = 'coin-pop';
    el.textContent = (n > 0 ? '+' : '−') + fmtInt(Math.abs(n)) + ' moedas';
    var cx = r ? (r.left - hr.left + r.width / 2) : hr.width / 2;
    var cy = r ? (r.top - hr.top) : hr.height / 2;
    el.style.left = Math.max(8, cx - 44) + 'px';
    el.style.top = Math.max(36, cy - 10) + 'px';
    host.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }

  /* ---------------------------------------------------------------- 看剧计币（v1.7.2 / BF-11-12）
     口径：进新一集从 0 起算，播放进度每 1% 涨 1 moeda，满 100（一集满额）封顶；
     满额后停住、等用户点收集球手动领取，绝不自动进余额；滑走/切集本集进度作废。 */
  function collectCap() { return COINS_PER_EP; }

  function accrueEarn() {
    var cap = collectCap();
    if ((state.pendingCoins || 0) >= cap) return;     /* 已满，停下等领取（下面有兜底） */
    var should = Math.min(cap, Math.floor(state.playPct));
    if (should <= state.epEarned) return;
    state.pendingCoins = Math.min(cap, (state.pendingCoins || 0) + (should - state.epEarned));
    state.epEarned = should;
    syncCollect();
    if (state.pendingCoins >= cap) {
      toast('Moedas completas · toque na moeda para resgatar');
      Sfx.win();
      scheduleAutoClaim();     /* v1.16：满额不再无限期干等，6 秒没人理就自动入账 */
    }
  }

  /* 满额兜底：给足时间让用户自己点（还能翻倍），超时就替用户收下 —— 绝不静默丢币 */
  var autoClaimTimer = null;
  function scheduleAutoClaim() {
    if (autoClaimTimer) return;
    autoClaimTimer = setTimeout(function () {
      autoClaimTimer = null;
      if ($('#mClaim') && $('#mClaim').classList.contains('on')) return;   /* 正在决定是否翻倍 */
      if ((state.pendingCoins || 0) < collectCap()) return;
      autoCollectPending();
    }, 6000);
  }
  function cancelAutoClaim() { clearTimeout(autoClaimTimer); autoClaimTimer = null; }

  function autoCollectPending() {
    var n = state.pendingCoins || 0;
    if (n <= 0) return;
    state.pendingCoins = 0;
    /* 领取后本集已计币进度对齐播放位置，避免同一段时长被计两次 */
    state.epEarned = Math.min(collectCap(), Math.floor(state.playPct));
    addCoins(n, { silent: true, anchor: '#collectBtn' });
    syncCollect();
    toast('+' + fmtInt(n) + ' moedas · coletadas automaticamente');
    Sfx.coin();
  }

  /* 切到新一集：本集计币进度归零，池里已累积的不动 */
  function resetEpEarn() {
    state.epEarned = 0;
    bumpTask('watch3', 1);
  }

  function syncCollect() {
    paintCollect($('#collectBtn'), 'collectN', 'collectRing');
    paintCollect(document.getElementById('plCollect'), 'plCollectN', 'plCollectRing');
  }
  /* 首页与看剧页各有一个收集球，读的是同一个待领池；进度环长在球上（v1.14） */
  function paintCollect(b, labelId, ringId) {
    if (!b) return;
    var n = state.pendingCoins || 0;
    var cap = collectCap();
    var k = cap > 0 ? Math.min(1, n / cap) : 0;
    var label = document.getElementById(labelId);
    if (label) label.textContent = n > 0 ? fmtInt(n) : '0';
    /* 看剧攒币 0→100 moedas 的过程：环随本集进度填充，满额全亮并跳动催领取 */
    var ring = document.getElementById(ringId);
    if (ring) {
      var C = 182.2;   /* r=29 的周长 */
      ring.style.strokeDasharray = String(C);
      ring.style.strokeDashoffset = String(C * (1 - k));
    }
    b.classList.toggle('is-empty', n <= 0);
    b.classList.toggle('has-coins', n > 0);
    b.classList.toggle('is-full', n >= cap);
  }

  /* ---------------------------------------------------------------- 领金币弹窗 */
  function renderClaim() {
    var n = state.pendingCoins || 0;
    var can = state.adsToday < state.adCap && n >= collectCap();
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('claimVal', fmtInt(n));
    set('claimTakeVal', fmtInt(n));
    set('claimDoubleVal', fmtInt(n * 2));
    var d = $('#claimDouble');
    if (d) d.style.display = can ? '' : 'none';
    var p = $('#claimDesc');
    if (p) p.textContent = can
      ? 'Resgate agora ou dobre assistindo um vídeo de 30s.'
      : 'Você já viu todos os vídeos de hoje. Resgate o que acumulou.';
    var f = $('#claimFine');
    if (f) f.textContent = can
      ? 'Limite de hoje: ' + Math.max(0, state.adCap - state.adsToday) + ' vídeos restantes.'
      : 'A roleta já está liberada · gaste as moedas nela.';
  }

  function openClaim() {
    var n = state.pendingCoins || 0;
    var cap = collectCap();
    /* 满 100 才可领：没满就提示还差多少，继续看剧即可涨 */
    if (n < cap) {
      toast(n > 0
        ? 'Faltam ' + fmtInt(cap - n) + ' moedas · continue assistindo'
        : 'Assista para acumular moedas');
      return;
    }
    renderClaim();
    openMask('mClaim');
  }

  function claimDone(doubled) {
    cancelAutoClaim();
    var n = (state.pendingCoins || 0) * (doubled ? 2 : 1);
    state.pendingCoins = 0;
    /* 领取后本集已计币进度对齐当前播放位置，避免同一段时长被计两次 */
    state.epEarned = Math.min(collectCap(), Math.floor(state.playPct));
    collectN = 0;
    closeMask('mClaim');
    addCoins(n, { anchor: '#collectBtn' });
    syncCollect();
    var btn = $('#collectBtn');
    if (btn) {
      for (var i = 0; i < 3; i++) {
        (function (k) { setTimeout(function () { flyCoin(btn); }, k * 90); })(i);
      }
    }
    toast('+ ' + fmtInt(n) + ' moedas' + (doubled ? ' · dobrado' : ''));
  }

  var claimTake = $('#claimTake');
  if (claimTake) claimTake.addEventListener('click', function () { claimDone(false); });
  var claimDouble = $('#claimDouble');
  if (claimDouble) claimDouble.addEventListener('click', function () {
    if (state.adsToday >= state.adCap) { toast('Limite de hoje atingido'); return; }
    closeMask('mClaim');
    setTimeout(function () { playAd('claimdouble'); }, 220);
  });

  /* ---------------------------------------------------------------- 签到 */
  /* v1.9：补签 / 翻倍都挂在日期格上 —— 用户看到哪一格有问题就点哪一格，
     不再有底部两个与格子脱节的按钮。 */
  function ckCanDouble() {
    var ck = state.ck;
    return !!ck.signed[ck.idx] && !ck.doubled[ck.idx] &&
      state.doubleLeft > 0 && state.adsToday < state.adCap;
  }

  function renderCheckin() {
    var box = $('#ckDays');
    if (!box) return;
    var ck = state.ck;
    var canDbl = ckCanDouble();
    var html = '';
    for (var i = 0; i < 7; i++) {
      var on = !!ck.signed[i];
      var isToday = i === ck.idx;
      var isMiss = !on && i === ck.missed;
      var dblOpen = isToday && on && !ck.doubled[i] && canDbl;
      var cls = on ? 'done' : (isToday ? 'today' : (isMiss ? 'miss' : ''));
      if (on && isToday) cls += ' today';
      if (isMiss) cls += ' is-fix';
      if (dblOpen) cls += ' is-dbl';
      var inner;
      if (dblOpen) {
        inner = '<span class="c tag"><svg><use href="#i-play"/></svg>Dobrar</span>';
      } else if (on) {
        inner = '<span class="c"><svg><use href="#i-check"/></svg>' +
          (isToday && ck.doubled[i] ? '<em>×2</em>' : '') + '</span>';
      } else if (isMiss) {
        inner = '<span class="c tag"><svg><use href="#i-clock"/></svg>Repor</span>';
      } else {
        inner = '<span class="c">+' + ck.reward[i] + '</span>';
      }
      html += '<div class="ck-day ' + cls + '" data-i="' + i + '">' +
        '<span class="d">D' + (i + 1) + '</span>' + inner + '</div>';
    }
    box.innerHTML = html;

    var streak = 0;
    var j = ck.signed[ck.idx] ? ck.idx : ck.idx - 1;
    for (; j >= 0; j--) { if (ck.signed[j]) streak++; else break; }
    var sl = $('#ckStreak');
    if (sl) sl.textContent = streak + (streak === 1 ? ' dia seguido' : ' dias seguidos');

    var doneToday = !!ck.signed[ck.idx];
    var btn = $('#ckBtn');
    if (btn) {
      if (!doneToday) {
        btn.disabled = false;
        btn.textContent = 'Fazer check-in · +' + ck.reward[ck.idx];
      } else if (ck.doubled[ck.idx]) {
        btn.disabled = true;
        btn.textContent = 'Check-in feito hoje · dobrado';
      } else if (ckCanDouble()) {
        btn.disabled = false;
        btn.textContent = 'Toque para dobrar e receber';
      } else {
        btn.disabled = true;
        btn.textContent = 'Check-in feito hoje';
      }
    }

    /* 提示行只在有「可点的格子」时出现，避免常驻噪音
       注意必须整行一个文本节点：innerHTML 拆节点会让词典查不到整句 */
    var hint = $('#ckHint');
    if (hint) {
      var hasFix = ck.missed != null && !ck.signed[ck.missed];
      if (hasFix) {
        hint.style.display = '';
        hint.textContent = 'Toque no D' + (ck.missed + 1) + ' para repor com anúncio';
      } else if (doneToday && !ck.doubled[ck.idx] && ckCanDouble()) {
        hint.style.display = '';
        hint.textContent = 'Toque no dia de hoje para dobrar o check-in';
      } else {
        hint.style.display = 'none';
      }
    }
  }

  /* 签到：到账后立刻给一次翻倍机会 */
  var ckBtn = $('#ckBtn');
  if (ckBtn) ckBtn.addEventListener('click', function () {
    var ck = state.ck;
    if (ck.signed[ck.idx]) { ckDoubleStart(); return; }
    ck.signed[ck.idx] = true;
    bumpTask('ck', 1);
    addCoins(ck.reward[ck.idx], { anchor: '#ckBtn' });
    toast('Check-in feito · +' + ck.reward[ck.idx] + ' moedas');
    renderCheckin();
    openCkDbl();
  });

  function openCkDbl() {
    var ck = state.ck;
    var r = ck.reward[ck.idx];
    var canDbl = ckCanDouble();
    var v = $('#ckDblVal'); if (v) v.textContent = r;
    var d = $('#ckDblDesc');
    if (d) d.textContent = 'Você ganhou +' + r + ' moedas. Dobre assistindo um vídeo curto.';
    var fine = $('#ckDblFine');
    if (fine) {
      fine.textContent = canDbl
        ? 'Você ainda pode dobrar ' + state.doubleLeft + (state.doubleLeft === 1 ? ' vez hoje.' : ' vezes hoje.')
        : 'Limite de vídeos de hoje atingido · você pode dobrar amanhã.';
    }
    var b = $('#ckDblAd');
    if (b) { b.disabled = !canDbl; b.classList.toggle('is-disabled', !canDbl); }
    openMask('mCkDbl');
  }

  function ckDoubleStart() {
    var ck = state.ck;
    if (!ck.signed[ck.idx]) { toast('Faça o check-in primeiro'); Sfx.err(); return; }
    if (ck.doubled[ck.idx]) { toast('Você já dobrou o check-in de hoje'); Sfx.err(); return; }
    if (state.doubleLeft <= 0) { toast('Você já dobrou 3 vezes hoje'); Sfx.err(); return; }
    if (state.adsToday >= state.adCap) { toast('Limite de vídeos de hoje atingido'); Sfx.err(); return; }
    state.doubleLeft--;
    playAd('ckdouble');
  }

  function ckDoubleDone() {
    var ck = state.ck, i = ck.idx;
    ck.doubled[i] = true;
    var r = ck.reward[i];
    addCoins(r, { anchor: '#ckBtn' });
    toast('Check-in dobrado · +' + r + ' moedas');
    renderCheckin();
  }

  /* 补签：点被漏掉的那一格 → 先弹「看激励补签」说明卡，确认后才进广告 */
  function ckMakeupStart() {
    var ck = state.ck;
    if (ck.missed == null || ck.signed[ck.missed]) { toast('Você não perdeu nenhum dia'); Sfx.err(); return; }
    if (state.adsToday >= state.adCap) { toast('Limite de vídeos de hoje atingido'); Sfx.err(); return; }
    openCkFix();
  }

  function openCkFix() {
    var ck = state.ck, i = ck.missed;
    var t = $('#ckFixTitle');
    if (t) t.textContent = 'Repor D' + (i + 1);
    var d = $('#ckFixDesc');
    if (d) d.textContent = 'Assista a um vídeo curto para repor o dia perdido e receber +' +
      ck.reward[i] + ' moedas.';
    var f = $('#ckFixFine');
    if (f) f.textContent = 'Você tem ' + Math.max(0, state.adCap - state.adsToday) + ' vídeos de anúncio restantes hoje.';
    openMask('mCkFix');
  }

  function ckMakeupPlay() {
    var ck = state.ck;
    if (ck.missed == null || ck.signed[ck.missed]) return;
    if (state.adsToday >= state.adCap) { toast('Limite de vídeos de hoje atingido'); Sfx.err(); return; }
    playAd('makeup');
  }

  function ckMakeupDone() {
    var ck = state.ck;
    if (ck.missed == null) return;
    var i = ck.missed;
    ck.signed[i] = true;
    ck.missed = null;
    addCoins(ck.reward[i], { anchor: '#ckDays' });
    toast('Dia D' + (i + 1) + ' reposto · +' + ck.reward[i] + ' moedas');
    renderCheckin();
  }

  /* 日期格点击：漏签格 → 补签广告；今日已签未翻倍 → 翻倍广告 */
  var ckDaysBox = $('#ckDays');
  if (ckDaysBox) ckDaysBox.addEventListener('click', function (e) {
    var cell = e.target.closest('.ck-day');
    if (!cell) return;
    var i = +cell.dataset.i;
    var ck = state.ck;
    if (!ck.signed[i] && i === ck.missed) { Sfx.click(); ckMakeupStart(); return; }
    if (i === ck.idx && ck.signed[i] && !ck.doubled[i]) { Sfx.click(); ckDoubleStart(); return; }
    Sfx.click();
  });

  var ckFixAd = $('#ckFixAd');
  if (ckFixAd) ckFixAd.addEventListener('click', function () {
    closeMask('mCkFix');
    setTimeout(function () { ckMakeupPlay(); }, 220);
  });
  var ckFixSkip = $('#ckFixSkip');
  if (ckFixSkip) ckFixSkip.addEventListener('click', function () {
    closeMask('mCkFix'); Sfx.click();
  });

  var ckDblAd = $('#ckDblAd');
  if (ckDblAd) ckDblAd.addEventListener('click', function () {
    closeMask('mCkDbl');
    setTimeout(function () { ckDoubleStart(); }, 220);
  });
  var ckDblSkip = $('#ckDblSkip');
  if (ckDblSkip) ckDblSkip.addEventListener('click', function () {
    closeMask('mCkDbl'); Sfx.click();
  });

  /* ---------------------------------------------------------------- 每日任务 */
  function renderTaskList() {
    var box = $('#taskList');
    if (!box) return;
    var doneCount = 0;
    box.innerHTML = state.tasks.map(function (t) {
      var cur = Math.min(t.goal, t.cur);
      var ready = cur >= t.goal;
      var claimed = !!state.claimed[t.id];
      if (claimed) doneCount++;
      var pct = Math.round(cur / t.goal * 100);
      /* v1.9.5：没达标不再给一个死按钮 —— 按钮变成「Fazer agora」，
         点了直接带去完成这件事的地方（看剧 / 看广告 / 分享 / 签到 / 邀请）。 */
      var btn = claimed
        ? '<button class="task-btn ok" disabled>Resgatado</button>'
        : (ready
          ? '<button class="task-btn" data-tid="' + t.id + '">Resgatar</button>'
          : '<button class="task-btn go" data-go="' + t.id + '">Fazer agora</button>');
      return '<div class="task-row' + (claimed ? ' done' : '') + '">' +
        '<span class="ti"><svg><use href="#i-' + t.icon + '"/></svg></span>' +
        '<span class="tm"><b>' + t.title + '</b>' +
        '<span>' + cur + ' de ' + t.goal + '</span>' +
        '<span class="tp"><i style="width:' + pct + '%"></i></span></span>' +
        '<span class="rw"><span class="amt"><svg><use href="#i-coin"/></svg>' + t.reward + '</span>' +
        btn + '</span></div>';
    }).join('');
    var pr = $('#taskProg');
    if (pr) pr.textContent = doneCount + ' de ' + state.tasks.length;
  }

  function bumpTask(id, n) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    t.cur = Math.min(t.goal, t.cur + (n || 1));
    if (state.tab === 'ganhar') {
      renderTaskList();
      /* 任务刚达标时要给一记反馈，否则用户不知道可以领了 */
      if (t.cur >= t.goal && !state.claimed[t.id]) Sfx.tick();
    }
    /* 首部剧达标 = 礼包冻结解除 */
    if (id === 'watch3' && t.cur >= t.goal) unlockLocked('1ª série concluída');
  }

  /* 「Fazer agora」= 带去完成，不是领取。每个任务给一条最短路径。 */
  function taskGo(id) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t || state.claimed[id] || t.cur >= t.goal) return;
    Sfx.click();
    if (id === 'watch3') {
      /* 直接开看剧页，回来还停在任务页（tab 不丢） */
      if (!openPlayer(FEED_ORDER[state.feedIdx], 1, 'task')) toast('Abra uma série para assistir');
      return;
    }
    if (id === 'share1') { doShare(); return; }
    if (id === 'ck') {
      var card = document.querySelector('.ck-card');
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card.classList.add('is-hl');
        setTimeout(function () { card.classList.remove('is-hl'); }, 1600);
      }
      return;
    }
    if (id === 'invite1') { openInvite(); return; }
  }

  document.addEventListener('click', function (e) {
    var g = e.target.closest('.task-btn[data-go]');
    if (g) { taskGo(g.dataset.go); return; }
    var b = e.target.closest('.task-btn[data-tid]');
    if (!b) return;
    var t = state.tasks.filter(function (x) { return x.id === b.dataset.tid; })[0];
    if (!t || state.claimed[t.id] || t.cur < t.goal) return;
    state.claimed[t.id] = true;
    addCoins(t.reward, { anchor: '#taskList' });
    toast('Tarefa concluída · +' + t.reward + ' moedas');
    renderTaskList();
  });

  /* ---------------------------------------------------------------- 广告阶梯卡（v1.9.7 / BF-11-13）
     一轮 = 0→15 个激励视频，三档奖励：
       第 1 个  +5   （自动到账，没有领取按钮 —— 看完立刻进余额）
       第 3 个  +20  （按钮领取）
       第 15 个 +200 （按钮领取）
     最后一档领完 → 计数归零、三档标记清空，重新开始一轮。
     与「今天一共看了多少条」无关：看 100 条也只是多跑几轮，不会因为总量而卡住。 */
  function adLad() {
    if (!state.adLad) state.adLad = { n: 0, c1: false, c3: false, c15: false, rounds: 0 };
    return state.adLad;
  }

  /* 每看完一条激励调一次（不论用途：普通激励 / 转盘 / 补签 / 翻倍都算看过） */
  function adLadderTick() {
    var L = adLad();
    if (L.n >= LAD_MAX) return;          /* 到 15 停住，等领完最后一档再归零 */
    L.n++;
    /* 每看一个视频 +5，直接进余额 —— 没有领取按钮，也没有「看一次不生效」的中间态 */
    L.c1 = true;
    addCoins(LAD_FIRST, { anchor: '#ladCard' });
    renderLadder();
    if ((L.n === 3 || L.n === LAD_MAX) && !document.querySelector('.mask.on')) Sfx.tick();
  }

  function ladClaim(step) {
    var L = adLad();
    if (step === 3) {
      if (L.c3 || L.n < 3) return;
      L.c3 = true;
      addCoins(LAD_MID, { anchor: '#ladBtn3' });
      toast('Faixa de 3 vídeos · +' + fmtInt(LAD_MID) + ' moedas');
      Sfx.win();
    } else if (step === 15) {
      if (L.c15 || L.n < LAD_MAX) return;
      /* 直接领最后一档时，把没领的 3 档一起补上，不让奖励落空 */
      if (!L.c3) { L.c3 = true; addCoins(LAD_MID, { anchor: '#ladBtn15' }); }
      L.c15 = true;
      addCoins(LAD_TOP, { anchor: '#ladBtn15' });
      toast('Rodada completa · +' + fmtInt(LAD_TOP) + ' moedas');
      Sfx.win();
      /* 最后一档领完 → 整轮归零，重新开始（不累加历史总量） */
      L.n = 0; L.c1 = false; L.c3 = false; L.c15 = false; L.rounds++;
      renderLadder();
      return;
    }
    renderLadder();
  }

  function renderLadder() {
    var L = adLad();
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('ladCount', L.n + ' de ' + LAD_MAX);
    var bar = $('#ladBar');
    if (bar) bar.style.width = Math.min(100, L.n / LAD_MAX * 100) + '%';
    /* 第 1 档没有按钮：只标「已到账」 */
    set('ladSt1', L.c1 ? '+' + fmtInt(LAD_FIRST) + ' ✓' : 'auto');
    var st1 = $('#ladSt1');
    if (st1) st1.classList.toggle('is-done', !!L.c1);

    var b3 = $('#ladBtn3');
    if (b3) {
      var ok3 = L.n >= 3 && !L.c3;
      b3.disabled = !ok3;
      b3.textContent = L.c3 ? 'Resgatado' : (ok3 ? 'Resgatar +' + fmtInt(LAD_MID) : L.n + ' / 3');
      b3.classList.toggle('is-ready', ok3);
    }
    var b15 = $('#ladBtn15');
    if (b15) {
      var ok15 = L.n >= LAD_MAX && !L.c15;
      b15.disabled = !ok15;
      b15.textContent = L.c15 ? 'Resgatado' : (ok15 ? 'Resgatar +' + fmtInt(LAD_TOP) : L.n + ' / 15');
      b15.classList.toggle('is-ready', ok15);
    }
    var note = $('#ladNote');
    if (note) {
      note.textContent = 'Ao resgatar a última faixa a contagem volta a zero e começa outra rodada.';
    }
  }

  var ladBtn3 = $('#ladBtn3');
  if (ladBtn3) ladBtn3.addEventListener('click', function () { Sfx.click(); ladClaim(3); });
  var ladBtn15 = $('#ladBtn15');
  if (ladBtn15) ladBtn15.addEventListener('click', function () { Sfx.click(); ladClaim(15); });

  /* ---------------------------------------------------------------- 转盘壳
     v1.15 口径：今日激励额度内 → 看 1 条广告免费转一次；额度用完 → 花 20 moedas 继续转 */
  /* v1.16：转盘的免费次数独立于「今日激励总额度」。
     以前直接借用 adCap(15)，等于一天能白转 15 次、白送 200+ 币，把广告收入倒贴回去。 */
  function wheelAdLeft() { return Math.max(0, (state.wheelFree || 0) - (state.wheelUsed || 0)); }

  function renderWheel() {
    var free = wheelAdLeft() > 0;
    var can = free || state.coins >= state.coinCost;
    var wc = $('#wheelCoins');
    if (wc) wc.textContent = fmtInt(state.coins);
    var cost = $('#wheelCost');
    if (cost) cost.textContent = free ? '1 anúncio por giro' : state.coinCost + ' moedas por giro';
    var b = $('#wheelSpin');
    if (b) {
      b.textContent = free ? 'Assistir anúncio e girar' : 'Girar por ' + state.coinCost + ' moedas';
      b.classList.toggle('is-disabled', !can);
    }
    var fine = $('#wheelFine');
    if (fine) {
      fine.textContent = free
        ? 'Giro grátis com 1 anúncio de 30s · ' + wheelAdLeft() + ' giros restantes hoje'
        : 'Giros grátis de hoje concluídos · ' + state.coinCost + ' moedas por giro';
    }
  }

  function openWheel() {
    renderWheelFace();
    renderWheel();
    openMask('mWheel');
  }

  /* ---------------------------------------------------------------- 任务页总渲染 */
  function renderTasks() {
    if (!document.getElementById('taskBody')) return;
    var bal = $('#taskBalNum');
    if (bal) bal.textContent = fmtInt(state.coins);
    var target = nextTier();
    var real = clamp(availCash() / target, 0, 1);
    var bar = $('#taskGoalBar i');
    if (bar) bar.style.width = (visualProgress(real) * 100).toFixed(2) + '%';
    var ge = $('#taskGoalEps');
    if (ge) ge.textContent = gapText(coinsOf(target) - availCoins(), 'eps');
    var gt = $('#taskGoalTgt');
    if (gt) gt.textContent = fmtInt(coinsOf(target));
    renderCoins();
    renderCheckin();
    renderTaskList();
    renderLadder();
  }

  var taskSacar = $('#taskSacar');
  if (taskSacar) taskSacar.addEventListener('click', function () { Sfx.click(); openSac(); });

  /* ---------------------------------------------------------------- 提现二级页 */
  function openSac() {
    renderWallet();
    renderStatements({ skeleton: !state.stSeen });
    state.stSeen = true;
    openPage('sac');
    /* BF-06-11：每账号首访弹一次说明 */
    if (!state.wdIntroSeen) {
      state.wdIntroSeen = true;
      setTimeout(function () { openMask('mWdIntro'); }, 420);
    }
  }

  function addBusinessDays(from, n) {
    var d = new Date(from || Date.now());
    var add = 0;
    while (add < n) {
      d.setDate(d.getDate() + 1);
      var w = d.getDay();
      if (w !== 0 && w !== 6) add++;
    }
    return d;
  }
  function dstr(d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function inviteValid() {
    return state.invites.list.filter(function (x) { return x.st === 'ok'; }).length;
  }

  /* 可用于提现加速的邀请：只认「本次新产生的有效邀请」（fresh），
     且没用过（sped），且本笔提现还没用过邀请加速。
     历史邀请（fresh=false）只发金币 —— 「曾经邀请的不算」。 */
  function invAccelReady() {
    var w = state.wd;
    if (!w || w.spedInv > 0) return null;
    var list = state.invites.list;
    for (var i = 0; i < list.length; i++) {
      if (list[i].st === 'ok' && list[i].fresh && !list[i].sped) return list[i];
    }
    return null;
  }

  function renderWdStatus() {
    var w = state.wd || { days: 15, spedAd: 0, spedInv: 0, free: 0, adToday: 0, amount: 5, at: Date.now() };
    /* v1.9.4：广告加速 1 次、邀请加速 1 次，各自用掉即锁，不再按今日观看数/好友数自动累计 */
    w.spedAd = Math.min(1, w.spedAd || 0);
    w.spedInv = Math.min(3, w.spedInv || 0);
    var sped = w.spedAd + w.spedInv;
    var left = Math.max(0, w.days - sped);
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('wdAmt', money(w.amount));
    set('wdDays', String(left));
    set('wdEta', 'previsão ' + dstr(addBusinessDays(w.at || Date.now(), left)));
    var bar = $('#wdAccelBar');
    if (bar) bar.style.width = ((1 - left / w.days) * 100).toFixed(1) + '%';
    set('wdAccelLb', sped + ' de 4 dias adiantados');
    set('wdAdSub', w.spedAd > 0 ? 'Usado neste saque · limite 1 vez' : 'Disponível 1 vez · 1 dia');
    var ready = invAccelReady();
    set('wdInvSub', w.spedInv > 0 ? 'Usado neste saque · limite 1 vez'
      : (ready ? 'Convite novo disponível · 3 dias' : 'Precisa de 1 convite novo · 3 dias'));
    set('wdTl1', left === 0 ? 'concluído' : 'até ' + left + ' dias úteis');
    set('wdTl0', nowStr());
    var ab = $('#wdAdBtn');
    if (ab) {
      ab.disabled = w.spedAd > 0 || left <= 0;
      ab.textContent = left <= 0 ? 'Concluído' : (w.spedAd > 0 ? 'Já usado' : 'Ver anúncio');
    }
    var ib = $('#wdInvBtn');
    if (ib) {
      ib.disabled = w.spedInv > 0 || left <= 0;
      ib.textContent = left <= 0 ? 'Concluído' : (w.spedInv > 0 ? 'Já usado' : (ready ? 'Usar convite' : 'Convidar'));
      ib.classList.toggle('btn-gold', !!ready && w.spedInv === 0 && left > 0);
      ib.classList.toggle('btn-ghost', !(!!ready && w.spedInv === 0 && left > 0));
    }

    /* 到账渠道按用户实际填的走，不写死 PIX */
    var via = state.payMethod === 'pix'
      ? 'PIX · chave ' + (($('#fKey') || {}).value || '***.789-00')
      : 'Conta bancária · ' + (($('#fBank') || {}).value || 'Nubank · 260') +
        ' · ag. ' + (($('#fAgency') || {}).value || '0001') +
        ' · cc ' + (($('#fAcc') || {}).value || '1234567-8');
    set('wdVia', via);
  }

  /* 广告加速：每笔提现只能用 1 次（-1 天）。今日观看数只用于广告额度，
     不再折算成加速天数 —— 「曾经观看的不算」。 */
  function accelByAd() {
    var w = state.wd;
    if (!w) return;
    if (w.spedAd > 0) { toast('Este saque já usou o adiantamento por anúncio'); Sfx.err(); return; }
    w.adToday++;
    w.spedAd = 1;
    renderWdStatus();
    toast('Saque adiantado em 1 dia');
    Sfx.win();
  }

  var wdAdBtn = $('#wdAdBtn');
  if (wdAdBtn) wdAdBtn.addEventListener('click', function () {
    var w = state.wd;
    if (!w) return;
    if (w.spedAd > 0) { toast('Adiantamento por anúncio: 1 vez por saque'); Sfx.err(); return; }
    if (state.adsToday >= state.adCap) { toast('Limite de vídeos de hoje atingido'); Sfx.err(); return; }
    playAd('wdaccel');
  });

  /* ---------------------------------------------------------------- 邀请 */
  function renderInvite() {
    var ok = inviteValid();
    var pend = state.invites.list.length - ok;
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('invCode', state.invites.code);
    set('invCount', String(ok));
    set('invCoins', fmtInt(ok * 2000));
    var canAcc = invAccelReady() ? 3 : 0;
    var got = (state.wd && state.wd.spedInv) || 0;
    set('invDays', String(Math.max(canAcc, got)));
    set('invPend', pend ? pend + ' pendente' : 'nenhum pendente');
    set('inviteGo', ok + ' amigos ›');
    var box = $('#invList');
    if (!box) return;
    box.innerHTML = state.invites.list.map(function (f) {
      var ini = f.n.split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
      /* 只有「新邀请 + 还没用于加速」才标 +3 dias；历史邀请只发金币 */
      var tag = f.st !== 'ok' ? 'aguardando'
        : (f.fresh && !f.sped && !(state.wd && state.wd.spedInv > 0) ? '+2.000 · +3 dias' : '+2.000');
      return '<div class="inv-fr"><span class="av">' + ini + '</span>' +
        '<span class="fm"><b>' + f.n + '</b><span>' + f.when + '</span></span>' +
        '<span class="st ' + (f.st === 'ok' ? 'ok' : 'wait') + '">' + tag + '</span></div>';
    }).join('');
  }

  function openInvite() {
    renderInvite();
    openPage('invite');
    Sfx.click();
  }

  var inviteEntry = $('#inviteEntry');
  if (inviteEntry) inviteEntry.addEventListener('click', openInvite);
  var sacInvite = $('#sacInvite');
  if (sacInvite) sacInvite.addEventListener('click', openInvite);
  /* 邀请加速：每笔提现 1 次（-3 天），必须消耗 1 个「本次新产生的有效邀请」 */
  var wdInvBtn = $('#wdInvBtn');
  if (wdInvBtn) wdInvBtn.addEventListener('click', function () {
    var w = state.wd;
    if (!w) return;
    if (w.spedInv > 0) { toast('Adiantamento por convite: 1 vez por saque'); Sfx.err(); return; }
    var f = invAccelReady();
    if (!f) { toast('Convide 1 amigo novo · convites antigos não adiantam'); openInvite(); return; }
    f.sped = true;
    w.spedInv = 3;
    renderWdStatus();
    renderInvite();
    toast('Saque adiantado em 3 dias · convite novo usado');
    Sfx.win();
  });

  var invCopy = $('#invCopy');
  if (invCopy) invCopy.addEventListener('click', function () {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(state.invites.code);
    } catch (e) { }
    toast('Código copiado · ' + state.invites.code);
    Sfx.click();
  });

  /* 演示用：分享后 1.6s 让"等待中"的朋友变为有效，方便验证金币与天数同时到账 */
  var invShare = $('#invShare');
  if (invShare) invShare.addEventListener('click', function () {
    Sfx.click();
    var wait = state.invites.list.filter(function (x) { return x.st === 'wait'; })[0];
    if (!wait) { toast('Convite copiado para compartilhar'); return; }
    toast('Convite enviado · aguardando o amigo assistir');
    setTimeout(function () {
      wait.st = 'ok';
      wait.when = 'agora';
      wait.fresh = true;   /* 本次新产生的邀请，可用于 1 次提现加速 */
      addCoins(2000, { anchor: '#invCode' });
      renderInvite();
      renderTasks();
      renderWdStatus();
      toast('Convite válido · +2.000 moedas · +3 dias no saque');
      Sfx.win();
    }, 1600);
  });

  /* ---------------------------------------------------------------- 邀请码兑付（被邀请方，BF-08-04）
     好友侧只有这一个动作：把朋友的码填进来。唯一入口 ——
       · Perfil › Código de convite（新人礼包里不再放入口，见 v1.9.8）
     规则：1 个码 / 账号，装后 7 天内有效，不能填自己的码；
     好友侧 +2.000 立刻到账，邀请人那 2.000 与 +3 天仍要等好友看满 15 分钟结算。 */
  var RD_BONUS = 2000;

  function rdClean(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }
  function rdFmt(v) {
    var s = rdClean(v);
    return s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s;
  }
  function rdBound() { return state.invites.bound || null; }

  function renderRedeem() {
    var b = rdBound();
    var ask = $('#rdAsk'), done = $('#rdDone');
    if (ask) ask.hidden = !!b;
    if (done) done.hidden = !b;
    if (b) {
      var g = $('#rdGainVal');
      if (g) g.textContent = '+' + fmtInt(b.coins || RD_BONUS);
      var d = $('#rdDoneDesc');
      if (d) d.textContent = 'Bônus creditado. Seu amigo recebe os ' + fmtInt(RD_BONUS) +
        ' dele quando você assistir 15 min.';
    }
    /* Perfil 那一行：没兑是入口，兑完变成结果，不再可点 */
    var tag = $('#rowRedeemTag'), sub = $('#rowRedeemSub');
    if (tag) {
      tag.textContent = b ? '+' + fmtInt(b.coins || RD_BONUS) + ' ✓' : 'Resgatar';
      tag.classList.toggle('on', !!b);
    }
    if (sub) {
      sub.textContent = b ? 'Código aplicado · +' + fmtInt(b.coins || RD_BONUS) + ' moedas'
        : 'Tenho o código de um amigo';
    }
  }

  function openRedeem() {
    var b = rdBound();
    var inp = $('#rdInput'), err = $('#rdErr');
    if (inp && !b) { inp.value = ''; inp.classList.remove('err'); }
    if (err) err.textContent = '';
    renderRedeem();
    openMask('mRedeem');
    if (!b && inp) setTimeout(function () { try { inp.focus(); } catch (e) { } }, 220);
    Sfx.click();
  }

  function rdSubmit() {
    var inp = $('#rdInput'), err = $('#rdErr');
    if (!inp || rdBound()) { renderRedeem(); return; }
    var code = rdFmt(inp.value);
    var bad = function (msg) {
      if (err) err.textContent = msg;
      inp.classList.add('err');
      Sfx.err();
    };
    inp.classList.remove('err');
    if (err) err.textContent = '';
    if (rdClean(code).length < 8) { bad('Digite o código completo, com 8 caracteres.'); return; }
    if (code === state.invites.code) { bad('Esse é o seu próprio código. Peça o do seu amigo.'); return; }
    /* 通过：好友侧立刻入账，邀请人侧不动（等 15 分钟观看结算） */
    state.invites.bound = { code: code, coins: RD_BONUS, at: Date.now() };
    addCoins(RD_BONUS, { anchor: '#rdOk' });
    renderRedeem();
    renderInvite();
    Sfx.win();
    toast('Código aplicado · +' + fmtInt(RD_BONUS) + ' moedas');
  }

  var rowRedeem = $('#rowRedeem');
  if (rowRedeem) rowRedeem.addEventListener('click', function () { openRedeem(); });
  var rdOk = $('#rdOk');
  if (rdOk) rdOk.addEventListener('click', function () { Sfx.click(); rdSubmit(); });
  var rdInput = $('#rdInput');
  if (rdInput) {
    /* 边输边转成 XXXX-XXXX：手机上全是数字键盘/粘贴，不需要管光标 */
    rdInput.addEventListener('input', function () {
      var v = rdFmt(this.value);
      if (this.value !== v) this.value = v;
      this.classList.remove('err');
      var e = $('#rdErr'); if (e) e.textContent = '';
    });
    rdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); rdSubmit(); }
    });
  }
  renderRedeem();

  /* ---------------------------------------------------------------- 新人礼包 */
  /* v1.9.3 新人礼包定标：US$ 5 等值金币的 20%（翻倍 40%）。
     v1.17：US$ 5 × fx 5,00 = R$ 25,00 = 250.000 moedas → 20% = 50.000 moedas ≈ R$ 5,00 ≈ US$ 1,00。
     礼包 R$ 值不变（汇率 ×10 时币数自动 ×10），只送金币，不捆绑其它权益。 */
  var NB_BASE_USD = 5;
  var NB_PCT = 0.20;
  var NB_COINS = Math.round(NB_BASE_USD * RG().fx * COIN_RATE * NB_PCT);   /* 50.000 */
  var NB_COINS_2 = Math.round(NB_BASE_USD * RG().fx * COIN_RATE * NB_PCT * 2);  /* 100.000 */

  /* 「约等于多少钱」：本地币 + 美元双标注（美元只在换算行出现，不进余额） */
  function nbMoneyTxt(coins) {
    var cash = cashOf(coins);
    return '≈ ' + money(cash) + ' · ≈ US$ ' + (cash / RG().fx).toFixed(2).replace('.', ',');
  }

  function renderNewbie() {
    var can = state.adsToday < state.adCap;
    var put = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    var d = $('#nbDouble');
    if (d) d.style.display = can ? '' : 'none';
    /* 广告不可用（额度耗尽/无填充）时，直接领取升为主按钮，不留死按钮 */
    var a = $('#nbAccept');
    if (a) {
      a.classList.toggle('btn-gold', !can);
      a.classList.toggle('btn-ghost', can);
    }
    put('nbPct', Math.round(NB_PCT * 100) + '% de US$ ' + NB_BASE_USD);
    put('nbAmount', fmtInt(NB_COINS));
    put('nbMoney', nbMoneyTxt(NB_COINS));
    put('nbDoubleVal', '+' + fmtInt(NB_COINS_2));
    put('nbSingleVal', '+' + fmtInt(NB_COINS));
  }
  /* mode: 'double' 看激励翻倍领 100.000（40%）· 'single' 直接领 50.000（20%）
     v1.9.2：只有这两个出口，没有「以后再说」——首启必领。
     v1.9.3：礼包只有金币，不再附送提现加速天数。 */
  function grantNewbie(mode) {
    var doubled = mode === 'double';
    state.newbieSeen = true;
    closeMask('mNewbie');
    var n = doubled ? NB_COINS_2 : NB_COINS;
    /* 先冻结再入账：能看到、能看到进度，但要等第一部剧看完才可提 */
    state.lockedCoins = (state.lockedCoins || 0) + n;
    addCoins(n, { anchor: '#feedBal' });
    paintLockNote();
    toast('Presente de +' + fmtInt(n) + ' moedas · liberado após a 1ª série' + (doubled ? ' · dobrado' : ''));
    Sfx.win();
  }
  var nbDouble = $('#nbDouble');
  if (nbDouble) nbDouble.addEventListener('click', function () {
    if (state.adsToday >= state.adCap) { toast('Limite de hoje atingido'); return; }
    state.newbieSeen = true;
    closeMask('mNewbie');
    setTimeout(function () { playAd('newbiedouble'); }, 220);
  });
  var nbAccept = $('#nbAccept');
  if (nbAccept) nbAccept.addEventListener('click', function () { grantNewbie('single'); });

  /* ---------------------------------------------------------------- 收款信息切换 */
  var pmSeg = $('#pmSeg');
  if (pmSeg) {
    $$('button', pmSeg).forEach(function (b) {
      b.addEventListener('click', function () {
        state.payMethod = b.dataset.pm;
        $$('button', pmSeg).forEach(function (x) { x.classList.toggle('on', x === b); });
        var bank = $('#pmBank'), pix = $('#pmPix');
        if (bank) bank.style.display = state.payMethod === 'bank' ? '' : 'none';
        if (pix) pix.style.display = state.payMethod === 'pix' ? '' : 'none';
        Sfx.click();
      });
    });
  }
  $$('.page[data-page="pix-form"] .seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var seg = b.closest('.seg');
      $$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); });
      Sfx.click();
    });
  });

  /* ---------------------------------------------------------------- 初始化 */
  function renderAll() {
    paintBal(state.coins);
    paintLockNote();
    syncCollect();
    renderGoal(); renderWallet(); renderStatements(); renderConsole();
    renderTasks(); renderRedeem();
  }

  /* ------------------------------------------------ 卸载挽留 & 桌面（5.13） */
  function renderUninstall() {
    var target = nextTier();
    var gap = Math.max(0, target - availCash());
    var real = clamp(availCash() / target, 0, 1);
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('unBal', fmtInt(state.coins));
    set('unTarget', fmtInt(coinsOf(target)));
    set('unEps', gapVal(coinsOf(target) - availCoins(), 'episódios'));
    set('unLb1', real >= 1 ? 'pode trocar agora' : 'faltam ' + fmtInt(coinsOf(gap)));
    set('unLb2', 'meta ' + fmtInt(coinsOf(target)));
    var bar = $('#unBar');
    if (bar) bar.style.width = (visualProgress(real) * 100).toFixed(2) + '%';
  }
  function openLauncher() {
    var l = $('#launcher');
    if (!l) return;
    var sh = $('#lpSheet');
    if (sh) sh.classList.remove('show');
    l.classList.add('on');
    /* 演示"长按"：展开后自动弹出快捷菜单 */
    setTimeout(function () { if (sh) sh.classList.add('show'); }, 420);
  }
  function closeLauncher() {
    var l = $('#launcher');
    if (l) l.classList.remove('on');
    var sh = $('#lpSheet');
    if (sh) sh.classList.remove('show');
  }
  document.addEventListener('click', function (e) {
    var r = e.target.closest('[data-lp]');
    if (!r) return;
    var k = r.dataset.lp;
    Sfx.click();
    if (k === 'uninstall') { closeLauncher(); renderUninstall(); openPage('uninstall'); }
    else if (k === 'sacar') { closeLauncher(); goTab('ganhar'); }
    else { closeLauncher(); goTab('inicio'); }
  });
  $('#unInstall').addEventListener('click', function () {
    var b = $('#sysBal');
    if (b) b.textContent = fmtInt(state.coins) + ' moedas';
    openMask('mSysUninstall');
  });
  $('#sysOk').addEventListener('click', function () {
    closeMask('mSysUninstall');
    toast('Abrindo a desinstalação do sistema…');
  });

  /* ================================================================
     细节动效层（不影响业务逻辑）
     ================================================================ */

  /* 1) 全局水波纹：只挂在按钮类，卡片用 scale 反馈，避免裁掉阴影 */
  (function initRipple() {
    var SEL = '.btn,.icon-btn,.chip,.tier,.wm-card,.ep-cell,.lps-row,.sys-acts button';
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest(SEL);
      if (!el || el.classList.contains('is-loading')) return;
      el.classList.add('rip-host');
      var r = el.getBoundingClientRect();
      if (!r.width) return;
      var size = Math.max(r.width, r.height) * 2.1;
      var sp = document.createElement('span');
      sp.className = 'rip';
      sp.style.width = sp.style.height = size + 'px';
      sp.style.left = (e.clientX - r.left) + 'px';
      sp.style.top = (e.clientY - r.top) + 'px';
      el.appendChild(sp);
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 620);
    }, true);
  })();

  /* 2) 下拉刷新（仅 Dramas）：拖动位移 + 阈值 60dp 触发 */
  (function initPTR() {
    var g = $('#dramaGrid'), ptr = $('#ptr');
    if (!g || !ptr) return;
    var lb = ptr.querySelector('span:last-child');
    var dragging = false, running = false, y0 = 0, dy = 0;

    function thH() {
      var th = document.querySelector('.tabpage[data-page="dramas"] .th');
      return th ? th.offsetHeight : 52;
    }
    g.addEventListener('pointerdown', function (e) {
      if (g.scrollTop > 0 || running || e.button > 0) return;
      dragging = true; y0 = e.clientY; dy = 0;
      g.style.transition = 'none';
    });
    g.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var raw = e.clientY - y0;
      if (raw <= 0) {
        dy = 0; g.style.transform = '';
        ptr.classList.remove('show', 'armed');
        return;
      }
      dy = Math.min(raw * 0.46, 86);
      g.style.transform = 'translateY(' + dy + 'px)';
      /* 指示器落在列表让出的空白区里（跟着 dy 走，不压分类条） */
      ptr.style.top = (g.offsetTop + dy / 2 - 22) + 'px';
      ptr.classList.add('show');
      var armed = dy >= 60;
      ptr.classList.toggle('armed', armed);
      lb.textContent = armed ? 'Solte para atualizar' : 'Arraste para atualizar';
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      g.style.transition = 'transform .3s var(--e-out)';
      if (dy >= 60) {
        running = true;
        ptr.classList.add('run');
        lb.textContent = 'Atualizando…';
        g.style.transform = 'translateY(26px)';
        setTimeout(function () {
          renderGrid();
          g.style.transform = '';
          ptr.classList.remove('run', 'armed');
          setTimeout(function () { ptr.classList.remove('show'); running = false; }, 420);
          Sfx.coin();
          toast('Atualizado · ' + currentList().length + ' séries');
        }, 760);
      } else {
        g.style.transform = '';
        ptr.classList.remove('show', 'armed');
      }
      dy = 0;
    }
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      g.addEventListener(ev, release);
    });
  })();

  /* 3) 列表滚动 → 页头变实底（内容从下面穿过去时有层次） */
  (function initHeadScroll() {
    var pairs = [
      ['#histBody', '.tabpage[data-page="historico"] .th']
    ];
    pairs.forEach(function (pr) {
      var sc = document.querySelector(pr[0]), th = document.querySelector(pr[1]);
      if (!sc || !th) return;
      sc.addEventListener('scroll', function () {
        th.classList.toggle('scrolled', sc.scrollTop > 6);
      });
    });
  })();

  /* 4) 详情页 hero 视差：滚动时头图轻微上移（8%），廉价的层次感 */
  (function initHeroParallax() {
    var pg = document.querySelector('.page[data-page="detail"]');
    var body = pg && pg.querySelector('.page-body');
    var hero = pg && pg.querySelector('.hero');
    if (!body || !hero) return;
    body.addEventListener('scroll', function () {
      var y = Math.min(body.scrollTop, 220);
      hero.style.transform = 'translateY(' + (y * 0.18) + 'px)';
      hero.style.opacity = String(1 - Math.min(y / 320, .55));
    });
  })();

  window.__CC__ = state;
  /* 便于自动化回归与调试台调用 */
  window.__CCAPI__ = {
    openDetail: openDetail, openPage: openPage, closePage: closePage,
    openMask: openMask, closeMask: closeMask, openReward: openReward,
    playAd: playAd, grantReward: grantReward, goTab: goTab,
    openSub: openSub, setPaused: setPaused, setSpeed: setSpeed,
    playEpisode: playEpisode, applyWdPage: applyWdPage, loadBucket: loadBucket,
    openPlayer: openPlayer, closePlayer: closePlayer, plOpen: plOpen,
    plGo: plGo, plCommit: plCommit, plCurInfo: function () { return plCur; },
    isUnlocked: isUnlocked, markUnlocked: markUnlocked,
    renderTasks: renderTasks, renderWheel: renderWheel, renderCoins: renderCoins,
    openWheel: openWheel, openClaim: openClaim, openSac: openSac,
    openInvite: openInvite, renderWdStatus: renderWdStatus,
    adLadderTick: adLadderTick, ladClaim: ladClaim, renderLadder: renderLadder,
    openRedeem: openRedeem, rdSubmit: rdSubmit, renderRedeem: renderRedeem,
    wipeAll: wipeAll, wipeAndReload: wipeAndReload,
    renderClaim: renderClaim, syncCollect: syncCollect, renderConsole: renderConsole,
    unlockLocked: unlockLocked, paintLockNote: paintLockNote,
    availCoins: availCoins, renderGoal: renderGoal, paintBal: paintBal,
    coinRate: COIN_RATE, gapVal: gapVal, gapText: gapText, seedBal: seedBal, plGo: plGo,
    straightenLabels: straightenLabels, renderWheelFace: renderWheelFace,
    wheelGeom: function () { return { rot: wheelRot, off: labelOff, angles: SEG_ANGLES.slice() }; },
    wheelRotSet: function (d) {   /* 仅供自测模拟停盘角度：同时把补偿角清零，基线确定 */
      wheelRot = d; labelOff = 0;
      var bs = document.querySelectorAll('#wheel .seg b');
      for (var i = 0; i < bs.length; i++) { bs[i].style.transition = 'none'; bs[i].style.transform = ''; }
    },
    toast: toast, topMask: topMask
  };

  function boot() {
    fit();
    if (DBG.seed) seedBal(4.2);   /* #seed：演示既有余额 42.000（R$4,20），用来看进度条/催领/提现态 */
    renderGrid();
    syncFeedMeta();
    renderAll();
    applyWdPage(state.wdPage || WD_DEFAULT);
    $('#sbTime').textContent = '9:41';

    if (DBG.annot) { setAnnot(true); $('#swAnnot').classList.add('on'); }
    if (DBG.region) { state.region = DBG.region; document.body.dataset.region = DBG.region; renderAll(); }
    if (DBG.tf) applyWdPage(DBG.tf === 'b' ? 'wp_br_b' : (DBG.tf === 'a' ? 'wp_br_a' : (state.wdPage || WD_DEFAULT)));
    if (DBG.page) goTab(DBG.page, true);
    if (DBG.detail) setTimeout(function () { openDetail(FEED_ORDER[0]); }, 400);
    if (DBG.player) setTimeout(function () { openPlayer(FEED_ORDER[0], 3, 'detail'); }, 400);
    if (DBG.sub) setTimeout(function () { state.perfilSeen = true; goTab('perfil', true); openSub(DBG.sub); }, 400);
    if (DBG.pg) setTimeout(function () { openPage(DBG.pg); if (DBG.pg === 'wd-status') renderWdStatus(); if (DBG.pg === 'invite') renderInvite(); }, 400);
    if (DBG.offline) setTimeout(function () { showOffline(true); }, 500);
    if (DBG.search) setTimeout(function () { openSearch(); }, 400);
    /* #skel=dramas|hist|st：把骨架定格下来，供设计评审看加载态 */
    if (DBG.skel) {
      window.__SKEL_FREEZE__ = true;
      if (DBG.skel === 'dramas') { goTab('dramas', true); $('#dramaGrid').innerHTML = skGrid(6); }
      if (DBG.skel === 'hist') { goTab('historico', true); $('#histBody').innerHTML = skHrows(4); }
      if (DBG.skel === 'st') { goTab('ganhar', true); $('#stMini').innerHTML = skRows(3); }
      if (DBG.skel === 'more') {
        goTab('dramas', true);
        var g = $('#dramaGrid');
        g.scrollTop = g.scrollHeight;
      }
    }
    if (DBG.nopromise) state.promiseSeen = true;
    if (DBG.feed) {
      var fi = parseInt(DBG.feed, 10);
      slides.forEach(function (s, i) { s.classList.toggle('on', i === fi); });
      state.feedIdx = fi; syncFeedMeta(); syncFeedVideo();
    }
    if (DBG.freeze) { clearInterval(beatTimer); }
    if (DBG.nosplash) {
      var sp = $('#splash'); if (sp) sp.parentNode.removeChild(sp);
      /* 手动脚本时也可能直达弹层 */
      if (DBG.mask && document.getElementById('m' + DBG.mask)) {
        setTimeout(function () {
          if (DBG.mask === 'Wheel') { openWheel(); return; }   /* 直达转盘走完整渲染（面盘+动态文案） */
          openMask('m' + DBG.mask);
        }, 240);
      } else if (DBG.mask === 'Inter') {
        setTimeout(function () { showInterstitial(function () { }); }, 240);
      } else if (DBG.mask === 'Ad') {
        setTimeout(function () { playAd(false); }, 240);
      } else if (DBG.mask === 'Uninstall') {
        setTimeout(function () { renderUninstall(); openPage('uninstall'); }, 240);
      } else if (DBG.mask === 'Launcher') {
        setTimeout(openLauncher, 240);
      }
      return;
    }

    /* 冷启：余额先归零，出 splash 后滚到真实值（模拟首屏拉取账户） */
    var BOOT_BAL = state.bal;
    state.bal = 0;
    state.coins = 0;
    paintBal(0);
    renderAll();

    /* 冷启：splash → 首开承诺弹窗（BF-01-08，≤1.5s 出弹） */
    setTimeout(function () {
      $('#splash').classList.add('hide');
      setTimeout(function () { setBalance(BOOT_BAL, { dur: 900 }); }, 120);
      setTimeout(function () {
        /* 冷启顺序：新人礼包 → 首开承诺 → 首页。两个都跳过过就什么都不弹 */
        if (state.firstRun && !state.newbieSeen && !DBG.nonewbie) {
          state.firstRun = false;
          openMask('mNewbie');
          return;
        }
        state.firstRun = false;
      }, 1250);
    }, 1750);

    /* 真实接口：先试实时拉取（服务端未开 CORS 时静默失败，继续用内嵌快照） */
    if (window.CCData) {
      CCData.reload().then(function () { renderConsole(); });
    }
  }

  /* 实时数据到达后整体重绘（35-data.js 的 reload 成功时回调） */
  window.CCHydrate = function () {
    if (!window.CCData || !CCData.dramas.length) return;
    DRAMAS = CCData.dramas;
    FEED_ITEMS = CCData.feed.length ? CCData.feed : demoFeed();
    FEED_SLIDES = FEED_ITEMS.slice(0, 8);
    FEED_ORDER = FEED_SLIDES.map(function (f) { return f.drama.id; });
    HISTORY = buildHistory();
    state.feedIdx = 0;
    renderFeedSlides();
    renderChips();
    renderGrid();
    paintHistory();
    syncFeedMeta();
    renderConsole();
    toast('Dados atualizados da API');
  };

  var booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnce);
  else bootOnce();

})();

/* ==========================================================================
   自测（仅 #selftest 触发）：验证交互链路与状态收敛
   ========================================================================== */
(function () {
  if (!/selftest/.test(location.hash)) return;
  var out = [];
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function log(ok, name, extra) {
    out.push((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
  }
  function txt(sel) { var e = document.querySelector(sel); return e ? e.textContent.trim() : '(nil)'; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function emit() {
    var box = document.createElement('pre');
    box.id = 'testout';
    box.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;color:#0f0;font:11px monospace;padding:8px;max-width:100%;white-space:pre-wrap;';
    var fail = out.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
    box.textContent = 'SELFTEST ' + (out.length - fail) + '/' + out.length + '\n' + out.join('\n');
    document.body.appendChild(box);
    document.title = 'SELFTEST ' + (out.length - fail) + '/' + out.length;
  }
  window.addEventListener('load', function () {
    setTimeout(function () { run().catch(function (e) { out.push('FAIL | 异常 ' + e.message); emit(); }); }, 600);
  });

  async function run() {
    var S = window.__CC__;
    var API = window.__CCAPI__;
    if (S) S.adFailRate = 0;   /* 自测不允许随机广告失败，否则断言偶发挂 */
    log(!!S, 'state 暴露');
    /* 等冷启收敛：splash 1750ms → 新人礼包 1250ms 后弹出（3s 左右） */
    await sleep(3600);

    // 0 冷启弹窗链：新人礼包 → 首开承诺，先处理完再测
    if ($('#mNewbie').classList.contains('on')) {
      log($('#nbDouble').style.display !== 'none' && $('#nbDoubleVal').textContent.indexOf('100.000') >= 0,
        '新人礼包可看激励翻倍领 100.000（40%）', txt('#nbDoubleVal'));
      log($('#nbSingleVal').textContent.indexOf('50.000') >= 0, '新人礼包直领 50.000（20%）', txt('#nbSingleVal'));
      log(txt('#nbAmount') === '50.000', '礼包主数字 = 50.000 moedas', txt('#nbAmount'));
      log(txt('#nbMoney').indexOf('R$ 5,00') >= 0 && txt('#nbMoney').indexOf('US$ 1,00') >= 0,
        '礼包标注约等于金额', txt('#nbMoney'));
      log(document.querySelectorAll('#mNewbie .nb-item').length === 0, '礼包不再列其它权益');
      log(document.querySelectorAll('#mNewbie .acts .btn').length === 2 && !document.getElementById('nbSkip'),
        '新人礼包只有普通领取 / 看视频翻倍两个出口（无「以后再说」）',
        String(document.querySelectorAll('#mNewbie .acts .btn').length) + ' 个按钮');
      log(!document.getElementById('nbHaveCode') && document.querySelectorAll('#mNewbie .nb-have').length === 0,
        '新人礼包内不再有填邀请码入口');
      log(!!document.getElementById('rowRedeem'), '填邀请码入口仍在 Perfil › Código de convite');
      API.closeMask('mNewbie'); S.newbieSeen = true; await sleep(420);
    }
    log(S.newbieSeen === true, '新人礼包链路走完');

    // 1 初始状态
    log(S.bal === 0 && S.coins === 0, '真实冷启余额 = 0（唯一初始金币来自新人礼包）', S.bal + ' / ' + S.coins + ' moedas');
    log(document.querySelector('.tabpage[data-page="inicio"]').classList.contains('on'), '默认 Tab = Início');
    log($('#goalTarget').textContent.indexOf('50.000') >= 0, '目标 = 50.000 moedas', txt('#goalTarget'));

    // 2 Tab 切换
    document.querySelector('.tab[data-tab="ganhar"]').click();
    await sleep(120);
    log(document.querySelector('.tabpage[data-page="ganhar"]').classList.contains('on'), '切到 Ganhar');
    log(document.querySelector('.tabpage[data-page="inicio"]').classList.contains('on') === false, 'Início 已隐藏');
    log($('#tabbar').classList.contains('is-hidden') === false, 'Tabbar 可见');
    log(document.querySelectorAll('#ckDays .ck-day').length === 7, '签到条 7 格', String(document.querySelectorAll('#ckDays .ck-day').length));
    log(document.querySelectorAll('#taskList .task-row').length === 4, '每日任务 4 条（看激励那条已并入阶梯卡）', String(document.querySelectorAll('#taskList .task-row').length));
    /* v1.9.5：没达标不是死按钮，而是可点的「Fazer agora」 */
    var goBtns = document.querySelectorAll('#taskList .task-btn[data-go]');
    log(goBtns.length === 4, '未达标任务全给「去完成」按钮', String(goBtns.length));
    log(goBtns[0].textContent.trim() === 'Fazer agora', '「去完成」文案 = Fazer agora', goBtns[0].textContent.trim());
    log(goBtns[0].disabled === false && goBtns[0].classList.contains('go'), '「去完成」可点击且有 go 样式');
    log(document.querySelectorAll('#taskList .task-btn.dim').length === 0, '不再有灰色死按钮');
    log(document.querySelectorAll('#taskList .task-btn[data-tid]').length === 0, '未达标不显示领取按钮');

    // 2.2 「去完成」跳转：签到 → 高亮签到卡；邀请 → 打开邀请页；看剧 → 开播放器
    document.querySelector('#taskList .task-btn[data-go="ck"]').click();
    await sleep(220);
    log(document.querySelector('.ck-card').classList.contains('is-hl'), '签到任务「去完成」高亮签到卡');
    document.querySelector('#taskList .task-btn[data-go="invite1"]').click();
    await sleep(300);
    log(document.querySelector('.page[data-page="invite"]').classList.contains('on'),
      '邀请任务「去完成」打开邀请页');
    document.querySelector('.page[data-page="invite"] [data-back]').click();
    await sleep(240);
    document.querySelector('#taskList .task-btn[data-go="watch3"]').click();
    await sleep(380);
    log(document.querySelector('.page[data-page="player"]').classList.contains('on'),
      '看剧任务「去完成」直接开播放器');
    $('#plBack').click();
    await sleep(320);
    log(document.querySelector('.tabpage[data-page="ganhar"]').classList.contains('on'),
      '从播放器返回仍在任务页');

    // 2.5 签到：签到 → 自动弹翻倍 → 跳过 → 今日格子变「翻倍」→ 按钮变「点击翻倍领取」
    var c0 = S.coins;
    log(document.querySelector('#ckDays .ck-day[data-i="1"]').classList.contains('is-fix'), '漏签格标出补签');
    log(txt('#ckDays .ck-day[data-i="1"]').indexOf('Repor') >= 0, '漏签格文案 = Repor', txt('#ckDays .ck-day[data-i="1"]'));
    $('#ckBtn').click();
    await sleep(240);
    log(S.coins === c0 + 250, '签到 +250 moedas', String(S.coins));
    log($('#mCkDbl').classList.contains('on'), '签到后自动弹翻倍弹窗');
    log(txt('#ckDblVal') === '250', '弹窗显示翻倍金额', txt('#ckDblVal'));
    $('#ckDblSkip').click();
    await sleep(240);
    log(!$('#mCkDbl').classList.contains('on'), '跳过关闭翻倍弹窗');
    var todayCell = document.querySelector('#ckDays .ck-day[data-i="3"]');
    log(todayCell.classList.contains('is-dbl'), '今日格变成可翻倍');
    log(txt('#ckDays .ck-day[data-i="3"]').indexOf('Dobrar') >= 0, '今日格文案 = Dobrar', txt('#ckDays .ck-day[data-i="3"]'));
    log(txt('#ckBtn').indexOf('Toque para dobrar') >= 0, '按钮文案 = 点击翻倍领取', txt('#ckBtn'));
    log($('#ckBtn').disabled === false, '翻倍按钮可点');
    // 点今日格子 → 看广告翻倍
    todayCell.click();
    await sleep(400);
    log($('#adPlay').classList.contains('on'), '翻倍签到进广告');
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(460);
    log(S.coins === c0 + 505, '翻倍签到再 +250（+ 看激励的 5）', String(S.coins));
    log(S.doubleLeft === 2, '每日翻倍次数 -1', String(S.doubleLeft));
    log(S.ck.doubled[3] === true, '今日已标记翻倍');
    log(txt('#ckDays .ck-day[data-i="3"]').indexOf('Dobrar') < 0, '翻倍后今日格不再显示 Dobrar');
    log($('#ckBtn').disabled === true, '翻倍后按钮禁用');
    // 2.6 分享任务「去完成」→ 执行分享动作 → 进度满 → 按钮变 Resgatar
    log(txt('#taskList .task-btn[data-go="share1"]').indexOf('Fazer agora') >= 0, '分享任务初始为「去完成」');
    document.querySelector('#taskList .task-btn[data-go="share1"]').click();
    await sleep(300);
    var shareRow = Array.prototype.slice.call(document.querySelectorAll('#taskList .task-row')).filter(function (r) { return r.textContent.indexOf('Compartilhe') >= 0; })[0];
    log(shareRow.textContent.indexOf('1 de 1') >= 0, '分享后进度 1/1', shareRow.textContent.replace(/\s+/g, ' ').slice(0, 40));
    log(!!shareRow.querySelector('.task-btn[data-tid="share1"]'), '分享达标后变可领取按钮');

    // 点漏签格 D2 → 先弹补签说明卡 → 点「观看视频补签」才进广告
    document.querySelector('#ckDays .ck-day[data-i="1"]').click();
    await sleep(320);
    log($('#mCkFix').classList.contains('on'), '补签先弹说明卡');
    log(!$('#adPlay').classList.contains('on'), '说明卡阶段不播广告');
    log(txt('#ckFixTitle').indexOf('D2') >= 0, '说明卡显示待补日期', txt('#ckFixTitle'));
    log(txt('#ckFixDesc').indexOf('150') >= 0, '说明卡显示补签金额', txt('#ckFixDesc'));
    $('#ckFixAd').click();
    await sleep(420);
    log($('#adPlay').classList.contains('on'), '确认后才进广告');
    log(!$('#mCkFix').classList.contains('on'), '确认后关闭说明卡');
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(460);
    log(S.ck.missed === null, '补签后无缺口', String(S.ck.missed));
    log(S.coins === c0 + 660, '补签 +150 moedas（+ 两条激励各 5）', String(S.coins));
    log(!document.querySelector('#ckDays .ck-day[data-i="1"]').classList.contains('is-fix'), '补签后格子恢复已签');

    // 3 余额不足 → 拦截弹窗（BF-06-13）
    $('#wdSubmit').click();
    await sleep(300);
    log($('#mShort').classList.contains('on'), '余额不足弹 mShort');
    var gapC = 50000 - API.availCoins();   /* v1.17：硬编码差值随汇率失效，改成按真实差额算 */
    var gapS = String(gapC).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    log(txt('#shortTitle').indexOf(gapS) >= 0, '差额文案 = 真实差额 ' + gapS + ' moedas（BF-06-13）', txt('#shortTitle'));
    $('[data-close="mShort"]').click();
    await sleep(280);
    log(!$('#mShort').classList.contains('on'), '关闭 mShort');

    // 4 激励弹窗 + 额度
    var before = S.adsToday, balBefore = S.bal;
    $('#adPill').click();
    await sleep(300);
    log($('#mReward').classList.contains('on'), '激励前置弹窗打开');
    log(txt('#quotaTxt').indexOf(String(before)) >= 0, '额度显示今日次数', txt('#quotaTxt'));

    // 5 播放广告（缩短）
    $('#rewardWatch').click();
    await sleep(400);
    log($('#adPlay').classList.contains('on'), '广告播放层打开');
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(2600);
    log($('#mDone').classList.contains('on'), '奖励到账弹窗');
    log(S.bal > balBefore, '余额已增加（' + balBefore.toFixed(2) + ' → ' + S.bal.toFixed(2) + '）', String(S.bal.toFixed(2)));
    log(S.adsToday === before + 1, '今日广告次数 +1', String(S.adsToday));
    $('#doneOk').click();
    await sleep(280);

    // 6 达标后进度 = 100%（红线 14）
    S.coins = 49900; S.lockedCoins = 0; S.bal = 4.99; // 手动逼近（v1.16 起余额与金币要同时设，avail 才算得上）
    $('#wdBalNum').textContent = '4,99';
    document.querySelector('.tab[data-tab="inicio"]').click();
    await sleep(100);
    document.querySelector('.tab[data-tab="ganhar"]').click();
    await sleep(120);

    // 7 转盘：20 格金币盘（20 金币/次；10×5 + 5×10 + 4×20 + 1×100，最高 100）
    S.coins = 600;
    API.renderTasks();
    API.openWheel();
    await sleep(220);
    var segs = document.querySelectorAll('#wheel .seg');
    log(segs.length === 20, '转盘 20 格', String(segs.length));
    var tally = { '5': 0, '10': 0, '20': 0, '100': 0 };
    segs.forEach(function (s) {
      var t = s.querySelector('b').textContent.trim();
      if (tally[t] != null) tally[t]++;
    });
    log(tally['5'] === 10 && tally['10'] === 5 && tally['20'] === 4 && tally['100'] === 1,
      '奖池分布 10×5 / 5×10 / 4×20 / 1×100', JSON.stringify(tally));
    log(document.querySelectorAll('#wheel .seg.is-hi').length === 1, '最大奖 100 只有一格');
    /* v1.15 口径：额度内看 1 条广告免费转；额度用完花 20 moedas */
    log(txt('#wheelSpin').indexOf('anúncio') >= 0, '额度内：按钮 = 看广告转一次', txt('#wheelSpin'));
    var cBefore = S.coins;
    var adBefore = S.adsToday;
    $('#wheelSpin').click();
    await sleep(900);
    log($('#adPlay').classList.contains('on'), '额度内点转盘先播激励');
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(320);
    log(S.adsToday === adBefore + 1, '广告转盘也计 1 条广告', String(S.adsToday));
    log(S.coins === cBefore + 5, '广告转不扣金币（阶梯每条 +5 自动到账）', String(S.coins));
    await sleep(5600);
    var outW = txt('#wheelOut');
    log(outW.indexOf('ganhou') >= 0, '转盘出结果', outW.replace(/\s+/g, ' '));
    log(S.coins > cBefore, '奖品入账', String(S.coins));
    $('[data-close="mWheel"]').click();
    await sleep(240);
    S.wheelUsed = S.wheelFree;   /* v1.16：免费次数独立，不再借 adCap */
    API.openWheel();
    await sleep(220);
    log(txt('#wheelSpin') === 'Girar por 20 moedas', '免费次数用完：按钮改金币', txt('#wheelSpin'));
    var c2 = S.coins;
    $('#wheelSpin').click();
    await sleep(300);
    log(S.coins === c2 - 20, '免费次数用完：先扣 20 moedas', String(S.coins));
    await sleep(5600);
    log(txt('#wheelOut').indexOf('ganhou') >= 0, '金币模式也能转出结果', txt('#wheelOut'));
    $('[data-close="mWheel"]').click();
    S.adsToday = 5;
    await sleep(200);

    // 7.1 首页也有轮盘入口：金币球下方第二颗球，点开同一张 20 格盘
    document.querySelector('.tab[data-tab="inicio"]').click();
    await sleep(180);
    log(!!document.getElementById('feedWheel'), '首页有幸运轮盘入口');
    document.getElementById('feedWheel').click();
    await sleep(280);
    log($('#mWheel').classList.contains('on'), '首页轮盘入口打开金币盘');
    $('[data-close="mWheel"]').click();
    await sleep(240);

    // 8 通知底栏
    $('#mNotif').classList.add('on');
    log($('#mNotif').classList.contains('on'), '通知底栏可打开');
    $('[data-close="mNotif"]').click();
    await sleep(240);

    // 9 插屏
    document.querySelector('.tab[data-tab="historico"]').click();
    await sleep(180);
    log(document.querySelectorAll('.sk-hrow').length > 0, '历史首访出骨架', String(document.querySelectorAll('.sk-hrow').length));
    await sleep(520);
    log(document.querySelectorAll('.hrow').length === 4, '历史 4 条', String(document.querySelectorAll('.hrow').length));
    $('.hrow').click();
    await sleep(400);
    log($('#interstitial').classList.contains('on'), '点击历史触发插屏');
    log($('.card-ad') && $('.card-ad').classList.contains('ld'), '插屏加载态', String(!!$('.card-ad')));
    await sleep(400);
    $('#intCd').textContent = '';
    $('#intClose').click();
    await sleep(300);
    log(!$('#interstitial').classList.contains('on'), '插屏可关闭');

    // 9.5 插屏真实倒计时回归（v1.1 曾因倒计时变量未声明 → interval 抛错 → 死锁无法关闭）
    document.querySelector('.tab[data-tab="perfil"]').click();
    await sleep(950);
    log($('#interstitial').classList.contains('on'), 'Perfil 首访触发插屏');
    await sleep(5900);
    log(txt('#intCd') === '×', '插屏倒计时走完出 ×', txt('#intCd'));
    $('#intClose').click();
    await sleep(320);
    log(!$('#interstitial').classList.contains('on'), '倒计时走完后可关闭');
    log(!!document.getElementById('intCd'), '关闭按钮 DOM 未被破坏');

    // 10 详情页
    document.querySelector('.tab[data-tab="dramas"]').click();
    await sleep(180);
    log(document.querySelectorAll('.sk-card').length === 6, '目录首访出骨架', String(document.querySelectorAll('.sk-card').length));
    await sleep(560);
    var n = document.querySelectorAll('.dcard').length;
    log(n === 6, '目录首屏 6 张卡', String(n));
    document.querySelector('.dcard').click();
    await sleep(300);
    log(document.querySelector('.page[data-page="detail"]').classList.contains('on'), '打开详情页');
    log(document.querySelectorAll('.ep-cell').length > 30, '选集渲染全部集数', String(document.querySelectorAll('.ep-cell').length));
    document.querySelector('.page[data-page="detail"] [data-back]').click();
    await sleep(320);
    log(!document.querySelector('.page[data-page="detail"]').classList.contains('on'), '详情页返回');

    // 11 看剧计币：从 0 起、随播放时长涨、满 100 才可手动领取
    document.querySelector('.tab[data-tab="inicio"]').click();
    await sleep(150);
    S.pendingCoins = 0; S.epEarned = 0; S.playPct = 10;
    log(S.pendingCoins === 0, '进新集待领金币从 0 起', String(S.pendingCoins));
    await sleep(1500);
    log(S.pendingCoins > 0 && S.pendingCoins < 100, '随播放时长渐进累积', String(S.pendingCoins));
    log(txt('#collectN') === String(S.pendingCoins), '收集球数字 = 待领数', txt('#collectN'));
    $('#collectBtn').click();
    await sleep(220);
    log(!$('#mClaim').classList.contains('on'), '未满 100 不可领取');
    S.playPct = 99;
    await sleep(1500);
    log(S.pendingCoins === 100, '满 100 封顶', String(S.pendingCoins));
    log($('#collectBtn').classList.contains('is-full'), '满额点亮收集球');
    $('#collectBtn').click();
    await sleep(320);
    log($('#mClaim').classList.contains('on'), '领金币弹窗打开');
    var pc = S.pendingCoins;
    log(txt('#claimDoubleVal') === String(pc * 2), '翻倍金额 = 2×', txt('#claimDoubleVal'));
    $('#claimTake').click();
    /* claimDone 同步清零；此后继续播放会立刻再涨，属预期行为 */
    log(S.pendingCoins === 0, '领取后待领清零', String(S.pendingCoins));
    log(S.coins >= pc, '金币入账', String(S.coins));
    log(!$('#collectBtn').classList.contains('is-full'), '领取后收集球回落');
    await sleep(420);

    // 11.1 达激励上限后：领金币只能直接领（翻倍按钮隐藏）
    S.adsToday = S.adCap;
    S.pendingCoins = 100;
    $('#collectBtn').click();
    await sleep(320);
    log($('#mClaim').classList.contains('on'), '达上限仍可打开领金币');
    log($('#claimDouble').style.display === 'none', '达上限翻倍按钮隐藏');
    var cClaim = S.coins;
    $('#claimTake').click();
    await sleep(320);
    log(S.coins === cClaim + 100, '达上限直领 +100', String(S.coins));
    S.adsToday = 5;
    API.renderConsole();

    // 11.5 加载更多
    document.querySelector('.tab[data-tab="dramas"]').click();
    await sleep(200);
    var more = document.getElementById('gridMore');
    log(!!more && more.classList.contains('more'), '列表尾部有加载指示');
    more.click();
    await sleep(120);
    log(document.querySelectorAll('#dramaGrid .sk-card').length === 2, '加载更多出尾部骨架', String(document.querySelectorAll('#dramaGrid .sk-card').length));
    await sleep(800);
    log(document.querySelectorAll('.dcard').length === 12, '加载更多追加到 12', String(document.querySelectorAll('.dcard').length));
    log(document.querySelectorAll('#dramaGrid .sk-card').length === 0, '骨架被真卡替换');
    log(!!document.getElementById('ptr'), '下拉刷新指示器存在');

    // 11.8 Feed 上下滑（v1.2 跟手滑动：滚轮触发同一滑屏动画）
    document.querySelector('.tab[data-tab="inicio"]').click();
    await sleep(220);
    var f0 = S.feedIdx;
    $('#feed').dispatchEvent(new WheelEvent('wheel', { deltaY: 140 }));
    await sleep(600);
    var onIdx = [].indexOf.call(document.querySelectorAll('.feed-slide'), document.querySelector('.feed-slide.on'));
    log(S.feedIdx === f0 + 1, 'Feed 下滑进下一屏', String(f0) + ' → ' + S.feedIdx);
    log(onIdx === S.feedIdx, '滑入屏获得 on', 'on=' + onIdx + ' idx=' + S.feedIdx);
    $('#feed').dispatchEvent(new WheelEvent('wheel', { deltaY: -140 }));
    await sleep(600);
    log(S.feedIdx === f0, 'Feed 上滑回上一屏', String(S.feedIdx));
    log(document.querySelectorAll('.feed-slide.on').length === 1, '始终只有一屏 on');

    // 11.85 播放器手势（单击暂停 / 双击点赞不暂停 / 长按 2× / 进度拖动）
    $('#feed').click();
    await sleep(340);
    log(S.paused === true, '单击暂停');
    log($('#pauseIc').classList.contains('on'), '暂停图标常驻');
    $('#feed').click();
    await sleep(340);
    log(S.paused === false, '再单击恢复播放');
    log(!$('#pauseIc').classList.contains('on'), '恢复播放图标消失');
    // 长按 2×（pointerdown 后等 480ms 不移动）
    $('#feed').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 91, clientY: 400, bubbles: true }));
    await sleep(500);
    log(S.speed === 2, '长按进入 2× 倍速', String(S.speed));
    log($('#speedTip').classList.contains('on'), '倍速提示可见');
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 91, clientY: 400, bubbles: true }));
    await sleep(120);
    log(S.speed === 1, '松手恢复 1× 倍速');
    // 进度条拖动 seek
    var pw = $('#playProgWrap').getBoundingClientRect();
    S.playPct = 10;
    $('#playProgWrap').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 92, clientX: pw.left + pw.width * 0.5, clientY: pw.top, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 92, bubbles: true }));
    await sleep(120);
    log(Math.abs(S.playPct - 50) < 6, '进度条拖动到中点', S.playPct.toFixed(1));

    // 11.9 搜索（真实剧目本地检索）
    document.querySelector('.tab[data-tab="dramas"]').click();
    await sleep(140);
    $('#searchBtn').click();
    await sleep(340);
    log(document.querySelector('.page[data-page="search"]').classList.contains('on'), '搜索页打开');
    var si = $('#sInput');
    si.value = 'ving';
    si.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(180);
    var rows = document.querySelectorAll('.srow');
    log(rows.length > 2, '搜索 ving 命中多部', String(rows.length));
    if (rows.length) {
      rows[0].click();
      await sleep(380);
      log(document.querySelector('.page[data-page="detail"]').classList.contains('on'), '搜索结果可进详情');
      document.querySelector('.page[data-page="detail"] [data-back]').click();
      await sleep(320);
    }

    // 11.95 设置子页（Perfil 每一项在真机上都是独立二级页）
    document.querySelector('.tab[data-tab="perfil"]').click();
    await sleep(300);
    document.querySelector('[data-page="perfil"] [data-sub="payouts"]').click();
    await sleep(340);
    log(document.querySelector('.page[data-page="sub"]').classList.contains('on'), 'Meus saques 子页打开');
    log($('#subTitle').textContent === 'Meus saques', '子页标题正确', $('#subTitle').textContent);
    log(document.querySelectorAll('#subBody .wd-item').length === 4, '提现记录 4 条',
      String(document.querySelectorAll('#subBody .wd-item').length));

    window.__CCAPI__.openSub('lang');
    await sleep(220);
    /* v1.7：语言列表新增中文项，按 data-lang 精确点击，不能用索引（[1] 已是中文） */
    document.querySelector('#subBody .opt[data-lang="en"]').click();
    await sleep(140);
    log(S.lang === 'en', '语言切到 English', S.lang);

    window.__CCAPI__.openSub('help');
    await sleep(220);
    document.querySelector('#subBody .faq button').click();
    await sleep(160);
    log(document.querySelector('#subBody .faq').classList.contains('open'), 'FAQ 可展开');

    window.__CCAPI__.openSub('delacc');
    await sleep(220);
    var db = $('#delBtn');
    log(db && db.disabled, '删除账号按钮默认禁用');
    document.querySelector('#subBody .chk').click();
    await sleep(140);
    log(db && !db.disabled, '勾选风险后按钮启用');
    document.querySelector('.page[data-page="sub"] [data-back]').click();
    await sleep(280);

    // 12 标注模式
    document.body.dataset.annot = 'on';
    log(getComputedStyle(document.body).getPropertyValue('--x') !== undefined, '标注模式可切换');

    /* ================= v1.4：提现页 A/B、解锁播放、去重 ================= */
    var API = window.__CCAPI__;

    // 13 分桶：同设备多次进页 page_id 恒定，bucket 落在 0–99
    var rec1 = API.loadBucket();
    var stable = true;
    for (var bi = 0; bi < 6; bi++) {
      var rr = API.loadBucket();
      if (rr.bucket !== rec1.bucket || rr.page !== rec1.page) stable = false;
    }
    log(stable, '同设备 6 次进页 page_id 恒定', rec1.bucket + ' · ' + rec1.page);
    log(rec1.bucket >= 0 && rec1.bucket < 100, 'bucket 落在 0–99', String(rec1.bucket));
    log(['wp_br_a', 'wp_br_b'].indexOf(rec1.page) >= 0, 'page_id 属于实验配置', rec1.page);

    // 14 两面呈现差异 + 数值逐字一致（BF-11-04）
    function wdSnap() {
      var hint = $('.wallet-cta .hint');
      var ht = hint ? hint.textContent.replace(/\s+/g, ' ').trim() : '';
      var at = ht.indexOf('sem taxa');           /* SLA 段必须逐字相同，只在它前面允许加差额 */
      return {
        bal: txt('#wdBalNum'),
        usd: txt('#wdUsd'),
        tiers: Array.prototype.map.call(document.querySelectorAll('#tiers .tier .v'), function (x) { return x.textContent.trim(); }).join('|'),
        taxa: txt('#secTier .more'),
        sla: at >= 0 ? ht.slice(at) : ht,
        art: getComputedStyle(document.querySelector('.bal-card .money-art')).display,
        flow: getComputedStyle($('#tiers')).gridAutoFlow
      };
    }
    document.querySelector('.tab[data-tab="ganhar"]').click();
    await sleep(160);
    API.applyWdPage('wp_br_a');
    await sleep(120);
    var sa = wdSnap();
    API.applyWdPage('wp_br_b');
    await sleep(120);
    var sb = wdSnap();
    log(sa.bal === sb.bal && sa.usd === sb.usd, '两面余额与汇率文案一致', sa.bal + ' / ' + sb.bal);
    log(sa.tiers === sb.tiers, '两面档位金额逐字一致', sa.tiers);
    log(sa.taxa === sb.taxa, '两面手续费文案一致', sa.taxa);
    log(sa.sla === sb.sla, '两面 SLA 逐字一致', sa.sla);
    log(sa.art !== 'none' && sb.art === 'none', '仅 A 面有余额卡插画', sa.art + ' / ' + sb.art);
    log(sa.flow !== sb.flow, '档位排布不同（竖排 vs 横排）', sa.flow + ' / ' + sb.flow);
    log(document.body.dataset.wdpage === 'wp_br_b', 'body 标记随 page_id 切换', document.body.dataset.wdpage);

    // 15 达标瞬间两面都是 100%（红线 14）
    S.coins = 500000; S.lockedCoins = 0; S.bal = 50; API.applyWdPage('wp_br_a');
    var wa = $('#wdGoalBar i').style.width;
    API.applyWdPage('wp_br_b');
    var wb = $('#wdGoalBar i').style.width;
    log(parseFloat(wa) === 100 && parseFloat(wb) === 100, '达标两面进度条都 100%', wa + ' / ' + wb);
    S.coins = 42000; S.lockedCoins = 0; S.bal = 4.2; API.applyWdPage('wp_br_a');

    // 16 解锁：锁着的集解锁后不再锁（markUnlocked 幂等且落盘）
    var ud = null;
    for (var di = 0; di < window.CCData.dramas.length; di++) {
      var cand = window.CCData.dramas[di];
      if (cand.apiId && cand.eps > 5) { ud = cand; break; }
    }
    log(!!ud, '取到可测剧目', ud ? ud.title : 'nil');
    API.openDetail(ud.id);
    await sleep(320);
    var lockCell = document.querySelector('#epsGrid .ep-cell.lock');
    log(!!lockCell, '详情页存在锁定集');
    var lockEp = lockCell ? parseInt(lockCell.dataset.ep, 10) : 0;
    API.markUnlocked(ud.id, lockEp);
    API.openDetail(ud.id);
    await sleep(320);
    var freed = document.querySelector('#epsGrid .ep-cell[data-ep="' + lockEp + '"]');
    log(freed && !freed.classList.contains('lock'), '解锁后该集不再锁定', 'EP ' + lockEp);

    // 17 点已解锁的集 → 进看剧页播这一集（不再跳回首页信息流）
    freed.click();
    await sleep(420);
    log(!document.querySelector('.page[data-page="detail"]').classList.contains('on'), '播放时已退出详情页');
    log(document.querySelector('.page[data-page="player"]').classList.contains('on'), '进入看剧页播放', 'player');
    log(txt('#plSub').indexOf('EP ' + String(lockEp).padStart(2, '0')) === 0, '看剧页集号 = 点击的集', txt('#plSub'));
    log(txt('#plTitle') === ud.title, '看剧页标题 = 该剧', txt('#plTitle'));
    document.getElementById('plBack').click();
    await sleep(240);
    log(document.querySelector('.page[data-page="detail"]').classList.contains('on'), '看剧页返回 → 回到详情页');
    document.querySelector('.page[data-page="detail"] [data-back]').click();
    await sleep(200);

    // 17.1 看剧页里看剧计币：进度推进 → 待领池增长 → 收集球同步
    API.openPlayer(ud.id, lockEp, 'detail');
    await sleep(220);
    S.playPct = 40; S.epEarned = 0;
    await sleep(1300);
    log(S.pendingCoins > 0, '看剧页看剧计币生效', String(S.pendingCoins));
    log(parseInt(String(txt('#plCollectN')).replace(/\./g, ''), 10) === S.pendingCoins, '看剧页收集球数字同步', txt('#plCollectN'));

    // 17.2 切下一集：集号 +1、进度归零重算（v1.19 底部按钮已删，直接调手势同源的 plGo）
    var plEpBefore = S.ep;
    API.plGo(1);
    await sleep(240);
    log(S.ep === plEpBefore + 1, '看剧页切到下一集', 'EP ' + S.ep);
    log(S.playPct < 20, '切集后重新计币', S.playPct.toFixed(0));

    // 17.3 上下滑动切集：上滑下一集、下滑上一集（手势与按钮共用 plGo）
    var plStageEl = document.getElementById('plStage');
    function plTouch(type, y) {
      var ev = new Event(type, { bubbles: true, cancelable: true });
      var tp = { clientX: 180, clientY: y, identifier: 1, target: plStageEl };
      ev.touches = type === 'touchend' ? [] : [tp];
      ev.changedTouches = [tp];
      plStageEl.dispatchEvent(ev);
    }
    var epBeforeSwipe = S.ep;
    plTouch('touchstart', 520);
    plTouch('touchmove', 470);
    plTouch('touchmove', 400);          /* dy = -120，过 72px 阈值 */
    log(document.getElementById('plGhost').classList.contains('is-next'), '上滑露出「下一集」预览层');
    log(document.getElementById('plGhostSub').textContent.indexOf('EP ' + String(epBeforeSwipe + 1).padStart(2, '0')) === 0,
      '预览层指向的正是下一集', txt('#plGhostSub'));
    plTouch('touchend', 400);
    await sleep(620);
    log(S.ep === epBeforeSwipe + 1, '上滑切到下一集', 'EP ' + S.ep);
    log(document.getElementById('plSlide').style.transform === '' ||
        /translateY\(0px\)/.test(document.getElementById('plSlide').style.transform),
      '切集后内容层回到原位', document.getElementById('plSlide').style.transform || 'none');

    var epBeforeDown = S.ep;
    plTouch('touchstart', 300);
    plTouch('touchmove', 350);
    plTouch('touchmove', 430);          /* dy = +130，向下滑 */
    log(document.getElementById('plGhost').classList.contains('is-prev'), '下滑露出「上一集」预览层');
    plTouch('touchend', 430);
    await sleep(620);
    log(S.ep === epBeforeDown - 1, '下滑回到上一集', 'EP ' + S.ep);

    // 17.4 位移不足阈值 → 回弹，不切集
    var epBeforeTap = S.ep;
    plTouch('touchstart', 400);
    plTouch('touchmove', 380);          /* dy = -20，远小于阈值 */
    plTouch('touchend', 380);
    await sleep(300);
    log(S.ep === epBeforeTap, '轻滑不切集（回弹）', 'EP ' + S.ep);

    // 17.5 看剧页也有提现入口：进 Sacar 再返回仍停在播放器
    log(!!document.getElementById('plSacar'), '看剧页顶栏有提现入口');
    log(parseInt(String(txt('#plBal')).replace(/\./g, ''), 10) === S.coins, '看剧页余额与主余额同源', txt('#plBal'));
    document.getElementById('plSacar').click();
    await sleep(300);
    log(document.querySelector('.page[data-page="sac"]').classList.contains('on'), '看剧页 Sacar → 提现页');
    if (document.getElementById('mWdIntro') && document.getElementById('mWdIntro').classList.contains('on')) {
      document.querySelector('[data-close="mWdIntro"]').click();
      await sleep(240);
    }
    document.querySelector('.page[data-page="sac"] [data-back]').click();
    await sleep(280);
    log(document.querySelector('.page[data-page="player"]').classList.contains('on'),
      '从提现页返回仍停在看剧页');

    // 17.6 看剧页左上角幸运轮盘入口
    log(!!document.getElementById('plWheel'), '看剧页左上角有转盘入口');
    document.getElementById('plWheel').click();
    await sleep(280);
    log($('#mWheel').classList.contains('on'), '点左上角入口打开金币盘');
    log(/anúncio|moedas/.test(txt('#wheelCost')), '盘内标注单次成本（广告或金币）', txt('#wheelCost'));
    $('[data-close="mWheel"]').click();
    await sleep(260);
    log(document.querySelector('.page[data-page="player"]').classList.contains('on'),
      '关掉转盘仍停在看剧页');

    document.getElementById('plBack').click();
    await sleep(200);

    log(API.playEpisode(ud.id, lockEp) === true, 'playEpisode 幂等可重入');

    // 18 播放源三级回退：本集原片 / 同剧片段 / 演示片段（传 id 或 apiId 都要命中）
    var feedDrama = window.CCData.feed[0].drama;
    var ex = window.CCData.videoFor(feedDrama.id, window.CCData.feed[0].ep.no);
    var dr = window.CCData.videoFor(feedDrama.id, 90);
    var dm = window.CCData.videoFor(999999, 1);
    log(ex.kind === 'exact' && !!ex.url, '首页条目命中本集原片', ex.kind);
    log(dr.kind === 'drama' && dr.url === ex.url, '同剧其它集回退到同剧片段', dr.kind);
    log(dm.kind === 'demo', '无源剧回退到演示片段', dm.kind);
    log(window.CCData.videoFor(feedDrama.apiId, window.CCData.feed[0].ep.no).kind === 'exact',
      'apiId 与内部 id 等价', String(feedDrama.apiId));

    // 19 重复入口已清理：右侧栏不再有第二个选集键；Ver tudo 进完整流水（不是提现记录）
    log(!document.getElementById('epsBtn'), '右侧栏不再有第二个选集按钮');
    $('#allSt').click();
    await sleep(320);
    log(document.querySelector('.page[data-page="sub"]').classList.contains('on') &&
        txt('#subTitle') === 'Extrato completo', 'Ver tudo 打开完整流水', txt('#subTitle'));
    log(document.querySelectorAll('#subBody .ex-row').length >= 5, '流水条目齐全',
      String(document.querySelectorAll('#subBody .ex-row').length));
    log(document.querySelectorAll('#subBody .wd-item').length === 0, '流水页不混入提现申请列表');
    document.querySelector('.page[data-page="sub"] [data-back]').click();
    await sleep(240);

    // 19.9 风控：礼包金币冻结中，总余额凑够 50.000（= 首档）也提不出来
    S.coins = 64000; S.lockedCoins = 50000; S.bal = 6.4;
    API.paintBal(S.coins); API.paintLockNote(); API.renderGoal();
    log(S.lockedCoins === 50000 && API.availCoins() === 14000, '冻结金币不计入可提现', String(API.availCoins()));
    log(document.getElementById('wdLockNote').style.display !== 'none'
      || getComputedStyle(document.getElementById('wdLockNote')).display !== 'none',
      '提现页展示冻结金额行');
    var wdNum = txt('#wdBalNum');
    log(wdNum.indexOf('64.000') >= 0 || wdNum.indexOf('64000') >= 0, '顶部仍展示总金币', wdNum);
    API.unlockLocked('teste');
    log(S.lockedCoins === 0 && API.availCoins() === 64000, '完成首部剧后冻结解除', String(API.availCoins()));

    // 20 提现全链路：二级页 → 未填收款进银行表单 → 提交 → 15 工作日 → 看广告加速
    S.coins = 183000; S.bal = 18.3; S.lockedCoins = 0; S.pixSaved = false;
    document.querySelector('.tab[data-tab="inicio"]').click();
    await sleep(140);
    $('#btnSacarTop').click();
    await sleep(320);
    log(document.querySelector('.page[data-page="sac"]').classList.contains('on'), 'Sacar 顶部按钮进提现二级页');
    if ($('#mWdIntro').classList.contains('on')) { $('[data-close="mWdIntro"]').click(); await sleep(260); }
    $('#wdSubmit').click();
    await sleep(320);
    log(document.querySelector('.page[data-page="pix-form"]').classList.contains('on'), '未填收款 → 收款信息表单');
    log($('#pmBank').style.display !== 'none', '默认银行账户表单');
    log(!!document.getElementById('fBank') && !!document.getElementById('fAgency'), '银行字段齐全（Banco / Agência / Conta）');
    $('#pmSeg [data-pm="pix"]').click();
    await sleep(160);
    log($('#pmPix').style.display !== 'none' && $('#pmBank').style.display === 'none', '可切换到 PIX');
    $('#pmSeg [data-pm="bank"]').click();
    await sleep(160);
    $('#pixSave').click();
    await sleep(320);
    $('#wdSubmit').click();
    await sleep(2300);
    log(document.querySelector('.page[data-page="wd-status"]').classList.contains('on'), '提交后进提现状态页');
    /* v1.9.4：历史邀请不算加速 → 新提现仍是 15 天，额度上限 1+3=4 天 */
    log(txt('#wdDays') === '15', '历史邀请不计入加速（仍 15 天）', txt('#wdDays'));
    log(txt('#wdAccelLb').indexOf('de 4') >= 0, '加速上限 4 天（1 广告 + 3 邀请）', txt('#wdAccelLb'));
    log(txt('#wdAdSub').indexOf('1 vez') >= 0, '广告加速标注仅 1 次', txt('#wdAdSub'));
    log(txt('#wdInvSub').indexOf('convite novo') >= 0, '邀请加速要求新邀请', txt('#wdInvSub'));
    var daysBefore = txt('#wdDays');
    $('#wdAdBtn').click();
    await sleep(400);
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(420);
    log(parseInt(txt('#wdDays'), 10) === parseInt(daysBefore, 10) - 1, '看广告加速 -1 天', daysBefore + ' → ' + txt('#wdDays'));
    log($('#wdAdBtn').disabled === true && txt('#wdAdBtn') === 'Já usado', '广告加速用完即锁（只能 1 次）', txt('#wdAdBtn'));
    var afterAd = txt('#wdDays');
    $('#wdAdBtn').click();
    await sleep(360);
    log(txt('#wdDays') === afterAd, '再点广告不再加速', txt('#wdDays'));
    log(txt('#wdEta').indexOf('/') >= 0, '预计到账日期已更新', txt('#wdEta'));
    /* 历史邀请不能换加速：点按钮应提示并跳邀请页 */
    log(txt('#wdInvBtn') === 'Convidar', '无新邀请时按钮 = 邀请', txt('#wdInvBtn'));
    $('#wdInvBtn').click();
    await sleep(320);
    log(document.querySelector('.page[data-page="invite"]').classList.contains('on'), '无新邀请 → 跳邀请页');
    document.querySelector('.page[data-page="wd-status"] [data-back]').click();
    await sleep(260);

    // 21 邀请：分享 → 新朋友变有效 → 金币到账，并解锁 1 次 3 天加速
    await sleep(240);
    log(document.querySelector('.page[data-page="invite"]').classList.contains('on'), '邀请页已打开');
    var invCoins0 = txt('#invCoins');
    log(txt('#invDays') === '0', '历史邀请不给加速天数', txt('#invDays'));
    $('#invShare').click();
    await sleep(2100);
    log(txt('#invCoins') !== invCoins0, '邀请奖励到账', invCoins0 + ' → ' + txt('#invCoins'));
    log(txt('#invDays') === '3', '新邀请解锁 3 天加速（仅 1 次）', txt('#invDays'));
    log(document.querySelectorAll('#invList .inv-fr').length === 3, '邀请列表 3 人', String(document.querySelectorAll('#invList .inv-fr').length));
    log(txt('#invList').indexOf('+3 dias') >= 0, '新邀请行标注可加速', 'ok');

    // 21.03 被邀请方填码（BF-08-04）：短码 / 自己的码要拦住，通过后立刻 +2.000
    var cRd = window.__CC__.coins;
    API.openRedeem();
    await sleep(340);
    log(!!document.querySelector('#mRedeem.on'), '填码弹窗已打开');
    log(document.querySelector('#rdDone').hidden === true, '初始态是输入态');
    $('#rdInput').value = 'ab12';
    $('#rdOk').click();
    await sleep(140);
    log(txt('#rdErr').length > 2, '短码被拒', txt('#rdErr'));
    $('#rdInput').value = 'luca8f3a';
    $('#rdOk').click();
    await sleep(140);
    log(txt('#rdErr').indexOf('próprio') >= 0, '自己的邀请码被拒', txt('#rdErr'));
    log(window.__CC__.coins === cRd, '被拒时不入账', String(window.__CC__.coins));
    $('#rdInput').value = 'mari2026';
    $('#rdOk').click();
    await sleep(420);
    log(document.querySelector('#rdDone').hidden === false, '成功后切到成功态');
    log(window.__CC__.coins === cRd + 2000, '好友侧 +2.000 立即到账', cRd + ' → ' + window.__CC__.coins);
    log(txt('#rowRedeemTag').indexOf('+2.000') >= 0, 'Perfil 行显示已兑付', txt('#rowRedeemTag'));
    var cDup = window.__CC__.coins;
    API.rdSubmit();
    await sleep(160);
    log(window.__CC__.coins === cDup, '重复填码不再入账', String(window.__CC__.coins));
    API.closeMask('mRedeem');
    await sleep(280);

    // 21.1 回提现页用掉这次邀请加速 → -3 天，之后锁死
    API.openPage('wd-status');
    await sleep(300);
    log(txt('#wdInvBtn') === 'Usar convite', '有新邀请时按钮 = 使用邀请', txt('#wdInvBtn'));
    var d0 = parseInt(txt('#wdDays'), 10);
    $('#wdInvBtn').click();
    await sleep(320);
    log(parseInt(txt('#wdDays'), 10) === d0 - 3, '邀请加速 -3 天', d0 + ' → ' + txt('#wdDays'));
    log(txt('#wdAccelLb') === '4 de 4 dias adiantados', '加速额度用满 4 天', txt('#wdAccelLb'));
    log($('#wdInvBtn').disabled === true, '邀请加速用完即锁（只能 1 次）');
    var d1 = txt('#wdDays');
    $('#wdInvBtn').click();
    await sleep(300);
    log(txt('#wdDays') === d1, '再点邀请不再加速', txt('#wdDays'));
    document.querySelector('.page[data-page="wd-status"] [data-back]').click();
    await sleep(260);

    // 22 广告阶梯卡（v1.9.7）：每个视频 +5 自动到账、3 个 +20、15 个 +200，领完归零重来
    S.adsToday = 0;
    S.adLad = { n: 0, c1: false, c3: false, c15: false, rounds: 0 };
    document.querySelector('.tab[data-tab="ganhar"]').click();
    await sleep(200);
    log(txt('#ladCount') === '0 de 15', '阶梯卡从 0 开始', txt('#ladCount'));
    log($('#ladBtn3').disabled === true && txt('#ladBtn3') === '0 / 3', '3 档未达标 = 0 / 3 且禁用', txt('#ladBtn3'));
    log($('#ladBtn15').disabled === true, '15 档未达标禁用');
    var cLad = S.coins;
    API.adLadderTick();
    await sleep(180);
    log(S.coins - cLad === 5, '看第 1 个视频自动 +5（无领取按钮）', '+' + (S.coins - cLad));
    log(txt('#ladSt1').indexOf('+5') >= 0, '第 1 档标已到账', txt('#ladSt1'));
    API.adLadderTick(); API.adLadderTick();
    await sleep(220);
    log(txt('#ladCount') === '3 de 15', '累计到 3', txt('#ladCount'));
    log(S.coins - cLad === 15, '3 个视频共 +15（每个 5）', '+' + (S.coins - cLad));
    log(txt('#ladBtn3').indexOf('Resgatar +20') >= 0, '3 档变可领 +20', txt('#ladBtn3'));
    $('#ladBtn3').click();
    await sleep(260);
    log(S.coins - cLad === 35, '3 档领取 +20 到账', '+' + (S.coins - cLad));
    log(txt('#ladBtn3') === 'Resgatado', '3 档已领取', txt('#ladBtn3'));
    var c15 = S.coins;
    for (var li = 3; li < 15; li++) API.adLadderTick();
    await sleep(240);
    log(txt('#ladCount') === '15 de 15', '累计到 15', txt('#ladCount'));
    log(S.coins - c15 === 60, '剩下 12 个视频 +60', '+' + (S.coins - c15));
    log(txt('#ladBtn15').indexOf('Resgatar +200') >= 0, '15 档变可领 +200', txt('#ladBtn15'));
    $('#ladBtn15').click();
    await sleep(280);
    log(S.coins - c15 === 260, '15 档领取 +200 到账', '+' + (S.coins - c15));
    log(txt('#ladCount') === '0 de 15', '领完最后一档计数归零', txt('#ladCount'));
    log($('#ladBtn3').disabled === true && txt('#ladBtn3') === '0 / 3', '归零后 3 档回到 0 / 3');
    log(txt('#ladSt1') === 'na hora' || txt('#ladSt1') === 'auto', '归零后第 1 档回到未到账', txt('#ladSt1'));
    /* 再看 1 个：新一轮还是从 0 数，不看历史总量 */
    var cR2 = S.coins;
    API.adLadderTick();
    await sleep(180);
    log(txt('#ladCount') === '1 de 15' && S.coins - cR2 === 5, '新一轮从 0 记，第 1 个仍 +5', txt('#ladCount'));

    // 23 新人礼包 → 看激励翻倍领取：点主按钮播广告，看完按 100.000 入账
    S.adsToday = 0;
    var nbCoins0 = S.coins;
    log(!$('#adPlay').classList.contains('on'), '礼包翻倍前广告层是干净的');
    $('#nbDouble').click();
    await sleep(1200);
    log($('#adPlay').classList.contains('on'), '新人翻倍调起激励视频');
    await sleep(5200);
    log($('#adBar').style.width === '100%', '新人翻倍广告播完', $('#adBar').style.width);
    $('#adClose').click();
    await sleep(420);
    log(S.coins - nbCoins0 === 100005, '新人礼包翻倍到账 +100.000（+ 激励阶梯 5）', '+' + (S.coins - nbCoins0));
    log(!$('#mNewbie').classList.contains('on'), '新人弹窗已关闭');

    // 24 新人礼包「普通领取」：二选一里的另一条路，直接领 50.000
    S.adsToday = 0;
    var nbCoins1 = S.coins;
    API.openMask('mNewbie');
    await sleep(240);
    log(document.querySelectorAll('#mNewbie .acts .btn').length === 2, '弹窗只有 2 个按钮',
      String(document.querySelectorAll('#mNewbie .acts .btn').length));
    $('#nbAccept').click();
    await sleep(560);
    log(S.coins - nbCoins1 === 50000, '普通领取 +50.000', '+' + (S.coins - nbCoins1));
    log(!$('#mNewbie').classList.contains('on'), '领取后弹窗关闭');

    // 25 v1.16 交互基础设施：toast 队列 / 遮罩栈 / 返回键 / 广告失败重试
    var host = $('#toastHost');
    host.innerHTML = '';
    API.toast('teste A'); API.toast('teste B'); API.toast('teste C'); API.toast('teste D');
    await sleep(60);
    log(host.querySelectorAll('.toast:not(.out)').length <= 2, 'toast 同屏最多 2 条',
      String(host.querySelectorAll('.toast:not(.out)').length));
    var before = host.querySelectorAll('.toast').length;
    API.toast('teste D');   /* 同文案立即重发应被去重 */
    await sleep(40);
    log(host.querySelectorAll('.toast').length === before, 'toast 同文案 1.2s 内去重',
      before + ' → ' + host.querySelectorAll('.toast').length);
    host.innerHTML = '';

    API.openMask('mNotif');
    await sleep(120);
    API.openWheel();
    await sleep(160);
    log(API.topMask() === 'mWheel', '遮罩栈顶 = 最后打开的那个', String(API.topMask()));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(280);
    log(!$('#mWheel').classList.contains('on') && $('#mNotif').classList.contains('on'),
      '返回键只关最上层，不连退两层');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(280);
    log(!$('#mNotif').classList.contains('on'), '再按一次关掉下一层');

    S.adFailRate = 1;
    API.playAd('reward');
    await sleep(950);
    log($('#adPlay').classList.contains('failed'), '广告拉不到素材进失败态');
    log(getComputedStyle($('#adFail')).display !== 'none', '失败态文案与按钮可见');
    var adsBefore = S.adsToday;
    $('#adSkip').click();
    await sleep(260);
    log(!$('#adPlay').classList.contains('on'), '失败后可直接退出');
    log(S.adsToday === adsBefore, '失败不消耗今日激励额度', String(S.adsToday));

    S.adFailRate = 0;
    API.playAd('reward');
    await sleep(950);
    log(!$('#adPlay').classList.contains('failed') && $('#adPlay').classList.contains('on'),
      '失败率归零后能正常加载');
    $('#adBar').style.width = '100%';
    $('#adClose').click();
    await sleep(360);

    // 25 v1.17 汇率 ×10 定标（老板 2026-11-15 A 案）：10.000 moedas = R$ 1,00
    log(API.coinRate === 10000, '汇率 = 10.000 moedas / R$1,00', String(API.coinRate));
    log(txt('#coinHint').indexOf('10.000 moedas = R$ 1,00') >= 0, '任务中心汇率说明文案', txt('#coinHint'));
    log(100 / API.coinRate === 0.01, '单集 100 moedas = R$ 0,01（产出币数不变）', String(100 / API.coinRate));
    var tierTxt = Array.prototype.map.call(document.querySelectorAll('#tiers .tier .d'),
      function (e) { return e.textContent.trim(); }).join(' | ');
    log(tierTxt.indexOf('50.000 moedas') >= 0 && tierTxt.indexOf('100.000 moedas') >= 0 &&
      tierTxt.indexOf('300.000 moedas') >= 0 && tierTxt.indexOf('500.000 moedas') >= 0,
      '提现四档币数 = 50.000 / 100.000 / 300.000 / 500.000（R$ 金额不变）', tierTxt);
    log(Math.abs(S.bal * API.coinRate - S.coins) < 2, '余额派生与金币同源（bal = coins / 10.000）',
      S.bal + ' × ' + API.coinRate + ' ≈ ' + S.coins);

    // 26 v1.18 差额双口径 + 演示种子开关
    log(API.gapVal(800, 'eps') === '8 eps', '小额差额说集数（800 moedas = 8 eps）', API.gapVal(800, 'eps'));
    log(API.gapVal(8000, 'eps').indexOf('R$ 0,80') >= 0, '大额差额改说金额（8.000 moedas = R$ 0,80）', API.gapVal(8000, 'eps'));
    log(API.gapVal(50000, 'eps').indexOf('R$ 5,00') >= 0, '全额差额 = R$ 5,00', API.gapVal(50000, 'eps'));
    log(API.gapText(8000, 'eps') === 'faltam R$ 0,80', '差额文案前缀 faltam + 金额', API.gapText(8000, 'eps'));
    API.seedBal(4.2);
    log(S.coins === 42000 && S.bal === 4.2, '#seed 演示种子口径（R$4,20 = 42.000 moedas）', S.coins + ' moedas');

    // 27 v1.21 转盘金额停盘后保持水平（修「数字乱摇摆」）
    API.renderWheelFace();
    var segB = document.querySelectorAll('#wheel .seg b');
    log(segB.length === 20, '转盘 20 格标签都已生成', String(segB.length));
    var norm360 = function (d) { return ((d % 360) + 540) % 360 - 180; };
    var prevOff2 = 0;
    [-99, -27, -351, -700].forEach(function (rot) {
      API.wheelRotSet(rot);
      API.straightenLabels(0);
      var gm = API.wheelGeom();
      var screenTxt = norm360(gm.rot + gm.off);
      var step = Math.abs(gm.off - prevOff2);
      prevOff2 = gm.off;
      log(Math.abs(screenTxt) < 0.51 && step <= 180.001,
        '停盘角 ' + rot + '° → 金额补偿回水平，且单次回转 ≤180°',
        'off ' + gm.off.toFixed(1) + '° · 单次 ' + step.toFixed(1) + '° · 屏幕 ' + screenTxt.toFixed(1) + '°');
    });
    log(/rotate\(/.test(segB[0].style.transform || ''), '标签角度写在内联样式（覆盖 CSS 的 -a 默认值）', segB[0].style.transform);
    API.wheelRotSet(0); API.straightenLabels(0);   /* 复位，避免影响后续手动操作 */

    emit();
  }
})();
