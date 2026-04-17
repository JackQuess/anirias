const TRANSLATE_TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 12000);

type GoogleTranslateChunk = [string?, string?];
type GoogleTranslateResponse = [GoogleTranslateChunk[]?];

function getTimeoutMs() {
  return Number.isFinite(TRANSLATE_TIMEOUT_MS) && TRANSLATE_TIMEOUT_MS > 0
    ? TRANSLATE_TIMEOUT_MS
    : 12000;
}

async function translateWithGoogle(input: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'en');
    url.searchParams.set('tl', 'tr');
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', input);

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const json = (await response.json()) as GoogleTranslateResponse;
    const chunks = Array.isArray(json?.[0]) ? json[0] : [];
    const translated = chunks
      .map((part) => String(part?.[0] || ''))
      .join('')
      .trim();
    if (!translated || translated === input) return null;
    return translated;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * EN -> TR translation using Google public endpoint.
 */
export async function translateToTurkish(text: string): Promise<string | null> {
  const input = String(text || '').trim();
  if (!input) return null;
  return translateWithGoogle(input);
}
