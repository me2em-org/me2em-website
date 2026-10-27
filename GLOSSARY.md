# Glossary

Brand canon, terminology, and translation conventions for the Me2eM website.

## Brand canon

- **Me2eM** — human-facing prose: brand name, UI copy, documentation, frontmatter display text. The brand does not decline or conjugate ("iPhone rule").
- **me2em** — machine identifiers only: npm packages (`@me2em/*`), code identifiers (`Me2emProvider`, `Me2emIdentity`), domain, URL paths, CLI. The form `Me2em` is forbidden in prose.

## Translation charter

### Source of truth

The ru collection file (`src/content/blog/ru/`, `src/content/usecases/ru/`) is the sole source for translation. zh and en translations derive from the same ru master — never from each other.

### File naming

The translated file name matches the ru file name (slug parity). Canonical linkage is via the `uid` in frontmatter, copied verbatim from ru.

### Frontmatter protocol

Translate: `title`, `description`, `meta[]` (usecases). Copy verbatim from ru: `uid`, `author`, `publishedAt`, `updatedAt`, `tags`, `icon`, `featured`, `order`, `uc`, `url`, `services`, `draft`, `image`/`svgSlug` and asset paths. The `locale` field — set to the target locale (`en`/`zh`).

### Tags stay English

Tags are URL identifiers: `tagToSlug` does not slugify Cyrillic or CJK. The convention is already correct in ru.

### Links

Internal links rewrite to locale prefix only: `/ru/blog/X` → `/blog/X` (en), `/zh/blog/X` (zh); same for `/usecases/…`, `/docs/…`. Links without a locale prefix (default en) stay unprefixed in en text. External URLs — verbatim. Anchor links `#…` are translated from the translated heading (heading slugification changes); each anchor is checked against the heading in the same file.

### Code blocks, paths, commands, package names (`@me2em/*`), mermaid

Verbatim. In mermaid, human-facing labels may be translated; node syntax and IDs must not change. The phrase "Save this as `path`" in en translations is permitted only if the following code block matches the file at that path character-for-character (the `published-source` test checks this automatically).

### Anti-fabrication in body

1:1 completeness — every section, list, table, warning in the ru master is present in the translation; nothing is added. Numbers, dates, versions, file names — character-for-character. No new facts, promises, or SEO keywords.

### Style

Translation is natural (not literal); terms follow the approved terminology table (§ Terminology). In zh prose, brand Latin and package names are preserved (`Me2eM`, `@me2em/core`, `Ed25519`, `HKDF`, `X3DH`).

## Terminology

| EN | RU | ZH | Notes |
|---|---|---|---|
| use cases | Сценарии использования | 使用场景 | Route `/usecases` is not renamed. |
| tutorials | Практические руководства | 实用指南 | |
| Identity | Identity | Identity | Protocol entity; not translated in any locale. |
| Handle | Handle | Handle | Not translated; protocol entity. |
| SubHandle | SubHandle | SubHandle | Leaf child of a Handle. |
| seed phrase | seed-фраза | 种子短语 | Also: seed (lowercase, code context). |
| seed-derived | seed-derived | seed-derived | Adjective; preserved in zh prose. |
| attestation | аттестация | 证明 | Attestation chain = аттестационная цепочка / 证明链. |
| attestation chain | аттестационная цепочка | 证明链 | |
| mandate | мандат | 授权 | Signed authority granted to an agent. Distinct from grant (授予). |
| revocation | отзыв | 撤销 | Also: ревокация (ru i18n). |
| revoke | отзывать | 撤销 | `revokeAttestation(jti)` = отзыв аттестации. |
| verifier | верификатор | 验证器 | |
| stateless | stateless | 无状态 | Also: stateless- (compound prefix in ru). |
| delegation | делегирование | 委托 | Delegatable trust = делегируемое доверие / 可委托信任. |
| trust | доверие | 信任 | Root of trust = корень доверия. |
| key | ключ | 密钥 | root key = корневой ключ; public key = публичный ключ; private key = приватный ключ. |
| keypair | keypair | keypair | Also: пара ключей. |
| signature / signed | подпись / подписанный | 签名 / 已签名 | |
| envelope | конверт | 信封 | For offline recipients. |
| channel | канал | 通道 | E2EE channel; also API scope prefix `channel:*`. |
| epoch | эпоха | 纪元 | Epoch rotation = ротация эпох. |
| session | сессия | 会话 | Stateless session = stateless-сессия / stateless会话. |
| password manager | менеджер паролей | 密码管理器 | Deterministic password manager = детерминированный менеджер паролей. |
| guard rails | guard rails | 护栏 | Also: страховка (ru body text). |
| derive / derived | выводить / выведенный | 派生 / 派生的 | derivation = деривация / 派生. |
| offline | офлайн | 离线 | |
| replay protection | replay protection | 重放保护 | Also: защита от replay. |
| forward secrecy | forward secrecy | 前向安全 | Also: message-level forward secrecy. |
| PreKeyBundle | PreKeyBundle | PreKeyBundle | Protocol term; not translated. |
| provisioning | provisioning | 预配 | Also: provision. |
| airframe | airframe | 机体 | Drone hardware unit. |
| TTL (Time To Live) | TTL | TTL | TTL cap = TTL-лимит; ttlSeconds = ttlSeconds. |
| grant | грант | 授予 | Attestation grant = грант аттестации. |
| scope | scope | 范围 | API scope; also: ограниченный по scope. |
| audience | аудитория | 受众 | `audiences` array in attestation. |
| persona | персона | 角色 | Contextual identity. |
| agent | агент | 代理 | AI agent = ИИ-агент / AI代理. |
| provider | провайдер | 提供商 | Tool provider, MCP provider. |
| key agreement | key agreement | 密钥协商 | Signal protocol term. |
| OTK (One-Time Key) | OTK | OTK | OTK consumption = потребление OTK. |
| SPK (Signed Public Key) | SPK | SPK | SPK signature verification. |
| double ratchet | Double Ratchet | Double Ratchet | On crypto package roadmap. |
| zero-fallback | zero-fallback | 零回退 | No zero-fallback = no zero-fallback. |
| MITM | MITM | MITM | Man-in-the-middle attack. |
| self-contained | self-contained | 自包含 | Envelopes are self-contained. |
| root of trust | корень доверия | 信任根 | Owner's / operator's root of trust. |
| compromised / compromise | компрометация / взломанная | 被入侵 / 被攻破 | Compromised agent = скомпрометированный агент. |
| isolation | изоляция | 隔离 | Per-context isolation. |
| deterministic | детерминированный | 确定性 | Deterministic derivation = детерминированная деривация. |
| verification | проверка | 验证 | Offline verification = офлайн-верификация. |
| signing | подпись | 签名 | Agent signs sessions = агент сам подписывает сессии. |
| attested | аттестованный | 已证明 | Attested by any verifier = аттестация любым верификатором. |
| attest | аттестовать | 证明 | HR attests employees = HR аттестует сотрудников. |
| self-issued | self-issued | 自签发 | Self-issued child attestation. |
| onboarding | онбординг | 入职 | Instant onboarding = мгновенный онбординг. |
| offboarding | offboarding | 离职 | One-operation offboarding. |
| contractor | подрядчик | 承包商 | Contractor self-expiry. |
| hangar | ангар | 机库 | Drone fleet operations. |
| telemetry | telemetry | 遥测 | Flight telemetry = телеметрия полёта. |
| gimbal | gimbal | 云台 | Camera gimbal. |
| connector | коннектор | 连接器 | EV charging connector. |
| charge station | зарядная станция | 充电站 | Part of charging network. |
| kill-switch | kill-switch | 紧急停机 | Instant kill-switch = мгновенный kill-switch. |
| safe mode | safe mode | 安全模式 | Spacecraft safe mode. |
| tasking | tasking | 任务调度 | EO tasking window. |
| transponder | транспондер | 应答机 | Transponder time. |
| downlink | нисходящий канал | 下行链路 | Downlink capacity. |
| EO (Earth Observation) | EO-съёмка | 地球观测 | EO imaging windows. |
| marketplace | маркетплейс | 市场 | Satellite capacity marketplace. |
| receipt | чек | 收据 | Signed receipt = подписанный чек. |
| credential | учётные данные | 凭证 | Instead of credentials. |
| sign-in | вход | 登录 | One sign-in = один вход. |
| correlation | корреляция | 关联 | Opt-in correlation = корреляция — по выбору. |
| flag | флаг | 标记 | One flag per station = один флаг на станцию. |
| retirement | вывод из эксплуатации | 退役 | Retiring a station. |
| sandbox | песочница | 沙盒 | |
| quick start | quick start | quick start | Preserved in all locales (ru i18n). |
| deep dive | разбор | 深度解析 | Protocol deep dive. |
| architecture note | архитектурная заметка | 架构笔记 | Blog category. |
| API reference | справочник API | API参考 | |
| glossary | глоссарий | 术语表 | |
| footer attribution | footer attribution | footer attribution | Not localized (see existing row). |
| Theme by Hans Martens Dev | Theme by Hans Martens Dev | Theme by Hans Martens Dev | Footer attribution is not localized. |

## ZH neologisms for approval

(none pending — approved neologisms are merged into § Terminology)

## Licenses

- Me2em protocol — Apache-2.0 (with patent grant).
- Theme / website — MIT (original theme license).
