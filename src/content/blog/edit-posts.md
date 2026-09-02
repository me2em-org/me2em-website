---
title: "How to edit blog posts in Astro"
excerpt: "Learn how to edit posts in Astro"
featuredImage: "./images/edit-posts.jpg"
publishDate: "2025-02-22"
publish: true
categories: ["Theme Usage"]

seo:
  title: "How to edit posts in Astro"
  description: "Learn how to edit posts in Astro"
---

## Steps to Edit a Blog Post

### Accessing the File
Navigate to your blog post file in the **src/content/blog/** directory. The filename typically matches your post's URL slug (e.g., my-first-post.md).

### Editing Frontmatter
The frontmatter is the metadata section at the top of your markdown file, contained between the --- markers. Here's what you can modify:

**title**: The post's main heading  
**excerpt**: A brief summary of your post  
**featuredImage**: Path to the post's main image (automatically used for SEO too)  
**publishDate**: Original publication date  
**publish**: true  
**categories**: Array of relevant categories

```javascript
title: "How to edit blog posts in Astro"
excerpt: "Learn how to edit posts in Astro"
featuredImage: "./images/edit-posts.jpg"
publishDate: "2024-03-10"
publish: true
categories: ["Theme Usage"]

seo:
  title: "Custom SEO Title (Optional)"
  description: "Custom SEO Description (Optional)"
```

#### Image Paths

For the `featuredImage`, use a relative path to the image in your content folder:
- `"./images/my-image.jpg"` - Image in the blog/images folder

#### SEO Settings

The `seo` section is optional and allows you to customize how your post appears in search engines and social media:

- **title**: Custom title for SEO (if different from post title)
- **description**: Custom description for SEO (if different from excerpt)
- **image**: Custom image for SEO (if different from featured image)

Your featured image is automatically used for SEO and social sharing, so you typically don't need to specify a separate SEO image.

### Editing Content

Below the frontmatter will contain the content of the post. This content is rendered out on your slug page (**/src/pages/blog/[slug].astro**).

## Astro Docs

Astro contains great documentation on editing blog post content. Listed below are links to the relevant sections:

- [Astro Content](https://docs.astro.build/en/components/content/)
- [Astro Frontmatter](https://docs.astro.build/en/components/frontmatter/)
- [Astro Markdown](https://docs.astro.build/en/components/markdown/)