/* flowviz.js \u2014 GitOps \u76ee\u6a19\u67b6\u69cb\u7684\u4e92\u52d5\u6d41\u7a0b\u5716\uff1a\u624b\u7e6a SVG \u7bc0\u9ede\u8207\u908a\uff0c\u4f9d\u60c5\u5883\u9010\u6b65\u9ede\u4eae\u3002\u4f9d\u8cf4 seqviz.js \u7684 stepper / el\u3002 */
(function (global) {
  'use strict';
  var W = 126, H = 44;
  var nodes = [
    { id: 'Dev', x: 20, y: 70, l: ['Developer'] },
    { id: 'GH', x: 190, y: 70, l: ['GitHub', 'liaooliver/notes'] },
    { id: 'GA', x: 360, y: 70, l: ['GitHub Actions', 'ci.yml'] },
    { id: 'build', x: 530, y: 70, l: ['build', 'npm test + build'] },
    { id: 'wb', x: 700, y: 70, l: ['white-box', 'Semgrep + Trivy'] },
    { id: 'docker', x: 870, y: 70, l: ['docker job', 'build + push'] },
    { id: 'bs', x: 530, y: 200, l: ['bump-staging', '\u7121\u9700\u5be9\u6838'] },
    { id: 'ENV', x: 616, y: 187, w: 170, h: 70, shape: 'diamond', l: ['Environment', 'production \u00b7 Approve'] },
    { id: 'bp', x: 870, y: 200, l: ['bump-production'] },
    { id: 'release', x: 1040, y: 200, l: ['release', 'semantic-release'] },
    { id: 'ARGO', x: 360, y: 340, l: ['Argo CD'] },
    { id: 'NS1', x: 530, y: 340, l: ['notes-staging', 'namespace'] },
    { id: 'NS2', x: 700, y: 340, l: ['notes-production', 'namespace'] },
    { id: 'GHCR', x: 1210, y: 340, l: ['GHCR', 'ghcr.io/liaooliver/notes'] }
  ];
  var clusters = [
    { x: 512, y: 44, w: 332, h: 96, label: 'CI\uff08\u6cbf\u7528\u73fe\u6709\uff09' },
    { x: 512, y: 324, w: 332, h: 90, label: 'k3s cluster' }
  ];
  /* pts\uff1a\u5b8c\u6574\u6298\u7dda\uff1blabel \u4f4d\u7f6e\u7528 lx, ly */
  var edges = [
    { id: 'e1', pts: [[146, 92], [190, 92]], label: 'PR', lx: 168, ly: 84 },
    { id: 'e2', pts: [[316, 92], [360, 92]], label: 'push', lx: 338, ly: 84 },
    { id: 'e3', pts: [[486, 92], [530, 92]] },
    { id: 'e4', pts: [[656, 92], [700, 92]] },
    { id: 'e5', pts: [[826, 92], [870, 92]] },
    { id: 'e6', pts: [[996, 92], [1273, 92], [1273, 340]], label: 'sha-xxx / staging / main', lx: 1140, ly: 84 },
    { id: 'e7', pts: [[920, 114], [920, 150], [593, 150], [593, 200]], label: 'push staging', lx: 760, ly: 144 },
    { id: 'e8', pts: [[946, 114], [946, 168], [701, 168], [701, 187]], label: 'push main', lx: 820, ly: 182 },
    { id: 'e9', pts: [[786, 222], [870, 222]], label: 'approved', lx: 828, ly: 214 },
    { id: 'e10', pts: [[593, 244], [593, 290], [253, 290], [253, 114]], label: 'commit overlays/staging', lx: 430, ly: 284 },
    { id: 'e11', pts: [[933, 244], [933, 304], [240, 304], [240, 114]], label: 'commit overlays/production', lx: 640, ly: 316 },
    { id: 'e12', pts: [[996, 222], [1040, 222]] },
    { id: 'e13', pts: [[210, 114], [210, 362], [360, 362]], dashed: true, label: 'polling 3 min / webhook', lx: 214, ly: 340, anchor: 'start' },
    { id: 'e14', pts: [[486, 362], [530, 362]], label: 'sync', lx: 508, ly: 354 },
    { id: 'e15', pts: [[423, 384], [423, 436], [763, 436], [763, 384]], label: 'auto / manual sync', lx: 593, ly: 450 },
    { id: 'e16', pts: [[1273, 384], [1273, 466], [593, 466], [593, 384]], dashed: true, label: 'imagePullSecrets', lx: 940, ly: 480 },
    { id: 'e17', pts: [[1210, 362], [826, 362]], dashed: true, label: 'imagePullSecrets', lx: 1018, ly: 354 }
  ];
  var scenarios = [
    { id: 's1', label: 'merge \u9032 staging', steps: [
      { n: ['Dev', 'GH'], e: ['e1'], t: '\u958b\u767c\u8005 merge PR \u9032 staging\uff0cGitHub \u6536\u5230 push \u4e8b\u4ef6' },
      { n: ['GA'], e: ['e2'], t: 'ci.yml \u88ab push staging \u89f8\u767c\uff08llm-pr-assist \u53ea\u807d PR\uff0c\u4e0d\u89f8\u767c\uff09' },
      { n: ['build'], e: ['e3'], t: 'build\uff1anpm ci \u2192 npm test \u2192 npm run build\uff0c\u4e0a\u50b3 dist/ artifact' },
      { n: ['wb'], e: ['e4'], t: 'white-box\uff1aSemgrep + Trivy fs\uff0c\u6293\u5230 CRITICAL/HIGH \u76f4\u63a5\u7194\u65b7' },
      { n: ['docker'], e: ['e5'], t: 'docker job\uff1a\u4e0b\u8f09 dist/ artifact\uff0cdocker build\uff08\u4e0d\u91cd\u8dd1 npm build\uff09' },
      { n: ['GHCR'], e: ['e6'], t: 'push ghcr.io/liaooliver/notes:sha-xxx \u8207 :staging \u5230 GHCR' },
      { n: ['bs'], e: ['e7'], t: 'bump-staging\uff1a\u4e0d\u9700\u5be9\u6838\uff0ckustomize edit set image \u2192 sha-xxx' },
      { n: ['GH'], e: ['e10'], t: 'commit deploy/overlays/staging \u56de repo\uff1b[skip ci] + GITHUB_TOKEN\uff0c\u4e0d\u518d\u89f8\u767c workflow' },
      { n: ['ARGO'], e: ['e13'], t: 'Argo CD \u6bcf 3 \u5206\u9418 polling\uff0c\u767c\u73fe staging \u5206\u652f\u7684 manifest \u8b8a\u4e86 \u2192 OutOfSync' },
      { n: ['NS1'], e: ['e14'], t: 'notes-staging Application \u8a2d automated\uff1a\u81ea\u52d5 kubectl apply' },
      { n: ['NS1', 'GHCR'], e: ['e16'], t: 'k3s \u7528 imagePullSecrets \u5f9e GHCR \u62c9 sha-xxx\uff0crolling update \u63db\u65b0 pod' }
    ] },
    { id: 's2', label: 'merge staging \u2192 main + Approve', steps: [
      { n: ['Dev', 'GH'], e: ['e1'], t: '\u958b\u767c\u8005 merge PR staging \u2192 main\uff0cGitHub \u6536\u5230 push main \u4e8b\u4ef6' },
      { n: ['GA'], e: ['e2'], t: 'ci.yml \u88ab push main \u89f8\u767c\uff0c\u9019\u6b21 if \u689d\u4ef6\u5168\u90e8\u6210\u7acb' },
      { n: ['build'], e: ['e3'], t: 'build\uff1anpm ci \u2192 npm test \u2192 npm run build' },
      { n: ['wb'], e: ['e4'], t: 'white-box\uff1aSemgrep + Trivy fs' },
      { n: ['docker'], e: ['e5'], t: 'docker job\uff1adocker build' },
      { n: ['GHCR'], e: ['e6'], t: 'push :sha-xxx \u8207 :main \u5230 GHCR\uff08\u8ddf staging \u9a57\u904e\u7684\u662f\u540c\u4e00\u500b sha\uff09' },
      { n: ['ENV'], e: ['e8'], t: 'bump-production \u7d81 environment: production\uff0cpipeline \u5728\u9019\u88e1\u505c\u4f4f\u7b49\u4eba Approve' },
      { n: ['ENV'], e: [], t: 'Reviewer \u5728 GitHub \u6309 Review deployments \u2192 Approve and deploy' },
      { n: ['bp'], e: ['e9'], t: 'bump-production\uff1akustomize edit set image \u2192 \u540c\u4e00\u500b sha-xxx\uff0c\u4e0d\u91cd build' },
      { n: ['GH'], e: ['e11'], t: 'commit deploy/overlays/production \u56de main\uff08[skip ci]\uff1b\u6703\u649e branch protection\uff0c\u9700 bypass\uff09' },
      { n: ['release'], e: ['e12'], t: 'release\uff1asemantic-release \u7b97\u7248\u865f\u3001\u6253 tag notes-vX.Y.Z\u3001\u767c GitHub Release' },
      { n: ['ARGO'], e: ['e13'], t: 'Argo CD polling \u767c\u73fe main \u5206\u652f\u7684 overlays/production \u8b8a\u4e86' },
      { n: ['NS2'], e: ['e15'], t: 'notes-production\uff1aautomated sync\uff1b\u6216\u95dc\u6389 automated\uff0c\u4eba\u5728 Argo UI \u6309 Sync \u7576\u7b2c\u4e8c\u9053\u9598' },
      { n: ['NS2', 'GHCR'], e: ['e17'], t: '\u5f9e GHCR \u62c9 sha-xxx\uff0crolling update\uff0c\u65b0 pod Ready \u5f8c\u624d\u6bba\u820a pod' }
    ] },
    { id: 's3', label: 'production \u56de\u6efe', steps: [
      { n: ['Dev', 'GH'], e: ['e1'], t: 'git revert \u90a3\u500b\u300cchore(deploy): production \u2192 sha-\u65b0\u300dcommit\uff0c\u958b PR \u9032 main' },
      { n: ['GH'], e: [], t: 'PR \u904e required checks \u5f8c merge\uff1b\u53ea\u6709 deploy/ \u8b8a\u52d5\uff0c\u4e0d\u6703\u7522\u751f\u65b0 image' },
      { n: ['ARGO'], e: ['e13'], t: 'Argo CD \u5075\u6e2c\u5230 overlays/production \u7684 image tag \u8b8a\u56de\u820a\u503c \u2192 OutOfSync' },
      { n: ['NS2'], e: ['e15'], t: '\u81ea\u52d5 rolling update \u56de\u820a pod\uff1bselfHeal \u958b\u8457\u7684\u8a71\uff0c\u4e8b\u5f8c\u624b\u52d5\u6539\u56de\u65b0\u7248\u4e5f\u6703\u88ab\u58d3\u56de Git \u7684\u7248\u672c' },
      { n: ['NS2', 'GHCR'], e: ['e17'], t: '\u820a image \u9084\u5728 GHCR\uff0c\u4e0d\u9700\u8981\u91cd build\uff1b\u300cproduction \u8dd1\u54ea\u7248\u300d\u6c38\u9060\u7b49\u65bc Git \u88e1\u7684 kustomization.yaml' }
    ] }
  ];

  function mount(container) {
    var el = global.SeqViz.el, textW = global.SeqViz.textW;
    var width = 1350, height = 500;
    var svg = el('svg', { viewBox: '0 0 ' + width + ' ' + height, 'class': 'flow-svg', role: 'img' });
    clusters.forEach(function (c) {
      var g = el('g', { 'class': 'cluster' }, svg);
      el('rect', { x: c.x, y: c.y, width: c.w, height: c.h }, g);
      var t = el('text', { x: c.x + 8, y: c.y + 14 }, g); t.textContent = c.label;
    });
    var gE = el('g', { 'class': 'edges' }, svg), gN = el('g', { 'class': 'nodes' }, svg);
    edges.forEach(function (e) {
      var g = el('g', { 'class': 'edge' + (e.dashed ? ' dashed' : ''), 'data-id': e.id }, gE);
      var d = e.pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
      el('path', { d: d }, g);
      var n = e.pts.length, a = e.pts[n - 2], b = e.pts[n - 1];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      var s = 8, hw = 4.5;
      var pts = [b[0], b[1], b[0] - ux * s - uy * hw, b[1] - uy * s + ux * hw, b[0] - ux * s + uy * hw, b[1] - uy * s - ux * hw];
      el('polygon', { points: pts.join(' '), 'class': 'ah' }, g);
      if (e.label) { var t = el('text', { x: e.lx, y: e.ly, 'text-anchor': e.anchor || 'middle' }, g); t.textContent = e.label; }
    });
    nodes.forEach(function (nd) {
      var w = nd.w || W, h = nd.h || H, g = el('g', { 'class': 'node', 'data-id': nd.id }, gN);
      if (nd.shape === 'diamond') {
        var cx = nd.x + w / 2, cy = nd.y + h / 2;
        el('polygon', { points: [cx, nd.y, nd.x + w, cy, cx, nd.y + h, nd.x, cy].join(' ') }, g);
      } else {
        el('rect', { x: nd.x, y: nd.y, width: w, height: h }, g);
      }
      var cx2 = nd.x + w / 2, two = nd.l.length > 1;
      var t1 = el('text', { x: cx2, y: nd.y + h / 2 + (two ? -2 : 4.5), 'text-anchor': 'middle' }, g); t1.textContent = nd.l[0];
      if (two) { var t2 = el('text', { x: cx2, y: nd.y + h / 2 + 13, 'text-anchor': 'middle', 'class': 'sub' }, g); t2.textContent = nd.l[1]; }
    });

    var scn = document.createElement('div'); scn.className = 'viz-scn'; scn.setAttribute('role', 'group'); scn.setAttribute('aria-label', '\u60c5\u5883');
    var active = scenarios[0], st = null;
    scenarios.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = s.label; b.dataset.id = s.id;
      b.setAttribute('aria-pressed', String(s === active));
      b.addEventListener('click', function () { select(s); });
      scn.appendChild(b);
    });
    var ctlHolder = document.createElement('div');
    var wrap = document.createElement('div'); wrap.className = 'viz-svg'; wrap.appendChild(svg);
    container.appendChild(scn); container.appendChild(ctlHolder); container.appendChild(wrap);

    function paint(k) {
      var steps = active.steps, curN = {}, curE = {}, doneN = {}, doneE = {}, inN = {}, inE = {};
      steps.forEach(function (s, i) {
        s.n.forEach(function (id) { inN[id] = true; if (i < k) doneN[id] = true; if (i === k) curN[id] = true; });
        s.e.forEach(function (id) { inE[id] = true; if (i < k) doneE[id] = true; if (i === k) curE[id] = true; });
      });
      svg.querySelectorAll('.node').forEach(function (g) {
        var id = g.dataset.id;
        g.classList.toggle('cur', !!curN[id]);
        g.classList.toggle('done', !curN[id] && !!doneN[id]);
        g.classList.toggle('off', k >= 0 && !inN[id]);
      });
      svg.querySelectorAll('.edge').forEach(function (g) {
        var id = g.dataset.id;
        g.classList.toggle('cur', !!curE[id]);
        g.classList.toggle('done', !curE[id] && !!doneE[id]);
        g.classList.toggle('off', k >= 0 && !inE[id]);
      });
    }
    function select(s) {
      active = s;
      scn.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === s.id)); });
      if (st) st.stop();
      ctlHolder.innerHTML = '';
      st = global.SeqViz.stepper({
        count: s.steps.length,
        caption: function (k) { return s.steps[k].t; },
        onStep: paint,
        intro: '\u60c5\u5883\u300c' + s.label + '\u300d\uff1a\u6309\u300c\u4e0b\u4e00\u6b65\u300d\u6216\u300c\u64ad\u653e\u300d\u770b\u8a0a\u865f\u600e\u9ebc\u8d70',
        interval: 1600
      });
      ctlHolder.appendChild(st.box); ctlHolder.appendChild(st.cap);
      st.set(-1);
    }
    container.addEventListener('keydown', function (e) {
      if (!st) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); st.stop(); st.set(st.get() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); st.stop(); st.set(st.get() - 1); }
    });
    select(active);
  }
  global.FlowViz = { mount: mount };
})(window);
