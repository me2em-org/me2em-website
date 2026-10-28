---
title: "Me2eM vs JWT vs OAuth: three trust models"
description: "JWT, OAuth and Me2eM solve the same task — authorization. But trust models are fundamentally different: who signs, who does the server trust, and what happens on compromise. A full comparison with code examples."
publishedAt: 2026-09-26
author: "Me2eM Organization"
tags: ["comparison", "security", "architecture"]
featured: true
locale: en
uid: "me2em-vs-jwt-vs-oauth"
---

JWT, OAuth 2.0 and Me2eM solve the same task: prove to a server that a client has the right to act. All three issue tokens, all three verify them on every request, all three promise security.

But beneath surface similarity — three fundamentally different trust models. And the choice between them is not a choice of technology, but a choice of **who owns the key** and **who can be wrong irreversibly**.

## Three models in one sentence each

**JWT** — the server signs the token with its secret or key. The server is omnipotent: it issues, revokes, interprets. The client receives a ready-made credential.

**OAuth 2.0** — the client delegates access to someone else's resources through an authorization server. The resource-owner server decides what to allow. The client acts within delegated bounds.

**Me2eM** — the user owns a seed phrase, from which all keys are deterministically derived. The client **signs its own tokens**, and the server only **verifies** them — directly (Mode 1) or against an attestation chain (Mode 2). No one owns the right to create someone else's tokens.

The difference is not cosmetic. It is three different answers to one question:

> **Who do you trust with the right to create a token with privileges?**

## Anatomy: what's inside a token

Let's start with the structure — it already reveals the philosophy.

### JWT (JSON Web Token)

```typescript
// Standard JWT structure:
// header.payload.signature (all three — base64url)

// Header:
{ "alg": "HS256", "typ": "JWT" }

// Payload:
{
  "sub": "user-12345",           // subject — ID from DB
  "name": "Alice",
  "role": "admin",               // permissions — written by server
  "iat": 1716912000,
  "exp": 1716915600
}

// Signature: HMAC-SHA256(header, payload, serverSecret)
// Or RSA/ECDSA — signature with server private key
```

### OAuth 2.0 Access Token

```typescript
// OAuth token — usually opaque:
// auth-server issues a random string and stores its value on its side
{
  "access_token": "at-9f2XkQ7Lm4Vn8pR3tW6yZ1cB5dE8gH2j"  // random string;
                                                           // value lives in auth-server DB
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}

// If JWT-as-access-token:
// same structure as above — but issued through OAuth flow
```

### Me2eM Session

```typescript
// Me2eM session payload:
{
  "hId": "base64url-handle-pubkey",
  "hNm": "work",
  // "hPath": ["work", "laptop-1"],  // SubHandle only: path in tree
  "aud": "app.example.com",          // for whom
  "scp": ["read", "write"],          // permissions — claimed by client,
                                      // verified by server
  "exp": 1716915600,
  "iat": 1716912000,
  "jti": "unique-ID"
}

// Signature: Ed25519(handle key, payload)
// Signed with HANDLE key, not server secret
```

**Key structural difference:** in JWT `sub` — a reference to DB (needs lookup to understand who). In OAuth `access_token` — usually opaque (needs introspection endpoint). In Me2eM `hId` — **the public key itself**, verifiable cryptographically without lookup.

## Who signs: server vs client

This is the main fork.

### JWT: server signs

```text
1. User logs in (password, OAuth provider, ...)
2. Server creates payload { sub, role, exp, ... }
3. Server signs payload WITH ITS SECRET
4. Client receives JWT and passes it on every request
5. Server verifies signature WITH ITS SECRET
```

The server is the sole source of tokens. It can create a token for any user with any permissions. The user **cannot** create a token themselves — and that is the strength of the model (server controls issuance), and its limitation (server must be online, server is the single point of compromise).

### Me2eM: client signs

```text
1. User enters seed phrase (once per session)
2. Handle is deterministically computed: private key
3. Client creates payload { hId, aud, scp, exp, ... }
4. Client SIGNS payload with HANDLE key
5. Server verifies signature against HANDLE public key
   (recalculated from name in token)
```

The server **cannot** create a token for a user — it does not have their private key. The user cannot create a token with elevated permissions — the payload is signed, changing fields without invalidating the signature is impossible. Permissions claimed by client and locked by signature, and in Mode 2 the verifier additionally compels them to attestation grants on every check.

> **One honest caveat about Mode 1.** Everything said about "server cannot" is unconditionally true for Mode 2, where the server holds only the public root. In Mode 1 the verifier holds the `Identity` — the root — and can therefore derive any key in the tree. That is why Mode 1 is intended only for infrastructure you already trust with issuance; for all external audiences — Mode 2.

### OAuth: intermediate option

OAuth 2.0 does not sign itself — it delegates. The client receives a token from the authorization server (authorization code flow, client credentials, etc.) and presents it to the resource server. The token can be opaque (introspection) or JWT (self-contained).

OAuth complexity lies in the number of entities: authorization server, resource server, client, resource owner, scopes, redirect URIs, refresh tokens. This is the price of flexibility for scenarios "app A wants access to user data on service B".

## Comparison table

| Aspect | JWT | OAuth 2.0 | Me2eM Session |
|--------|-----|-----------|---------------|
| **Who signs** | Server | Authorization server | **Client (handle)** |
| **Signature basis** | Server secret / key | N/A (opaque) or server key | Deterministic handle key |
| **Server session storage** | No (self-contained) | Yes (introspection / reference token) | No (stateless) |
| **Revocation** | No built-in (needs DB blacklist) | Yes (refresh flow, introspection) | Yes (jti + RevocationChecker) |
| **Identity** | `sub` string from DB | String from auth-server | **Public key** — verifiable |
| **Hierarchy** | No | No | Yes (hPath: Handle → SubHandle) |
| **Who can forge a token** | Someone who knows server secret | Auth-server; stolen token — use, not forge | Someone who knows handle private key |
| **Pubkey recalculation** | Not needed | Not needed | Yes — from name in token (Mode 1) |
| **Anonymity** | Low (`sub` — DB identifier) | Low (client is identifiable) | High (no email/phone link) |

## Trust model: who trusts whom

### JWT — trust to the server entirely

```text
User → trusts → Server → signs → Token
                                    ↓
                              Server can:
                              - issue any permissions
                              - revoke any session
                              - read payload (it is not encrypted)
                              - lose secret → all tokens compromised
```

### OAuth — trust to three parties

```text
User → trusts → Auth-server → issues token
            → trusts → Resource-server → verifies token
            → trusts → Client → will not exceed scope
```

### Me2eM — trust to cryptography

```text
User → owns → Seed phrase → deterministically → all keys
Client → signs → token → presents
Server → verifies → signature + attestations → public root (Mode 2)
        ← server CANNOT create someone else's token — only verify
        ← payload content is open, but cannot be forged
```

## Leak: what happens

The key question when choosing a model: what happens on compromise.

### JWT: server secret leak

```text
Secret leaked → attacker can issue TOKEN FOR ANY USER
            → with any permissions, any exp, any sub
            → until secret rotation
            → without trace (no creation logs)
Mitigation: secret rotation → all JWTs become invalid → all
            users logged out
```

### Me2eM: handle key leak

```text
Handle private key leaked → attacker can sign sessions FOR THIS
                           HANDLE (within its permissions)
Mitigation 1: revoke handle attestation (Mode 2) — instantly kills
              current and future sessions across all services
Mitigation 2: short TTL (recommendation — up to an hour) — attack
              window limited
Risk contained to HANDLE — other handles of the same user unaffected
```

### Me2eM: seed leak

```text
Seed leaked → attacker derives ENTIRE TREE: all handles, all keys
            → full identity compromise
            → no rotation: determinism always reproduces same keys
Mitigation: seed on paper only, never on device or cloud;
             passphrase ("25th word") — second degree of freedom: phrase
             without codeword produces a different (empty to attacker)
             identity
```

## Code: one scenario, three implementations

Scenario: user wants to access an API. Let's see what each approach looks like.

### JWT

```typescript
// Server:
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

// Verification on every request:
function authenticate(req) {
  const payload = jwt.verify(req.headers.authorization, SERVER_SECRET);
  // Look up user in DB to confirm role still valid
  const user = await db.users.findById(payload.sub);
  return user;
}
```

### OAuth 2.0

```typescript
// Step 1: redirect to auth-server
res.redirect(`https://auth.example.com/authorize?` +
  `response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read`);

// Step 2: exchange code for token
const token = await fetch('https://auth.example.com/token', {
  method: 'POST',
  body: `grant_type=authorization_code&code=${code}&client_id=${CLIENT_ID}`
});

// Step 3: every request — introspection or local JWT verify
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

// Single entry — seed phrase (on paper). No registration:
// all handles already exist, they are deterministic.
const identity = await Identity.fromSeed(seedBytes);
const handle = await identity.deriveHandle('work');

// Session creation (on client, no server):
const session = await Session.create(handle, {
  audience: 'app.example.com',
  scopes: ['read', 'write'],
  ttl: 3600,
});

// Verification (on server, no DB):
const verified = await Session.verifyStateless(
  session.token,
  serverIdentity,     // Identity — recalculates handle pubkey
  'app.example.com',  // RevocationChecker — optional 4th arg
);
// verified.scopes — permissions from token
// verified.handleName — who exactly
```

**Clarification on two modes.** The example above — Mode 1 (`verifyStateless`): the verifier holds `Identity` and recalculates keys from names in the token itself. For external audiences there is Mode 2 (`verifyAttested`): the server verifies the chain of parent attestations against the **public** root — then there is no server secret at all, and grants are compelled on every check. The table rows where Me2eM says "no server secret" refer to Mode 2; full breakdown — in the article [on attestation chains](/blog/attestation-chains-delegated-trust).

## Summary table

| Criterion | JWT | OAuth 2.0 | Me2eM Session |
|-----------|-----|-----------|---------------|
| **Who creates token** | Server | Auth-server | Client (handle) |
| **Server secret** | Needed | Needed | **Mode 1:** verifier holds root · **Mode 2:** not needed |
| **Stateless** | Yes (self-contained JWT) | Usually no (introspection) | Yes |
| **Revocation** | No built-in | Yes (introspection) | Yes (jti + RevocationChecker; branch-level in Mode 2) |
| **Permission hierarchy** | No | No (flat scope strings) | Yes (attestation chains) |
| **Identity** | `sub` string from DB | `sub` string | **Public key** |
| **Anonymity** | Low | Low | High |
| **Server secret leak** | Critical | Critical | **Mode 1:** critical (that is the root) · **Mode 2:** N/A |
| **Client key leak** | N/A (client stores no key) | N/A | Contained (one handle, short TTL, revocation in Mode 2) |
| **Multi-device** | Requires sync | Requires sync | Deterministic (same seed) |
| **Registration** | Email/phone | Email/phone | **Seed phrase only** |
| **Delegation** | Limited | Primary purpose | Attestation chains |

## When to choose what

| Situation | Recommendation |
|-----------|----------------|
| Standard web-app with user DB | JWT — battle-tested standard |
| Multi-service architecture with delegation | OAuth 2.0 — battle-tested standard |
| Cryptographic identity without DB | Me2eM Session |
| E2EE communication | Me2eM + @me2em/crypto |
| IoT devices with offline authorization | Me2eM + attestation chains |
| AI agents with deterministic keys | Me2eM + attestation chains |
| Anonymous users (no email/phone) | Me2eM |
| Standard SaaS without crypto requirements | JWT / OAuth — don't overcomplicate |

Me2eM does not replace JWT or OAuth — it solves a different problem. If you need anonymous, deterministic, delegatable identity without server secrets and without a DB — Me2eM does this natively. If you need standard authorization in a web app with a user DB — JWT or OAuth is sufficient and simpler.

## What to read next

- **[SSO without a user database](/blog/me2em-multi-app-sso)** — the extreme case: seed phrase as the platform account
- **[Stateless sessions: authorization without a database](/blog/stateless-sessions-no-database)** — what's inside the token and what seven checks a session passes
- **[Attestation chains: delegating trust without a server](/blog/attestation-chains-delegated-trust)** — Mode 2: delegation and revocation of branches
- **[Instant revocation: revocation in a stateless world](/blog/revocation-checker-instant-revocation)** — how jti revocation works
- **[Me2eM: identity from seed phrase](/blog/me2em-seed-derived-identity)** — the foundation
- **[`@me2em/core` on npm](https://www.npmjs.com/package/@me2em/core)** — implementation
