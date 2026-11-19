/**
 * Framework-free operation log shared by every sandbox scenario. Scenario
 * logic (`src/lib/sandbox/*.ts`) and the sandbox UI both import the same
 * singleton, so log lines emitted during a protocol run show up in the
 * `<Logger>` panel. Ported from the standalone me2em-demo app.
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export type ScenarioTag = 'seed' | 'human' | 'satellite' | 'agent' | 'commerce' | 'sso' | 'ev';

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: string;
  scenario: ScenarioTag;
};

class Logger {
  private listeners: ((entry: LogEntry) => void)[] = [];
  private currentScenario: ScenarioTag = 'seed';

  setScenario(tag: ScenarioTag) {
    this.currentScenario = tag;
  }

  log(level: LogLevel, message: string, data?: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data,
      scenario: this.currentScenario,
    };
    console.log(`[Me2em ${level.toUpperCase()}]`, message, data || '');
    this.listeners.forEach((listener) => listener(entry));
  }

  info(message: string, data?: string) {
    this.log('info', message, data);
  }
  success(message: string, data?: string) {
    this.log('success', message, data);
  }
  warn(message: string, data?: string) {
    this.log('warn', message, data);
  }
  error(message: string, data?: string) {
    this.log('error', message, data);
  }

  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const logger = new Logger();
