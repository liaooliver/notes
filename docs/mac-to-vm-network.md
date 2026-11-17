# 從 Mac 的 curl 到 VM 的 192.168.252.6：一個請求的網路旅程

在 Mac 上執行 `curl http://lab.local/api/health`，到請求抵達 Multipass VM（k3s 所在的那台）的 80 port 為止，中間發生了什麼事。
進入 k8s 之後（Traefik → Service → Pod）的部分，見本文最後一節的銜接。

> **本文的實機數值**
>
> | 項目 | 值 | 怎麼查到的 |
> | --- | --- | --- |
> | Mac 主機名稱 | `liaoyanjundeMacBook-Air.local` | `hostname` |
> | VM（k8s node）IP | `192.168.252.6` | `kubectl config view --minify \| grep server` → `https://192.168.252.6:6443` |
> | Ingress ADDRESS | `192.168.252.6` | `kubectl get ingress -n notes-staging` |
>
> `bridge100`、`192.168.252.1`、`enp0s1`、MAC 位址這幾個是**示意值**，實際名稱以第 3 節各步驟的檢查指令輸出為準。

---

## 1. 一句話版本

**整個過程不經過 Wi-Fi，也不經過家裡的路由器。** 封包從頭到尾都在 MacBook 內部，透過 Multipass 用軟體做出來的虛擬網路，送到 VM 的虛擬網卡。

---

## 2. 全貌

```
+- MacBook Air (your terminal) ----------------------------------+
| curl http://lab.local/api/health                               |
|   |                                                            |
|   | (1) parse URL : http / lab.local / :80 / /api/health       |
|   | (2) /etc/hosts: lab.local -> 192.168.252.6                 |
|   | (3) route     : 192.168.252.0/24 -> bridge100              |
|   | (4) ARP       : 192.168.252.6 -> 52:54:00:xx:xx:xx         |
|   v                                                            |
| +----------------------------+    +----------------+           |
| | bridge100  192.168.252.1   |    | en0 (Wi-Fi)    |           |
| | (virtual switch, vmnet)    |    | NOT used       |           |
| +----------------------------+    +----------------+           |
|              | (5)                                             |
| +------------v-------------+                                   |
| | Hypervisor (QEMU)        |                                   |
| +------------+-------------+                                   |
+--------------|-------------------------------------------------+
               | (6) frame delivered to VM's virtual NIC
               v
+- Multipass VM "k3s" = k8s node --------------------------------+
| NIC enp0s1  192.168.252.6                                      |
|   |                                                            |
|   | (7) Linux: dst is me, port 80                              |
|   |     -> k3s svclb -> Traefik   ==> enters k8s               |
+----------------------------------------------------------------+
```

時間順序（誰在什麼時候對誰說話）：

```
   curl           macOS         VM kernel        Traefik
    |               |               |               |
    |-------------->|               |               |   (2) lab.local 的 IP 是？
    |<--------------|               |               |       -> 192.168.252.6
    |               |               |               |
    |-------------->|               |               |   (3) 連 192.168.252.6:80
    |               |-------------->|               |   (4) ARP: 誰是 .6？
    |               |<--------------|               |       -> 52:54:00:..
    |               |               |               |
    |---------------------------------------------->|   TCP SYN      (5)(6)(7)
    |<----------------------------------------------|   TCP SYN-ACK
    |---------------------------------------------->|   TCP ACK  => 連線建立
    |               |               |               |
    |---------------------------------------------->|   GET /api/health
    |               |               |               |   Host: lab.local
    |<----------------------------------------------|   200 {"status":"ok"}
```

穿過 macOS 和 VM kernel 的長箭頭代表封包只是「路過」，實際路徑是 `bridge100 → QEMU → VM 網卡 → 轉送規則 → Traefik`。

---

## 3. 逐步拆解

### (1) curl 拆解網址

| 部分 | 值 | 說明 |
| --- | --- | --- |
| 協定 | `http` | 所以預設用 80 port（https 是 443） |
| 主機 | `lab.local` | 要連到誰；這時還只是名字，不是 IP |
| 路徑 | `/api/health` | 連線建立後才會用到 |

### (2) 名字轉 IP：查 `/etc/hosts`

網路只認得 IP，所以 curl 先請 macOS 把 `lab.local` 翻譯成 IP。macOS 會先查本機的 `/etc/hosts`，找不到才問 DNS 伺服器。`lab.local` 是自己取的名字，網路上沒有任何 DNS 知道它，所以要在 `/etc/hosts` 手寫一筆：

```
192.168.252.6 lab.local
```

```bash
dscacheutil -q host -a name lab.local
# ip_address: 192.168.252.6
```

不改 `/etc/hosts` 也能測：直接打 IP，手動帶 Host 標頭，就跳過這一步。

```bash
curl -H "Host: lab.local" http://192.168.252.6/api/health
```

> **`.local` 的坑**：macOS 用 `.local` 做 Bonjour（mDNS，AirDrop、印表機搜尋都靠它）。查 `.local` 名字時偶爾會先等 Bonjour 逾時，造成約 5 秒延遲。改用 `.test` 這種保留給測試的網域可以避開。

### (3) 查路由表：這個 IP 要從哪張網卡送出去

知道目的地是 `192.168.252.6` 之後，Mac 的系統核心查**路由表**決定走哪個網路介面：

| 目的地 | 走哪個介面 |
| --- | --- |
| `192.168.252.x` | `bridge100`（Multipass 建的虛擬介面） |
| 家用網段，例如 `192.168.1.x` | `en0`（Wi-Fi） |
| 其他所有地方 | 預設路由：`en0` → 路由器 → 網際網路 |

`bridge100` 是 Multipass 啟動 VM 時，透過 macOS 的虛擬網路功能（vmnet）在 Mac 上建立的。可以把它想成**一台用軟體做出來的交換器**，一邊插著 Mac，一邊插著 VM。Mac 在這台交換器上也有自己的 IP，通常是同網段的 `.1`。

```bash
route -n get 192.168.252.6
# interface: bridge100      ← 走虛擬介面，不是 en0

ifconfig bridge100
# inet 192.168.252.1 ...    ← Mac 在這個虛擬網路上的 IP
```

介面名稱可能是 `bridge100` 或 `bridge101`，以 `route -n get` 的輸出為準。

### (4) ARP：192.168.252.6 是哪張網卡

在同一個網段裡，封包實際是用**網卡的 MAC 位址**投遞的，不是 IP。Mac 在 `bridge100` 上廣播：「誰是 `192.168.252.6`？」VM 的網卡回答自己的 MAC 位址，Mac 把答案快取起來，下次不必再問。

```bash
arp -n 192.168.252.6
# ? (192.168.252.6) at 52:54:0:xx:xx:xx on bridge100
```

### (5)(6) 經過虛擬交換器，交給 VM

Mac 把封包放上 `bridge100`。負責執行 VM 的 **Hypervisor**（Multipass 在 Mac 上通常用 QEMU）接手，轉交給 VM 的**虛擬網卡**。從 VM 的角度看，就是自己的網卡收到了一個封包，它不知道自己是虛擬機。

```bash
multipass info k3s                       # IPv4 那一欄是 192.168.252.6
multipass exec k3s -- ip addr            # 某張網卡（例如 enp0s1）是 192.168.252.6
```

### (7) VM 的 Linux 收下，交給 80 port 上的 Traefik

Linux 看到目的地是自己的 IP、80 port，就把連線交給在那個 port 等著的程式。在 k3s 裡，那是 `kube-system` 裡的 **Traefik**：k3s 內建的 ServiceLB（svclb）把 Traefik 掛在 node IP 的 80 / 443 上。這也是 `kubectl get ingress` 的 ADDRESS 欄位會顯示 VM IP 的原因。

```bash
kubectl get svc traefik -n kube-system
# EXTERNAL-IP 192.168.252.6，PORT(S) 有 80
```

從這裡開始，請求就進入 k8s 了。

### (8) 先 TCP 三向交握，再送 HTTP

上面 (3)～(7) 其實都發生在 TCP 連線的**第一個封包（SYN）**身上。HTTP 內容要等連線建立後才出發：

```
Mac  -- SYN ------------>  VM:80    「我想連線」
Mac  <-------- SYN-ACK --  VM:80    「好，我在」
Mac  -- ACK ------------>  VM:80    「收到」
Mac  -- GET /api/health, Host: lab.local -->   ← 這時 HTTP 才出發
```

`curl -v` 可以看到這個順序：

```bash
curl -v http://lab.local/api/health
# *   Trying 192.168.252.6:80...                        ← (2) 查到 IP
# * Connected to lab.local (192.168.252.6) port 80      ← (3)~(8) TCP 連上
# > GET /api/health HTTP/1.1                            ← 送出 HTTP 請求
# > Host: lab.local                                     ← Traefik 要看的就是這行
# < HTTP/1.1 200 OK
# {"status":"ok"}
```

---

## 4. 同一個 IP，兩個不同的門

| 誰在用 | 位址 | 誰在聽 | 做什麼 |
| --- | --- | --- | --- |
| kubectl | `192.168.252.6:6443` | k3s API server | 管理叢集：建立、查詢、刪除資源 |
| 瀏覽器 / curl | `192.168.252.6:80` | Traefik | 使用服務：HTTP 請求照 Ingress 規則轉到 pod |

單節點 k3s 把所有東西放在同一台 VM，所以只差 port。

**`192.168.252.6:3000` 沒有人在聽。** 3000 是 pod 自己 IP（`10.42.x.x`）上的 port，不在 VM 的 IP 上。每個 pod 都有自己的 IP，所以 `lab` 和 `notes-staging` 的 api 都用 3000 也不會衝突。

```bash
curl http://192.168.252.6:3000/api/health   # Connection refused
```

---

## 5. 為什麼只有這台 Mac 連得到？VM 又怎麼上網？

```
  [ phone / other PC on Wi-Fi ]
               |
               X  cannot reach 192.168.252.6
               |
  +------------|---------------------------------------------------+
  | MacBook    v                                                   |
  |   en0 (Wi-Fi) 192.168.1.x <--- only this faces your home LAN   |
  |       ^                                                        |
  |       | NAT (Mac forwards VM's traffic as itself)              |
  |       |                                                        |
  |   bridge100 192.168.252.1  <--- private, exists only in Mac    |
  |       ^                                                        |
  +-------|--------------------------------------------------------+
          |
     VM 192.168.252.6  --(pull image)--> bridge100 --> Mac NAT
                                         --> en0 --> router --> ghcr.io
```

- `bridge100` 只存在這台 Mac 裡，家裡網路上的其他裝置看不到它。
- VM 要上網（例如從 GHCR 拉 image）時，由 Mac 代為轉送出去（**NAT**），就像家裡路由器讓多台裝置共用一個對外 IP。
- 圖中 `en0` 的 `192.168.1.x` 只是示意。

---

## 6. 連不上時，從上往下逐步檢查

```
 step  where        check command                                  expect
 ----  -----------  ---------------------------------------------  ---------------------
 (2)   Mac          dscacheutil -q host -a name lab.local          192.168.252.6
 (3)   Mac          route -n get 192.168.252.6                     interface: bridge100
 (4)   Mac          arp -n 192.168.252.6                           52:54:0:.. on bridge100
 (6)   Mac -> VM    multipass info k3s                             IPv4 192.168.252.6
 (7)   VM :80       kubectl get svc traefik -n kube-system         EXTERNAL-IP .252.6, 80
 all   end to end   curl -v http://lab.local/api/health            200 {"status":"ok"}
```

哪一步結果不符合 expect，問題就出在那一步。常見的幾種：

| 症狀 | 多半是哪一步 | 原因 |
| --- | --- | --- |
| `Could not resolve host: lab.local` | (2) | `/etc/hosts` 沒寫或寫錯 |
| 卡很久才 timeout | (3)(4)(6) | VM 沒開（`multipass list` 看 State），或 IP 變了 |
| `Connection refused` | (7) | 打到 VM 了，但 80 port 沒人聽：Traefik 沒起來，或 port 打錯 |
| 回 404 | 已進 k8s | Traefik 收到了，但沒有符合的 Ingress 規則（Host 或路徑對不上） |
| 回 502 / 503 | 已進 k8s | Ingress 對上了，但 Service 後面沒有就緒的 pod |

> **VM 的 IP 會變。** [`gitops-roadmap.md`](./gitops-roadmap.md) Phase 6 當時記錄的 IP 是 `192.168.64.5`，現在實機是 `192.168.252.6`。VM 重建或某些情況下重開後 IP 可能改變，`/etc/hosts` 的舊紀錄就會讓請求卡在 (3)～(6) 直到 timeout。遇到「昨天還好好的」先跑一次 `multipass info k3s` 對 IP。

---

## 7. 銜接：進入 k8s 之後

請求在 (7) 交給 Traefik 之後的路徑：

```
Traefik (ns: kube-system)
   |  看 Ingress 規則：Host = lab.local？路徑以 /api 開頭？
   v
Service "api" (ns: lab)
   |  selector app=api，只挑 readiness 通過的 pod（Endpoints）
   v
Pod  10.42.0.x:3000
   |  Express: GET /api/health -> {"status":"ok"}
```

| 步驟 | 檢查指令 | 預期 |
| --- | --- | --- |
| Ingress 規則 | `kubectl describe ingress api -n lab` | `/api  api:3000 (10.42.0.x:3000, ...)` |
| Service 找到的 pod | `kubectl get endpoints api -n lab` | 有 IP:3000，空的代表 selector 沒對上或 pod 沒就緒 |
| Pod 本身 | `kubectl logs -n lab <pod>` | 沒有錯誤 |

注意 Ingress **不會**刪掉路徑前面的 `/api`，Express 收到的仍是完整的 `/api/health`，所以 `api/server.js` 的路由都以 `/api` 開頭。

---

*最後更新：2026-10-02*
