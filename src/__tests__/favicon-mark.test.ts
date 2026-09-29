// src/__tests__/favicon-mark.test.ts
import { describe, expect, it } from 'vitest';
import { buildMarkSvg } from '../lib/favicon/svg.ts';

describe('brand mark SVG', () => {
  const svg = buildMarkSvg(16, '#0083fe');
  const maskable = buildMarkSvg(16, '#0083fe', { maskable: true });

  it('draws one Identity square and four Handle dots', () => {
    expect((svg.match(/<rect x="6" y="6" width="4" height="4"/g) ?? []).length).toBe(1);
    expect((svg.match(/<circle /g) ?? []).length).toBe(4);
  });

  it('keeps the badge invariant: rx = 3 with dots concentric to corner arcs', () => {
    expect(svg).toContain('rx="3"');
    expect(svg).toContain('cx="3" cy="3"');
    expect(svg).toContain('cx="13" cy="13"');
  });

  it('never emits text or font references (crawler-fallback regression)', () => {
    expect(svg).not.toMatch(/<text|font-family/i);
    expect(maskable).not.toMatch(/<text|font-family/i);
  });

  it('maskable variant is full-bleed and scaled into the safe zone', () => {
    expect(maskable).toContain('<rect width="16" height="16" fill="#0083fe"/>');
    expect(maskable).not.toContain('rx=');
    expect(maskable).toContain('scale(0.7)');
  });
});