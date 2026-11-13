import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './config.js';

serve({ fetch: app.fetch, port: config.port }, (i) => console.log(`API Laundry berjalan di http://localhost:${i.port}/api/v1`));
