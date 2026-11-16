# Developer Portal

面向第三方的静态开发者门户。用 GitHub Pages 展示产品需求文档、产品原型和 API 文档，不需要后端、数据库、登录或构建步骤。

首页提供三个入口：

- **Product Requirements**：产品需求文档（PRD v2.6.0）。单文件 HTML，双击可读，无外部依赖。
- **Product Prototype**：产品原型。目录里还没有页面时，首页显示 Coming Soon，入口不可点击。
- **API Documentation**：由 [Scalar](https://github.com/scalar/scalar) 渲染的 OpenAPI 3.1 文档，包含参数、响应、认证、错误码，以及 Scalar 自带的请求调试。

卡片顺序按阅读链路排：需求 → 原型 → 接口。

页面使用相对链接。同一套文件可以放在 GitHub 项目站点（`https://<user>.github.io/<repo>/`）或自定义域名的根路径下。

## 目录结构

```text
├── public/                      # GitHub Pages 发布目录
│   ├── index.html               # 门户首页
│   ├── assets/styles.css
│   ├── PRD/
│   │   └── index.html           # 产品需求文档 v2.6.0（单文件，全内联）
│   ├── prototype/               # 产品原型（构建产物 + 源分片）
│   │   ├── index.html
│   │   ├── src/
│   │   └── data/snapshot.json
│   └── api/
│       ├── index.html           # Scalar API 文档
│       ├── openapi.json         # OpenAPI 3.1 机器合同（Scalar 读的就是它）
│       └── 10-统一接口文档-v1.0.md  # 接口基线（人读，权威）
├── .github/workflows/deploy.yml # 推送到 main 时部署
├── redocly.yaml                 # OpenAPI 校验配置
├── Bootstrap-接口契约说明.md     # Bootstrap 契约 + 冲突与待确认清单
├── AGENTS.md                    # 项目地图与硬约束（给 AI / 新人读）
└── README.md
```

部署后的站点路径：

```text
/              Developer Portal
/PRD/          产品需求文档
/prototype/    产品原型
/api/          Scalar API 文档
```

上面是站点根目录下的相对结构。项目 Pages 会自动带上 `/<repo>/` 前缀，页面里的链接不用改。

## 启用 GitHub Pages

工作流在仓库根目录的 `.github/workflows/deploy.yml`。GitHub 只会读取这个位置。

**前置条件**：GitHub Pages 必须先在仓库上启用，否则 `actions/configure-pages` 会在 `Setup Pages` 一步直接失败，报错：

```text
Get Pages site failed. Please verify that the repository has Pages enabled
and configured to build using GitHub Actions.
Error: Not Found - /rest/pages/pages#get-a-apiname-pages-site
```

这个 404 不是 workflow 写错，而是 Pages 根本没启用。启用后 `Upload artifact` 与 `Deploy` 才会执行。

1. 把仓库推送到 GitHub 的 `main` 分支。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment** 里，把 **Source** 选为 **GitHub Actions**。不要选 “Deploy from a branch”。
4. 打开 **Actions**，确认 “Deploy GitHub Pages” 成功。也可以用 **Run workflow** 手动部署一次。
5. 部署完成后，Pages 设置页会显示站点地址。

也可以用 API 启用，等价于上面第 2、3 步：

```bash
gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow
```

公开仓库可以免费使用 GitHub Pages。**私有仓库的 Pages 需要 GitHub Pro / Team / Enterprise**：在免费账号的私有仓库上调用启用接口会返回
`422 Your current plan does not support GitHub Pages for this repository`。这种情况下要么把仓库改为 public，要么升级方案。

## 本地预览

在 `public/` 下启动任意静态服务器：

```bash
cd public
python3 -m http.server 8080
```

打开 `http://127.0.0.1:8080/`。不要直接双击 HTML 文件：浏览器会用 `file://` 打开，原型探测和 OpenAPI 加载都会失败。

## 修改首页

编辑这两个文件：

- `public/index.html`：文案和入口
- `public/assets/styles.css`：视觉样式

首页默认是浅色，并跟随系统的深色模式，没有单独的主题开关。

GitHub 链接默认隐藏。要显示它，给首页的 `#github-link` 填写 `data-url`：

```html
<a id="github-link" class="github-link" data-url="https://github.com/org/developer-portal" ...>
```

链接请继续使用相对路径，例如 `./api/`、`./prototype/`。不要写成 `/api/`，否则项目 Pages 的 `/<repo>/` 前缀会失效。

## 更新 OpenAPI

编辑 `public/api/openapi.json`。`public/api/index.html` 会按当前页面地址加载同目录的这个文件，项目 Pages 和自定义域名都不需要改路径。

规范用 **JSON** 而不是 YAML：这份合同由脚本生成与校验，JSON 不怕缩进和制表符——YAML 在长段中文描述里踩过一次缩进错位。

当前只有一个接口：

| 接口 | 作用 | 文档 |
|---|---|---|
| `POST /v1/app/bootstrap` | App 冷启初始化：身份 + 会话 + 三段配置 + 启动弹窗 | [Bootstrap-接口契约说明.md](./Bootstrap-接口契约说明.md) |

它是**冷启与配置下发的唯一入口**。原先的 `GET /v1/config` 已从规范中移除——区域、运行时、弹窗三块配置都由 Bootstrap 的 `config` 段下发，靠 `config_versions` 做版本比对。接口基线 `10-统一接口文档-v1.0.md` 里仍留着 §4.1 的旧定义，读基线时以本规范为准。

其余分组（登录、观看计币、广告奖励、钱包提现）尚未写入规范，以 `10-统一接口文档-v1.0.md` 为准。

改完必须校验，要求 **0 error 0 warning**：

```bash
npx --yes @redocly/cli@latest lint public/api/openapi.json
```

`servers[0].url` 是**占位域名**（`https://api.test.com`），正式域名未定，不要拿去联调。

把真实规范写进这个文件后再分享给第三方。Scalar 会展示规范里的参数、响应模型、认证方式和错误码，并用页面上的客户端发送调试请求。跨域请求走 Scalar 的代理 `https://proxy.scalar.com`。

文档页通过 CDN 固定加载 `@scalar/api-reference@1.78.1`。升级时改 `public/api/index.html` 里的脚本地址即可。

## 添加产品原型

1. 新增 `public/prototype/index.html`，以及原型需要的样式和脚本。
2. 原型内部继续使用相对链接，以便兼容 `/<repo>/prototype/`。
3. 提交并推送到 `main`。

首页会请求 `./prototype/index.html`。文件返回成功后，Product Prototype 卡片变成可点击链接，并去掉 Coming Soon。文件不存在时，卡片不是链接，不会跳转。`.gitkeep` 只为了让 Git 跟踪空目录，不会被当成原型页面。

## 更新 PRD

需求文档是一份自包含的单文件 HTML：`public/PRD/index.html`（v2.6.0，约 331 KB，样式与内容全部内联，无 CDN、无图片外链）。

换版本时直接覆盖这个文件即可，不需要改首页。注意三点：

1. **保持 `public/PRD/` 这个大小写**。首页链接是 `./PRD/`，GitHub Pages 跑在 Linux 上区分大小写，改成 `prd/` 会 404。
2. **不要引入外部资源**。一旦引用 CDN 字体或外链图片，离线打开和弱网下的可读性都会退化；现在双击文件就能读全文。
3. **版本号写进首页卡片文案**。卡片描述里带 `(v2.6.0)`，升级 PRD 时同步改 `public/index.html` 里那一行，否则首页显示旧版本。

## 绑定自定义域名

1. 购买域名并准备 DNS。
2. 在 **Settings → Pages → Custom domain** 填入域名。
3. 按 [GitHub 自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) 添加 DNS：
   - 子域名：CNAME 到 `<user>.github.io`
   - 根域名：按文档中的 A 记录和 AAAA 记录配置
4. 等待 DNS 生效后，在 Pages 设置里开启 **Enforce HTTPS**。
5. 可选：在 `public/CNAME` 中写入域名并提交。这样每次 Actions 部署都会带上域名，避免设置被覆盖。

自定义域名从站点根路径提供页面。现有相对链接不用修改。

## 通过 Git Push 部署

`.github/workflows/deploy.yml` 会在下面两种情况运行：

- 向 `main` 推送
- 在 Actions 页面手动触发

工作流使用 GitHub 官方的 Pages Actions，把 `public/` 作为发布目录上传。没有 `npm install`，也没有构建命令。

一次成功的部署会发布：

```text
public/index.html          → /
public/PRD/index.html      → /PRD/
public/prototype/          → /prototype/
public/api/index.html      → /api/
public/api/openapi.json    → /api/openapi.json
```
