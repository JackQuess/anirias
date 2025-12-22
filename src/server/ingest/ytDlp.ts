import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface YtDlpResult {
  stdout: string;
  stderr: string;
}

const YT_DLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';

export async function runYtDlpDownload(pageUrl: string, outFile: string): Promise<YtDlpResult> {
  await mkdir(path.dirname(outFile), { recursive: true });

  return new Promise((resolve, reject) => {
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

    const child = spawn(YT_DLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      reject(new Error(`yt-dlp spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}
