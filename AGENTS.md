# AGENTS.md

给 AI Coding Agent / 新加入的工程师看的项目说明书。**动手前先读第 1 节和第 5 节**（第 5 节是唯一一个能把仓库改坏的坑）。

---

## 1. 这是什么项目

一个**纯静态**的开发者门户，用 GitHub Pages 托管，对外展示「cineCone 短剧网赚 App」的产品需求文档、产品原型和 API 文档。

- 没有任何构建系统：没有 `package.json`、没有 `npm install`、没有打包步骤
- 没有后端、没有数据库、没有登录
- `public/` 就是发布根目录，GitHub Actions 把它整包上传成 Pages 站点

业务背景（读代码时需要）：CineCoin 是一个面向**巴西市场**的短剧 App，用户看剧赚金币、金币按固定汇率换现金提现（PIX），广告（TopOn 聚合）是唯一变现路径。界面语言 **pt-BR（巴西葡语）**，原型内置简体中文词典可切换。

| 入口 | 路径 | 说明 |
|---|---|---|
| 门户首页 | `public/index.html` | 三张卡片：需求 / 原型 / 接口（按阅读链路排序） |
| 产品需求文档 | `public/PRD/index.html` | PRD v2.6.0，单文件全内联，约 331 KB，双击可读 |
| 产品原型 | `public/prototype/index.html` | 单文件高保真原型，约 690 KB，含接口快照 |
| 接口文档 | `public/api/index.html` | Scalar 渲染 `openapi.json` |

---

## 2. 目录地图

```text
├── public/                          # 唯一发布目录（Actions 上传的就是它）
│   ├── index.html                   # 门户首页（探测 ./prototype/index.html 是否存在）
│   ├── assets/styles.css            # 门户 + 文档页样式（浅色/深色跟随系统）
│   ├── PRD/
│   │   └── index.html               # 产品需求文档。目录名大写，Linux 上区分大小写
│   ├── prototype/
│   │   ├── index.html               # ★ 构建产物，不要手改（见第 5 节）
│   │   ├── src/                      # ★ 真正的源码，按数字前缀拼接
│   │   ├── data/snapshot.json       # 构建时抓取的真实接口返回
│   │   └── README.md                # 原型的完整变更史与设计口径（很长，但权威）
│   └── api/
│       ├── index.html               # Scalar 容器，CDN 固定 @scalar/api-reference@1.78.1
│       ├── openapi.json             # 机读合同（Bootstrap + Config，见第 8 节）
│       └── 10-统一接口文档-v1.0.md   # ★ 真正的接口基线 v1.2，46 path / 15 schema
├── .github/workflows/deploy.yml     # push 到 main → 部署 Pages
└── README.md                        # 部署与运维手册
```

---

## 3. 硬约束（改代码前必须遵守）

1. **链接一律用相对路径**。`./api/`、`./prototype/`，**不要**写 `/api/`。
   GitHub 项目站点会带 `/<repo>/` 前缀，绝对路径会 404。自定义域名下相对路径同样正确。
2. **不要引入构建链**。不加 npm / vite / webpack / postcss / TypeScript。这个仓库的价值之一就是「推上去就能用」。
3. **不要在 `public/` 之外新增发布资源**。Pages 只上传 `public/`。
4. **不要直接打开 `file://`**。浏览器的 CORS 与 fetch 会让原型探测、OpenAPI 加载、接口快照全部失效。本地预览必须起静态服务器。
5. **`.idea/` 已在 `.gitignore` 里**，不要提交 IDE 配置。
6. **两个文档不要互相污染**：`public/api/10-统一接口文档-v1.0.md` 是中文接口基线（人读），`openapi.json` 是机器合同（Scalar 读）。基线是**权威**，规范与它冲突时以基线为准并同步改规范。
7. **目录名大小写要照抄**：`public/PRD/` 是大写，首页链接必须写 `./PRD/`。GitHub Pages 跑在 Linux 上区分大小写，本地 macOS 不区分 —— 本地能开、线上 404 的坑就出在这。

---

## 4. 本地预览

```bash
cd public && python3 -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

截图/自动化时注意：原型的自测浮层和演示控制台会把页面撑宽，**headless 截图请用 900×1000 窗口**，否则设备右侧被裁。

---

## 5. ⚠️ 最关键的一条：`prototype/index.html` 是构建产物

原型的真实源码是 `src/` 下的分片，按**文件名数字前缀**拼接成一个 HTML：

| 分片 | 内容 |
|---|---|
| `00-head.html` | head / meta / theme-color |
| `10-tokens.css` ~ `17-verde.css` | 8 层样式，见下方层序说明 |
| `30-body.html` | 全部 DOM（含 SVG sprite、3 个剪影） |
| `35-data.js` | 数据层 `window.CCData`：接口规范化 / 快照兜底 / 实时刷新 |
| `40-app.js` | 交互逻辑 + 自测（约 250 KB / 5500 行，单文件） |
| `45-i18n.js` / `46-i18n-zh.js` | 语言运行时 + 中文词典（约 500 条） |
| `99-tail.html` | 收尾标签 |

**问题在于：拼接脚本 `build.py` 和抓快照的 `tools/snapshot.py` 不在本仓库里**（原型 README 第 5.5、7 节提到它们，但从未提交）。所以只有两条路：

- **A（默认）**：改 `src/` 分片，然后自己用脚本/命令重新拼接生成 `index.html`，并在提交前确认产物已更新
- **B（不推荐但要知情）**：只改 `index.html`，会让 `src/` 与产物不一致，下次任何人重新构建就丢改动

判断产物是否与源一致（`data-part` 标记能快速看出产物包含哪些分片）：

```bash
grep -oE 'data-part="[^"]+"' public/prototype/index.html
```

产物里每个 `<style data-part="...">` / `<script data-part="...">` 都对应一个源分片。**如果新增了分片文件，产物里没有对应标记，就是没重新构建。**

### CSS 层序（覆盖关系是刻意的）

`10 → 11 → 12 → 13 → 14 → 15 → 16 → 17`，后加载的覆盖前面的。`17-verde.css` 是**皮肤覆盖层**（约 560 行，绿色金色主题），`16-earn.css` 是任务中心/金币模块。想改视觉，**优先在 `17-verde.css` 里加覆盖**，别去改 `10-tokens.css` 的基础变量——那会波及所有页面。

`15-anim.css` 有一条已验证的经验写在文件头：选集 30 格**不要逐格 stagger**（每格独立合成层，低端机会残留半透明），要整块淡入。

---

## 6. 原型的领域约定（改交互时不能违反）

这些是产品反复拍板的硬口径，踩错了会被打回：

| 约定 | 值 / 规则 | 位置 |
|---|---|---|
| **金币唯一资产** | 界面只出现 `moedas`，现金**只在提现页**由金币换算出现 | `40-app.js` `paintBal()` 是所有余额 DOM 的唯一写入口 |
| **汇率** | `COIN_RATE = 10000`（10.000 moedas = R$ 1,00）；发布常量，不可远程改 | `40-app.js:296` |
| **提现四档** | 50.000 / 100.000 / 300.000 / 500.000 moedas = R$ 5 / 10 / 30 / 50 | `TIERS` |
| **state 唯一真值** | `state.coins` 是真值，`state.bal` 只是派生值（coins / 10000），二者永不各写一份 | `state` 对象 |
| **冻结金币风控** | 新人礼包金币进 `lockedCoins`，顶部照常显示但带锁角标；**完成首部剧才解冻**，提现一律走 `availCoins()` | 别用 `state.bal` 算可提金额 |
| **冷启余额 = 0** | 新用户初始金币只来自新人礼包；演示态用 `#seed` 注入 42.000 | 别改回默认 4,20 |
| **差额双口径** | 差 ≤20 集说集数（`faltam 8 eps`），>20 集说金额（`faltam R$ 0,80`） | `gapVal` / `gapText` |
| **提现 A/B** | `bucket = fnv1a(device_id + "|wd_page_v1") % 100`，同设备 30 天不换桶 | `applyWdPage` / `loadBucket` |
| **播放源三级回退** | 本剧该集 `exact` → 本剧任意集 `drama` → 全局首条 `demo` → `none`。**必须如实标出 kind**，不能让演示片段冒充原片 | `CCData.videoFor()` |
| **数字格式** | pt-BR：`R$ 1.234,56`；百分比/小数用逗号 | 所有金额 |
| **设计基准** | 360 × 800 dp（20:9），靠 `--zoom` 自适应缩放，**不是** iPhone 375×812 | `fit()` |
| **动效预算** | 入场 ≤400ms、位移 ≤14dp、只动 `transform / opacity / clip-path` | `15-anim.css` |

### 落盘键只有 4 个

`cc_unlocked_v1`（已解锁集）、`cc_device_id`、`cc_wd_bucket_v1`（A/B 桶）、`cc.lang`。
`#reset` 或 `?reset=1` 清空这 4 个键并重载成干净冷启，清理逻辑在 `40-app.js` 文件头 `WIPE_KEYS`。新增持久化字段时要同步加进这个数组。

### i18n 规则

任何新增的葡语文案都要在 `46-i18n-zh.js` 补词条：

- key 是**归一化形式**——所有数字段替换成 `{d}`（如 `'faltam {d} eps'`）
- value 的 `{d}` 个数必须和 key 一致，`45-i18n.js` 会校验
- 专名保留原词不进字典：`PIX` / `Sacar` / `Ganhar` / `GIRAR` / `BRINDE` / `CPF` / `LGPD` / 剧名 / 人名 / 银行名

漏翻译用 `#lang=zh&i18nreport` 打开，未命中清单会写进 `<head>` 的 `#cc-i18n-report`。

---

## 7. 验证方式（每次改完都要跑）

### 7.1 自测（交互回归）

```text
public/prototype/index.html#selftest
```

结果打在页面左上角和 `<title>`：`SELFTEST 274/274`。断言覆盖冷启链路、金币计币、领奖翻倍、转盘停盘角度、提现分桶、遮罩栈、冻结金币不可提等。

**规矩：断言总数只能增不能减。** 改了行为就补断言；删功能就同步删掉对应断言并在 README 变更史里写明。当前约 274 条。

### 7.2 调试参数（截图 / 复现单一场景）

URL hash 可叠加，如 `#nosplash&freeze&mask=Wheel`：

| 参数 | 作用 |
|---|---|
| `#nosplash` / `#freeze` | 跳过启动页 / 冻结计时（截图必用） |
| `#page=ganhar` | 直达 Tab（inicio / dramas / ganhar / historico / perfil） |
| `#mask=Wheel` | 直达弹层（Newbie / Claim / Wheel / Prize / Ad / Inter / Launcher / Uninstall …） |
| `#pg=invite` | 直达二级页（sac / invite / wd-status / pix-form） |
| `#seed` | 注入 42.000 moedas 演示余额（= R$ 4,20，首档 84%） |
| `#region=MX` | 切墨西哥区域（SPEI / MX$ 文案联动） |
| `#tf=a` / `#tf=b` | 强制提现页 A 面 / B 面 |
| `#skel=dramas` | 定格骨架屏 |
| `#annot` | 显示需求编号标注（BF-xx-xx / MZ-xx-xx） |
| `#lang=zh` | 切简体中文 |
| `#reset` | 清 4 个落盘键并冷启 |

完整清单见 `public/prototype/README.md` 第 3 节。参数解析在 `40-app.js` 的 `DBG` 对象（约 357 行）。

### 7.3 自动化钩子

```js
window.__CC__       // 完整 state（含 coins / pendingCoins / adLad / invites …）
window.__CCAPI__    // 约 60 个动作：openWheel / openClaim / playEpisode / plGo /
                    // renderTasks / availCoins / gapText / wheelGeom / wipeAll …
```

写 Playwright / CDP 脚本时优先用它们，不要去点 DOM 选择器。
另有 `window.CCHydrate()`：实时接口数据到达后整体重绘的入口。

### 7.4 门户与文档

- 首页：Product Prototype 卡片是否从 Coming Soon 变成可点（取决于 `fetch('./prototype/index.html')` 是否成功）
- 文档页：`/api/` 能渲染出侧边栏即正常（依赖 CDN，离线会显示 fallback 文案）

---

## 8. 已知不一致 / 待办

这些不是 bug 报告，是**知情状态**。改到相关区域时顺手处理或至少别扩大：

1. **`openapi.json` 正在从零重建，目前覆盖 2/46 个 path**（`POST /v1/app/bootstrap`、`GET /v1/config`）。真实基线在 `10-统一接口文档-v1.0.md`（46 path / 15 schema），按「Bootstrap → 登录 → 观看计币 → 广告奖励 → 钱包提现」顺序逐步补齐。补齐前对外分享必须说明覆盖范围。
   - 改动后用 `npx --yes @redocly/cli@latest lint public/api/openapi.json` 校验（仓库根有 `redocly.yaml`），要求 0 error 0 warning。
   - **别把 `openapi.json` 改回 YAML**：长段中文描述在 YAML 里缩进极易错位，这份文件现在由 Ruby 脚本从分片 YAML 合成后输出 JSON，手工维护请直接改 JSON。
   - **`servers[0].url` 是占位域名 `https://api.test.com`**：正式 API 域名尚未确定。不要把示例地址当真实环境去联调；域名定档后只改这一行，并在 `info.x-server-status` 同步状态。基线文档里的 `api.cinecoin.app` 同样只是示意，没有实际部署。
2. **`build.py` / `tools/snapshot.py` 缺失**（第 5 节）。想恢复可重复构建，需要按分片顺序重写一个拼接脚本，并加标签配平自检。
3. **PRD 只有 v2.6.0 这一份，且是单文件**：`public/PRD/index.html`（标题 `CineCoin 产品需求文档 v2.6.0 · 两大模块`）已入库，但基线文档引用的 `拆解/` 目录（策略平台 PRD、`openapi-v1.json`、PRD 的历史版本）**仍不在本仓库**。原型 README 里写「对应 PRD v2.6.0」，而正文引用的文件名仍是 `CineCoin-PRD-v2.4` —— 这是历史命名，不代表版本倒退。
4. **接口未开 CORS**：`api.salesmarto.com` 不返回 `Access-Control-Allow-Origin`，浏览器实时拉取会被拦，所以构建期快照是主路径，实时模式是"能成就更好"。别把实时拉取当依赖。
5. **`/home-feed` 只覆盖 12/101 部剧**，其余剧的集用同一段演示片段——这是接口能力边界，不是播放逻辑缺陷。
6. **口径漂移风险**：`README` 第 1 节提到 v1.6「金币唯一资产」与 PRD v2.4.12「单币种现金」正好相反，以**金币口径**为准（代码已实现）。

---

## 9. 提交前检查清单

```bash
# 1. 相对链接没写错
grep -rn 'href="/\|src="/' public/ --include=*.html

# 2. 改了 src/ 的话，产物已重新构建
grep -oE 'data-part="[^"]+"' public/prototype/index.html

# 3. 自测通过（浏览器打开，标题应为 SELFTEST x/x，无 FAIL）
open "http://127.0.0.1:8080/prototype/#selftest"

# 4. 首页与文档页仍可访问
open "http://127.0.0.1:8080/" && open "http://127.0.0.1:8080/api/"
```

- 改了原型行为 → 同步更新 `public/prototype/README.md` 的变更史（按 vX.Y 追加一条，写清"改了什么 + 为什么 + 自测多少条"）
- 改了部署/门户 → 同步更新根 `README.md`
- 部署：push 到 `main` 即触发 `.github/workflows/deploy.yml`；仓库 Pages Source 必须是 **GitHub Actions**，不是 "Deploy from a branch"

---

## 10. 一些能省时间的经验

- `40-app.js` 有 250 KB / 5500 行，靠**章节注释**导航（`/* ---- 转盘 ---- */` 这类横线分隔），别顺着读
- 原型的演示数据（`DEMO_DRAMAS`，12 部假剧）只在接口快照和实时数据都拿不到时才生效；日常几乎不会走到
- 首页 Feed 只渲染前 8 屏 `<video>`（`FEED_SLIDES`），不是 31 条全渲染——别"修"这个
- 广告演示时长 5s（`AD_TOTAL`），正式 30s；角标读同一常量，改时长只需改一处
- 想验证视觉改动，最省事的组合是 `#nosplash&freeze&seed&page=ganhar`——跳过所有冷启动画、余额有内容、直接落在最复杂的任务中心页
