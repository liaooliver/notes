// 把 snippets 資料注入頁面：每個 <article class="case"> 裡的 .seq 右側加一個 <aside class="code-panel">
// 用法：node build-snippets.mjs <page.html> <snippets.mjs>   （可重複執行，會先移除舊的 aside）
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const PAGE = process.argv[2] || 'index.html';
const snippets = (await import(pathToFileURL(resolve(process.argv[3] || './snippets.mjs')).href)).default;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderCode(code) {
  return code.replace(/^\n/, '').split('\n').map((ln) => {
    const hl = ln.startsWith('>>');
    const body = esc(hl ? ln.slice(2) : ln);
    return hl ? `<span class="hl">${body}</span>` : `<span>${body}</span>`;
  }).join('\n');
}
function renderAside(list) {
  const items = list.map((s) => `
        <div class="snip" data-steps="${s.steps.join(' ')}" tabindex="0">
          <div class="snip-file">${esc(s.file)}</div>
          <pre><code>${renderCode(s.code)}</code></pre>
          <p class="snip-why">${esc(s.why)}</p>
        </div>`).join('');
  return `<aside class="code-panel" aria-label="對照程式碼"><div class="snip-head">對照程式碼</div>${items}\n      </aside>`;
}

let html = readFileSync(PAGE, 'utf8');
// 先移除舊的 aside / viz-row（可重複執行）
html = html.replace(/<div class="viz-row">/g, '').replace(/<aside class="code-panel"[\s\S]*?<\/aside>\n?\s*<\/div>/g, '</div>');
html = html.replace(/<div class="diagram-label">時序圖[^<]*<\/div>/g, '<div class="diagram-label">時序圖</div>');

let count = 0;
html = html.replace(/<article class="case" id="(uc-\d\d)"[\s\S]*?<\/article>/g, (article, id) => {
  const list = snippets[id];
  if (!list) return article;
  count++;
  return article
    .replace('<div class="diagram-label">時序圖</div>\n<div class="seq">', '<div class="diagram-label">時序圖 · 右側為對照程式碼，會跟著步驟點亮</div>\n<div class="viz-row"><div class="seq">')
    .replace(/<\/script><\/div><\/div>\n\s*<\/article>$/, `</script></div>\n      ${renderAside(list)}</div></div>\n      </article>`);
});
writeFileSync(PAGE, html);
console.log('injected', count, 'panels;', (html.match(/class="snip"/g) || []).length, 'snippets');
