import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const YTDLP_PATH = process.env.YTDLP_PATH || '/usr/local/bin/yt-dlp';

export async function runYtDlp(pageUrl: string, outFile: string): Promise<void> {
  await mkdir(path.dirname(outFile), { recursive: true });

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
    '-o',
    outFile,
    pageUrl,
  ];

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
