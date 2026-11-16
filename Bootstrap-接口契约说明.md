# Bootstrap 接口契约说明

> ⚠️ **本文档描述的是历史版本（零信封，对应 `openapi.json` v0.3.0）。**
> 规范已升级为 `CineCoin Unified API v1.5.0`（68 path），成功响应改为统一信封
> `{code:0, message, data, request_id}`，错误体统一 `message_pt`。
> **下文 §3–§7 里的响应结构与示例已过时**，只保留业务规则、冲突清单与决策记录的价值；
> 字段与结构一律以 `public/api/openapi.json` 为准。

- 版本：v0.2（2026-11-16）
- 编写时对应的规范：`public/api/openapi.json` v0.3.0（OpenAPI 3.1.0，仅含本接口）
- 参考基线（**只读，不修改**）：`public/api/10-统一接口文档-v1.0.md`（v1.2）、`public/PRD/index.html`（PRD v2.6.0）
- 唯一可写的接口合同：`public/api/openapi.json`
- 范围：只讨论 `POST /v1/app/bootstrap`。

---

## 1. 一句话定位

App 冷启的**唯一入口**：一次请求拿到「我是谁 / 我的凭证 / 这个国家怎么玩 / 运营参数是什么 / 弹窗规则是什么 / 这次启动该弹什么」。

不是匿名登录接口的改名版。差异在于三点：

| | `POST /v1/auth/anonymous`（旧） | `POST /v1/app/bootstrap`（本契约） |
|---|---|---|
| 返回 | 只有身份 + token | 身份 + 会话 + 三段配置 + 启动弹窗 |
| `device_id` | 客户端自报 | **服务端签发** |
| 新人礼包 | 无 | 建号事务内入账并冻结，随 `startup.popups` 下发展示数据 |
| 幂等 | 按 `device_id` 去重 | 按 `Idempotency-Key` 去重（24h） |

冷启的往返次数从 7 次（anonymous + me + region-config + config + popup-set + withdraw-page + popup decision）降到 1 次。

> **v0.2 变更（2026-11-16）**：产品决定取消独立的配置接口。`GET /v1/config` 已从规范删除，`GET /v1/bootstrap`（基线 §4.5）与 `POST /v1/auth/anonymous`（基线 §5.1）同样不实现。规范内现在**只有 `POST /v1/app/bootstrap` 一个 path**：身份、会话、三段配置、启动弹窗全在这里。

---

## 2. 三条身份分支

| 请求 | 服务端行为 | 返回特征 |
|---|---|---|
| 无 `Authorization` | 建游客账户 → 生成 `device_id` → 建匿名 Session → 建 `welcome` 账本流水（冻结） | `account_type=guest`、`is_new_account=true`、`startup.popups` 含 `welcome_gift` |
| 有效游客 Token | 恢复原账户，不新建、不重发礼包 | `account_type=guest`、`is_new_account=false`，礼包是否出现取决于展示资格 |
| 有效正式 Token | 恢复正式用户 | `account_type=google`、`is_guest=false`、`profile.display_name` / `avatar_url` 有值 |

**不做的事**：不处理 Google 登录、不执行游客账户合并 —— 仍在 `POST /v1/auth/google`。

### 三条不能破的线

1. **Token 无效/过期 → 不静默建新账户**。返回 `TOKEN_INVALID` / `TOKEN_EXPIRED`，客户端先走 `POST /v1/auth/refresh`（基线 §5.3）。已登录账号刷新失败必须提示重新登录，否则余额会「消失」。
2. **不接受客户端提交的 `device_id` 当身份**。请求体里根本没有这个字段 —— 不是「校验它」，是让它无处可传。
3. **GeoIP 由服务端按来源 IP 判定**。`sim_country_code` 只参与国家判定（第 1 优先级），`vpn_detected` 只打风控标记、不切区域。

---

## 3. 请求契约

### Header

| 名称 | 必填 | 说明 |
|---|---|---|
| `Authorization` | 条件 | `Bearer <access_token>`。首次安装不带 |
| `Idempotency-Key` | **无 Token 时必填** | 16–128 位字母数字。客户端持久化到本地，Bootstrap 成功后才可丢弃；超时重试必须复用 |

### Body

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `app_id` | string | 是 | 固定 `cinecoin_br`（多 APP 预留） |
| `platform` | `android`\|`ios` | 是 | |
| `app_version` | string | 是 | 语义化版本，如 `1.0.3`，用于配置分层灰度 |
| `build_number` | integer | 是 | 构建号，同版本不同构建视为不同 |
| `locale` | string | 是 | BCP-47，如 `pt-BR` |
| `sim_country_code` | string\|null | 否 | SIM 国家码（免权限可读）。无 SIM 传 `null`，不要空串 |
| `vpn_detected` | boolean | 是 | 客户端本地检测结果，仅作风控信号 |
| `media_source` | string | 否 | 首启归因（MMP）。**从 `/auth/anonymous` 迁来，丢了就永久丢失** |
| `install_id` | string | 否 | MMP 安装 ID，与 `device_id` 分开 |
| `config_versions` | object | 否 | `{region, runtime, popups}` 三段本地版本；不传 = 无缓存 = 全量下发 |

> `media_source` / `install_id` 不在你给的最小字段集里，是我加的：这两个字段原来挂在 `/auth/anonymous` 上，Bootstrap 取代它之后如果不上报，首启归因就断了（BF-11-07 的渠道 ROI 全靠它）。措辞、长度限制都给了，客户端可选。

---

## 4. 响应契约

顶层是**扁平**结构，没有 `data` 信封（对齐你给的结构 + PRD 5.8 的错误体形态）：

```
request_id · server_time · identity · session · config{region,runtime,popups} · startup{popups[]}
```

### 4.1 `identity`

| 字段 | 说明 |
|---|---|
| `user_id` | int64，游客也有，登录合并后不变 |
| `device_id` | **服务端签发**的 UUID，客户端落盘 |
| `account_type` | `guest` \| `google` |
| `is_guest` | `false` 才允许提现 |
| `is_new_account` | 本次是否新建（埋点 / 礼包资格解释用） |
| `profile` | `display_name` / `avatar_url` / `email_masked` / `invite_code` / `locale` / `region` / `segments` / `registered_at` |

`profile` 是 `GET /v1/me` 的**子集**：不含余额、KYC、当日计数 —— 余额只从 `/v1/wallet` 读这条硬约束同样适用 Bootstrap。

### 4.2 `session`

`access_token` / `token_type=Bearer` / `expires_at` / `refresh_token` / `refresh_expires_at`。

沿用基线 §5.1 / §5.3 的既有机制（Access 30 天 + Refresh 90 天轮换），**没有新增认证体系**。字段名从 `token` 改成 `access_token` 是对齐你给的命名，同一物。

### 4.3 `config` 三段与版本比对

> 配置**只在这里下发**。规范里没有、也不应该有 `/v1/config` 一类的独立路由——需要刷新就重新调用本接口并带 `config_versions`。

三段**各自独立版本化**，各自返回 `status`：

| status | values | 客户端动作 |
|---|---|---|
| `updated` | 必带，整包替换 | 覆盖缓存 |
| `not_modified` | **不带** | 保留缓存，不写盘 |
| `unavailable` | 不带 | 读磁盘缓存 → 内置默认 |

为什么不是「整包一个 version」：区域包按国家发布、运行时参数按运营调参、弹窗按活动改，绑在一起会导致改一次频控就把区域包重发一遍。

`not_modified` 用 JSON Schema 的 `if/then` 约束（`status=updated` 时 `values`/`version` 必填），不是靠文档口头约定。

#### region

`region_code` / `currency` / `content_source_id` / `withdraw_page_set[]` / `popup_set` / `copy_pack` / `channels[]` / `ad_units_ref`，外加 `resolved_by`（`sim`\|`geoip`\|`locale`\|`default`，命中的判定层级，用于日志与客诉归因）。

**金额类字段（`fx` / `coin_rate` / `min_payout_coins`）我特意没放进来**：PRD 5.15 自己标注它们「发布常量、后台无入口、不可在此处改」，放进区域包等于给了个可改的位置。客户端要用门槛与档位，从 `GET /v1/wallet` 拿（§8.1 已有 `min_payout_coins` / `tiers` / `fx`）。

#### runtime

`ad.reward.daily_cap` 15 / `ad.interstitial.daily_cap` 12 / `ad.appopen.hourly_cap` 1 / `ad.appopen.daily_cap` 1 / `ad.total.hard_cap` 40 / `invite.settle_max` 50 / `double.daily_cap` 3。

每个字段的默认值、合法区间、**生效时机**都写进了 schema description（次日 00:00 BRT / 立即 / 下次冷启三种）。整包校验、坏一条拒全包 —— 违反的那一段直接 `unavailable`，绝不下发半份。

`additionalProperties: true`：未知 key 客户端必须忽略（向前兼容），但禁止新增 PRD 未登记的可配参数。

**不可配的红线**（汇率、单次奖励币数、提现门槛与档位、提现 SLA、KYC 强度）不在这个对象里，schema 里也没有给它们留位置。

#### popups

`popup_set` + `items[]`，每条 = `id` / `enabled` / `trigger` / `priority` / `group` / `conditions` / `limits` / `template` / `copy_pack`。

- `template` 只能是客户端**内置**模板 id，服务端不下发布局（防「配置错 = 白屏」）
- `conditions` 是 `additionalProperties: true`：条件会扩展，客户端不认识就忽略，不能因为多了个字段就不弹
- 频控四维 `per_session` / `per_day` / `cooldown_sec` / `max_lifetime`，补了 `max_lifetime_period`（见 C-05）

`onb_promise` 不出现在任何示例里，schema 的 `id` 说明里明确标了废弃。

### 4.4 `startup.popups`

`config.popups` 是**规则**（所有用户一样），`startup.popups` 是**结论**（这个用户这次该弹什么）。客户端不需要判断「是不是新用户」。

每条投递实例：

```
delivery_id · popup_id · template · priority · group · trigger · copy_pack
auto_close_sec · expires_at · payload?
```

- `delivery_id` 是幂等与埋点的锚：同一次 Bootstrap 重放返回**同一个** `delivery_id`，超时重试不会让用户看两遍礼包、埋点也不会算两次曝光。
- `maxItems: 3`，与客户端队列上限一致，超出由服务端按优先级截断并记 `popup_dropped`。
- 空数组是正常结果，不是错误。

---

## 5. 新人礼包（本轮重点）

### 5.1 时序：入账在服务端，弹窗只告知

```
建游客账户（同一事务）
  ├─ 建 users 记录，生成 device_id
  ├─ 建 welcome 账本流水：+50.000 moedas，locked
  └─ 建 Session
        ↓
Bootstrap 返回 startup.popups[0] = welcome_gift（payload 里带已入账金额）
        ↓
客户端展示弹窗 —— 不发放任何金币
        ↓
用户点「Ver anúncio e dobrar」→ MZ-03 激励状态机
        ↓
S2S 回调验签通过 → 追加 50.000（第二条流水，grant_status → doubled）
```

关键点：**礼包在用户看到弹窗之前就已经在账上了**（BF-01-04「注册完成即得」）。弹窗是告知 + 提供翻倍入口，不是领取入口。所以「先领 50.000 再点翻倍」这种两段式在账本上表现为两条流水汇总到 `granted_coins=100000`，而不是把第一条改成 100.000。

### 5.2 payload 字段

| 字段 | 说明 |
|---|---|
| `base_coins` | 基础奖励，当前 50.000。若展示前已绑邀请码，按 BF-08-02 合并 +1.000 → 51.000 |
| `granted_coins` | **实际已入账**（含已完成翻倍）。客户端渲染「已到账」用它，别用 `base_coins` |
| `grant_status` | `granted` \| `doubled`。**没有「未发放」**：账本写入失败则整个建号事务回滚，用户拿到 500，看不到这个弹窗 |
| `ledger_type` | 固定 `welcome`，钱包页据此显示「Presente de boas-vindas」 |
| `locked` | 冻结态。`available = balance − lockedCoins`，提现页显示解冻进度 |
| `unlock` | `required_episodes=3` / `valid_episodes`（服务端计时口径）/ `unlocked_at` |
| `double.available` | 服务端综合判定：激励额度剩余、是否已翻倍、风控 |
| `double.incremental_coins` | 额外可得 50.000（等于 `base_coins`） |
| `double.target_total_coins` | 翻倍后总额 100.000，用于主文案「de 50.000 para 100.000」 |
| `double.blocked_reason` | `ad_daily_cap_reached` / `already_doubled` / `not_eligible` / `null`，决定按钮形态 |

### 5.3 六条业务边界（契约层面的落点）

1. 50.000 由**服务端建账本流水**，客户端不发币 → `grant_status` 是只读状态，不是领取回执
2. Bootstrap 只返回状态，重复调用不重复入账 → 靠 `Idempotency-Key` + 账户唯一性
3. 翻倍复用 MZ-03 状态机 → payload 只给报价（`double.*`），不定义新的发奖路径
4. S2S 验签通过才追加 50.000 → 客户端**不得**在收到发奖确认前先按翻倍金额渲染余额
5. 重复调 Bootstrap 拿不到额外奖励 → 同上，且 `already_doubled` 会把它挡在报价层
6. 金额是固定业务规则 → `config.popups` 里**没有金额字段**，只有开关和频控

---

## 6. 错误处理

按 PRD 5.8：`{code, message_pt, retryable}`，另加平台统一的 `request_id`。

| code | HTTP | 含义 | 客户端动作 |
|---|---|---|---|
| `INVALID_REQUEST` | 400 | 参数缺失/格式错；无 Token 缺幂等键 | 不重试，埋点打全字段 |
| `TOKEN_EXPIRED` | 401 | 过期（可刷新） | 先 refresh，再用同一幂等键重放 |
| `TOKEN_INVALID` | 401 | 失效/已撤销 | 游客清 token 重建；已登录提示重新登录 |
| `IDEMPOTENCY_CONFLICT` | 409 | 同键不同 body | 不重试，查本地是否写错键 |
| `BOOTSTRAP_INIT_FAILED` | 500 | 账户/会话初始化失败 | 退避重试 ≤3 次 → 受限模式 |
| `CONFIG_LOAD_FAILED` | 503 | 三段配置全挂 | 走完全离线路径（磁盘缓存 + 内置默认） |

**`CONFIG_LOAD_FAILED` 为什么不是「返回身份 + 空配置」**：那样客户端会拿到 token 但不知道频控，等于让它按错的规则跑。更实际的问题是——失败后重试如果又建一个账户，用户就有两个账户。所以服务端在返回 503 前**回滚本次建号事务并释放幂等键**，客户端用同一键重试即可。

`message_pt` 是可直接展示的葡语文案，客户端不许按文本分支；`details.fields` 只进日志，结构不稳定。

---

## 7. 三个响应示例

规范里 `200` 下有三个具名示例，Scalar 里可切换查看：

| 示例名 | 场景 | 关键取值 |
|---|---|---|
| `first_install_new_guest` | 首次安装 | `is_new_account=true`、三段全 `updated`、`startup.popups` 含 `welcome_gift`（`base_coins=50000`、`locked=true`、`double.available=true`） |
| `returning_guest` | 已有游客 | `is_new_account=false`、三段全 `not_modified`（**无 `values`**）、`startup.popups=[]` |
| `returning_google_user` | Google 用户 | `account_type=google`、`is_guest=false`、`profile.display_name=Maria S.`、`avatar_url` 有值 |

错误示例 6 个：`invalid_request`（含两个 `details.fields` 变体）、`token_expired`、`token_invalid`、`idempotency_conflict`、`init_failed`、`config_load_failed`。

---

## 8. 发现的冲突

按「会不会挡住开发」排序。**每一条我都没有擅自拍板业务规则**，只在契约里选了一个可解释的写法并在此标注。

### C-01 · 响应形态有两套，且 code 类型不同（已闭环）

| | PRD 5.8 | 基线 §1.2 / §17 |
|---|---|---|
| 成功 | 无信封（未定义） | `{code:0, message:"ok", data:{}, request_id}` |
| 错误 | `{code, message_pt, retryable}`，`code` 是**字符串** | `{code, message, data, request_id}`，`code` 是**整数**（40001/40101…） |

**已闭环（2026-11-16）**：按产品决定，`GET /v1/config` 从规范中**删除**，配置统一下沉到 Bootstrap 的 `config` 段。规范内不再存在整数码信封，`code` 只有字符串一套形态，客户端只需一个解析器。

遗留：基线文档 §1.2 / §17 / §4.1 仍是整数码 + `{code:0,...}` 的旧写法。**基线文档是冻结的只读参考，不改它**（见 `AGENTS.md` 硬约束 6）—— 两者分叉是预期状态，接口变更只写 `openapi.json`；废弃接口在规范里删掉即可，不必回基线划掉。

### C-02 · 时间字段格式（已决定，可一句话回滚）

你给的结构示例是 `"server_time": "2026-11-16T07:00:00Z"`。但基线 §4.5 / §5.1 全用 UTC 毫秒整数（`1762905600000`），`AGENTS.md` 也把「接口时间统一 UTC 毫秒」写成硬约束。

本轮取**整数毫秒**，理由：一个格式贯穿全站，客户端不用做时区解析，也不会出现「有的接口 ISO 有的毫秒」。若要 ISO，改 `format: date-time` 即可。

### C-03 · 弹窗触发器枚举对不上（阻塞）

- **BF-11-05** 明列 6 种：`app_open` / `feed_idle` / `episode_end` / `wallet_enter` / `withdraw_fail` / `timer`，并写「trigger.type 必须在 6 种内」
- **但 5.14 的弹窗清单**里有 3 个触发方式不在其中：`ad_pre`=点金币球、`notify_push`=`wheel_close(3rd)`、`retain`=快捷方式/设置页
- **基线 §4.3** 又写成 `episode_completed` / `click`，与 BF-11-05 的 `episode_end` 同名不同写

本轮枚举取 **9 个**：BF-11-05 的 6 个 + `click` + `wheel_close` + `shortcut`，规范名用 `episode_end`。

**待确认**：是扩充 BF-11-05 白名单，还是把 `notify_push` / `retain` 降级为纯客户端本地触发（不进配置）。这不影响客户端解析，但影响「弹窗全配置化」这个承诺能不能兑现。

### C-04 · `double.daily_cap` 有正文、没参数表（影响默认值可信度）

- 5.12 正文说 v2.5 增补了三类可配参数，其中包含 `double.daily_cap`（BF-07-07）
- 但 5.12 的「参数清单（唯一来源）」表只有 6 行，**没有 `double.daily_cap`** —— 默认值、区间、生效时机全缺
- BF-07-07 正文给「每日翻倍 ≤3 次」，原型 `state.doubleLeft = 3`

本轮取默认 3、区间 0–3（由「≤3」推得）、立即生效，并在 schema description 里**明写「区间为推导、PRD 未单列」**。不写这个参数会让客户端拿不到额度；凭空编一个默认值又不该。

**待确认**：把该行补进 5.12。另需明确「次数独立计数但与激励 15 条共用当日额度池」在判定上是先扣哪个池。

### C-05 · `max_lifetime` 缺周期口径

5.14 对 `welcome_gift`（旧 `onb_promise`）写 `max_lifetime=1`（终身一次），MZ-11-01 对 `wheel` 写「max_lifetime 按周计」——但配置结构里只有一个整数，没有周期字段。

本轮补 `max_lifetime_period`（`lifetime`|`week`|`day`，默认 `lifetime`）。

**待确认**：`week` 是自然周（周一 00:00 BRT 重置）还是 7×24 小时滚动窗口。

### C-06 · 弹窗展示上报缺 `delivery_id` 维度

基线 §12.1 有 `POST /v1/popup/report {popup_id, action, dwell_ms}`，事件字典有 `popup_show`。同一个 `popup_id` 会在多次会话重复投递，只按 `popup_id` 上报就分不清「第几次」、也无法对账「服务端下发 N 次 / 客户端展示 M 次」。

本轮在 `startup.popups[]` 里给了 `delivery_id`，但**没有改** `/v1/popup/report`（它不在本规范范围内，属于「必要时才动」）。

**待确认**：report 增加 `delivery_id`，或约定埋点 `popup_show` 必带 `delivery_id`。两者选一，客户端才能把投递闭环。

### C-07 · `device_id` 归属反转（已决议，影响旧接口）

- 基线 §5.1：客户端自报 `device_id`，服务端「同一 device_id 重复调用返回同一 user_id」
- 本契约：服务端签发，客户端**无处可传**

如果 `/v1/auth/anonymous` 继续存在，就会出现两套建号路径：一个认客户端 ID、一个发服务端 ID，同一个用户可能被判成两个账户。

**已决议（2026-11-16）**：`/v1/auth/anonymous` **废弃**。Bootstrap 是唯一的建号入口，`device_id` 只由服务端签发。保留的认证类接口只有 `POST /v1/auth/google`（正式登录）与 `POST /v1/auth/refresh`（续期），两者都不创建账户。

### C-08 · 两个 bootstrap 入口

基线 §4.5 定义了 `GET /v1/bootstrap`（含 `wallet` / `tasks` / `ETag` 304），与本契约是两套设计。

**已决议（2026-11-16）**：§4.5 的 `GET /v1/bootstrap` **不实现**；「局部刷新」这条路也**一并放弃**——配置不单独开路由，需要刷新就重新调用 `POST /v1/app/bootstrap` 并带上 `config_versions`。`ETag / 304` 在 §4.2 的 `region` 段有 `version` 可以替代，不引入两套缓存协商。

钱包（`wallet`）与任务（`tasks`）留在各自接口（基线 §4.7 / §4.8），不进 Bootstrap：冷启快照里的余额不能拿去做提现判断（见 4 节说明）。

### C-09 · 区域包里的金额字段（已决定，附理由）

基线 §4.2 / PRD 5.15 的 `region_config` 含 `fx`、`coin_rate`、`min_payout_coins`。本契约的 `region.values` **不含**。

理由：PRD 5.15 自己标注这三项「发布常量 / 后台无入口 / 不可在此处改」；放进区域包等于给运营一个「看起来能改」的位置。而客户端要用的门槛与档位，`GET /v1/wallet`（§8.1）本来就下发 `min_payout_coins` / `tiers` / `fx`。

**如果你要保留**，加三个只读字段即可，成本很低 —— 但那就要接受「区域包里躺着不可改的常量」这个语义。

### C-10 · 新人礼包由谁发放（原型与新契约不一致，需改原型）

原型 `40-app.js` 的 `grantNewbie(mode)` 是**客户端**在用户点按钮时才 `addCoins`，两个出口（`single` / `double`），「以后再说」在 v1.9.2 被移除。新契约是服务端建号即入账、弹窗只告知。

顺带一个真实风险被这次改动消掉了：原型里 `NB_COINS = round(NB_BASE_USD × fx × COIN_RATE × NB_PCT)`，是按 `fx` **算出来**的。区域包一旦换 `fx`，礼包金币数就会变。新契约用 `base_coins` 字段下发、客户端不得自行计算，这条路径被堵上了。

**待确认**：原型是否按新契约调整（`grantNewbie` 改为只展示、不发币）。这是原型与契约的偏差，不是 PRD 问题。

### C-11 · PRD 内部与基线在「提现档位」上差 10 倍（不影响本轮，但迟早爆）

| 出处 | 四档 |
|---|---|
| PRD 变更记录（v2.6） | 5.000 / 10.000 / 30.000 / 50.000 moedas = R$ 5/10/30/50 |
| PRD BF-06-01 | 50.000 / 100.000 / 300.000 / 500.000 moedas = R$ 5/10/30/50 |
| 基线 §8.1 `tiers` | `[5000, 10000, 30000, 50000]` + `tier_display` R$ 5/10/30/50 |
| 基线 §1.5 | 50.000 / 100.000 / 300.000 / 500.000 |

按 `COIN_RATE = 10.000:1`，只有 **BF-06-01 与 §1.5 自洽**（50.000 = R$5）。5.15 里 `min_payout_coins: 25000` 还注着「与 BF-06-01 一致」，实际不一致。

不影响 Bootstrap（礼包金额 BF-01-04 明确 50.000），但提现侧按 `[5000,...]` 实现会把 R$5 算成 R$0,50。**建议在开提现开发前先把这条钉死。**

### C-12 · 新人礼包是否还附送提现加速

- BF-01-04：v1.9.3 起剥离，「只送金币、不附送提现加速天数」
- BF-06-14：三条加速通道之三写「新人礼包一次性 −3 天（BF-01-04）」

本轮 payload **没有**加速字段（按 BF-01-04）。若 BF-06-14 那条仍有效，payload 要加 `accel_business_days`。

### C-13 · 激励 S2S 路径命名不一致

基线 §7.3 是 `POST /v1/ad/s2s/reward`，PRD MZ-03-04 写 `POST /v1/ads/verify`。「翻倍复用 MZ-03 状态机」最终打哪个地址，需在实现前统一（本轮不涉及该接口定义）。

---

## 9. 本轮我做的决定（附理由，便于你否决）

| # | 决定 | 理由 |
|---|---|---|
| D-01 | 时间统一 UTC 毫秒整数 | 见 C-02 |
| D-02 | 配置段增加 `unavailable` 状态 | 只有 `updated` / `not_modified` 时，某段挂掉就只能整包失败 → 首装用户拿不到 token。加一个「明确缺失」状态，客户端才能按 PRD 兜底（BF-01-07 / BF-11-01） |
| D-03 | 错误体加 `request_id` | PRD 5.8 只有三项，但基线 §1.2 要求所有响应可串链路；不加就没法排查 |
| D-04 | `version` 放块级，`values` 里不重复 | 版本是块的元数据，塞进内容里会出现两个真值 |
| D-05 | region 包去掉金额字段 | 见 C-09 |
| D-06 | 不做 `ETag` / 304 | 每段 `not_modified` 已能省流量；304 与「每次都要返回 identity + session」冲突 |
| D-07 | 新增 `resolved_by` / `is_new_account` / `media_source` / `install_id` | 前两个是排查与解释礼包资格的必要信息；后两个是归因不丢失的必要条件 |
| D-08 | 规范从 YAML 改为 JSON | 你的交付要求；且长段中文描述在 YAML 里缩进极易错位（本仓库踩过） |

---

## 10. 待确认清单

| # | 问题 | 阻塞谁 | 关联 |
|---|---|---|---|
| ~~Q-01~~ | ~~统一错误形态~~ **已定**：字符串码，`/v1/config` 已删，整数码信封不再出现在规范里 | — | C-01 |
| ~~Q-02~~ | ~~旧入口是否废弃~~ **已定**：两个都废弃，Bootstrap 是唯一建号与配置入口 | — | C-07 C-08 |
| Q-03 | trigger 白名单是 6 种还是 9 种 | 弹窗配置后台 | C-03 |
| Q-04 | `double.daily_cap` 补进 5.12 参数表；额度池扣减顺序 | 客户端频控 | C-04 |
| Q-05 | `max_lifetime` 的 `week` 是自然周还是滚动 7 天 | 客户端频控 | C-05 |
| Q-06 | `/v1/popup/report` 是否接受 `delivery_id` | 埋点对账 | C-06 |
| Q-07 | `welcome_gift` 的客户端内置模板 id 到底叫什么（我用了 `welcome_gift_v1`） | 客户端 | — |
| Q-08 | 被邀请人 +1.000 是计入 `base_coins`（51.000）还是单独一条流水 | 钱包流水对账 | C-10 |
| Q-09 | **礼包已入账但弹窗未展示就杀进程**：下次冷启是否还弹？`max_lifetime` 计「下发」还是「成功展示」？ | 礼包曝光率 / 客诉 | — |
| Q-10 | 新人礼包是否仍附送 −3 天提现加速 | 提现侧 | C-12 |
| Q-11 | 提现四档到底 5.000 还是 50.000 | 提现开发 | C-11 |

Q-09 是我在写契约时发现的真空白：礼包在**建号事务内**就入账了，但弹窗是否 `max_lifetime=1` 由「下发」还是「展示」计数，PRD 没写。若按下发计数，用户杀掉弹窗就再也看不到（但币已经在账上，只是不知道有）；按展示计数则下次冷启还会弹。两种都说得通，**必须产品定**。

---

## 11. 对照你的 12 条验收标准

| # | 标准 | 落点 |
|---|---|---|
| 1 | `openapi.json` 可通过 JSON 解析 | 已验证，`json.load` 通过 |
| 2 | OpenAPI 3.1.0 校验通过 | Redocly `0 error 0 warning`（仓库根 `redocly.yaml`），36 个 `$ref` 无断链 |
| 3 | 无 Token 分支表达完整建号契约 | `first_install_new_guest` 示例 + `IdempotencyKey` 参数 + `is_new_account` |
| 4 | 游客 Token 表达身份恢复 | `returning_guest` 示例（三段 `not_modified`、`popups=[]`） |
| 5 | Google Token 表达正式用户恢复 | `returning_google_user` 示例（`account_type=google`、`display_name` / `avatar_url`） |
| 6 | 礼包只在符合条件时出现在 `startup.popups` | `startup.popups` 由服务端判定；`maxItems:3`；两个老用户示例中均为空数组 |
| 7 | 基础奖励不因重复 Bootstrap 重复入账 | `Idempotency-Key` + 建号事务 + `grant_status` 为只读状态（无领取语义） |
| 8 | 50.000 + 50.000 与 PRD 一致 | `base_coins=50000`、`double.incremental_coins=50000`、`target_total_coins=100000`，与 BF-01-04 对齐 |
| 9 | 配置版本比对完整 | 三段独立 `version` + `status` + `config_versions` 入参 + `if/then` 条件必填 |
| 10 | 未重新引入首开承诺弹窗 | 无 `onb_promise` 的枚举值或示例；仅两处 schema description 里作为**废弃声明**出现（「已按 BF-01-08 删除，不要再下发」）。全文无 `promise.mode`、无 200.000 金额 |
| 11 | 固定汇率/奖励/门槛未做成热更参数 | runtime 只有 7 个上限类 key；金额红线在 description 与 §4.3 双重声明 |
| 12 | 未破坏其他已有接口 | 规范内已无其他接口；删除 `/v1/config` 是产品决定，见 C-01。剩余 4 个孤儿 schema / 4 个参数 / 3 个响应已一并清理，`$ref` 25 个无断链、无未引用组件 |

---

## 12. 文件改动

| 文件 | 动作 |
|---|---|
| `public/api/openapi.json` | **新增**（0.3.0，仅 Bootstrap；`/v1/config` 已移除） |
| `public/api/openapi.yaml` | **删除**（已完整并入 json，git 历史可追） |
| `public/api/index.html` | Scalar 加载路径改为 `openapi.json` |
| `redocly.yaml` | **新增**（关掉一条对 `if/then` 误报的规则，附原因） |
| `README.md` | 「更新 OpenAPI」章节重写；目录树与发布映射改 json |
| `AGENTS.md` | 入口表 / 目录地图 / 硬约束 / 已知问题同步 |
| `Bootstrap-接口契约说明.md` | **新增**（本文） |
