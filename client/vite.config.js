import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';

// Vite runs in middleware mode inside the Express server (see server/src/app.js),
// so there is no `server` block here - the app only ever listens on one port.
//
// unplugin-icons compiles the exact Iconify glyphs the Figma file uses
// (feather, material-symbols, mingcute, bx, file-icons, f7) into the bundle at
// build time, so nothing is fetched at runtime.
export default defineConfig({
  plugins: [react(), Icons({ compiler: 'jsx', jsx: 'react', autoInstall: false })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
