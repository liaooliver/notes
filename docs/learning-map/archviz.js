/* archviz.js - architecture map (full + mini) and grid flow diagrams. Depends on seqviz.js (el, stepper, textW).
   ASCII only: all UI strings are \u escapes; page data comes from JSON embedded in the HTML. */
(function (global) {
  'use strict';
  var S = global.SeqViz, el = S.el;
  var W = 130, H = 46;

  function arrowHead(g, pts) {
    var n = pts.length, a = pts[n - 2], b = pts[n - 1];
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
    var s = 8, hw = 4.5;
    el('polygon', { points: [b[0], b[1], b[0] - ux * s - uy * hw, b[1] - uy * s + ux * hw, b[0] - ux * s + uy * hw, b[1] - uy * s - ux * hw].join(' '), 'class': 'ah' }, g);
  }
  function label(g, x, y, text, anchor) {
    if (!text) return;
    var w = S.textW(text, 11.5) + 8;
    var x0 = anchor === 'start' ? x - 3 : anchor === 'end' ? x - w + 3 : x - w / 2;
    el('rect', { x: x0, y: y - 11, width: w, height: 15, 'class': 'lbg' }, g);
    var t = el('text', { x: x, y: y, 'text-anchor': anchor || 'middle' }, g); t.textContent = text;
  }
  function drawNode(parent, nd, extraCls) {
    var w = nd.w || W, h = nd.h || H;
    var g = el('g', { 'class': 'node' + (extraCls || ''), 'data-id': nd.id }, parent);
    if (nd.shape === 'diamond') {
      var cx = nd.x + w / 2, cy = nd.y + h / 2;
      el('polygon', { points: [cx, nd.y, nd.x + w, cy, cx, nd.y + h, nd.x, cy].join(' ') }, g);
    } else {
      el('rect', { x: nd.x, y: nd.y, width: w, height: h }, g);
    }
    var cx2 = nd.x + w / 2, two = nd.l.length > 1;
    var t1 = el('text', { x: cx2, y: nd.y + h / 2 + (two ? -2 : 4.5), 'text-anchor': 'middle', 'class': 'main' }, g); t1.textContent = nd.l[0];
    if (two) { var t2 = el('text', { x: cx2, y: nd.y + h / 2 + 13, 'text-anchor': 'middle', 'class': 'sub' }, g); t2.textContent = nd.l[1]; }
    return g;
  }
  function drawEdge(parent, e, labelLayer) {
    var g = el('g', { 'class': 'edge' + (e.dashed ? ' dashed' : ''), 'data-id': e.id }, parent);
    el('path', { d: e.pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ') }, g);
    arrowHead(g, e.pts);
    if (e.label) {
      var lg = labelLayer ? el('g', { 'class': 'edge elabel' + (e.dashed ? ' dashed' : ''), 'data-id': e.id }, labelLayer) : g;
      label(lg, e.lx, e.ly, e.label, e.anchor);
    }
    return g;
  }

  /* ---------- architecture map ---------- */
  function renderArch(A, mini) {
    var svg = el('svg', { viewBox: '0 0 ' + A.size.w + ' ' + A.size.h, 'class': 'flow-svg arch-svg' + (mini ? ' arch-mini' : ''), role: 'img' });
    var gC = el('g', { 'class': 'clusters' }, svg);
    A.clusters.forEach(function (c) {
      var g = el('g', { 'class': 'cluster', 'data-id': c.id }, gC);
      el('rect', { x: c.x, y: c.y, width: c.w, height: c.h }, g);
      var t = el('text', { x: c.right ? c.x + c.w - 8 : c.x + 8, y: c.bottom ? c.y + c.h - 7 : c.y + 14, 'text-anchor': c.right ? 'end' : 'start' }, g);
      t.textContent = c.label;
    });
    var gE = el('g', { 'class': 'edges' }, svg), gN = el('g', { 'class': 'nodes' }, svg);
    A.edges.forEach(function (e) { drawEdge(gE, e); });
    A.nodes.forEach(function (nd) { drawNode(gN, nd); });
    return svg;
  }

  function mountMini(container, A, ids, href) {
    var svg = renderArch(A, true), hit = {};
    ids.forEach(function (id) { hit[id] = true; });
    svg.querySelectorAll('.node, .cluster').forEach(function (g) { if (hit[g.dataset.id]) g.classList.add('hit'); });
    var a = document.createElement('a'); a.href = href; a.className = 'mini-link';
    a.setAttribute('aria-label', '\u5728\u7e3d\u67b6\u69cb\u5716\u4e0a\u7684\u4f4d\u7f6e');
    a.appendChild(svg); container.appendChild(a);
  }

  function mountFull(container, A, kpIndex, panel) {
    var svg = renderArch(A, false);
    svg.querySelectorAll('.node, .cluster').forEach(function (g) {
      if (kpIndex[g.dataset.id]) { g.classList.add('has-kp'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); }
    });
    var scn = document.createElement('div'); scn.className = 'viz-scn'; scn.setAttribute('role', 'group');
    var ctlHolder = document.createElement('div');
    var wrap = document.createElement('div'); wrap.className = 'viz-svg'; wrap.appendChild(svg);
    container.appendChild(scn); container.appendChild(ctlHolder); container.appendChild(wrap);
    var active = null, st = null;
    function paint(k) {
      var steps = active ? active.steps : [], cur = {}, done = {}, inS = {};
      steps.forEach(function (s, i) {
        s.n.concat(s.e).forEach(function (id) { inS[id] = true; if (i < k) done[id] = true; if (i === k) cur[id] = true; });
      });
      svg.querySelectorAll('.node, .edge, .cluster').forEach(function (g) {
        var id = g.dataset.id;
        g.classList.toggle('cur', !!cur[id]);
        g.classList.toggle('done', !cur[id] && !!done[id]);
        g.classList.toggle('off', k >= 0 && !inS[id] && !g.classList.contains('cluster'));
      });
    }
    function select(s) {
      active = s;
      scn.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === s.id)); });
      if (st) st.stop();
      ctlHolder.innerHTML = '';
      st = S.stepper({ count: s.steps.length, caption: function (k) { return s.steps[k].t; }, onStep: paint,
        intro: '\u60c5\u5883\u300c' + s.label + '\u300d\uff1a\u6309\u300c\u4e0b\u4e00\u6b65\u300d\u6216\u300c\u64ad\u653e\u300d\uff0c\u770b\u8a0a\u865f\u600e\u9ebc\u8d70', interval: 1700 });
      ctlHolder.appendChild(st.box); ctlHolder.appendChild(st.cap);
      st.set(-1);
    }
    A.scenarios.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = s.label; b.dataset.id = s.id;
      b.addEventListener('click', function () { select(s); }); scn.appendChild(b);
    });
    select(A.scenarios[0]);

    function show(id) {
      svg.querySelectorAll('.sel').forEach(function (g) { g.classList.remove('sel'); });
      var g = svg.querySelector('[data-id="' + id + '"]'); if (g) g.classList.add('sel');
      var list = kpIndex[id] || [];
      var h = '<div class="np-head"><span class="np-id">' + id + '</span><b>' + esc(A.names[id] || id) + '</b></div>';
      if (!list.length) h += '<p class="np-empty">\u9019\u500b\u7bc0\u9ede\u6c92\u6709\u7368\u7acb\u7684\u77e5\u8b58\u9ede\u3002</p>';
      else h += '<ol class="np-list">' + list.map(function (k) {
        return '<li><a href="' + k.page + '.html#' + k.id + '"><span class="np-kp">' + k.id.toUpperCase() + '</span><span class="np-t">' + esc(k.title) +
          '</span><span class="np-pg">' + esc(k.pageTitle) + '</span></a><p>' + esc(k.tldr) + '</p></li>';
      }).join('') + '</ol>';
      panel.innerHTML = h;
      try { history.replaceState(null, '', '#node-' + id); } catch (e) {}
    }
    function pick(e) {
      var g = e.target.closest ? e.target.closest('.has-kp') : null;
      if (!g) return;
      // clusters sit under nodes: a click inside a cluster but not on a node selects the cluster
      show(g.dataset.id);
      if (window.innerWidth < 1100) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    svg.addEventListener('click', pick);
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    var m = /^#node-([A-Z_]+)$/.exec(location.hash || '');
    show(m && kpIndex[m[1]] ? m[1] : 'DOCKER');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- grid flow (per knowledge point) ---------- */
  var CW = 230, RH = 112, NW = 160, NH = 48, PX = 16, PY = 28;
  function layoutFlow(spec) {
    var maxC = 0, maxR = 0, pos = {};
    spec.nodes.forEach(function (n) {
      maxC = Math.max(maxC, n.c); maxR = Math.max(maxR, n.r);
      var w = n.shape === 'diamond' ? NW : NW, h = n.shape === 'diamond' ? 64 : NH;
      var x = PX + n.c * CW, y = PY + n.r * RH + (NH - h) / 2;
      pos[n.id] = { id: n.id, x: x, y: y, w: w, h: h, l: n.l, shape: n.shape, cx: x + w / 2, cy: y + h / 2, c: n.c, r: n.r };
    });
    var pair = {};
    spec.edges.forEach(function (e) { pair[e.from + '>' + e.to] = true; });
    var edges = spec.edges.map(function (e) {
      var a = pos[e.from], b = pos[e.to], pts, lx, ly, anchor = 'middle';
      var off = pair[e.to + '>' + e.from] ? (e.from < e.to ? -9 : 9) : 0;
      if (a.r === b.r) {
        var y = a.cy + off, right = b.c > a.c;
        pts = [[right ? a.x + a.w : a.x, y], [right ? b.x : b.x + b.w, y]];
        lx = (pts[0][0] + pts[1][0]) / 2; ly = off > 0 ? a.y + a.h + 16 : a.y - 7;
      } else if (a.c === b.c) {
        var x = a.cx + off, down = b.r > a.r;
        pts = [[x, down ? a.y + a.h : a.y], [x, down ? b.y : b.y + b.h]];
        lx = x + 7; ly = (pts[0][1] + pts[1][1]) / 2 + 4; anchor = 'start';
      } else {
        var dn = b.r > a.r, midY = dn ? PY + b.r * RH - (RH - NH) / 2 : PY + a.r * RH - (RH - NH) / 2;
        var sx = a.cx + off, ex = b.cx + off;
        pts = [[sx, dn ? a.y + a.h : a.y], [sx, midY], [ex, midY], [ex, dn ? b.y : b.y + b.h]];
        lx = (sx + ex) / 2; ly = midY - 6;
      }
      return { id: e.id, pts: pts, label: e.label, lx: lx, ly: ly, anchor: anchor, dashed: e.dashed };
    });
    return { nodes: spec.nodes.map(function (n) { return pos[n.id]; }), edges: edges,
      w: PX * 2 + maxC * CW + NW, h: PY * 2 + maxR * RH + NH + 4 };
  }
  function mountFlow(container) {
    var src = container.querySelector('script[type="application/json"]');
    if (!src) return;
    var spec = JSON.parse(src.textContent), L = layoutFlow(spec);
    var svg = el('svg', { viewBox: '0 0 ' + L.w + ' ' + L.h, 'class': 'flow-svg grid-flow', role: 'img', width: L.w });
    svg.style.minWidth = Math.min(L.w, Math.max(620, Math.round(L.w * 0.85))) + 'px'; svg.style.maxWidth = L.w + 'px';
    var gE = el('g', { 'class': 'edges' }, svg), gN = el('g', { 'class': 'nodes' }, svg), gL = el('g', { 'class': 'labels' }, svg);
    L.edges.forEach(function (e) { drawEdge(gE, e, gL); });
    L.nodes.forEach(function (n) { drawNode(gN, n); });
    var steps = spec.steps || [];
    function paint(k) {
      var cur = {}, done = {}, inS = {};
      steps.forEach(function (s, i) {
        (s.n || []).concat(s.e || []).forEach(function (id) { inS[id] = true; if (i < k) done[id] = true; if (i === k) cur[id] = true; });
      });
      svg.querySelectorAll('.node, .edge').forEach(function (g) {
        var id = g.dataset.id;
        g.classList.toggle('cur', !!cur[id]);
        g.classList.toggle('done', !cur[id] && !!done[id]);
        g.classList.toggle('off', k >= 0 && !inS[id]);
      });
      try { container.dispatchEvent(new CustomEvent('seqstep', { detail: { step: k, count: steps.length } })); } catch (e) {}
    }
    var st = S.stepper({ count: steps.length, caption: function (k) { return steps[k].t; }, onStep: paint, interval: 1600 });
    var wrap = document.createElement('div'); wrap.className = 'viz-svg'; wrap.appendChild(svg);
    container.appendChild(st.box); container.appendChild(st.cap); container.appendChild(wrap);
    container.tabIndex = 0;
    container.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); st.stop(); st.set(st.get() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); st.stop(); st.set(st.get() - 1); }
    });
    container.seqviz = st;
    st.set(-1);
  }

  global.ArchViz = { renderArch: renderArch, mountMini: mountMini, mountFull: mountFull, mountFlow: mountFlow, layoutFlow: layoutFlow };
})(window);
