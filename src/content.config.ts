import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

/**
 * These schemas are the contract. A content file that violates one SHOULD fail
 * the build — do not add .optional()/.catch() to make a broken file pass; fix
 * the file.
 *
 * Note what is absent: `concepts`. Concepts are joined in from data/graph.json
 * via src/lib/data.ts and are never authored on a paper.
 */

/**
 * One YAML file, not a directory of empty-bodied markdown: same reasoning as
 * `courses` below. A paper is metadata — there is no per-paper route and
 * nothing calls render() on one, so a body would have nowhere to display.
 *
 * Notes about a paper live in a blog post that names its slug in `papers:`;
 * that renders as a link in both directions, so prose has a home without a
 * paper needing one.
 *
 * `id` is the permanent slug — project and blog backlinks reference it, and
 * allPapers() throws if one drifts out of data/graph.json. Never change one.
 */
const papers = defineCollection({
  loader: file('./src/content/papers.yaml'),
  schema: z.object({
    id: z.string().min(1),
    title: z.string().min(1),

    // Theme/subtheme mirror the vault's folder structure, exported alongside
    // the paper, so the UI needs no path parsing.
    theme: z.string().min(1),
    subtheme: z.string().nullable().default(null),

    // Raw tags, verbatim from the vault — including odd ones like `(IA)^3`.
    // Never normalised, retitled or deduplicated. Search facets only; the
    // graph is built from concepts, not these.
    tags: z.array(z.string()).default([]),

    // The one hand-added link.
    url: z.string().url().nullable().default(null),

    status: z.enum(['noted', 'read', 'skimmed']),
    confidence: z.enum(['confirmed', 'unconfirmed']),

    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    org: z.string().min(1),
    period: z.string().min(1),
    status: z.enum(['production', 'active', 'shipped', 'archived']),
    stack: z.array(z.string()).min(1),

    problem: z.string().min(1),
    approach: z.string().min(1),
    result: z.string().min(1),

    repo: z.string().url().nullable().default(null),
    writeup: z.string().nullable().default(null),

    featured: z.boolean().default(false),
    order: z.number().int().default(100),

    // The reverse backlink: paper slugs.
    papers: z.array(z.string()).default([]),

    // True when `result` still contains a placeholder metric. Surfaces a
    // visible flag in the UI so a placeholder can never ship silently.
    resultIsPlaceholder: z.boolean().default(false),
  }),
});

/**
 * Blog posts. Not wired up for authoring yet — the collection exists so a post
 * that names a paper in `papers` surfaces as a link in that paper's info card.
 */
const blogs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blogs' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().nullable().default(null),
    /** Paper slugs this post writes about. Drives the paper -> blog backlink. */
    papers: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** Courses and certificates are hand-authored credential lists. */

/**
 * The discipline a course belongs to. Drives the filter chips on the homepage.
 * Adding a value here is the only change needed to add a chip — the UI derives
 * the chip list from the entries themselves.
 */
const CATEGORIES = ['Civil', 'CSE'] as const;

/**
 * One YAML file, not a directory of empty-bodied markdown: a course is a name,
 * a grade and a category, with no prose to render and no detail page.
 *
 * Render order is the order entries appear in courses.yaml. `file()` preserves
 * it and allCourses() adds no sort, so the file reads as the page reads.
 *
 * Each entry needs an `id` — the array form of `file()` skips (with only a log
 * line) any item lacking one, so a missing id drops a course silently. It is
 * the entry key, not schema data, so it is validated here rather than declared.
 */
const courses = defineCollection({
  loader: file('./src/content/courses.yaml'),
  schema: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    category: z.enum(CATEGORIES),

    // Letter grade, rendered inline after the course name. Nullable because a
    // MOOC or audited course legitimately has none — absent means "not graded",
    // never "grade withheld", so it renders as nothing rather than a dash.
    grade: z.string().min(1).nullable().default(null),

    draft: z.boolean().default(false),
  }),
});

/**
 * One YAML file, not a directory of markdown: same reasoning as `courses`
 * above — a certificate is title/issuer/credentialId, no prose, no detail page.
 *
 * Render order is the order entries appear in certificates.yaml; `file()`
 * preserves it and allCertificates() adds no sort.
 *
 * Each entry needs an `id` — the array form of `file()` skips (with only a log
 * line) any item lacking one, so a missing id drops a certificate silently.
 */
const certificates = defineCollection({
  loader: file('./src/content/certificates.yaml'),
  schema: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    issuer: z.string().min(1),
    credentialId: z.string().nullable().default(null),
    draft: z.boolean().default(false),
  }),
});

export const collections = { papers, projects, blogs, courses, certificates };
