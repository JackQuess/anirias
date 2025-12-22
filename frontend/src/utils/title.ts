export type TitleValue =
  | string
  | {
      romaji?: string | null;
      english?: string | null;
      native?: string | null;
    }
  | null
  | undefined;

export const getDisplayTitle = (title: TitleValue): string => {
  if (!title) return 'Untitled';

  const pickFromObject = (obj: any) => obj?.english || obj?.romaji || obj?.native;

  if (typeof title === 'string') {
    const trimmed = title.trim();
    if (!trimmed) return 'Untitled';
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const picked = pickFromObject(parsed);
        if (picked) return picked;
      } catch {
        // fall through to raw string
      }
    }
    return trimmed;
  }

  const picked = pickFromObject(title);
  return picked ? picked : 'Untitled';
};
