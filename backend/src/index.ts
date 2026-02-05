import express, { Request, Response } from 'express';
import cors from 'cors';
import autoImportRouter from './routes/admin/autoImport.js';
import bunnyPatchRouter from './routes/admin/bunnyPatch.js';
import hybridImportRouter from './routes/admin/hybridImport.js';
import fixSeasonsRouter from './routes/admin/fixSeasons.js';
import deleteAnimeRouter from './routes/admin/deleteAnime.js';
import toggleFeaturedRouter from './routes/admin/toggleFeatured.js';
import bindAniListSeasonRouter from './routes/admin/bindAniListSeason.js';
import createSeasonRouter from './routes/admin/createSeason.js';
import updateProfileRoleRouter from './routes/admin/updateProfileRole.js';
import adminNotificationsRouter from './routes/admin/adminNotifications.js';
import createAnimeRouter from './routes/admin/createAnime.js';
import updateAnimeRouter from './routes/admin/updateAnime.js';
import updateEpisodeRouter from './routes/admin/updateEpisode.js';
import automationRouter from './routes/automation.js';
import animeRouter from './routes/anime.js';
import { startNotificationWorker } from './services/notificationWorker.js';
import { startAnimelyWatcher } from './services/animelyWatcher.js';
import { startAutoDownloadWorker } from './services/autoDownloadWorker.js';

const app = express();

// CORS Configuration
// Normalize origin to remove trailing slash
const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

const allowedOrigin = process.env.CORS_ORIGIN 
  ? normalizeOrigin(process.env.CORS_ORIGIN) 
  : '*';

const allowedOrigins = allowedOrigin === '*' 
  ? '*' 
  : allowedOrigin.split(',').map((o) => normalizeOrigin(o.trim()));

// Default allowed origins (add production domain, Vercel and localhost for dev)
const defaultOrigins = [
  'https://anirias.com',
  'https://anirias.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Merge default origins with env origins (if not using wildcard)
const finalOrigins = allowedOrigin === '*' 
  ? '*' 
  : [...new Set([...defaultOrigins, ...allowedOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // If wildcard is set, allow all
      if (allowedOrigin === '*') return callback(null, true);
      
      // Check if origin is in allowed list
      if (finalOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-ADMIN-TOKEN',
      'X-ADMIN-SECRET',
      'X-Requested-With'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
  })
);

// Explicit OPTIONS handler for all routes
app.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ADMIN-TOKEN, X-ADMIN-SECRET, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.use('/api/admin', autoImportRouter);
app.use('/api/admin', bunnyPatchRouter);
app.use('/api/admin', hybridImportRouter);
app.use('/api/admin', fixSeasonsRouter);
app.use('/api/admin', deleteAnimeRouter);
app.use('/api/admin', toggleFeaturedRouter);
app.use('/api/admin', bindAniListSeasonRouter);
app.use('/api/admin', createSeasonRouter);
app.use('/api/admin', updateProfileRoleRouter);
app.use('/api/admin', adminNotificationsRouter);
app.use('/api/admin', createAnimeRouter);
app.use('/api/admin', updateAnimeRouter);
app.use('/api/admin', updateEpisodeRouter);
app.use('/api/automation', automationRouter);
app.use('/api/anime', animeRouter);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ANIRIAS backend listening on ${PORT}`);
  
  // Start notification worker (checks for upcoming/released episodes every 5 min)
  startNotificationWorker();
  
  // Start Animely watcher (checks for new episodes every 30 min)
  startAnimelyWatcher();
  
  // Start auto download worker (processes pending downloads every 15 min)
  startAutoDownloadWorker();
});
