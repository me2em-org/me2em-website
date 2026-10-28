---
title: "后记：@me2em/core 的演进——从身份库到带证明的协议"
description: "对七个设计决策的诚实剖析：确定性代替存储、无状态会话、两种验证模式、证明代替角色、名称规范、缓存新鲜盐值和禁止 zero-fallback——附带替代方案和我们希望不同做法的地方。"
publishedAt: 2026-10-03
author: "Me2eM Organization"
tags: ["architecture", "cryptography", "security"]
featured: false
locale: zh
uid: "core-evolution-post-mortem"
---

这篇帖子是对 Me2eM 协议关键设计决策的诚实剖析。不是"我们如何构建的"（那在教程中），而是**为什么我们那样构建**——附带背景、替代方案和我们希望不同做法的地方。

我们从身份库的想法开始，最终以一个带有证明链、两种验证模式和三个包的协议结束。在这两点之间，是一系列决策，每一个都打开了某些可能性，也关闭了其他可能性。这份文档为未来的贡献者和我们自己记录了关键的分叉——一年后，当细节已经模糊的时候。

---

## DR-1：确定性代替存储

**决策：** 所有密钥都从 seed 短语确定性派生。不存储任何内容。

**背景：** 第一版将生成的密钥存储在 localStorage 中。它工作了——直到第一个"如果用户在第二台设备上打开应用怎么办？"的问题。

**我们拒绝的替代方案：** 服务器端密钥同步（像大多数密码管理器那样）。它解决了多设备问题，但创建了服务器即存储——所有用户的单点泄露。

**解决方案：** seed 短语（BIP39）→ 确定性 HKDF 树。相同的 seed + 相同的名称 → 相同的密钥。在任何设备上，在世界任何地方。

**它打开了什么：**

- 免费的跨设备（不需要同步）
- 设备自主性（树在本地计算）
- Seed = 唯一身份载体（纸质）

**它要求了什么：**

- 名称规范（没有 NFKC 规范化，"Work"和"work"会产生不同的密钥——一个独立的故事，DR-5）
- 派生路径版本化（info = "me2em/handle/v1/{name}"——版本在字符串内）
- 清理纪律（瞬态材料——RAM 中的原始密钥字节）

**我们希望不同做法：** 我们从第一天就实现名称规范，而不是在调试去同步化一周之后（更多关于 DR-5）。

---

## DR-2：无状态会话代替服务器端

**决策：** 会话是一个签名令牌，携带内部所有数据。服务器无需 DB 查找即可验证签名。

**背景：** 经典方法——服务器颁发会话令牌（随机 ID）并将会话存储在 Redis 中。验证 = 通过 ID 在 Redis 中查找。

**问题：** 在 Me2eM 中，**客户端自己签名令牌**。这意味着：服务器在会话创建之前无法存储会话——因为服务器在第一个请求之前不知道会话的存在。

**解决方案：** 令牌包含所有必要的内容（handleId、audience、scopes、exp、iat、jti）。服务器针对 handle 的 pubkey 验证签名（从令牌中的名称确定性重新计算）。

**它打开了什么：**

- 无需 DB 的服务器验证
- 无需服务器端会话同步的多设备
- 无需 Redis 的测试环境

**它要求了什么：**

- 通过 RevocationChecker 撤销（可选，为需要的人）
- 从名称重新计算 pubkey（得益于 DR-1）
- payload 中强制 `iat`（否则"未来日期"验证失败）

**我们希望不同做法：** 我们一开始就把 `iat` 设为强制字段。最初它不存在——"来自未来的令牌"检查通过硬未来窗口工作，这 silently 将会话 TTL 限制为一小时。只有在编写 TTL > 3600 的测试时才发现了这个 bug。

---

## DR-3：两种验证模式

**决策：** 两种验证会话的方式——Mode 1（verifyStateless，直接）和 Mode 2（verifyAttested，通过证明链）。

**背景：** 在证明出现之前，只有 Mode 1。它工作了，但有限制：验证器必须持有 `Identity`——私钥根。对于第三方应用，这是不可接受的。

**什么需要了 Mode 2：** 外部服务（司机应用、企业Messenger）必须**在不接收私钥根**的情况下验证会话。证明链可以实现这一点：每一级都由其父级签名，链追溯到公钥根。

**它打开了什么：**

- 第三方验证器（不需要私钥）
- 验证时的授权强制（scopes、TTL、audiences）
- 分支撤销（revoke attestation jti——杀死整个分支）

**它要求了什么：**

- attestation.ts 模块（issue、decode、verifySignature）
- Session.verifyAttested 中的扩展验证（嵌套、名称模式、TTL 上限）
- 接受证明 jtis 的 RevocationChecker（不仅是会话）

**我们希望不同做法：** 我们一开始就建立双模式支持。我们在 0.6.0 中添加了 Mode 2，当时变得清楚第三方验证器是关键需求。如果它在 v0.1 中，attestation.ts 会更干净。

---

## DR-4：数据库中的证明代替角色

**决策：** 代替经典的 DB 角色（`user.role = 'admin'`）——带有授权的证明链。

**背景：** 在经典系统中，权限存储在 DB 中。更改权限 = DB 中的 UPDATE。撤销 = 从 DB 中 DELETE。

**问题：** 在去中心化系统中，没有单一的 DB。谁存储权限？验证器如何了解用户的权限？

**解决方案：** 权限由父级签名，嵌入证明链中，在每次请求时出示。验证器检查链："根断言这个密钥属于这个名称，带有这个授权。"

**它打开了什么：**

- 无需 DB 的验证（所有权限在链中）
- 层次委派（子授权 ⊆ 父授权）
- 分支撤销（revoke attestation jti = 杀死整个分支）

**它要求了什么：**

- 授权设计的纪律：`scopes` 是精确字符串，`subNamePatterns` 仅在末尾使用 `*`
- 扩展验证：`AUDIENCE_NOT_PERMITTED`、`SCOPE_EXCEEDED`、`TTL_EXCEEDED`、`SESSION_OUTLIVES_ATTESTATION`
- 接受 Mode 1 不强制授权（这是限制，不是 bug）

**我们希望不同做法：** 我们不会在同一个命名空间中混合授权 scope（`charge:start`）和权限名称（`billing:admin`）。这在扩展时创造了潜在的混淆。v1.0 应该分离它们。

---

## DR-5：名称规范

**决策：** 所有名称都经过 NFKC → lowercase → trim → 使用模式 `/^[a-z0-9][a-z0-9._@-]{0,62}$/` 验证。

**背景：** 没有规范化，`"Station-001"`和`"station-001"`会在不同平台上产生不同的密钥。更糟糕的是：`"a/b"`和`"a.b"`会产生潜在的路径冲突。

**问题：** 跨实现测试中的密钥不匹配——两个独立的实现使用"相同"的名称产生了不同的密钥。确定性工作了，但输入不是规范的。

**解决方案：** 单一的 `normalizeName(raw: string): string` 函数——`NFKC → lowercase → trim` → 验证。所有派生输入都通过它。模式 `/` 被禁止——它是路径分隔符。

**它打开了什么：**

- 所有平台上的确定性
- 防止同形字符攻击（NFKC 规范化 Unicode）
- 防止路径遍历（禁止 `/`）

**它要求了什么：**

- 放弃支持带有 Unicode 字母、超过 64 个字符和包含 `/` 的名称
- 每个 Unicode 边界情况的测试

**我们希望不同做法：** 我们从第一个提交就部署它。我们在 0.6.0 中添加了规范——在此之前，`"Work"`和`"work"`是不同的 handle。

---

## DR-6：每次登录时 cacheKey 的新鲜盐值

**决策：** cacheKey 在每次登录时使用新的随机盐值派生：`cacheKey = deriveCacheKey(seed, freshSalt)`。盐值不是常量，也不是从 seed 确定性派生的。

**背景：** cacheKey 加密 IndexedDB 中的上下文缓存。讨论了两种方案：

- **SaltA：** 每次登录新鲜盐值 → 第 N 个纪元的 cacheKey 泄露不会帮助第 N+1 个纪元
- **SaltB：** 从 seed 确定性盐值 → cacheKey 恒定；一次泄露读取所有纪元的缓存

**我们选择什么以及为什么：** SaltA。缓存只包含派生材料——不是 seed 或私钥——但"缓存非秘密"不应成为唯一防线。新鲜盐值使 cacheKey 泄露在时间上局部化：被盗的密钥读取一个纪元的缓存，在下次登录边界处死亡。

**代价：** 密钥更改时缓存失效——但它被设计为缓存：所有内容在毫秒内从 seed 重新计算。

**我们希望不同做法：** 我们从第一天就按材料类别分离缓存（派生-非秘密 / 临时-敏感）——现在这已由规则固定，但它是演化出现的。

---

## DR-7：OTK 必须——禁止 zero-fallback

**决策：** 如果 PreKeyBundle 中没有 OTK，X3DH **抛出错误**，而不是替换为零。

**背景：** 第一版实现有一个 fallback：

```typescript
// ❌ 之前：
let dh4: Uint8Array;
if (myOneTimeKey) {
  dh4 = await computeX25519SharedSecret(myOTK_x, theirEK_x);
} else {
  dh4 = new Uint8Array(32); // Fallback: zeros
}
```

**问题：** 协议不失败，但每个没有 OTK 的聊天都失去了 freshness 属性——秘密在没有一次性贡献的情况下计算。事后 identity key + SPK 泄露会暴露对话。

**解决方案：** OTK 是强制的。如果 PreKeyBundle 不包含 OTK，X3DH **抛出错误**，而不是替换为零。

**我们希望不同做法：** 同样的事情，只是更早。我们在别人的实现中发现了这个偏差，而不是 ours——但原则是普遍的：**协议应该失败，而不是退化**。这个陷阱的完整剖析和测试课程——见文章[无存储的 E2EE](/zh/blog/e2ee-seed-derived-identity)。

---

## 我们希望不同做法——总结

| 决策 | 部署时间 | 需要时间 |
|------|---------|---------|
| NFKC 名称规范化 | 0.6.0 | 第一个提交 |
| payload 中的 `iat` | 0.7.0-alpha.1 | 第一个提交 |
| 双模式验证 | 0.6.0 | 0.1.0 |
| 带规范顺序的 X3DH | 0.1.0-alpha.1 (`@me2em/crypto`) | 第一个提交 |
| OTK 强制 | 0.1.0-alpha.1 (`@me2em/crypto`) | 第一个提交 |
| 每次登录新鲜盐值 | 0.1.0-alpha.1 (`@me2em/react`) | 0.1.0-alpha.1 ✓ |
| 不可提取的持久化 CryptoKey | 0.1.0-alpha.1 (`@me2em/react`) | 0.1.0-alpha.1 ✓ |

共同模式：**密码学正确性必须从第一个提交就建立，因为每次"以后再做"的重构都是一个漏洞窗口。** 最后两行确认了这种情况也可能发生。

---

## 继续阅读

- **[Me2eM：从 seed 短语生成身份](/zh/blog/me2em-seed-derived-identity)** — 确定性树
- **[证明链：无需服务器的委托信任](/zh/blog/attestation-chains-delegated-trust)** — 信任委派（DR-3、DR-4 在实际中）
- **[无存储的 E2EE](/zh/blog/e2ee-seed-derived-identity)** — session-bound 配置（DR-1、DR-6、DR-7 带测试课程）
- **[DevSecOps 用于密码学 monorepo](/ru/blog/devsecops-crypto-monorepo)** — 这些决策如何在 CI 中得到保护 (RU)
- **[BACKLOG.md](https://github.com/me2em-org/me2em-protocol/blob/main/BACKLOG.md)** — 当前 backlog 和计划（建议性）
