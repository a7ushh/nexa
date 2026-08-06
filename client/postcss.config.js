import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const here = path.dirname(fileURLToPath(import.meta.url));

// Tailwind resolves `tailwind.config.js` from process.cwd() by default. The dev
// server runs from the repository root (Vite is Express middleware there), while
// `npm run build -w client` runs from client/ - so the path is pinned explicitly
// to keep both working.
export default {
  plugins: [tailwindcss({ config: path.join(here, 'tailwind.config.js') }), autoprefixer],
};
