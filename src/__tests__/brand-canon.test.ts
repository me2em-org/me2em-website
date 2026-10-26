/**
 * Brand-canon test — TЗ-GEO-1 §5.3.
 *
 * Канон (§0.6): Me2eM — проза; me2em — машинные контексты; Me2em — запрещена.
 * Этот тест проверяет только словари i18n (контент подключается к канон-гейту
 * в Этапах 1/3/4).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROHIBITED = /Me2em(?![A-Za-z])/;

const dicts = ['en', 'ru', 'zh'] as const;

describe('brand canon — no prohibited "Me2em" form in i18n dictionaries', () => {
  for (const lang of dicts) {
    it(`${lang}.json does not contain "Me2em"`, () => {
      const raw = readFileSync(
        join(process.cwd(), 'src/i18n', `${lang}.json`),
        'utf8'
      );
      expect(PROHIBITED.test(raw), `${lang}.json contains prohibited "Me2em"`).toBe(false);
    });
  }

  it('en.json contains "Me2eM" (positive control)', () => {
    const raw = readFileSync(
      join(process.cwd(), 'src/i18n', 'en.json'),
      'utf8'
    );
    expect(raw).toContain('Me2eM');
  });

  it('ru.json contains "Me2eM" (positive control)', () => {
    const raw = readFileSync(
      join(process.cwd(), 'src/i18n', 'ru.json'),
      'utf8'
    );
    expect(raw).toContain('Me2eM');
  });
});
