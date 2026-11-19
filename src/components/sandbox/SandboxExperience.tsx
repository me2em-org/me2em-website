/**
 * SandboxExperience — the single client island behind the Sandbox page. Owns
 * the sandbox session (root Identity + raw seed bytes) handed up by the seed
 * step, the active scenario tab, and the scenario/Logger layout under the
 * seed section. Copy arrives as one `sandbox` subtree prop from
 * SandboxView.astro (the sandbox i18n module); scenario components receive
 * their slice and take every reader-facing string from it.
 */
import { useCallback, useState } from 'react';
import {
  Bot,
  Briefcase,
  CreditCard,
  KeyRound,
  PlugZap,
  Satellite,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { Identity } from '@me2em/core';
import SeedIsland from './SeedIsland';
import Logger from './Logger';
import ScenarioHuman from './ScenarioHuman';
import type { SandboxCopy, ScenarioId, ScenarioTab } from './copy';

const SCENARIO_ICONS: Record<ScenarioId, LucideIcon> = {
  human: Briefcase,
  satellite: Satellite,
  agent: Bot,
  sso: KeyRound,
  ev: PlugZap,
  commerce: CreditCard,
};

const SCENARIO_ORDER: ScenarioId[] = ['human', 'satellite', 'agent', 'sso', 'ev', 'commerce'];

interface SandboxSession {
  identity: Identity;
  seedBytes: Uint8Array;
}

export default function SandboxExperience({ copy }: { copy: SandboxCopy }) {
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);

  const handleIdentityReady = useCallback((identity: Identity, seedBytes: Uint8Array) => {
    setSession({ identity, seedBytes });
  }, []);

  const handleScenarioSelect = useCallback((id: ScenarioId) => {
    setActiveScenario(id);
    document
      .getElementById('sandbox-scenario')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scenarioTabs: ScenarioTab[] = SCENARIO_ORDER.map((id) => {
    const Icon = SCENARIO_ICONS[id];
    return {
      id,
      tab: copy.scenarios[id].tab,
      tabDesc: copy.scenarios[id].tabDesc,
      icon: <Icon size={20} />,
    };
  });

  return (
    <>
      <SeedIsland
        seed={copy.sandboxSeed}
        scenarioTabs={scenarioTabs}
        activeScenario={activeScenario}
        onScenarioSelect={handleScenarioSelect}
        onIdentityReady={handleIdentityReady}
      />

      {/* Scenario stage + operation log, side by side on desktop. */}
      <div id="sandbox-scenario" className="flex scroll-mt-24 flex-col gap-6">
        {session ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              {activeScenario === 'human' && (
                <ScenarioHuman
                  identity={session.identity}
                  seedBytes={session.seedBytes}
                  copy={copy.scenarios.human}
                />
              )}
            </div>
            <Logger
              scenario={activeScenario ?? 'seed'}
              title={copy.log.title}
              emptyText={copy.log.empty}
            />
            <div className="flex items-center gap-2 text-xs text-foreground-subtle lg:col-span-3">
              <ChevronRight size={14} />
              <span>{copy.tabs.hint}</span>
            </div>
          </div>
        ) : (
          <Logger
            scenario="seed"
            title={copy.log.title}
            emptyText={copy.log.empty}
          />
        )}
      </div>
    </>
  );
}
