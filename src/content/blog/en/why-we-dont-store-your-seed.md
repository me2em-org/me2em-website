---
title: "Why We Don't Store Your Seed — And Why It's a Feature, Not a Shortcoming"
description: "The seed phrase is the sole carrier of your identity. We don't store it. Why this is a deliberate decision, the price you pay for it, and why that price is more honest than the alternative."
publishedAt: 2026-09-28
author: "Me2eM Organization"
tags: ["security", "identity", "architecture"]
featured: false
locale: en
uid: "why-we-dont-store-your-seed"
---

> **Level: protocol philosophy.** The derivation mechanics are in [Me2eM: Identity from a Seed Phrase](/blog/me2em-seed-derived-identity); the custody practice is in [a password manager that stores nothing](/blog/me2em-deterministic-password-keeper).

Every service you use offers you "secure storage" of your data. Save contacts — we'll sync them. Upload photos — we'll back them up. Enter a card — we'll remember it for convenience.

Me2eM does the opposite: **we don't store your seed. Anywhere. In any form.**

Not encrypted in the cloud. Not encrypted in the browser. Not partially. Not "optionally with a security disclaimer." Never and nowhere.

If you lose your phone, reinstall your browser, clear all data, drown in an OS update — your seed is unharmed, because it was never on the device. It was on paper, in your safe, in your head. And it will stay there.

This article is about why this is a deliberate architectural decision, the price you pay for it, and why that price is more honest than the alternative.

## What a seed is — in one paragraph

A seed phrase is 12 or 24 words from a fixed dictionary of 2048 elements. The words encode 128–256 bits of entropy plus a checksum.

From a seed phrase, **the entire user key tree is deterministically derived**: root identity, isolated contexts (Handle), device components (SubHandle), passwords for services, encryption keys. Not stored — **computed** in milliseconds from the same words.

```text
12 words (paper)
  └─ 32 bytes of seed (transient in RAM)
       └─ IdentityPrivateKey (HKDF)
            └─ HandlePrivateKey("work")     ← computed on demand
            └─ HandlePrivateKey("personal") ← computed on demand
                 └─ SubHandlePrivateKey(...) ← computed on demand
```

One seed = the entire universe of keys. No other carrier is needed.

## Why we don't store seed — four reasons

### Reason 1: storage becomes a target

Wherever you store a seed — encrypted in the cloud, in the browser, in a protected enclave — that place becomes a **high-priority target**. Not for you personally — for the storage operator: envelopes of all users gathered in one place.

A slow KDF (Argon2id) only raises the cost of an attempt — it does not eliminate the threat. The attacker works offline, for as long as needed, on all envelopes in parallel. A weak or medium password will be brute-forced — it is a question of economics, not possibility.

And — crucially — **an envelope has no revocation mechanism**. A stolen envelope cannot be "annulled." It remains a target forever, as long as it exists.

### Reason 2: no revocation without centralization

Revocation in a distributed system is an intersection of interests:

- **Want instant revocation of a stolen seed?** A central registry is needed, which all verifiers check. A central registry = a centralized point of failure and trust. Contradicts the protocol's philosophy.
- **Want to change your seed?** The user must publish a new seed and notify all contacts. Contacts need to re-verify. Without infrastructure — infeasible.

In classical systems (JWT, OAuth) revocation is possible because the server controls token issuance. In a decentralized system the root key exists with the user — and no one can revoke it: no registry, no center, no button.

It is important not to confuse levels. **The seed is non-revocable — but branches are revocable.** Attestation chains allow the owner to instantly burn derived keys — handles and subhandles — with a single `jti` revocation, across all services simultaneously. Centralization does not return: what is revoked are not the root, but the signed delegations. Mechanics in [the article on instant revocation](/blog/revocation-checker-instant-revocation).

### Reason 3: false security is worse than none

If a seed storage offers "secure backup in the cloud" — the user starts thinking the seed no longer needs to be written on paper. And **they think correctly**: why, if there is a backup?

But a backup is not a replacement for paper:

- A service may shut down (startups close).
- A service may be breached (no one guarantees eternal security).
- The user's password may be weak.
- The device used to enter the password may be compromised.

If the backup disappears — the user loses the seed along with the paper they already threw away. This is the worst outcome: **a double point of failure where the user thinks there is only one**.

### Reason 4: transparency is a property, not a shortcoming

Deterministic derivation gives a property that cannot be obtained if the seed is stored somewhere:

**The user always knows where their key is.** Not "somewhere in our service's cloud," not "in an encrypted backup," not "on the device" — but **on paper**. If the paper is fine — the identity is fine. If the paper is lost — the identity is lost. Zero uncertainty.

## What the user gets

| Property | How it works |
|----------|--------------|
| **No dependency on any service** | A service may vanish — the seed remains. |
| **No data leakage** | Nothing to leak — keys are computed, not stored. |
| **Multi-device without sync** | The same seed on a new device = the same tree. |
| **No password for recovery** | Seed = password. Password = seed. Zero entities to recover. |
| **Full anonymity** | No email, no phone, no card — the seed is not tied to a person. |

## The price you pay

Honesty requires listing the price too:

| Price | Why |
|------|-----|
| **Lost seed = lost everything** | No recovery, no reset, no "forgot password — send an SMS." Seed lost — identity lost. |
| **Responsibility on the user** | Write on paper, store securely, don't photograph, don't store in cloud notes. |
| **Seed cannot be changed** | No "reset password." If the seed is compromised — a new identity is needed (new seed), and all connections are rebuilt. |

## Comparison with alternatives

| Model | Recovery | Vulnerability | Service dependency |
|-------|----------|---------------|-------------------|
| **Service password** | "Forgot password?" → email → SMS → new password | SMS interception, email breach, insider | Full |
| **Seed encrypted in cloud** | Password → cloud → decrypt | Cloud compromised + password brute force | Partial (needs cloud access) |
| **Seed on paper (Me2eM)** | Only the physical paper | Paper must be stored | **Zero** |

Cloud recovery is a convenient option, but its security hinges on the user's password. If the password is weak — offline brute-force of the envelope is a matter of time. If the password is strong — the user needs to remember it as carefully as a seed phrase. This is a trade-off, not a solution.

## What the user should do

Practical checklist after creating a seed phrase:

✅ **Required**:
- Write the 12 words with a pen on paper — and never in digital form.
- Read what you wrote. Check every word twice.
- If confused — take a clean sheet and write again.
- Store the paper where it won't be destroyed by water, fire, time.
- For critical identity — engraving on a metal plate and a second copy in another geolocation.

❌ **Never**:
- Don't photograph the seed phrase.
- Don't store in cloud notes.
- Don't send to yourself in a messenger.
- Don't store in a password manager — a vault storage is exactly the model we are moving away from (Reason 1).
- Don't show anyone — not even "support" (they will never ask).

## Seed is not a password. Seed is the sole carrier of identity

A password can be reset. A seed phrase cannot.

A password can be changed. A seed phrase cannot (but a new identity can be created).

A password is stored by the service in hashed form. A seed phrase is stored nowhere — not by us, not by anyone, except the user's paper.

The difference is fundamental. A password is an **authorization secret** for access to an account on a server. A seed is a **master secret** from which the entire user identity is derived.

## Who this approach suits

✅ **Suitable**:
- Users who value sovereignty and do not trust centralized storage.
- IoT scenarios where a device operates autonomously without a cloud.
- Developers who need determinism (the same seed on all devices = the same keys).
- Users who need anonymity.

❌ **Not suitable**:
- Users who will lose the paper and cannot recover it.
- Scenarios requiring centralized revocation and recovery.

## What to read next

- **[Why seed-phrase UX is so paranoid](/blog/me2em-seed-ux-react)** — how the @me2em/react package compensates for human errors
- **[Me2eM: Identity from a Seed Phrase](/blog/me2em-seed-derived-identity)** — deterministic key tree
- **[A password manager that stores nothing](/blog/me2em-deterministic-password-keeper)** — the same custody model in practice
- **[Instant revocation: revocation in a stateless world](/blog/revocation-checker-instant-revocation)** — why revocation does not require storing seed: branches are revocable, root is not
- **[`@me2em/core` on npm](https://www.npmjs.com/package/@me2em/core)** — implementation
