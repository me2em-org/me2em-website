---
title: "Post-mortem: @me2em/core evolution — from identity library to protocol with attestations"
description: "An honest breakdown of seven design decisions: determinism over storage, stateless sessions, two verification modes, attestations over roles, name canonicality, fresh salt for cache, and zero-fallback ban — with alternatives and what we'd do differently."
publishedAt: 2026-10-03
author: "Me2eM Organization"
tags: ["architecture", "cryptography", "security"]
featured: false
locale: en
uid: "core-evolution-post-mortem"
---

This post is an honest breakdown of the key design decisions of the Me2eM protocol. Not "how we built it" (that's in the tutorials), but **why we built it that way** — with context, alternatives, and what we'd do differently.

We started with the idea of an identity library and ended with a protocol featuring attestation chains, two verification modes, and three packages. Between those two points lies a series of decisions, each of which opened some possibilities and closed others. This document records the key forks for future contributors and for ourselves — a year from now, when details have worn away.

---

## DR-1: Determinism over storage

**Decision:** all keys are deterministically derived from a seed phrase. Nothing is stored.

**Context:** the first version stored generated keys in localStorage. It worked — until the first "what if the user opens the app on a second device?" question.

**Alternative we rejected:** server-side key synchronization (like most password managers). It solves multi-device, but creates a server-as-storage — a single point of compromise for all users.

**Solution:** seed phrase (BIP39) → deterministic HKDF tree. Same seed + same name → same keys. On any device, anywhere in the world.

**What it opened:**

- Free multi-device (no sync needed)
- Device autonomy (tree computed locally)
- Seed = sole identity carrier (paper)

**What it required:**

- Name canonicality (without NFKC normalization, "Work" and "work" would produce different keys — a separate story, DR-5)
- Derivation path versioning (info = "me2em/handle/v1/{name}" — version inside the string)
- Wipe discipline (transient material — raw key bytes in RAM)

**What we'd do differently:** we'd have implemented name canonicality from day one, not after a week of debugging desynchronization (more on DR-5).

---

## DR-2: Stateless sessions over server-side

**Decision:** a session is a signed token carrying all data inside. The server verifies the signature without a DB lookup.

**Context:** the classic approach — the server issues a session token (random ID) and stores the session in Redis. Verification = lookup in Redis by ID.

**Problem:** in Me2eM, **the client signs the token itself**. This means: the server cannot store the session before it's created — because the server doesn't know about the session until the first request.

**Solution:** the token contains everything needed (handleId, audience, scopes, exp, iat, jti). The server verifies the signature against the handle's pubkey (recalculated deterministically from the name in the token).

**What it opened:**

- Server without a DB for verification
- Multi-device without server-side session sync
- Test environments without Redis

**What it required:**

- Revocation via RevocationChecker (optional, for those who need it)
- Pubkey recalculation from name (possible thanks to DR-1)
- Mandatory `iat` in payload (otherwise "future-dated" verification broke)

**What we'd do differently:** we'd have made `iat` a mandatory field from the start. It wasn't there originally — the "token from the future" check worked through a hard future window, which silently limited session TTL to one hour. The bug was found only when writing tests with TTL > 3600.

---

## DR-3: Two verification modes

**Decision:** two ways to verify a session — Mode 1 (verifyStateless, direct) and Mode 2 (verifyAttested, via attestation chain).

**Context:** before attestations appeared, there was only Mode 1. It worked, but had a limitation: the verifier must hold the `Identity` — the private root key. For a third-party application, this is unacceptable.

**What required Mode 2:** an external service (driver app, corporate messenger) must verify sessions **without receiving the private root**. An attestation chain makes this possible: each level is signed by its parent, the chain traces up to the public root.

**What it opened:**

- Third-party verifiers (no private keys needed)
- Grant enforcement at verification (scopes, TTL, audiences)
- Branch revocation (revoke attestation jti — kills the whole branch)

**What it required:**

- attestation.ts module (issue, decode, verifySignature)
- Extended verification in Session.verifyAttested (nesting, name patterns, TTL caps)
- RevocationChecker that accepts attestation jtis (not just sessions)

**What we'd do differently:** we'd have built dual-mode support from the very beginning. We added Mode 2 in 0.6.0 when it became clear that a third-party verifier was a key requirement. If it had been in v0.1, attestation.ts would have been cleaner.

---

## DR-4: Attestations over roles in the DB

**Decision:** instead of classic DB roles (`user.role = 'admin'`) — attestation chains with grants.

**Context:** in a classic system, rights are stored in a DB. Changing rights = UPDATE in the DB. Revocation = DELETE from the DB.

**Problem:** in a decentralized system, there is no single DB. Who stores the rights? How does a verifier learn about the user's rights?

**Solution:** rights are parent-signed, embedded in the attestation chain, presented at every request. The verifier checks the chain: "root asserts that this key belongs to this name with this grant."

**What it opened:**

- Verification without a DB (all rights in the chain)
- Hierarchical delegation (child grant ⊆ parent grant)
- Branch revocation (revoke attestation jti = kill entire branch)

**What it required:**

- Discipline in grant design: `scopes` are exact strings, `subNamePatterns` trailing '*' only
- Extended validation: `AUDIENCE_NOT_PERMITTED`, `SCOPE_EXCEEDED`, `TTL_EXCEEDED`, `SESSION_OUTLIVES_ATTESTATION`
- Acceptance that Mode 1 does not enforce grants (a limitation, not a bug)

**What we'd do differently:** we wouldn't have mixed authorization scopes (`charge:start`) with permission names (`billing:admin`) in the same namespace. This created potential confusion at extension time. v1.0 should separate them.

---

## DR-5: Name canonicality

**Decision:** all names are normalized NFKC → lowercase → trim → validated against the pattern `/^[a-z0-9][a-z0-9._@-]{0,62}$/`.

**Context:** without normalization, `"Station-001"` and `"station-001"` would produce different keys on different platforms. Even worse: `"a/b"` and `"a.b"` would create potential path collisions.

**Problem:** key mismatch in cross-implementation tests — two independent implementations with "identical" names produced different keys. Determinism worked, but the inputs weren't canonical.

**Solution:** a single `normalizeName(raw: string): string` function — `NFKC → lowercase → trim` → validation. All derivation inputs pass through it. The `/` pattern is forbidden — it's a path separator.

**What it opened:**

- Determinism on all platforms
- Protection against homoglyph attacks (NFKC normalizes Unicode)
- Protection against path traversal (forbid `/`)

**What it required:**

- Abandoning support for names with Unicode letters, longer than 64 characters, and with `/`
- Tests for every Unicode edge case

**What we'd do differently:** we'd have deployed it from the first commit. We added canonicality in 0.6.0 — before that, `"Work"` and `"work"` were different handles.

---

## DR-6: Fresh salt for cacheKey on every login

**Decision:** cacheKey is derived with a new random salt on every login: `cacheKey = deriveCacheKey(seed, freshSalt)`. The salt is not a constant and not deterministic from the seed.

**Context:** cacheKey encrypts the context cache in IndexedDB. Two options were discussed:

- **SaltA:** fresh salt per login → compromise of epoch N cacheKey doesn't help in epoch N+1
- **SaltB:** deterministic salt from seed → cacheKey is constant; one compromise reads all epochs of cache

**What we chose and why:** SaltA. The cache contains only derived material — not seed or private keys — but "cache non-secret" shouldn't become the only line of defense. Fresh salt makes cacheKey compromise time-local: a stolen key reads one epoch's cache and dies at the next login boundary.

**The cost:** cache is invalidated on key change — but it was meant as a cache: all its contents are recomputed from the seed in milliseconds.

**What we'd do differently:** we'd have separated cache into material classes (derived-non-secret / ephemeral-sensitive) from day one — this is now fixed by rules, but emerged evolutionarily.

---

## DR-7: OTK mandatory — zero-fallback forbidden

**Decision:** if the PreKeyBundle has no OTK, X3DH **throws an error** instead of substituting zeros.

**Context:** the first implementation had a fallback:

```typescript
// ❌ Was:
let dh4: Uint8Array;
if (myOneTimeKey) {
  dh4 = await computeX25519SharedSecret(myOTK_x, theirEK_x);
} else {
  dh4 = new Uint8Array(32); // Fallback: zeros
}
```

**Problem:** the protocol doesn't fail, but every chat without OTK loses the freshness property — the secret is computed without the one-time contribution. Post-facto identity key + SPK compromise exposes the conversation.

**Solution:** OTK is mandatory. If the PreKeyBundle doesn't contain an OTK, X3DH **throws an error** instead of substituting zeros.

**What we'd do differently:** the same thing, only earlier. We found this deviation in someone else's implementation, not our own — but the principle is universal: **the protocol should fail, not degrade**. A full breakdown of this trap with test lessons — in the article [E2EE without storing private keys](/blog/e2ee-seed-derived-identity).

---

## What we'd do differently — summary

| Decision | When deployed | When needed |
|----------|--------------|-------------|
| NFKC name normalization | 0.6.0 | First commit |
| `iat` in payload | 0.7.0-alpha.1 | First commit |
| Dual-mode verification | 0.6.0 | 0.1.0 |
| X3DH with canonical order | 0.1.0-alpha.1 (`@me2em/crypto`) | First commit |
| OTK mandatory | 0.1.0-alpha.1 (`@me2em/crypto`) | First commit |
| Fresh salt on every login | 0.1.0-alpha.1 (`@me2em/react`) | 0.1.0-alpha.1 ✓ |
| Non-extractable persisted CryptoKey | 0.1.0-alpha.1 (`@me2em/react`) | 0.1.0-alpha.1 ✓ |

The common pattern: **cryptographic correctness must be built in from the first commit, because every refactoring of "we'll do it later" is a vulnerability window.** The last two rows confirm that this can happen too.

---

## What to read next

- **[Me2eM: Identity from a Seed Phrase](/blog/me2em-seed-derived-identity)** — deterministic tree
- **[Attestation Chains: Delegated Trust Without a Server](/blog/attestation-chains-delegated-trust)** — trust delegation (DR-3, DR-4 in action)
- **[E2EE Without Storing Private Keys](/blog/e2ee-seed-derived-identity)** — session-bound profile (DR-1, DR-6, DR-7 with test lessons)
- **[DevSecOps for a Cryptographic Monorepo](/ru/blog/devsecops-crypto-monorepo)** — how these decisions are guarded in CI
- **[BACKLOG.md](https://github.com/me2em-org/me2em-protocol/blob/main/BACKLOG.md)** — current backlog and plans (advisory)
