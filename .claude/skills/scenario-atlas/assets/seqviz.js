/* seqviz.js \u2014 \u628a Mermaid sequenceDiagram \u5b50\u96c6\u89e3\u6790\u6210 SVG\uff0c\u4e26\u63d0\u4f9b\u9010\u6b65\u64ad\u653e\u3002
   \u652f\u63f4\uff1aparticipant / actor\u3001->> -->> --x -x -> -->\u3001Note over/left of/right of\u3001
   alt/else\u3001opt\u3001loop\u3001par/and\u3001break\u3001critical\uff0c\u4ee5\u53ca\u8a0a\u606f\u4e2d\u7684 <br/> \u63db\u884c\u3002 */
(function (global) {
  'use strict';

  var FS = 13, LINE = 16, HEAD_H = 32, PAD = 24, TOP = 12, BOTTOM = 20, MAXTXT = 280;
  var CJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f\u2000-\u206f]/;

  function charW(ch, fs) {
    if (CJK.test(ch)) return fs;
    if (/[A-Z@#%&mw]/.test(ch)) return fs * 0.7;
    if (/[iljtf.,:;'!| ()\[\]]/.test(ch)) return fs * 0.34;
    return fs * 0.58;
  }
  function textW(s, fs) { fs = fs || FS; var w = 0; for (var i = 0; i < s.length; i++) w += charW(s[i], fs); return w; }
  function wrapLine(s, maxW) {
    var lines = [], cur = '', w = 0, tokens = s.split(/(\s+)/);
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i]; if (!tok) continue;
      var tw = textW(tok);
      if (tw > maxW) {
        for (var j = 0; j < tok.length; j++) {
          var cw = charW(tok[j], FS);
          if (w + cw > maxW && cur) { lines.push(cur); cur = ''; w = 0; }
          cur += tok[j]; w += cw;
        }
      } else if (w + tw <= maxW || cur === '') { cur += tok; w += tw; }
      else { lines.push(cur.replace(/\s+$/, '')); cur = tok.replace(/^\s+/, ''); w = textW(cur); }
    }
    if (cur.replace(/\s+/g, '')) lines.push(cur.replace(/\s+$/, ''));
    return lines.length ? lines : [''];
  }
  function wrapAll(s, maxW) {
    var out = [], parts = s.split('\u2028');
    for (var i = 0; i < parts.length; i++) out = out.concat(wrapLine(parts[i], maxW));
    return out;
  }
  function maxLineW(lines) { var m = 0; for (var i = 0; i < lines.length; i++) m = Math.max(m, textW(lines[i])); return m; }

  /* ---------- parse ---------- */
  function parse(src) {
    var parts = [], byId = {}, root = [], stack = [{ steps: root }];
    function top() { return stack[stack.length - 1]; }
    function ensure(id) { if (!byId[id]) { var p = { id: id, label: id }; parts.push(p); byId[id] = p; } }
    var text = src.replace(/&lt;br\s*\/?&gt;|<br\s*\/?>/gi, '\u2028');
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim(), m;
      if (!line || line.indexOf('%%') === 0 || /^sequenceDiagram/.test(line) || line === 'autonumber') continue;
      if ((m = line.match(/^(participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/))) {
        var p = { id: m[2], label: (m[3] || m[2]).trim(), actor: m[1] === 'actor' };
        parts.push(p); byId[p.id] = p; continue;
      }
      if ((m = line.match(/^Note\s+(over|left of|right of)\s+([^:]+):\s*(.*)$/i))) {
        var ids = m[2].split(',').map(function (s) { return s.trim(); });
        ids.forEach(ensure);
        top().steps.push({ t: 'note', ids: ids, text: m[3] }); continue;
      }
      if ((m = line.match(/^(alt|opt|loop|par|critical|break|rect)\b\s*(.*)$/))) {
        var b = { t: 'block', kind: m[1], branches: [{ label: m[2], steps: [] }] };
        top().steps.push(b); stack.push({ block: b, steps: b.branches[0].steps }); continue;
      }
      if ((m = line.match(/^(else|and|option)\b\s*(.*)$/))) {
        var fr = top(); if (!fr.block) continue;
        var br = { label: m[2], steps: [] }; fr.block.branches.push(br); fr.steps = br.steps; continue;
      }
      if (line === 'end') { if (stack.length > 1) stack.pop(); continue; }
      if ((m = line.match(/^(\S+?)\s*(-->>|->>|--x|-x|-->|->|--\)|-\))\s*(\S+?)\s*:\s*(.*)$/))) {
        ensure(m[1]); ensure(m[3]);
        var arrow = m[2];
        top().steps.push({
          t: m[1] === m[3] ? 'self' : 'msg', from: m[1], to: m[3], text: m[4],
          dashed: arrow.indexOf('--') === 0,
          head: /x$/.test(arrow) ? 'x' : /\)$/.test(arrow) ? 'open' : />>$/.test(arrow) ? 'filled' : 'line'
        });
        continue;
      }
    }
    return { participants: parts, steps: root, byId: byId };
  }

  /* ---------- layout ---------- */
  function layout(model) {
    var parts = model.participants, n = parts.length, idx = {};
    parts.forEach(function (p, i) { idx[p.id] = i; });
    var headW = 90;
    parts.forEach(function (p) { headW = Math.max(headW, textW(p.label) + 26); });
    var gap = headW + 20;
    (function walk(steps) {
      steps.forEach(function (s) {
        if (s.t === 'msg') {
          var span = Math.max(1, Math.abs(idx[s.to] - idx[s.from]));
          var w = Math.min(maxLineW(wrapAll(s.text, MAXTXT)), MAXTXT) + 24;
          gap = Math.max(gap, w / span);
        } else if (s.t === 'block') s.branches.forEach(function (b) { walk(b.steps); });
      });
    })(model.steps);
    gap = Math.min(gap, 250);
    var x0 = PAD + headW / 2;
    parts.forEach(function (p, i) { p.x = x0 + i * gap; });

    var rows = [], y = TOP + HEAD_H + 16, step = 0, maxRight = x0 + (n - 1) * gap + headW / 2;
    function lay(steps, depth) {
      steps.forEach(function (s) {
        if (s.t === 'msg' || s.t === 'self') {
          var x1 = parts[idx[s.from]].x, x2 = parts[idx[s.to]].x;
          var avail = s.t === 'self' ? 240 : Math.max(Math.abs(x2 - x1) - 14, 70);
          var lines = wrapAll(s.text, Math.min(avail, MAXTXT));
          var h = lines.length * LINE + (s.t === 'self' ? 24 : 12);
          if (s.t === 'self') maxRight = Math.max(maxRight, x1 + 34 + maxLineW(lines));
          rows.push({ t: s.t, s: s, lines: lines, y: y, h: h, step: step++, depth: depth, x1: x1, x2: x2 });
          y += h;
        } else if (s.t === 'note') {
          var xs = s.ids.map(function (id) { return parts[idx[id]].x; });
          var lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
          var cx = (lo + hi) / 2;
          var spanW = xs.length > 1 ? hi - lo + 100 : 210;
          var nl = wrapAll(s.text, Math.min(spanW - 16, 340));
          var w = maxLineW(nl) + 18, nh = nl.length * LINE + 10;
          maxRight = Math.max(maxRight, cx + w / 2);
          rows.push({ t: 'note', s: s, lines: nl, y: y + 4, h: nh, cx: cx, w: w, step: step++, depth: depth });
          y += nh + 12;
        } else if (s.t === 'block') {
          var start = { t: 'block', kind: s.kind, label: s.branches[0].label, y: y, depth: depth, step: step, seps: [] };
          rows.push(start); y += 22;
          s.branches.forEach(function (b, i) {
            if (i > 0) { var sep = { label: b.label, y: y, step: step }; start.seps.push(sep); y += 18; }
            lay(b.steps, depth + 1);
          });
          start.yEnd = y + 4; start.lastStep = step - 1; y += 12;
        }
      });
    }
    lay(model.steps, 0);
    var height = y + BOTTOM, width = maxRight + PAD;
    return { rows: rows, width: width, height: height, steps: step, headW: headW };
  }

  /* ---------- render ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function textBlock(parent, x, y, lines, anchor, cls) {
    var t = el('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'class': cls || '' }, parent);
    lines.forEach(function (ln, i) {
      var ts = el('tspan', { x: x, dy: i === 0 ? 0 : LINE }, t); ts.textContent = ln;
    });
    return t;
  }
  function arrowHead(parent, x, y, dir, kind) {
    var s = 7 * dir;
    if (kind === 'x') {
      el('line', { x1: x - 5 * dir, y1: y - 5, x2: x + 3 * dir, y2: y + 5, 'class': 'ah-x' }, parent);
      el('line', { x1: x - 5 * dir, y1: y + 5, x2: x + 3 * dir, y2: y - 5, 'class': 'ah-x' }, parent);
    } else if (kind === 'filled') {
      el('polygon', { points: [x, y, x - s, y - 4.5, x - s, y + 4.5].join(' '), 'class': 'ah' }, parent);
    } else {
      el('polyline', { points: [x - s, y - 4.5, x, y, x - s, y + 4.5].join(' '), 'class': 'ah-open' }, parent);
    }
  }

  function render(model, L) {
    var svg = el('svg', { viewBox: '0 0 ' + L.width + ' ' + L.height, width: L.width, height: L.height, 'class': 'seq-svg', role: 'img' });
    var gFrames = el('g', { 'class': 'frames' }, svg);
    var gLife = el('g', { 'class': 'lifelines' }, svg);
    var gRows = el('g', { 'class': 'rows' }, svg);
    var gHead = el('g', { 'class': 'heads' }, svg);
    var lifeBottom = L.height - BOTTOM + 6;

    model.participants.forEach(function (p) {
      var g = el('g', { 'class': 'head', 'data-id': p.id }, gHead);
      var w = Math.max(72, textW(p.label) + 22);
      el('rect', { x: p.x - w / 2, y: TOP, width: w, height: HEAD_H, 'class': p.actor ? 'actor' : '' }, g);
      var t = el('text', { x: p.x, y: TOP + HEAD_H / 2 + 4.5, 'text-anchor': 'middle' }, g); t.textContent = p.label;
      el('line', { x1: p.x, y1: TOP + HEAD_H, x2: p.x, y2: lifeBottom, 'class': 'life', 'data-id': p.id }, gLife);
    });

    L.rows.forEach(function (r) {
      if (r.t === 'block') {
        var g = el('g', { 'class': 'row frame', 'data-step': r.step, 'data-last': r.lastStep }, gFrames);
        var x = PAD / 2 + r.depth * 10, w = L.width - PAD - r.depth * 20;
        el('rect', { x: x, y: r.y, width: w, height: r.yEnd - r.y, 'class': 'frame-rect' }, g);
        var tab = el('text', { x: x + 8, y: r.y + 15, 'class': 'frame-kind' }, g); tab.textContent = r.kind;
        if (r.label) { var lb = el('text', { x: x + 8 + textW(r.kind, 12) + 10, y: r.y + 15, 'class': 'frame-label' }, g); lb.textContent = '[' + r.label + ']'; }
        r.seps.forEach(function (sp) {
          var gs = el('g', { 'class': 'row sep', 'data-step': sp.step }, gFrames);
          el('line', { x1: x, y1: sp.y + 2, x2: x + w, y2: sp.y + 2, 'class': 'sep-line' }, gs);
          if (sp.label) { var sl = el('text', { x: x + 8, y: sp.y + 15, 'class': 'frame-label' }, gs); sl.textContent = '[' + sp.label + ']'; }
        });
        return;
      }
      var g2 = el('g', { 'class': 'row ' + r.t, 'data-step': r.step }, gRows);
      if (r.t === 'msg') {
        var yl = r.y + r.lines.length * LINE + 2, dir = r.x2 > r.x1 ? 1 : -1;
        textBlock(g2, (r.x1 + r.x2) / 2, r.y + 12, r.lines, 'middle', 'msg-text');
        el('line', { x1: r.x1, y1: yl, x2: r.x2 - 2 * dir, y2: yl, 'class': 'msg-line' + (r.s.dashed ? ' dashed' : '') }, g2);
        arrowHead(g2, r.x2, yl, dir, r.s.head);
        g2.setAttribute('data-parts', r.s.from + ' ' + r.s.to);
      } else if (r.t === 'self') {
        var y0 = r.y + 6, x = r.x1;
        var d = 'M' + x + ' ' + y0 + ' H' + (x + 26) + ' V' + (y0 + r.lines.length * LINE + 4) + ' H' + (x + 3);
        el('path', { d: d, 'class': 'msg-line' + (r.s.dashed ? ' dashed' : '') }, g2);
        arrowHead(g2, x, y0 + r.lines.length * LINE + 4, -1, r.s.head);
        textBlock(g2, x + 34, y0 + 12, r.lines, 'start', 'msg-text');
        g2.setAttribute('data-parts', r.s.from);
      } else if (r.t === 'note') {
        el('rect', { x: r.cx - r.w / 2, y: r.y, width: r.w, height: r.h, 'class': 'note-rect' }, g2);
        textBlock(g2, r.cx - r.w / 2 + 9, r.y + 15, r.lines, 'start', 'note-text');
        g2.setAttribute('data-parts', r.s.ids.join(' '));
      }
    });
    return svg;
  }

  /* ---------- stepper (shared) ---------- */
  function stepper(opts) {
    var count = opts.count, cur = -1, timer = null;
    var box = document.createElement('div'); box.className = 'viz-ctl';
    var mk = function (label, act) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.act = act; box.appendChild(b); return b; };
    var bFirst = mk('\u91cd\u4f86', 'first'), bPrev = mk('\u4e0a\u4e00\u6b65', 'prev'), bNext = mk('\u4e0b\u4e00\u6b65', 'next'), bPlay = mk('\u64ad\u653e', 'play'), bAll = mk('\u5168\u90e8', 'all');
    var counter = document.createElement('span'); counter.className = 'viz-count'; box.appendChild(counter);
    var range = document.createElement('input'); range.type = 'range'; range.min = -1; range.max = count - 1; range.value = -1; range.className = 'viz-range'; range.setAttribute('aria-label', '\u6b65\u9a5f'); box.appendChild(range);
    var cap = document.createElement('div'); cap.className = 'viz-caption';
    function set(k) {
      cur = Math.max(-1, Math.min(count - 1, k));
      range.value = cur;
      counter.textContent = (cur + 1) + ' / ' + count;
      cap.textContent = cur < 0 ? (opts.intro || '\u6309\u300c\u4e0b\u4e00\u6b65\u300d\u6216\u300c\u64ad\u653e\u300d\u958b\u59cb') : opts.caption(cur);
      opts.onStep(cur);
      bPrev.disabled = cur < 0; bNext.disabled = cur >= count - 1;
      if (cur >= count - 1) stop();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } bPlay.textContent = '\u64ad\u653e'; }
    function play() { if (timer) return stop(); if (cur >= count - 1) set(-1); bPlay.textContent = '\u66ab\u505c'; timer = setInterval(function () { set(cur + 1); }, opts.interval || 1300); }
    box.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.act; if (!a) return;
      if (a === 'first') { stop(); set(-1); } else if (a === 'prev') { stop(); set(cur - 1); }
      else if (a === 'next') { stop(); set(cur + 1); } else if (a === 'play') play();
      else if (a === 'all') { stop(); set(count - 1); }
    });
    range.addEventListener('input', function () { stop(); set(parseInt(range.value, 10)); });
    return { box: box, cap: cap, set: set, stop: stop, get: function () { return cur; } };
  }

  /* ---------- mount ---------- */
  function mount(container) {
    var srcEl = container.querySelector('script[type="text/plain"], textarea');
    if (!srcEl) return;
    var model = parse(srcEl.textContent);
    var L = layout(model);
    var svg = render(model, L);
    var rows = L.rows.filter(function (r) { return r.t !== 'block'; });

    function caption(k) {
      var r = rows[k], by = model.byId;
      if (r.t === 'msg') return by[r.s.from].label + ' \u2192 ' + by[r.s.to].label + '\uff1a' + r.s.text.replace(/\u2028/g, ' ');
      if (r.t === 'self') return by[r.s.from].label + '\uff08\u81ea\u5df1\uff09\uff1a' + r.s.text.replace(/\u2028/g, ' ');
      return '\u8a3b\u89e3 ' + r.s.ids.map(function (id) { return by[id].label; }).join('\u3001') + '\uff1a' + r.s.text.replace(/\u2028/g, ' ');
    }
    function onStep(k) {
      var heads = svg.querySelectorAll('.head'), lives = svg.querySelectorAll('.life');
      var active = {};
      svg.querySelectorAll('.row').forEach(function (g) {
        var s = parseInt(g.dataset.step, 10);
        var last = g.dataset.last !== undefined ? parseInt(g.dataset.last, 10) : s;
        g.classList.toggle('future', s > k);
        g.classList.toggle('done', last < k);
        var isCur = g.classList.contains('frame') ? (k >= s && k <= last) : s === k;
        g.classList.toggle('cur', isCur);
        if (s === k && g.dataset.parts) g.dataset.parts.split(' ').forEach(function (id) { active[id] = true; });
      });
      heads.forEach(function (h) { h.classList.toggle('cur', !!active[h.dataset.id]); });
      lives.forEach(function (l) { l.classList.toggle('cur', !!active[l.dataset.id]); });
      try { container.dispatchEvent(new CustomEvent('seqstep', { detail: { step: k, count: rows.length } })); } catch (e) {}
    }
    var st = stepper({ count: rows.length, caption: caption, onStep: onStep, intro: container.dataset.intro });
    var wrap = document.createElement('div'); wrap.className = 'viz-svg'; wrap.appendChild(svg);
    container.appendChild(st.box); container.appendChild(st.cap); container.appendChild(wrap);
    svg.addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('.row') : null;
      if (g && !g.classList.contains('frame') && !g.classList.contains('sep')) { st.stop(); st.set(parseInt(g.dataset.step, 10)); }
    });
    container.tabIndex = 0;
    container.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); st.stop(); st.set(st.get() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); st.stop(); st.set(st.get() - 1); }
    });
    container.seqviz = st;
    st.set(-1);
    return st;
  }
  function mountAll(sel) { document.querySelectorAll(sel || '.seq').forEach(mount); }

  global.SeqViz = { parse: parse, layout: layout, render: render, mount: mount, mountAll: mountAll, stepper: stepper, el: el, textW: textW };
})(window);
