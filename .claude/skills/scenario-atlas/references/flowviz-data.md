# flowviz.js 的資料格式

`assets/flowviz.js` 開頭三個陣列是唯一要改的地方，其餘是渲染與播放邏輯。畫布固定 viewBox `1350 × 500`，
超出時在 `mount()` 裡改 `width / height`。

## nodes

```js
{ id: 'GH', x: 190, y: 70, l: ['GitHub', 'liaooliver/notes'] }          // 矩形，預設 126×44
{ id: 'ENV', x: 616, y: 187, w: 170, h: 70, shape: 'diamond', l: ['Environment', 'production · Approve'] }
```

- `l` 一到兩行：第一行主標，第二行小字。
- 用三列（y = 70 / 200 / 340）排：第一列主流程、第二列閘門與分支、第三列部署端；同列節點 x 間隔 170。
- `clusters` 陣列畫虛線群組框：`{ x, y, w, h, label }`。

## edges

```js
{ id: 'e7', pts: [[920, 114], [920, 150], [593, 150], [593, 200]], label: 'push staging', lx: 760, ly: 144 }
{ id: 'e13', pts: [[210, 114], [210, 362], [360, 362]], dashed: true, label: 'polling', lx: 214, ly: 340, anchor: 'start' }
```

- `pts` 是完整折線，第一點在來源節點邊上、最後一點在目標節點邊上，箭頭自動畫在最後一段方向。
  節點邊界：左 `x`、右 `x+w`、上 `y`、下 `y+h`，中心 `x+w/2`。
- 同一節點底邊出去兩條邊時，起點 x 錯開 26px（例如 920 與 946），避免重疊。
- 回頭邊（往左上）走節點下方一條水平線，兩條回頭邊的水平線相差 14px。
- `label` 位置手動給 `lx, ly`；`anchor: 'start'` 讓文字靠左對齊。

## scenarios

```js
{ id: 's1', label: 'merge 進 staging', steps: [
  { n: ['Dev', 'GH'], e: ['e1'], t: '開發者 merge PR 進 staging，GitHub 收到 push 事件' },
  { n: ['ENV'],       e: [],     t: 'Reviewer 在 GitHub 按 Approve' },   // 沒有邊也可以，只點亮節點
] }
```

- 每個情境一個按鈕；步驟依序點亮 `n` 裡的節點與 `e` 裡的邊，走過的保留亮色描邊，不在該情境裡的節點與邊壓淡。
- `t` 是說明列文字，寫成「誰做了什麼、系統怎麼反應」一句話，20 到 40 字。
- 三到四個情境剛好：主要路徑、需要人工閘的路徑、回滾或失敗路徑。

## 頁面接線

```html
<div class="diagram"><div class="diagram-label">flowchart</div>
<div class="flow-viz" id="arch" tabindex="0"></div></div>
…
<script src="seqviz.js"></script>
<script src="flowviz.js"></script>
<script>
  SeqViz.mountAll('.seq');
  FlowViz.mount(document.getElementById('arch'));
</script>
```

`flowviz.js` 依賴 `SeqViz.stepper` 與 `SeqViz.el`，所以 `seqviz.js` 要先載入。
