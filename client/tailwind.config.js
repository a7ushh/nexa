import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Reads a token as `rgb(<channels> / <alpha>)` so opacity modifiers work. */
const token = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

// Absolute globs: Tailwind resolves relative content paths against
// process.cwd(), which differs between `npm run dev` (repo root) and
// `npm run build -w client` (client/).
/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(here, 'index.html'), path.join(here, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        offwhite: token('off-white'),
        surface: token('surface'),
        ink: token('ink'),
        navy: token('navy'),
        accent: token('accent'),
        'card-accent': token('card-accent'),
        'pin-box': token('pin-box'),
        edge: token('border'),
        outline: token('outline'),
        'table-head': token('table-head'),
        'icon-box': token('icon-box'),
        muted: token('muted'),
        calendar: token('calendar-accent'),
        'calendar-light': token('calendar-accent-light'),
        'calendar-surface': token('calendar-surface'),
        danger: token('danger'),
        ink_text: token('text'),
        body: token('text-body'),
        soft: token('text-soft'),
        'on-dark': token('text-on-dark'),
      },
      fontFamily: {
        // The navbar and wordmark stay Raleway; everything else - labels, data,
        // buttons, headings inside pages - is Source Code Pro.
        brand: ['Raleway', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Source Code Pro"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        mono: ['"Source Code Pro"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        note: ['12px', { lineHeight: '16px' }],
        data: ['14px', { lineHeight: '16px' }],
        label: ['16px', { lineHeight: '20px' }],
        title: ['20px', { lineHeight: '26px' }],
        // The Figma frame sets 26px, which reads oversized at real viewport
        // widths; 19px keeps the proportions without dominating the page.
        nav: ['19px', { lineHeight: '24px' }],
        heading: ['32px', { lineHeight: '40px' }],
        display: ['40px', { lineHeight: '48px' }],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        field: 'var(--radius)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        navbar: 'var(--navbar-height)',
        rail: 'var(--rail-width)',
        panel: 'var(--filter-panel-width)',
      },
      letterSpacing: {
        brand: 'var(--brand-tracking)',
      },
    },
  },
  plugins: [],
};
