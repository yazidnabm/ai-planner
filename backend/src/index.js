import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { loadConfig } from './lib/config.js';
import { requireAuth } from './middleware/auth.js';
import tasksRouter from './routes/tasks.js';
import plannerRouter from './routes/planner.js';

const config = loadConfig();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());

// Public health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// All data routes are behind authentication
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/planner', requireAuth, plannerRouter);

// Serve the built frontend (single-service deployment: Express serves dist/).
// SPA fallback: any non-API route returns index.html so React Router works.
const distPath = path.resolve(__dirname, '../../frontend/dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler + global error handler
app.use((_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

app.listen(config.port, () => {
  console.log(`Backend berjalan di http://localhost:${config.port}`);
});
