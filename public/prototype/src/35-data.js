/* ==========================================================================
   35-data.js · 短剧数据层（真实接口）
   接口：https://api.salesmarto.com/app-api/drama
   策略：
     ① 页面内嵌构建期快照 #cc-snap（真实接口返回，见 data/snapshot.json）——
        同步可用，任何环境（双击打开 / 离线）都能看到真实数据；
     ② 启动后尝试 fetch 实时数据；服务端未开 CORS 时静默失败，继续用快照；
     ③ 两者都没有 → 由 40-app.js 的演示数据兜底。
   对外：window.CCData
     .source      'snapshot' | 'api' | 'none'
     .dramas[]    规范化剧目（id 前缀 r）
     .feed[]      首页视频流（drama / ep / video / poster）
     .cats[]      分类（按剧目数排序）
     .epCache     分集缓存（apiId → episodes[]）
     .episodes(id) .search(kw) .reload()
   ========================================================================== */
(function () {
  var BASE = 'https://api.salesmarto.com/app-api/drama';
  var QS = '?countryCode=BR&locale=pt-BR';

  var snap = null;
  try {
    var el = document.getElementById('cc-snap');
    if (el && el.textContent) snap = JSON.parse(el.textContent);
  } catch (e) { snap = null; }

  var meta = { source: snap ? 'snapshot' : 'none', fetchedAt: snap ? snap.fetchedAt || '' : '' };

  function trim(s) { return (s == null ? '' : String(s)).trim(); }

  /* API 剧目对象 → 原型内部结构 */
  function normDrama(x) {
    x = x || {};
    var cats = trim(x.categoryCodes).split(',').map(trim).filter(Boolean);
    var id = 'r' + x.id;
    var raw = trim(x.title) || 'Sem título';
    /* 接口里 "(Dublagem)" 之类前缀占掉一行宽度的三分之一，展示层去掉，原名留档 */
    var title = raw.replace(/^\((?:Dublagem|Dublado|Legendado|Dubbed)\)\s*/i, '');
    return {
      id: id,
      apiId: x.id,
      title: title,
      rawTitle: raw,
      desc: trim(x.description),
      cover: trim(x.coverUrl),
      cats: cats,
      cat: cats[0] || 'Drama',
      eps: x.totalEpisodes || 1,
      free: x.freeEpisodeCount || 0,
      heat: trim(x.heatText) || String(x.heatScore == null ? '' : x.heatScore),
      views: trim(x.heatText) || '—',
      seen: 0,
      cur: 1,
      cls: 'v' + ((Number(x.id) % 4) + 1),
      fig: ['fig-a', 'fig-b', 'fig-c'][Number(x.id) % 3]
    };
  }

  function normEpisode(e) {
    e = e || {};
    return {
      id: e.id,
      no: e.episodeNo || 1,
      title: trim(e.title),
      cover: trim(e.coverUrl),
      duration: e.durationSeconds || 0,
      free: !!e.free,
      unlocked: !!e.unlocked,
      locked: !!e.locked || e.free === false
    };
  }

  /* 播放源索引：分集接口只给元数据，真正的播放地址只出现在 /home-feed 的条目里。
     所以一集的可用源按「本剧本集 → 本剧任意集 → 全局首条」三级回退，
     并如实标出 kind，界面与自测据此区分「这集的原片」和「同剧演示片段」。
     key 统一去掉原型内部的 r 前缀：调用方传 'r1108' 或 1108 都能命中。 */
  var videoMap = {}, firstVideo = '';
  function idKey(v) { return String(v == null ? '' : v).replace(/^r/, ''); }
  function indexVideo(raw) {
    videoMap = {}; firstVideo = '';
    (((raw || {}).feed || {}).items || []).forEach(function (it) {
      var u = trim(it.videoUrl);
      if (!u) return;
      if (!firstVideo) firstVideo = u;
      var id = it.drama && it.drama.id;
      if (!id) return;
      var key = idKey(id);
      var no = (it.episode && it.episode.episodeNo) || 1;
      var m = videoMap[key] || (videoMap[key] = { eps: {}, any: '' });
      if (!m.eps[no]) m.eps[no] = u;
      if (!m.any) m.any = u;
    });
  }

  function videoFor(apiId, epNo) {
    var m = videoMap[idKey(apiId)];
    if (m) {
      if (m.eps[epNo]) return { url: m.eps[epNo], kind: 'exact' };
      if (m.any) return { url: m.any, kind: 'drama' };
    }
    if (firstVideo) return { url: firstVideo, kind: 'demo' };
    return { url: '', kind: 'none' };
  }

  function build(raw) {
    var dramas = ((raw && raw.dramas) || []).map(normDrama);
    indexVideo(raw);
    var byId = {};
    dramas.forEach(function (d) { byId[d.id] = d; });
    var feed = (((raw || {}).feed || {}).items || []).map(function (it) {
      var d = normDrama(it.drama);
      if (!byId[d.id]) { dramas.push(d); byId[d.id] = d; }
      return {
        drama: byId[d.id],
        ep: normEpisode(it.episode),
        video: trim(it.videoUrl),
        poster: trim(it.drama && it.drama.coverUrl),
        fallback: !!it.fallback
      };
    });
    var cnt = {};
    dramas.forEach(function (d) { d.cats.forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; }); });
    var cats = (((raw || {}).home || {}).categories || []).map(function (c) {
      var code = trim(c.code);
      return { code: code, name: trim(c.name), count: cnt[code] || 0 };
    }).filter(function (c) { return c.code; });
    cats.sort(function (a, b) { return b.count - a.count; });
    return { dramas: dramas, feed: feed, cats: cats, home: (raw || {}).home };
  }

  var built = build(snap ? snap : null);

  function fetchJSON(path) {
    return new Promise(function (resolve, reject) {
      if (!window.fetch) { reject(new Error('no fetch')); return; }
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
      fetch(BASE + path, {
        headers: { Accept: 'application/json' },
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        clearTimeout(timer);
        if (!j || j.code !== 200) throw new Error('code ' + (j && j.code));
        resolve(j.data);
      }).catch(function (e) {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  var epCache = {};
  function episodes(apiId) {
    if (epCache[apiId]) return Promise.resolve(epCache[apiId]);
    return fetchJSON('/dramas/' + apiId + '/episodes' + QS).then(function (arr) {
      var list = (arr || []).map(normEpisode);
      epCache[apiId] = list;
      return list;
    });
  }

  function search(kw) {
    return fetchJSON('/dramas' + QS + '&keyword=' + encodeURIComponent(kw)).then(function (arr) {
      return (arr || []).map(normDrama);
    });
  }

  window.CCData = {
    get source() { return meta.source; },
    get fetchedAt() { return meta.fetchedAt; },
    get dramas() { return built.dramas; },
    get feed() { return built.feed; },
    get cats() { return built.cats; },
    get home() { return built.home; },
    epCache: epCache,
    episodes: episodes,
    search: search,
    videoFor: videoFor,
    get videoDramas() { return Object.keys(videoMap).map(Number); },
    /* 实时优先：成功则替换快照并通知 UI 重绘；失败保持快照，不打扰用户 */
    reload: function () {
      return Promise.all([
        fetchJSON('/home' + QS),
        fetchJSON('/dramas' + QS),
        fetchJSON('/home-feed' + QS)
      ]).then(function (r) {
        built = build({ home: r[0], dramas: r[1], feed: r[2] });
        meta.source = 'api';
        meta.fetchedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
        if (window.CCHydrate) window.CCHydrate();
        return true;
      }).catch(function () {
        return false;
      });
    }
  };
})();
