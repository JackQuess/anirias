import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const YTDLP_PATH = process.env.YTDLP_PATH || '/usr/local/bin/yt-dlp';

/** Sidecar WebVTT for player `subtitle_tracks` (set YTDLP_WRITE_SUBS=false to skip). */
export async function runYtDlp(pageUrl: string, outFile: string): Promise<void> {
  await mkdir(path.dirname(outFile), { recursive: true });

  const writeSubs = process.env.YTDLP_WRITE_SUBS !== 'false';
  const subLangs = process.env.YTDLP_SUB_LANGS || 'tr,en,ja';

  const args = [
    '-f',
    'bv*+ba/b',
    '--merge-output-format',
    'mp4',
    '--retries',
    '3',
    '--fragment-retries',
    '3',
    '--concurrent-fragments',
    '8',
    '--no-part',
    '--no-continue',
  ];

  if (writeSubs) {
    args.push(
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      subLangs,
      '--convert-subs',
      'vtt',
    );
  }

  args.push('-o', outFile, pageUrl);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(YTDLP_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
    });
  });
}
