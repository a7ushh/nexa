import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';

import { env, clientDir, clientDistDir } from './config/env.js';
import { sessionMiddleware, idleTimeout } from './config/session.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { hostGate } from './middleware/hostGate.js';
import apiRouter from './routes/index.js';

/**
 * One origin, one port (steps.md: "Hosted on port:5000").
 *
 * In development Vite is mounted as Express middleware rather than run as its
 * own server, so HMR works without a second port and the OAuth redirect has a
 * single possible target. In production the built client is served statically.
 */
export async function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // First, before anything that costs work. A refused request must not reach
  // express.json() - which would buffer up to 1mb of a body we are about to
  // discard - and above all must not reach sessionMiddleware: connect-pg-simple
  // issues a SELECT for every request carrying a grag.sid cookie, so gating
  // after it would turn a flood of bogus Host headers into a flood of database
  // round-trips. Helmet's headers on the 403 protect nothing: the response is a
  // fixed sentence with no user data and no scripts.
  app.use(hostGate);

  app.use(
    helmet({
      // Client and API share an origin; CSP is relaxed so the Google sign-in
      // redirect and Vite's injected dev styles work.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use('/api', idleTimeout);

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'grag-erp', env: env.nodeEnv });
  });

  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);

  if (env.isProduction) {
    const indexHtml = path.join(clientDistDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      throw new Error('client/dist is missing. Run "npm run build" before starting in production.');
    }
    app.use(express.static(clientDistDir, { index: false }));
    app.get('*', (req, res) => res.sendFile(indexHtml));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: clientDir,
      appType: 'spa',
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
    app.locals.vite = vite;
  }

  app.use(errorHandler);

  return app;
}
