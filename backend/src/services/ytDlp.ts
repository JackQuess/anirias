import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import ytdlp from 'youtube-dl-exec';

export async function runYtDlp(pageUrl: string, outFile: string): Promise<void> {
  await mkdir(path.dirname(outFile), { recursive: true });

  await ytdlp(pageUrl, {
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
