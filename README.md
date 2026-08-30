# Research notebook

Static Astro site — a portfolio built around a reading library: the papers, how the concepts connect, and which projects were grounded in which research.
Deployed to GitHub Pages by [.github/workflows](.github/workflows) on push to `main`.

## Setup

```bash
npm install
npm run dev            # → localhost:4321
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :4321 |
| `npm run build` | Static build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run check` | Type/content-schema check |

## Where things go

| What | Where |
|---|---|
| Résumé | `public/resume.pdf` |
| Profile picture | `public/profile.jpg` |
| Cover photo | `public/cover.jpg` |
| Name, links, nav | `src/site.ts` |
| Projects | `src/content/projects/*.md` — one file per project |
| Papers | `src/content/papers.yaml` — one list, grouped by theme |
| Blogs | `src/content/blogs/*.md` — one file per post |
| Courses | `src/content/courses.yaml` — one list, render order = file order |
| Certificates | `src/content/certificates.yaml` — one list, render order = file order |
| Concept graph | `data/graph.json` — exported from the vault, not built here |

Field names for each are in [src/content.config.ts](src/content.config.ts).

## Data flow

The reading vault is upstream and owns everything about the papers — the folder structure, the tags, and the concept graph built from them. 
This repo only displays that export, and adds the one relationship it owns: which project was grounded in which paper.

```
vault ──► src/content/papers.yaml   (title, theme, subtheme, tags, url, status)
      ──► data/graph.json           (concept nodes, edges, paper → concepts)

here  ──► src/content/projects/*.md  `papers: [slug]`  ← the backlink
      ──► src/content/blogs/*.md     `papers: [slug]`  ← notes about a paper
```

A paper is metadata, not a page: there is no `papers/[slug]` route and no prose
on a record. Notes about a paper go in a blog post naming its slug in `papers:`,
which renders as a link in both directions — the post lists its papers, and the
paper's panel lists the posts.

[src/lib/data.ts](src/lib/data.ts) is the only place these are joined.

Three vocabularies, deliberately separate:

| Layer | Source | Used for |
|---|---|---|
| `tags` | `papers.yaml`, verbatim from the vault | search text only |
| concepts | `graph.json`, keyed by paper slug | graph nodes, related papers, project → concept rollup |
| `theme` / `subtheme` | `papers.yaml`, mirrors the vault's folders | facet rail, breadcrumbs |

## Frontmatter

Projects:

```yaml
---
title: 'Project name'
org: 'Convin'
period: '2025'
status: production          # production | active | shipped | archived
stack: ['Python', 'vLLM']
problem: 'What was broken.'
approach: 'What you did.'
result: 'What changed.'
repo: https://github.com/you/repo   # or null
featured: false
order: 100
papers: ['paper-slug']              # paper ids from src/content/papers.yaml
---
```

Blogs:

```yaml
---
title: 'Post title'
date: 2026-08-21
summary: 'One line.'
papers: ['paper-slug']      # optional
---
```

Body of the `.md` file is the post.

Papers, courses and certificates are entries in their single YAML file. `id` is
the permanent slug — project and blog backlinks reference it:

```yaml
- id: 'agentic-harness-engineering'
  title: 'Agentic Harness Engineering'
  theme: 'Agents & Orchestration'   # mirrors the vault's folders
  subtheme: null
  tags: ['agent harness design', 'coding agents']   # search facets only
  url: 'https://arxiv.org/abs/...'  # or null
  status: read                      # read | noted | skimmed
  confidence: confirmed             # confirmed | unconfirmed
```


```yaml
- id: 'engineering-mathematics-i'
  title: 'Engineering Mathematics I'
  category: CSE             # Civil | CSE — drives the homepage filter
  grade: 'A-'               # or null when ungraded

- id: 'tensorflow-developer-certificate'
  title: 'TensorFlow Developer Certificate'
  issuer: 'Google'
  credentialId: 'TF-2025-84213'   # or null
```

## Rules

- `data/graph.json` is a vault export. Don't hand-edit it — regenerate it
  upstream and copy it in.
- Paper slugs are permanent. Changing one breaks project backlinks, and the build fails loudly if a slug drifts out of the graph.
- A paper's concepts come from `graph.json`, never from `papers.yaml`.
- Raw `tags` are search facets only. They are never graph nodes.
- No server-side anything. GitHub Pages serves static files only.
