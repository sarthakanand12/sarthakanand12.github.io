// Single source of truth for identity and nav. Edit here, not in components.
export const site = {
  name: 'Sarthak Anand',
  handle: 'sarthak anand',
  tagline: 'research notebook',
  role: 'ML Engineer at Convin',
  positioning:
    'ML Engineer at Convin — goal-directed dialogue agents, RL fine-tuning, and eval harnesses for production LLM systems.',

  /** Hero epigraph. Rendered as a pull quote, not used in metadata. */
  epigraph: {
    text:
      'A precipitous slope, a narrow river width, a fast and violent flow. ' +
      'The state of the water is perfectly decided yet, water obeys only itself. ' +
      'Water is only water. Thoroughly water. Absolutely free.',
    author: 'Miyamoto Musashi',
    source: 'Chapter 305: “The Water Path”',
  },
  links: {
    github: 'https://github.com/falconboi12',
    linkedin: 'https://www.linkedin.com/in/falconboi12',
    email: 'mailto:sarthak.anand12@gmail.com',
    resume: '/resume.pdf',
  },
} as const;

export const nav = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/research/', label: 'Research', icon: 'library' },
  { href: '/graph/', label: 'Graph', icon: 'graph' },
  { href: '/projects/', label: 'Projects', icon: 'projects' },
  { href: '/blogs/', label: 'Blogs', icon: 'note' },
] as const;

/** Trailing-slash-insensitive active check for nav highlighting. */
export function isActive(current: string, href: string): boolean {
  const norm = (s: string) => (s !== '/' ? s.replace(/\/+$/, '') : '/');
  const c = norm(current);
  const h = norm(href);
  return h === '/' ? c === '/' : c === h || c.startsWith(h + '/');
}
