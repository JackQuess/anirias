import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import ytdlp from 'youtube-dl-exec';

const ytdlpExec = ytdlp as unknown as (url: string, args?: Record<string, unknown>) => Promise<unknown>;

export async function runYtDlp(pageUrl: string, outFile: string): Promise<void> {
  await mkdir(path.dirname(outFile), { recursive: true });

  await ytdlpExec(pageUrl, {
    output: outFile,
    format: 'bv*+ba/b',
    mergeOutputFormat: 'mp4',
    retries: 3,
    fragmentRetries: 3,
    concurrentFragments: 8,
    noPart: true,
    noContinue: true,
    quiet: false,
  } as any);
}
