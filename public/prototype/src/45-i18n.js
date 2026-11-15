/* ==========================================================================
   CineCoin Prototype · 界面语言运行时（v1.7）
   默认 pt-BR；设置页可切到简体中文。词典见 46-i18n-zh.js。
   设计要点：
   1) 数字统一归一化为 {d} 再查表 —— 渲染出来的动态数字不会导致查不到；
   2) 命中后按顺序回填原数字，并按中文习惯改写格式（4.200 → 4,200、4,20 → 4.20）；
   3) MutationObserver 兜住所有 innerHTML 重渲染，切换语言无需重载页面；
   4) 翻译过的节点留原文快照，切回葡语时原位还原。
   调试：__CC_I18N__.setLang('zh'|'pt') / misses() / stats()
   ========================================================================== */
(function () {
  'use strict';

  var ZH = window.__CC_ZH__;
  if (!ZH || !ZH.map) { window.__CC_I18N__ = { setLang: function () {}, misses: function () { return []; } }; return; }

  var LS_KEY = 'cc.lang';
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var cur = 'pt';
  var enabled = false;
  var recs = [];          // {t:'text'|'attr', n, a, src, out}
  var missSet = {};
  var hit = 0;

  /* ---------------------------------------------------------- 数字与格式 */
  var NUM = /\d+(?:[.,]\d+)*/g;

  function numsOf(s) { var m = s.match(NUM); return m || []; }
  function norm(s) { return s.replace(NUM, '{d}'); }

  /* pt-BR 数字 → 中文习惯 */
  function zhNumOne(s) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) return s.replace(/\./g, ',');
    if (/^\d+,\d{1,2}$/.test(s)) return s.replace(',', '.');
    return s;
  }
  function zhNumsIn(s) {
    return s
      .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, function (m) { return m.replace(/\./g, ','); })
      .replace(/\b(\d+),(\d{1,2})\b/g, '$1.$2');
  }

  function miss(s) {
    if (!s || s.length < 2) return;
    missSet[s] = (missSet[s] || 0) + 1;
  }

  /* ---------------------------------------------------------------- 查表 */
  function tr(core) {
    var val = ZH.map[norm(core)];
    if (val == null && core.length <= 32 && ZH.word && ZH.word[core] != null) val = ZH.word[core];
    if (val == null) return null;

    var nums = numsOf(core);
    var slots = (val.match(/\{d\}/g) || []).length;
    if (slots !== nums.length) {           // 占位数与原文数字数不符：宁可漏译也不串值
      miss(core + '  ← 占位不符 ' + slots + '/' + nums.length);
      return null;
    }
    var i = 0;
    return zhNumsIn(val.replace(/\{d\}/g, function () { return zhNumOne(nums[i++]); }));
  }

  /* ---------------------------------------------- 复合句兜底（A · B · C） */
  function trSegments(core) {
    if (core.indexOf(' · ') < 0) return null;
    var parts = core.split(' · ');
    var any = false;
    var out = parts.map(function (p) {
      var t = tr(p);
      if (t != null) { any = true; return t; }
      return zhNumsIn(p);
    });
    return any ? out.join(' · ') : null;
  }

  /* -------------------------------------------------------------- 文本节点 */
  function applyText(node) {
    var p = node.parentNode;
    if (!p) return;
    var tag = p.nodeName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'NOSCRIPT') return;

    var v = node.nodeValue;
    if (node.__ccOut === v) return;              // 仍是我们的译文，避免自触发
    if (v == null) return;

    var lead = (v.match(/^\s*/) || [''])[0];
    var trail = (v.match(/\s*$/) || [''])[0];
    var core = v.trim();
    if (!core) return;

    var out = tr(core);
    if (out == null) out = trSegments(core);      // 「分类 · 60 eps · 5 views」这类复合行
    var changed = out != null;
    if (!changed) {
      var conv = zhNumsIn(core);                 // 未命中词典也要统一数字格式
      if (conv === core) { if (core.length > 1 && /[A-Za-zÀ-ÿ]{3}/.test(core)) miss(core); return; }
      out = conv;
    } else {
      hit++;
    }

    node.__ccSrc = v;
    node.__ccOut = lead + out + trail;
    recs.push({ t: 'text', n: node, src: v, out: node.__ccOut });
    node.nodeValue = node.__ccOut;
  }

  /* ------------------------------------------------------------ 元素属性 */
  function applyAttr(el, a) {
    if (!el.getAttribute) return;
    var v = el.getAttribute(a);
    if (!v) return;
    if (el.__ccOut && el.__ccOut[a] === v) return;   // 已是我们的译文，避免二次翻译
    var out = tr(v.trim());
    if (out == null) { miss(v.trim()); return; }
    el.__ccOut = el.__ccOut || {};
    el.__ccOut[a] = out;
    el.__ccSrc = el.__ccSrc || {};
    el.__ccSrc[a] = v;
    recs.push({ t: 'attr', n: el, a: a, src: v, out: out });
    el.setAttribute(a, out);
  }

  /* ---------------------------------------------------------------- 遍历 */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { applyText(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP[root.nodeName]) return;

    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var batch = [], n;
    while ((n = tw.nextNode())) batch.push(n);
    for (var i = 0; i < batch.length; i++) applyText(batch[i]);

    if (root.getAttribute) {
      for (var k = 0; k < ATTRS.length; k++) if (root.hasAttribute(ATTRS[k])) applyAttr(root, ATTRS[k]);
    }
    var els = root.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var j = 0; j < els.length; j++) {
      for (var k2 = 0; k2 < ATTRS.length; k2++) if (els[j].hasAttribute(ATTRS[k2])) applyAttr(els[j], ATTRS[k2]);
    }
  }

  /* ---------------------------------------------------------------- 还原 */
  function restore() {
    for (var i = recs.length - 1; i >= 0; i--) {
      var r = recs[i];
      if (!r.n || !r.n.isConnected) continue;
      if (r.t === 'text') {
        if (r.n.nodeValue === r.out) r.n.nodeValue = r.src;
        r.n.__ccOut = null;
      } else {
        if (r.n.getAttribute(r.a) === r.out) r.n.setAttribute(r.a, r.src);
        if (r.n.__ccOut) r.n.__ccOut[r.a] = null;
      }
    }
    recs = [];
  }

  /* ------------------------------------------------------------ 语言切换 */
  function setLang(k) {
    k = (k === 'zh') ? 'zh' : 'pt';
    try { localStorage.setItem(LS_KEY, k); } catch (e) {}
    if (k === cur) return cur;

    if (k === 'zh') {
      cur = 'zh'; enabled = true;
      walk(document.body);
    } else {
      enabled = false;
      restore();
      cur = 'pt';
    }

    document.documentElement.setAttribute('lang', k === 'zh' ? 'zh-CN' : 'pt-BR');
    document.documentElement.classList.toggle('lang-zh', k === 'zh');
    if (window.__CC__) window.__CC__.lang = (k === 'zh' ? 'zh' : 'pt');
    return cur;
  }

  /* ------------------------------------------------------------ 动态监听 */
  var mo = new MutationObserver(function (muts) {
    if (!enabled) return;
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') { applyText(m.target); continue; }
      if (m.type === 'attributes') { applyAttr(m.target, m.attributeName); continue; }
      var add = m.addedNodes;
      for (var j = 0; j < add.length; j++) {
        var nd = add[j];
        if (nd.nodeType === 3) applyText(nd);
        else if (nd.nodeType === 1) walk(nd);
      }
    }
  });

  /* ---------------------------------------------------------------- 启动 */
  function boot() {
    var h = location.hash || '';
    var m = h.match(/lang=(zh|pt)/);
    var isSelftest = h.indexOf('selftest') > -1;
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
    /* selftest 永远以葡语为基准跑，忽略 #lang= 与 localStorage */
    var want = isSelftest ? 'pt' : (m ? m[1] : (saved === 'zh' ? 'zh' : 'pt'));

    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });

    if (want === 'zh') setLang('zh');
    else { document.documentElement.setAttribute('lang', 'pt-BR'); if (window.__CC__) window.__CC__.lang = 'pt'; }

    /* 首屏可能存在未走 MutationObserver 的静态节点，补扫一次 */
    if (want === 'zh') setTimeout(function () { if (enabled) walk(document.body); }, 0);

    /* 调试：#i18nreport 把未命中词条写到 <head>，便于 dump-dom 批量补齐（不影响界面） */
    if ((location.hash || '').indexOf('i18nreport') > -1) {
      setTimeout(function () {
        var st = window.__CC_I18N__.stats();
        var ms = window.__CC_I18N__.misses();
        var pre = document.createElement('pre');
        pre.id = 'cc-i18n-report';
        pre.setAttribute('style', 'display:none');
        pre.textContent = JSON.stringify(st) + '\n---\n' + ms.join('\n');
        document.head.appendChild(pre);
      }, 1500);
    }
  }

  window.__CC_I18N__ = {
    setLang: setLang,
    lang: function () { return cur; },
    misses: function () {
      return Object.keys(missSet).sort(function (a, b) { return missSet[b] - missSet[a]; });
    },
    stats: function () { return { hits: hit, records: recs.length, misses: Object.keys(missSet).length, entries: Object.keys(ZH.map).length }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
