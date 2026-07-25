import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const projectRoot = dirname(fileURLToPath(import.meta.url))

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Runs our Netlify Functions directly inside the Vite dev server, so `npm run dev`
// keeps working end-to-end without needing the Netlify CLI locally.
function netlifyFunctionsDevPlugin() {
  const routes = [
    ['/.netlify/functions/analyzeMove', '/netlify/functions/analyzeMove.js'],
    ['/.netlify/functions/weaknessSummary', '/netlify/functions/weaknessSummary.js'],
  ];

  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      for (const [routePath, modulePath] of routes) {
        server.middlewares.use(routePath, async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            const body = await readBody(req);
            const { handler } = await server.ssrLoadModule(modulePath);
            const result = await handler({ httpMethod: 'POST', body });
            res.statusCode = result.statusCode;
            const headers = result.headers || { 'Content-Type': 'application/json' };
            for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
            res.end(result.body);
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err?.message || err) }));
          }
        });
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  process.env.LLM_API_KEY = process.env.LLM_API_KEY || env.LLM_API_KEY || '';
  process.env.LLM_API_URL = process.env.LLM_API_URL || env.LLM_API_URL || '';
  process.env.LLM_MODEL = process.env.LLM_MODEL || env.LLM_MODEL || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      netlifyFunctionsDevPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg'],
        manifest: {
          id: '/',
          name: 'מאמן השחמט שלי',
          short_name: 'מאמן שחמט',
          description: 'שפרו את דירוג האלו שלכם באמצעות ניתוח טעויות בזמן אמת עם מאמן שחמט מבוסס AI ומנוע Stockfish מקומי.',
          lang: 'he',
          dir: 'rtl',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // The Stockfish engine files are large and rarely change - cache them
          // so the app can re-launch and analyze offline once installed.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
      }),
    ],
  };
})
