import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { themeColor } from '../lib/themeColor';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3-force';

/**
 * The only hydrated island on the site. 49 nodes and 147 edges — SVG and
 * d3-force, no canvas, no WebGL. Layer toggles for papers/projects/raw tags are
 * deliberately out of scope: concepts only. (SPEC §4)
 */

interface Node {
  id: string;
  label: string;
  count: number;
  theme: string | null;
  rawTags: string[];
  papers: string[];
}
interface Edge {
  source: string;
  target: string;
  weight: number;
  papers: string[];
}
interface PaperMeta {
  slug: string;
  title: string;
}
interface ProjectMeta {
  slug: string;
  title: string;
  concepts: string[];
}

interface Props {
  nodes: Node[];
  edges: Edge[];
  papers: Record<string, PaperMeta>;
  projects: ProjectMeta[];
  defaultMinWeight: number;
  /** Concept id to select on load, from ?c= */
  initial?: string | null;
}

type Sim = Node & { x: number; y: number; vx: number; vy: number; r: number };

const W = 900;
const H = 520;

// Themes get a hue from the site palette. Kept short and desaturated so the
// graph reads as one system rather than a pie chart.
// Theme colours live in src/lib/themeColor.ts — shared with the homepage map.

export default function Graph({
  nodes,
  edges,
  papers,
  projects,
  defaultMinWeight,
  initial = null,
}: Props) {
  // Threshold is fixed at the default backbone — no slider. (user-review.md)
  const minWeight = defaultMinWeight;
  // ?c=<concept> deep link, read on mount (the island is client:only, so
  // location is always available here).
  const [selected, setSelected] = useState<string | null>(() => {
    if (initial) return initial;
    if (typeof location === 'undefined') return null;
    const c = new URLSearchParams(location.search).get('c');
    return c && nodes.some((n) => n.id === c) ? c : null;
  });
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tick, setTick] = useState(0);

  const simRef = useRef<Simulation<Sim, undefined> | null>(null);
  const posRef = useRef<Map<string, Sim>>(new Map());

  const visibleEdges = useMemo(
    () => edges.filter((e) => e.weight >= minWeight),
    [edges, minWeight]
  );

  // Nodes with no edge at this threshold are the "reading gaps" — they leave
  // the canvas and appear in their own panel, which is the honest framing.
  const linkedIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of visibleEdges) {
      s.add(e.source);
      s.add(e.target);
    }
    return s;
  }, [visibleEdges]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => linkedIds.has(n.id)),
    [nodes, linkedIds]
  );

  const maxCount = useMemo(() => Math.max(...nodes.map((n) => n.count), 1), [nodes]);
  const maxWeight = useMemo(() => Math.max(...edges.map((e) => e.weight), 1), [edges]);

  // Re-run the simulation whenever the visible set changes. Positions persist
  // across threshold changes so nodes do not teleport.
  useEffect(() => {
    simRef.current?.stop();

    const simNodes: Sim[] = visibleNodes.map((n) => {
      const prev = posRef.current.get(n.id);
      return {
        ...n,
        x: prev?.x ?? W / 2 + (Math.random() - 0.5) * 240,
        y: prev?.y ?? H / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
        r: 6 + Math.sqrt(n.count / maxCount) * 20,
      };
    });
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    posRef.current = byId;

    const links = visibleEdges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ ...e }));

    const sim = forceSimulation<Sim>(simNodes)
      .force(
        'link',
        forceLink<Sim, any>(links)
          .id((d: any) => d.id)
          .distance((l: any) => 108 - Math.min(l.weight, 5) * 11)
          .strength((l: any) => Math.min(0.09 * l.weight, 0.6))
      )
      .force('charge', forceManyBody<Sim>().strength(-165).distanceMax(340))
      .force('center', forceCenter(W / 2, H / 2).strength(0.09))
      .force(
        'collide',
        forceCollide<Sim>().radius((d) => d.r + 7)
      )
      .alpha(1)
      .alphaDecay(0.022)
      .on('tick', () => {
        // Keep every node inside the viewBox. forceCenter pulls toward the
        // middle but does not bound, so without this the widest clusters
        // drift off-canvas and simply disappear.
        for (const n of simNodes) {
          // Labels are centred under the node, so the horizontal pad has to
          // cover half a label, not just the circle.
          const pad = n.r + 26; // room for the label under the circle
          n.x = Math.max(62, Math.min(W - 62, n.x));
          n.y = Math.max(n.r + 6, Math.min(H - pad, n.y));
        }
        setTick((t) => t + 1);
      });

    simRef.current = sim;
    return () => sim.stop();
  }, [visibleNodes, visibleEdges, maxCount]);

  const positions = posRef.current;
  const sel = selected ? nodes.find((n) => n.id === selected) ?? null : null;

  // Strongest links for the inspector, at the current threshold.
  const selLinks = useMemo(() => {
    if (!selected) return [];
    return edges
      .filter((e) => e.source === selected || e.target === selected)
      .sort((a, b) => b.weight - a.weight)
      .map((e) => ({
        id: e.source === selected ? e.target : e.source,
        weight: e.weight,
      }));
  }, [edges, selected]);

  const selProjects = useMemo(
    () => (selected ? projects.filter((p) => p.concepts.includes(selected)) : []),
    [projects, selected]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      nodes
        .filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            n.rawTags.some((t) => t.toLowerCase().includes(q))
        )
        .map((n) => n.id)
    );
  }, [nodes, query]);

  const neighbours = useMemo(() => {
    const focus = hover ?? selected;
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const e of visibleEdges) {
      if (e.source === focus) s.add(e.target);
      if (e.target === focus) s.add(e.source);
    }
    return s;
  }, [hover, selected, visibleEdges]);

  const dim = (id: string) => {
    if (matches && !matches.has(id)) return true;
    if (neighbours && !neighbours.has(id)) return true;
    return false;
  };

  return (
    <div class="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_290px]">
      {/* ── Controls ──────────────────────────────────────────────────── */}
      <aside class="space-y-5">
        <div>
          <label class="eyebrow block" for="cfind">
            Find
          </label>
          <input
            id="cfind"
            type="search"
            value={query}
            placeholder="concept or raw tag…"
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            class="mt-2 w-full rounded-[4px] border border-paper-300 bg-paper-50 px-2 py-1.5 text-[12.5px] focus:border-clay-600 focus:outline-none"
          />
          {matches && (
            <p class="tabular mt-1.5 text-[11px] text-ink-400">{matches.size} match(es)</p>
          )}
        </div>
      </aside>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <div class="card overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          class="block h-auto w-full touch-pan-y"
          role="application"
          aria-label="Concept graph"
          data-tick={tick}
        >
          <g>
            {visibleEdges.map((e) => {
              const a = positions.get(e.source);
              const b = positions.get(e.target);
              if (!a || !b) return null;
              const active =
                neighbours && (neighbours.has(e.source) || neighbours.has(e.target));
              const focus = hover ?? selected;
              const onPath =
                focus && (e.source === focus || e.target === focus);
              return (
                <line
                  key={`${e.source}-${e.target}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={onPath ? 'var(--graph-highlight)' : 'var(--graph-edge)'}
                  stroke-width={0.8 + (e.weight / maxWeight) * 3.4}
                  stroke-opacity={focus ? (onPath ? 0.85 : 0.14) : 0.5}
                  stroke-linecap="round"
                />
              );
            })}
          </g>

          <g>
            {visibleNodes.map((n) => {
              const p = positions.get(n.id);
              if (!p) return null;
              const isSel = selected === n.id;
              const faded = dim(n.id);
              const color = themeColor(n.theme);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  opacity={faded ? 0.2 : 1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(isSel ? null : n.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.label}, ${n.count} papers`}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(isSel ? null : n.id);
                    }
                  }}
                >
                  <circle
                    r={p.r}
                    fill={color}
                    fill-opacity={isSel ? 0.34 : 0.15}
                    stroke={color}
                    stroke-width={isSel ? 2.4 : 1.3}
                  />
                  {(p.r > 13 || isSel || hover === n.id) && (
                    <text
                      y={p.r + 11}
                      text-anchor="middle"
                      class="pointer-events-none"
                      font-size={10.5}
                      fill="var(--color-ink-700, #3d362b)"
                      style={{ fontWeight: isSel ? 600 : 400 }}
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Inspector ─────────────────────────────────────────────────── */}
      <aside class="space-y-4">
        {sel && (
          <>
            <div class="card px-4 py-4">
              <p class="eyebrow">Selected concept</p>
              <h3 class="mt-1.5 text-[16px] font-medium text-ink-900">{sel.label}</h3>
              <p class="tabular mt-1 text-[12px] text-ink-400">
                {sel.count} paper{sel.count === 1 ? '' : 's'} · {sel.rawTags.length} raw
                tag{sel.rawTags.length === 1 ? '' : 's'}
                {selProjects.length > 0 && ` · feeds ${selProjects.length} project`}
              </p>

              {selLinks.length > 0 && (
                <>
                  <p class="eyebrow mt-4 border-t border-paper-300 pt-3">Strongest links</p>
                  <ul class="mt-2 space-y-1">
                    {selLinks.slice(0, 5).map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(l.id)}
                          class="flex w-full items-center gap-1.5 text-left text-[12.5px] text-ink-700 hover:text-clay-600"
                        >
                          <span class="text-ink-400">→</span>
                          <span class="min-w-0 flex-1 truncate">
                            {nodes.find((n) => n.id === l.id)?.label}
                          </span>
                          <span class="tabular shrink-0 text-[11.5px] text-ink-400">
                            {l.weight}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p class="eyebrow mt-4 border-t border-paper-300 pt-3">
                Raw tags folded in
              </p>
              <ul class="mt-2 flex flex-wrap gap-1">
                {sel.rawTags.map((t) => (
                  <li key={t} class="chip">
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div class="card px-4 py-4">
              <p class="eyebrow">Papers ({sel.papers.length})</p>
              <ul class="mt-2 space-y-1.5">
                {sel.papers.map((s) => (
                  <li key={s}>
                    <a
                      href={`/research/?paper=${s}`}
                      class="block text-[12.5px] leading-snug text-ink-700 hover:text-clay-600"
                    >
                      {papers[s]?.title ?? s}
                    </a>
                  </li>
                ))}
              </ul>
              <a
                href={`/research/?concept=${sel.id}`}
                class="mt-3 inline-block text-[11.5px] text-clay-600 hover:text-ink-900"
              >
                filter the library by this concept →
              </a>
            </div>

            {selProjects.length > 0 && (
              <div class="backlink flex-col items-start">
                <p class="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                  Built with this
                </p>
                <ul class="mt-1.5 space-y-1">
                  {selProjects.map((p) => (
                    <li key={p.slug}>
                      <a href={`/projects/${p.slug}/`} class="text-[12.5px]">
                        ↗ {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
