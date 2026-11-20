import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import authRouter from './routes/auth.js';
import { loadUser } from './lib/auth.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // In production the API runs behind one reverse proxy (Caddy) on the same host.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  // Readiness also proves the database connection, which /api/health alone cannot.
  app.get('/api/health/ready', async (_request, response) => {
    try { await prisma.$queryRaw`SELECT 1`; response.json({ status: 'ok', database: 'ok' }); }
    catch { response.status(503).json({ status: 'degraded', database: 'unreachable' }); }
  });
  app.use(loadUser);
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    console.error(`[${request.id}]`, error);
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
