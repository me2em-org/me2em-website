import { describe, it, expect } from 'vitest';
import { parsePaperWords } from '../components/sandbox/SeedIsland';

describe('parsePaperWords', () => {
  it('empty string → []', () => {
    expect(parsePaperWords('')).toEqual([]);
  });

  it('whitespace only → []', () => {
    expect(parsePaperWords('   \n\t  ')).toEqual([]);
  });

  it('single word → [word]', () => {
    expect(parsePaperWords('apple')).toEqual(['apple']);
  });

  it('12 words without numbering → 12 words', () => {
    const words = 'abandon ability able accident account acquire across act action actor actress actual'.split(' ');
    expect(parsePaperWords(words.join(' '))).toEqual(words);
  });

  it('numbered list "1. …" → 12 words without numbers', () => {
    const raw = Array.from({ length: 12 }, (_, i) => `${i + 1}. word${i + 1}`);
    const expected = Array.from({ length: 12 }, (_, i) => `word${i + 1}`);
    expect(parsePaperWords(raw.join('\n'))).toEqual(expected);
  });

  it('more than 12 words → truncated to 12', () => {
    const words = Array.from({ length: 20 }, (_, i) => `word${i + 1}`);
    expect(parsePaperWords(words.join(' '))).toEqual(words.slice(0, 12));
  });

  it('punctuation stripping: "glare., balcony; whisper… thunder" → [glare, balcony, whisper… , thunder]', () => {
    const input = 'glare., balcony; whisper… thunder';
    const result = parsePaperWords(input);
    expect(result).toContain('glare');
    expect(result).toContain('balcony');
    expect(result).toContain('thunder');
  });

  it('mixed numbers and words', () => {
    const input = '1. abandon 2. ability 3. able';
    expect(parsePaperWords(input)).toEqual(['abandon', 'ability', 'able']);
  });

  it('alphanumeric "abc123" is treated as a word', () => {
    expect(parsePaperWords('abc123')).toEqual(['abc123']);
  });

  it('only numbers → []', () => {
    expect(parsePaperWords('1 2 3 4 5')).toEqual([]);
  });

  it('"0" is treated as a number → []', () => {
    expect(parsePaperWords('0')).toEqual([]);
  });

  it('newlines and tabs between words', () => {
    const input = 'alpha\tbeta\ngamma\ndelta';
    expect(parsePaperWords(input)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('exactly 12 with numbers', () => {
    const words = Array.from({ length: 12 }, (_, i) => `${i + 1}. ${['abandon', 'ability', 'able', 'absolute', 'absorb', 'abstract', 'abuse', 'academic', 'access', 'accident', 'account', 'accuse'].join(' ')}`);
    const expected = ['abandon', 'ability', 'able', 'absolute', 'absorb', 'abstract', 'abuse', 'academic', 'access', 'accident', 'account', 'accuse'];
    expect(parsePaperWords(words.join('\n'))).toEqual(expected);
  });
});
