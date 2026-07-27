// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';


// 🟢 1. 文章 Collection
const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.string().or(z.date()).optional(),
    category: z.string().default('Uncategorized'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    readTime: z.string().default('5 min read'),
  }),
});

// 🟢 2. 音樂 Collection
const musicCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/music' }),
  schema: z.object({
    title: z.string().optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    audioUrl: z.string().optional(),
    lyricUrl: z.string().optional(),
    coverUrl: z.string().optional(),
  }),
});

// 🟢 3. 朋友圈/動態 Collection
const momentsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
  schema: z.object({
    day: z.string(),
    month: z.string(),
    title: z.string(),
    subtitle: z.string(),
    time: z.string(),
    location: z.string().optional(),
    thumbnail: z.string(),
    images: z.array(z.string()).default([]),
    likes: z.array(z.string()).default([]),
    comments: z.array(
      z.object({
        user: z.string(),
        text: z.string()
      })
    ).default([]),
  }),
});

export const collections = {
  posts: postsCollection,
  music: musicCollection,
  moments: momentsCollection,
};