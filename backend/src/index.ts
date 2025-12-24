import express, { Request, Response } from 'express';
import cors from 'cors';
import autoImportRouter from './routes/admin/autoImport.js';
import bunnyPatchRouter from './routes/admin/bunnyPatch.js';

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-ADMIN-TOKEN'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.use('/api/admin', autoImportRouter);
app.use('/api/admin', bunnyPatchRouter);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ANIRIAS backend listening on ${PORT}`);
});
