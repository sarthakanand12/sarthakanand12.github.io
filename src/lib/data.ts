import { getCollection, type CollectionEntry } from 'astro:content';
import graph from '../../data/graph.json';

/**
 * The join layer. Every page reads from here rather than touching collections
 * and graph.json directly, so the paper ↔ concept ↔ project relationships are
 * derived in exactly one place.
 */

export type GraphNode = (typeof graph.nodes)[number];
export type GraphEdge = (typeof graph.edges)[number];

export const graphData = graph;

const conceptById = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));
export const paperConcepts = graph.paperConcepts as Record<string, string[]>;

export function conceptLabel(id: string): string {
  return conceptById.get(id)?.label ?? id;
}
export function getConcept(id: string): GraphNode | undefined {
  return conceptById.get(id);
}

/**
 * A paper, with its derived concepts attached. No `entry`: papers are YAML
 * records with no body, so there is nothing to render() — see content.config.ts.
 */
export interface Paper {
  slug: string;
  data: CollectionEntry<'papers'>['data'];
  concepts: string[];
}

export interface Project {
  slug: string;
  data: CollectionEntry<'projects'>['data'];
  entry: CollectionEntry<'projects'>;
  /** Concepts reached through this project's papers, ranked by frequency. */
  concepts: string[];
}

export interface Blog {
  slug: string;
  data: CollectionEntry<'blogs'>['data'];
  entry: CollectionEntry<'blogs'>;
}

let _papers: Paper[] | null = null;
let _projects: Project[] | null = null;

export async function allPapers(): Promise<Paper[]> {
  if (_papers) return _papers;
  const entries = await getCollection('papers', ({ data }) => !data.draft);
  _papers = entries
    .map((entry) => ({
      slug: entry.id,
      data: entry.data,
      concepts: paperConcepts[entry.id] ?? [],
    }))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  // Fail loudly on a paper the graph has never heard of: it means a slug was
  // renamed by hand, which silently breaks backlinks.
  const unknown = _papers.filter((p) => !(p.slug in paperConcepts));
  if (unknown.length) {
    throw new Error(
      'Papers absent from graph.json (slug drift — re-export the graph from ' +
        'the vault, or restore the slug): ' +
        unknown.map((p) => p.slug).join(', ')
    );
  }
  return _papers;
}

export async function allProjects(): Promise<Project[]> {
  if (_projects) return _projects;
  const entries = await getCollection('projects');
  const papers = await allPapers();
  const bySlug = new Map(papers.map((p) => [p.slug, p]));

  _projects = entries
    .map((entry) => {
      const freq = new Map<string, number>();
      for (const slug of entry.data.papers) {
        const paper = bySlug.get(slug);
        if (!paper) {
          throw new Error(
            `Project "${entry.id}" references unknown paper slug "${slug}". ` +
              'Paper slugs are stable forever — check src/content/papers.yaml.'
          );
        }
        for (const c of paper.concepts) freq.set(c, (freq.get(c) ?? 0) + 1);
      }
      return {
        slug: entry.id,
        data: entry.data,
        entry,
        concepts: [...freq.entries()]
          .sort((a, b) => b[1] - a[1] || conceptLabel(a[0]).localeCompare(conceptLabel(b[0])))
          .map(([id]) => id),
      };
    })
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));

  return _projects;
}

export async function paperBacklinks(): Promise<Map<string, Project[]>> {
  const projects = await allProjects();
  const map = new Map<string, Project[]>();
  for (const pr of projects) {
    for (const slug of pr.data.papers) {
      const list = map.get(slug) ?? [];
      list.push(pr);
      map.set(slug, list);
    }
  }
  return map;
}

/**
 * Related papers: pure set intersection over concepts, ranked by overlap size.
 * No embeddings — that was contingent on abstract fetching, which is deferred.
 */
export async function relatedPapers(slug: string, limit = 5) {
  const papers = await allPapers();
  const self = papers.find((p) => p.slug === slug);
  if (!self || self.concepts.length === 0) return [];
  const mine = new Set(self.concepts);

  return papers
    .filter((p) => p.slug !== slug)
    .map((p) => {
      const shared = p.concepts.filter((c) => mine.has(c));
      return { paper: p, shared, overlap: shared.length };
    })
    .filter((r) => r.overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        a.paper.data.title.localeCompare(b.paper.data.title)
    )
    .slice(0, limit);
}

/** Theme facet counts, ordered by count desc — drives the facet rail. */
export async function themeCounts() {
  const papers = await allPapers();
  const counts = new Map<string, number>();
  for (const p of papers) counts.set(p.data.theme, (counts.get(p.data.theme) ?? 0) + 1);
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}

export async function statusCounts() {
  const papers = await allPapers();
  const counts = new Map<string, number>();
  for (const p of papers) counts.set(p.data.status, (counts.get(p.data.status) ?? 0) + 1);
  return counts;
}

/**
 * Blog posts, newest first. Authoring is not wired up yet, so this is normally
 * empty — the join exists so a post lands on its papers the moment one is added.
 *
 * The explicit `Blog[]` matters: inferred, the near-empty collection narrows to
 * `never` in blogs/[slug].astro's `Astro.props` and every `post.data` access
 * fails to type-check.
 */
export async function allBlogs(): Promise<Blog[]> {
  const entries = await getCollection('blogs', ({ data }) => !data.draft);
  return entries
    .map((entry) => ({ slug: entry.id, data: entry.data, entry }))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** paper slug -> blog posts written about it. */
export async function blogsByPaper() {
  const blogs = await allBlogs();
  const map = new Map<string, typeof blogs>();
  for (const b of blogs) {
    for (const slug of b.data.papers) {
      const list = map.get(slug) ?? [];
      list.push(b);
      map.set(slug, list);
    }
  }
  return map;
}

/**
 * Deliberately unsorted: courses render in the order they are written in
 * courses.yaml. Adding a sort here would silently override that file's order,
 * which is the only thing controlling it.
 */
export async function allCourses() {
  const entries = await getCollection('courses', ({ data }) => !data.draft);
  return entries.map((entry) => ({ slug: entry.id, data: entry.data }));
}

/**
 * Deliberately unsorted: certificates render in the order they are written in
 * certificates.yaml, same as allCourses() above.
 */
export async function allCertificates() {
  const entries = await getCollection('certificates', ({ data }) => !data.draft);
  return entries.map((entry) => ({ slug: entry.id, data: entry.data }));
}
