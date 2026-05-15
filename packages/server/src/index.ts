import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

const port = 3000;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });