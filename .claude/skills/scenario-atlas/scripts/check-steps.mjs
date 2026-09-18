#!/usr/bin/env node
// 用法：
//   node check-steps.mjs <page.html>          檢查每個 snippet 的 data-steps 是否在該圖步數範圍內
//   node check-steps.mjs <page.html> --list   另外印出每張圖的步驟索引與文字，方便填 snippets.mjs 的 steps
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = process.argv[2];
const list = process.argv.includes('--list');
if (!page) { console.error('usage: check-steps.mjs <page.html> [--list]'); process.exit(2); }

// seqviz.js 是瀏覽器腳本：用最小的 window/document 樁讓 parse/layout 能在 Node 跑
globalThis.window = {};
globalThis.document = { createElementNS() { return { setAttribute() {}, appendChild() {} }; } };
createRequire(import.meta.url)(resolve(here, '../assets/seqviz.js'));
const S = globalThis.window.SeqViz;

const html = readFileSync(page, 'utf8');
const articles = [...html.matchAll(/<article class="case" id="(uc-\d+)"[\s\S]*?<\/article>/g)];
let bad = 0;
for (const [article, id] of articles) {
  const src = article.match(/<script[^>]*type="text\/plain"[^>]*>\n?([\s\S]*?)<\/script>/i);
  if (!src) { console.log(`${id}: no sequence diagram`); continue; }
  const model = S.parse(src[1]);
  const L = S.layout(model);
  const rows = L.rows.filter((r) => r.t !== 'block');
  // trim + /\s+/：data-steps="3 4 " 用 split(' ') 會切出空字串，Number('') 是 0，會憑空多一個步驟 0
  const steps = [...article.matchAll(/data-steps="([^"]+)"/g)].flatMap((m) => m[1].trim().split(/\s+/).map(Number));
  const out = steps.filter((s) => !(s >= 0 && s < rows.length));
  const snips = (article.match(/class="snip"/g) || []).length;
  console.log(`${id}: ${rows.length} steps, ${snips} snippets ${out.length ? 'OUT OF RANGE ' + out.join(',') : 'ok'}`);
  if (out.length) bad++;
  if (list) {
    rows.forEach((r, i) => {
      const by = model.byId;
      const t = r.t === 'note'
        ? `Note ${r.s.ids.map((x) => by[x].label).join(',')}: ${r.s.text}`
        : `${by[r.s.from].label} -> ${by[r.s.to].label}: ${r.s.text}`;
      console.log(`   [${i}] ${t.replace(/\u2028/g, ' ')}`);
    });
  }
}
if (!articles.length) { console.error('no <article class="case" id="uc-NN"> found'); process.exit(2); }
process.exit(bad ? 1 : 0);
