import { Identity, crypto as coreCrypto, type Handle } from '@me2em/core';
import { SolanaWalletTree } from '@me2em/solana';
import { base58 } from '@scure/base';
import { logger } from './logger';

export interface HumanWalletInfo {
  address: string;
  derivationPath: string;
  privateKeyBase58: string;
}

export interface HumanRootIdentity {
  pubKeyHex: string;
  privKeyHex: string;
}

export interface HumanPasswords {
  email: string;
  google: string;
  github: string;
}

export interface HumanHandleInfo {
  name: string;
  displayName: string;
  nickname: string;
  email: string;
  avatar: string;
  handleId: string;
  pubKeyHex: string;
  privKeyHex: string;
  passwords: HumanPasswords;
  channelKeyHex: string;
  wallet: HumanWalletInfo;
}

// Demo profiles: the same human behind three isolated contexts.
// `.example` domains (RFC 2606) mark these addresses as demo-only.
export const DEMO_PROFILES: Record<
  string,
  { displayName: string; nickname: string; email: string; avatar: string }
> = {
  work: {
    displayName: 'Alex Morgan',
    nickname: '@alex.morgan',
    email: 'a.morgan@meridian-corp.example',
    avatar: '💼',
  },
  family: {
    displayName: 'Papa Lex',
    nickname: '@dad.alex',
    email: 'alex.family@postbox.example',
    avatar: '🏡',
  },
  gym: {
    displayName: 'IronLex',
    nickname: '@iron.lex',
    email: 'ironlex@fitverse.example',
    avatar: '💪',
  },
};

export const CONTEXT_ORDER = ['work', 'family', 'gym'] as const;
export type ContextName = (typeof CONTEXT_ORDER)[number];

// Wallet derivation index per context — deterministic regardless of the
// order in which the user creates the handles in the demo.
const CONTEXT_WALLET_INDEX: Record<string, number> = { work: 0, family: 1, gym: 2 };

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Demo-only fallback per user request: random placeholder shown if the
// official audit derivation is somehow unavailable in a given build.
function randomKeyBytes(): Uint8Array {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf;
}

/**
 * Staged engine: the user creates handles one at a time — work first,
 * then family, then gym — matching the progressive style of the other
 * scenarios. Every derivation is deterministic from the same seed.
 */
export class HumanEngine {
  private identity: Identity | null = null;
  private tree: SolanaWalletTree | null = null;
  private root: HumanRootIdentity | null = null;
  private rootPriv: Uint8Array | null = null;

  dispose(): void {
    try {
      this.tree?.dispose();
    } catch {
      /* already disposed */
    }
    this.tree = null;
    this.identity = null;
    this.root = null;
    this.rootPriv?.fill(0);
    this.rootPriv = null;
  }

  getRoot(): HumanRootIdentity | null {
    return this.root;
  }

  async init(identity: Identity, seedBytes: Uint8Array): Promise<HumanRootIdentity> {
    logger.setScenario('human');
    this.dispose();
    this.identity = identity;

    logger.info(
      'Deriving master private key (HKDF-SHA256, info=me2em/identity/v1/root)…',
    );
    // Official audit path from @me2em/core: deriveRootKey reproduces exactly
    // the key Identity.fromSeed holds (TSDoc: "reproduce or audit").
    let rootPrivKey: Uint8Array;
    try {
      rootPrivKey = coreCrypto.deriveRootKey(seedBytes);
    } catch {
      logger.warn('deriveRootKey unavailable — showing a random placeholder key');
      rootPrivKey = randomKeyBytes();
    }

    this.root = {
      pubKeyHex: toHex(identity.getPublicKey()),
      privKeyHex: toHex(rootPrivKey),
    };
    this.rootPriv = rootPrivKey;
    this.tree = SolanaWalletTree.fromSeed(seedBytes);
    logger.success('Root Identity ready — handles derive from it one by one');
    return this.root;
  }

  /** Derive ONE context handle (its profile, keys, passwords, wallet). */
  async deriveContext(name: ContextName): Promise<HumanHandleInfo> {
    if (!this.identity || !this.tree || !this.root) {
      throw new Error('run init first');
    }
    logger.setScenario('human');
    const profile = DEMO_PROFILES[name];

    logger.info(`Deriving Handle "${name}" from root Identity…`);
    const handle: Handle = await this.identity.deriveHandle(name, {
      displayName: profile.displayName,
    });

    let handlePrivKey: Uint8Array;
    try {
      handlePrivKey = coreCrypto.deriveHandleKey(
        this.rootPriv as Uint8Array,
        name,
      );
    } catch {
      logger.warn(`deriveHandleKey("${name}") unavailable — random placeholder`);
      handlePrivKey = randomKeyBytes();
    }

    const wallet = await this.tree.deriveWallet(CONTEXT_WALLET_INDEX[name]);
    const privateKeyBase58 = base58.encode(wallet.privateKey);
    wallet.privateKey.fill(0); // wipe per API contract (fresh buffer)

    logger.success(
      `Handle "${name}" derived`,
      `wallet ${wallet.derivationPath} → ${wallet.address.slice(0, 8)}…`,
    );

    return {
      name,
      displayName: profile.displayName,
      nickname: profile.nickname,
      email: profile.email,
      avatar: profile.avatar,
      handleId: handle.getId(),
      pubKeyHex: toHex(handle.getPublicKey()),
      privKeyHex: toHex(handlePrivKey),
      // Same services, different contexts — each Handle produces its own
      // deterministic passwords even for the same service name.
      passwords: {
        email: handle.derivePassword(profile.email, { byteLength: 16 }),
        google: handle.derivePassword('Google', { byteLength: 16 }),
        github: handle.derivePassword('Github', { byteLength: 16 }),
      },
      channelKeyHex: toHex(handle.deriveChannelKey(name)),
      wallet: {
        address: wallet.address,
        derivationPath: wallet.derivationPath,
        privateKeyBase58,
      },
    };
  }
}
