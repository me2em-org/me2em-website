---
title: "Me2eM vs JWT vs OAuth：三种信任模型"
description: "JWT、OAuth 和 Me2eM 解决同一个任务——授权。但信任模型根本不同：谁签名、服务器信任谁、以及发生泄露时会怎样。附代码示例的全面对比。"
publishedAt: 2026-09-26
author: "Me2eM Organization"
tags: ["comparison", "security", "architecture"]
featured: true
locale: zh
uid: "me2em-vs-jwt-vs-oauth"
---

JWT、OAuth 2.0 和 Me2eM 解决同一个任务：向服务器证明客户端有权限执行操作。三者都颁发令牌，三者都在每次请求时验证，三者都承诺安全。

但表面相似之下——三种根本不同的信任模型。选择它们不是选择技术，而是选择**谁拥有密钥**以及**谁可能不可逆地犯错**。

## 一句话概括三种模型

**JWT**——服务器用自己的密钥或密钥对签名令牌。服务器无所不能：颁发、撤销、解释。客户端接收现成的凭证。

**OAuth 2.0**——客户端通过授权服务器委托访问他人资源。资源拥有者服务器决定允许什么。客户端在委托范围内行动。

**Me2eM**——用户拥有 seed 短语，所有密钥由此确定性派生。客户端**自己签名**自己的令牌，服务器仅**验证**它们——直接验证（Mode 1）或对抗 attest 链验证（Mode 2）。没有人拥有创建他人令牌的权利。

区别不是表面的。这是对同一个问题的三种不同回答：

> **你信任谁有权创建具有权限的令牌？**

## 解剖：令牌内部有什么

从结构开始——它已经揭示了哲学。

### JWT（JSON Web Token）

```typescript
// 标准 JWT 结构：
// header.payload.signature（全部 — base64url）

// Header：
{ "alg": "HS256", "typ": "JWT" }

// Payload：
{
  "sub": "user-12345",           // subject — 来自数据库的 ID
  "name": "Alice",
  "role": "admin",               // 权限 — 由服务器写入
  "iat": 1716912000,
  "exp": 1716915600
}

// Signature：HMAC-SHA256(header, payload, serverSecret)
// 或 RSA/ECDSA — 服务器私钥签名
```

### OAuth 2.0 Access Token

```typescript
// OAuth 令牌——通常是无状态的（opaque）：
// 授权服务器颁发一个随机字符串并将其值存储在自己那边
{
  "access_token": "at-9f2XkQ7Lm4Vn8pR3tW6yZ1cB5dE8gH2j"  // 随机字符串；
                                                           // 值存储在授权服务器数据库中
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}

// 如果 JWT 作为 access token：
// 结构与上方相同——但通过 OAuth 流程颁发
```

### Me2eM Session

```typescript
// Me2em session payload：
{
  "hId": "base64url-handle-pubkey",
  "hNm": "work",
  // "hPath": ["work", "laptop-1"],  // 仅 SubHandle：树中的路径
  "aud": "app.example.com",          // 给谁
  "scp": ["read", "write"],          // 权限——客户端声明，
                                      // 服务器验证
  "exp": 1716915600,
  "iat": 1716912000,
  "jti": "unique-ID"
}

// Signature：Ed25519(handle key, payload)
// 用 HANDLE 密钥签名，而非服务器密钥
```

**结构层面的关键区别：** JWT 中的 `sub`——对数据库的引用（需要 lookup 才能知道是谁）。OAuth 中的 `access_token`——通常是无状态的（需要 introspection endpoint）。Me2eM 中的 `hId`——**本身就是公钥**，无需 lookup 即可密码学验证。

## 谁签名：服务器 vs 客户端

这是主要分歧点。

### JWT：服务器签名

```text
1. 用户登录（密码、OAuth 提供商、...）
2. 服务器创建 payload { sub, role, exp, ... }
3. 服务器用自己的密钥签名 payload
4. 客户端接收 JWT 并在每次请求时传递
5. 服务器用自己的密钥验证签名
```

服务器是令牌的唯一来源。它可以为任何用户创建具有任何权限的令牌。用户**不能**自己创建令牌——这正是模型的优势（服务器控制颁发），也是其局限（服务器必须在线，服务器是唯一的泄露点）。

### Me2eM：客户端签名

```text
1. 用户输入 seed 短语（每次会话一次）
2. 确定性计算 Handle：私钥
3. 客户端创建 payload { hId, aud, scp, exp, ... }
4. 客户端用 HANDLE 密钥对 payload 签名
5. 服务器用 HANDLE 公钥验证签名
   （从令牌中的名称重新计算）
```

服务器**不能**为用户创建令牌——它没有用户的私钥。用户不能创建具有扩展权限的令牌——payload 已签名，修改字段而不使签名失效是不可能的。权限由客户端声明并由签名锁定，在 Mode 2 下验证器还会在每次验证时强制将其转换为 attest 授权。

> **关于 Mode 1 的一个诚实说明。** 所有关于"服务器不能"的说法对 Mode 2 来说绝对正确，服务器在 Mode 2 下仅持有公钥根。在 Mode 1 中验证器持有 `Identity`——根——因此可以推导出树中的任何密钥。这就是为什么 Mode 1 仅用于你本就信任颁发权限的基础设施；对于所有外部受众——Mode 2。

### OAuth：中间方案

OAuth 2.0 本身不签名——它委托。客户端从授权服务器接收令牌（授权码流程、客户端凭证等）并提交给资源服务器。令牌可以是无状态的（introspection）或 JWT（自包含）。

OAuth 的复杂性在于实体的数量：授权服务器、资源服务器、客户端、资源拥有者、scope、重定向 URI、refresh 令牌。这是"应用 A 想要访问用户在服务 B 上的数据"场景的灵活性代价。

## 对比表

| 方面 | JWT | OAuth 2.0 | Me2eM Session |
|--------|-----|-----------|---------------|
| **谁签名** | 服务器 | 授权服务器 | **客户端（handle）** |
| **签名基础** | 服务器密钥/密钥对 | N/A（opaque）或服务器密钥 | 确定性 handle 密钥 |
| **服务器会话存储** | 无（自包含） | 有（introspection / 引用令牌） | 无（stateless） |
| **撤销** | 无内置（需要数据库黑名单） | 有（refresh 流程、introspection） | 有（jti + RevocationChecker） |
| **身份** | 来自数据库的 `sub` 字符串 | 来自授权服务器的字符串 | **公钥**——可验证 |
| **层级** | 无 | 无 | 有（hPath：Handle → SubHandle） |
| **谁能伪造令牌** | 知道服务器密钥的人 | 授权服务器；被盗令牌——使用而非伪造 | 知道 handle 私钥的人 |
| **公钥重新计算** | 不需要 | 不需要 | 需要——从令牌中的名称（Mode 1） |
| **匿名性** | 低（`sub`——数据库标识符） | 低（客户端可识别） | 高（无邮箱/电话关联） |

## 信任模型：谁信任谁

### JWT——完全信任服务器

```text
用户 → 信任 → 服务器 → 签名 → 令牌
                                    ↓
                              服务器可以：
                              - 颁发任何权限
                              - 撤销任何会话
                              - 读取 payload（未加密）
                              - 丢失密钥 → 所有令牌泄露
```

### OAuth——信任三方

```text
用户 → 信任 → 授权服务器 → 颁发令牌
            → 信任 → 资源服务器 → 验证令牌
            → 信任 → 客户端 → 不超出 scope
```

### Me2eM——信任密码学

```text
用户 → 拥有 → Seed 短语 → 确定性 → 所有密钥
客户端 → 签名 → 令牌 → 提交
服务器 → 验证 → 签名 + attestations → 公钥根（Mode 2）
        ← 服务器不能创建他人令牌——只能验证
        ← payload 内容公开，但无法伪造
```

## 泄露：会发生什么

选择模型时的关键问题：发生泄露时会怎样。

### JWT：服务器密钥泄露

```text
密钥泄露 → 攻击者可以为任何用户颁发令牌
         → 任何权限、任何 exp、任何 sub
         → 直到密钥轮换
         → 无痕迹（无创建日志）
缓解：密钥轮换 → 所有 JWT 失效 → 所有
      用户登出
```

### Me2eM：handle 密钥泄露

```text
Handle 私钥泄露 → 攻击者可以为该
                         handle 签名会话（在其权限范围内）
缓解 1：撤销 handle attestation（Mode 2）——立即终止
        所有服务中的当前和将来会话
缓解 2：短 TTL（建议——不超过一小时）——攻击
        窗口受限
风险限于 HANDLE——同一用户的其他 handle 不受影响
```

### Me2eM：seed 泄露

```text
Seed 泄露 → 攻击者导出整棵树：所有 handle、所有密钥
          → 身份完全泄露
          → 无可轮换：确定性始终复现相同密钥
缓解：seed 仅存于纸上，永不在设备和云端；
      passphrase（"第 25 个词"）——第二自由度：不带
      密码词的短语生成不同的（对攻击者为空的）
      身份
```

## 代码：一个场景，三种实现

场景：用户想要访问 API。看看每种方法的样子。

### JWT

```typescript
// 服务器：
app.post('/login', async (req, res) => {
  const user = await verifyPassword(req.body.email, req.body.password);
  if (!user) return res.status(401).send('Invalid credentials');
  
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    SERVER_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token });
});

// 每次请求验证：
function authenticate(req) {
  const payload = jwt.verify(req.headers.authorization, SERVER_SECRET);
  // 在数据库中查找用户以确认角色仍然有效
  const user = await db.users.findById(payload.sub);
  return user;
}
```

### OAuth 2.0

```typescript
// 步骤 1：重定向到授权服务器
res.redirect(`https://auth.example.com/authorize?` +
  `response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read`);

// 步骤 2：用 code 交换 token
const token = await fetch('https://auth.example.com/token', {
  method: 'POST',
  body: `grant_type=authorization_code&code=${code}&client_id=${CLIENT_ID}`
});

// 步骤 3：每次请求——introspection 或本地 JWT 验证
const introspect = await fetch('https://auth.example.com/introspect', {
  method: 'POST',
  body: `token=${token}`,
  headers: { 'Authorization': `Basic ${CLIENT_CREDENTIALS}` }
});
const { active, scope, sub } = await introspect.json();
```

### Me2eM

```typescript
import { Identity, Session } from '@me2em/core';

// 唯一入口——seed 短语（在纸上）。无需注册：
// 所有 handle 已存在，它们是确定性的。
const identity = await Identity.fromSeed(seedBytes);
const handle = await identity.deriveHandle('work');

// 创建会话（在客户端，无需服务器）：
const session = await Session.create(handle, {
  audience: 'app.example.com',
  scopes: ['read', 'write'],
  ttl: 3600,
});

// 验证（在服务器，无需数据库）：
const verified = await Session.verifyStateless(
  session.token,
  serverIdentity,     // Identity — 重新计算 handle 公钥
  'app.example.com',  // RevocationChecker — 可选的第四个参数
);
// verified.scopes — 令牌中的权限
// verified.handleName — 具体是谁
```

**关于两种模式的说明。** 上面的示例——Mode 1（`verifyStateless`）：验证器持有 `Identity` 并从令牌中的名称自行重新计算密钥。对于外部受众存在 Mode 2（`verifyAttested`）：服务器验证父级 attest 链对抗**公钥**根——则根本没有服务器密钥，授权在每次验证时强制。表格中 Me2eM 写"无服务器密钥"的行指的是 Mode 2；完整分解——见[关于 attest 链的文章](/zh/blog/attestation-chains-delegated-trust)。

## 汇总表

| 标准 | JWT | OAuth 2.0 | Me2eM Session |
|-----------|-----|-----------|---------------|
| **谁创建令牌** | 服务器 | 授权服务器 | 客户端（handle） |
| **服务器密钥** | 需要 | 需要 | **Mode 1：** 验证器持有根 · **Mode 2：** 不需要 |
| **Stateless** | 是（自包含 JWT） | 通常否（introspection） | 是 |
| **撤销** | 无内置 | 有（introspection） | 有（jti + RevocationChecker；Mode 2 下的分支级） |
| **权限层级** | 无 | 无（扁平 scope 字符串） | 有（attestation chains） |
| **身份** | 来自数据库的 `sub` 字符串 | `sub` 字符串 | **公钥** |
| **匿名性** | 低 | 低 | 高 |
| **服务器密钥泄露** | 严重 | 严重 | **Mode 1：** 严重（这就是根） · **Mode 2：** N/A |
| **客户端密钥泄露** | N/A（客户端不存储密钥） | N/A | 受限（一个 handle、短 TTL、Mode 2 下的撤销） |
| **多设备** | 需要同步 | 需要同步 | 确定性（同一 seed） |
| **注册** | 邮箱/电话 | 邮箱/电话 | **仅 seed 短语** |
| **委托** | 有限 | 主要目的 | Attestation chains |

## 何时选择什么

| 场景 | 建议 |
|----------|------|
| 带用户数据库的常规 web-app | JWT——成熟的方案 |
| 带委托的多服务架构 | OAuth 2.0——成熟的方案 |
| 无需数据库的密码学身份 | Me2eM Session |
| E2EE 通信 | Me2eM + @me2em/crypto |
| 带离线授权的 IoT 设备 | Me2eM + attestation chains |
| 带确定性密钥的 AI 代理 | Me2eM + attestation chains |
| 匿名用户（无邮箱/电话） | Me2eM |
| 无密码学需求的常规 SaaS | JWT / OAuth——不要过度复杂化 |

Me2eM 不替代 JWT 或 OAuth——它解决不同的问题。如果你需要匿名、确定性、可委托的身份，无需服务器密钥和数据库——Me2eM 原生实现。如果你需要在带用户数据库的 web 应用中进行常规授权——JWT 或 OAuth 足够且更简单。

## 推荐阅读

- **[无需用户数据库的 SSO](/zh/blog/me2em-multi-app-sso)**——极端情况：seed 短语作为整个平台的账户
- **[Stateless 会话：无需数据库的授权](/zh/blog/stateless-sessions-no-database)**——令牌里面是什么以及会话通过哪些检查
- **[Attestation 链：无需服务器的信任委托](/zh/blog/attestation-chains-delegated-trust)**——Mode 2：委托和分支撤销
- **[即时撤销：stateless 世界中的撤销](/zh/blog/revocation-checker-instant-revocation)**——jti 撤销如何运作
- **[Me2eM：从 seed 短语获取身份](/zh/blog/me2em-seed-derived-identity)**——基础
- **[`@me2em/core` 在 npm 上](https://www.npmjs.com/package/@me2em/core)**——实现
