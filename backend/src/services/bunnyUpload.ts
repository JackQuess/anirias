import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const STORAGE_ENDPOINT = 'https://storage.bunnycdn.com';

export async function uploadToBunny(remotePath: string, localFile: string) {
  if (!STORAGE_ZONE || !STORAGE_API_KEY) {
    throw new Error('Bunny storage env vars missing');
  }

  console.log("[BUNNY DEBUG]", {
    zone: process.env.BUNNY_STORAGE_ZONE,
    keyLen: process.env.BUNNY_STORAGE_API_KEY?.length
  });

  const info = await stat(localFile);
  if (!info.isFile()) throw new Error('Local file missing for upload');

  const url = `${STORAGE_ENDPOINT}/${STORAGE_ZONE}/${remotePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: STORAGE_API_KEY,
      'Content-Type': 'application/octet-stream',
    } as any,
    // @ts-expect-error duplex is required by Node fetch for streams
    duplex: 'half',
    body: createReadStream(localFile) as any,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Bunny upload failed ${res.status}: ${txt}`);
  }
}
