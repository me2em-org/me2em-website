---
title: "How to add/remove categories"
excerpt: "Learn how to add/remove categories"
featuredImage: "./images/update-categories.jpg"
publishDate: "2025-02-22"
publish: true
categories: ["Theme Usage"]

seo:
  title: "How to add/remove categories"
  description: "Learn how to add/remove categories"
  image: "./images/update-categories.jpg"
---

Categories are a crucial part of organizing your content and helping users navigate your site. This post will guide you through the process of editing categories in your theme, using the `categories.ts` file.

## Understanding the categories.ts File

The `categories.ts` file is where your theme's categories are defined. It's a TypeScript file that exports an array of category objects. Each object typically includes:

- `name`: The display name of the category.
- `slug`: A URL-friendly version of the name (used in URLs).
- `description`: A brief description of the category.

Here's an example of what a category object looks like:

```typescript
export const categories = [
  { name: 'Category 1', slug: 'category-1', description: 'Description of Category 1' },
  { name: 'Category 2', slug: 'category-2', description: 'Description of Category 2' },
];
```

## Modifying a Category

1. Open the `categories.ts` file.
2. Find the category you want to modify and change its `name`, `slug`, or `description` properties.

For example, to update the description of the "Tech" category:

```typescript
export const categories = [
  { name: 'Tech', slug: 'tech', description: 'All things tech-related' },
  { name: 'Design', slug: 'design', description: 'Design tips and tutorials' },
];
```

## Adding a New Category

1. Open the `categories.ts` file.
2. Add a new object to the array with the desired `name`, `slug`, and `description`.

For example, to add a new category called "Marketing":

```typescript
export const categories = [
  ...existingCategories,
  { name: 'Marketing', slug: 'marketing', description: 'Marketing tips and tutorials' },
];
```