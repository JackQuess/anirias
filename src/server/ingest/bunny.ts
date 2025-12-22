import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_KEY = process.env.BUNNY_STORAGE_API_KEY;

const STORAGE_ENDPOINT = 'https://storage.bunnycdn.com';

export async function uploadToBunny(remotePath: string, localFilePath: string): Promise<void> {
  if (!STORAGE_ZONE || !STORAGE_KEY) {
    throw new Error('Bunny storage env vars missing');
  }

  const size = await stat(localFilePath);
  if (!size.isFile()) {
    throw new Error(`Local file missing at ${localFilePath}`);
  }

  const url = `${STORAGE_ENDPOINT}/${STORAGE_ZONE}/${remotePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: STORAGE_KEY,
      'Content-Type': 'application/octet-stream',
    } as any,
    // @ts-expect-error duplex is required for streaming bodies in Node18 fetch
    duplex: 'half',
    body: createReadStream(localFilePath) as any,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny upload failed (${res.status}): ${text}`);
  }
}
