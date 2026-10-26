/**
 * JSON-LD schema tests — TЗ-GEO-1 §4.7.
 *
 * Round-trip JSON parse of every schema constructor, structural asserts on
 * fields that must never drift (pricing, licensing, author data, ordering).
 */
import { describe, it, expect } from 'vitest';
import siteConfig from '../config/site.config';
import {
  createWebsiteSchema,
  createOrganizationSchema,
  createSoftwareApplicationSchema,
  createAuthorPersonSchema,
  createBlogPostSchema,
  createFAQSchema,
  resolveAuthorForSchema,
} from '../lib/schema';

describe('JSON-LD schemas', () => {
  it('SoftwareApplication — fields from siteConfig, Apache-2.0, free', () => {
    const schema = createSoftwareApplicationSchema();
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.name).toBe(siteConfig.name);
    expect(schema.url).toBe(siteConfig.url);
    expect(schema.description).toBe(siteConfig.description);
    expect(schema.applicationCategory).toBe('DeveloperApplication');
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.offers.price).toBe('0');
    expect(schema.offers.priceCurrency).toBe('USD');
    expect(schema.license).toBe('https://www.apache.org/licenses/LICENSE-2.0');
    // Round-trip: serialise and parse back
    const parsed = JSON.parse(JSON.stringify(schema));
    expect(parsed.offers.price).toBe('0');
    expect(parsed.license).toContain('LICENSE-2.0');
  });

  it('author Person — sameAs ×3, no email/telephone/image', () => {
    const schema = createAuthorPersonSchema();
    expect(schema['@type']).toBe('Person');
    expect(schema.name).toBe('Serge Lubimov');
    expect(schema.jobTitle).toBe('Author & maintainer of the Me2eM protocol');
    expect(schema.sameAs).toHaveLength(3);
    expect(schema.knowsAbout).toBeDefined();
    expect(schema.knowsAbout).toContain('seed phrase');
    // No PII fields
    expect(schema).not.toHaveProperty('email');
    expect(schema).not.toHaveProperty('telephone');
    expect(schema).not.toHaveProperty('image');
    // Round-trip
    const parsed = JSON.parse(JSON.stringify(schema));
    expect(parsed.sameAs).toHaveLength(3);
  });

  it('BlogPosting with serge-lubimov — resolved author data', () => {
    const author = resolveAuthorForSchema('serge-lubimov');
    expect(author.name).toBe('Serge Lubimov');
    expect(author.url).toBe('https://selub.github.io');
    expect(author.sameAs).toHaveLength(3);
    expect(author.sameAs).toContain('https://www.linkedin.com/in/serge-lubimov');
    expect(author.sameAs).toContain('https://github.com/selub');

    const schema = createBlogPostSchema({
      title: 'Test Post',
      description: 'A test',
      url: 'https://example.com/test',
      image: 'https://example.com/test.png',
      datePublished: new Date('2025-01-01'),
      author,
    });
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema.author.name).toBe('Serge Lubimov');
    expect(schema.author.url).toBe('https://selub.github.io');
    expect(schema.author.sameAs).toHaveLength(3);
  });

  it('BlogPosting with "Team" — fallback to slug as name', () => {
    const author = resolveAuthorForSchema('Team');
    expect(author.name).toBe('Team');
    expect(author.url).toBe(siteConfig.url);
    expect(author.sameAs).toBeUndefined();
  });

  it('FAQPage — round-trip preserves questions', () => {
    const faqs = [
      { question: 'What?', answer: 'Something.' },
      { question: 'How?', answer: 'Like this.' },
    ];
    const schema = createFAQSchema(faqs);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0].name).toBe('What?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('Something.');
    // Round-trip
    const parsed = JSON.parse(JSON.stringify(schema));
    expect(parsed.mainEntity[1].name).toBe('How?');
  });

  it('HomeView schema order — WebSite is first with url field', () => {
    const schemas = [
      createWebsiteSchema(),
      createOrganizationSchema(),
      createSoftwareApplicationSchema(),
    ];
    const firstWithUrl = schemas.find((s) => 'url' in s);
    expect(firstWithUrl).toBe(schemas[0]);
    expect(new URL(firstWithUrl!.url as string).origin).toBe(
      new URL(siteConfig.url).origin
    );
  });
});
