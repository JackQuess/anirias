import express from 'express';
import autoImportRouter from './routes/admin/autoImport';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/admin', autoImportRouter);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ANIRIAS backend listening on ${PORT}`);
});
