/** n8n control webhook action types */
export type AutomationAction =
  | 'DISCOVER_NEW_ANIME'
  | 'SCAN_NEW_EPISODES'
  | 'SCAN_MISSING_EPISODES'
  | 'SCAN_MISSING_METADATA';

/** Kaynak sağlayıcılar (bölüm keşfi / tarama) — worker discover.js ile uyumlu */
export type SourceProvider = 'diziwatch' | 'animecix';

/** Metadata sağlayıcılar (AniList/MAL bilgisi) */
export type MetadataProvider = 'anilist' | 'mal';

export interface AutomationRunPayload {
  action: AutomationAction;
  providers?: (SourceProvider | MetadataProvider)[];
  limit?: number;
  only_existing?: boolean;
}

export const AUTOMATION_ACTIONS: AutomationAction[] = [
  'DISCOVER_NEW_ANIME',
  'SCAN_NEW_EPISODES',
  'SCAN_MISSING_EPISODES',
  'SCAN_MISSING_METADATA',
];

export const SOURCE_PROVIDERS: SourceProvider[] = ['diziwatch', 'animecix'];
export const METADATA_PROVIDERS: MetadataProvider[] = ['anilist', 'mal'];

/** Source aksiyonları: provider olarak SourceProvider kullanır */
export const SOURCE_ACTIONS: AutomationAction[] = [
  'DISCOVER_NEW_ANIME',
  'SCAN_NEW_EPISODES',
  'SCAN_MISSING_EPISODES',
];

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 500;
export const LIMIT_DEFAULT = 10;

/** Varsayılan seçili source provider'lar */
export const DEFAULT_SOURCE_PROVIDERS: SourceProvider[] = ['diziwatch', 'animecix'];

/** Varsayılan seçili metadata provider'lar */
export const DEFAULT_METADATA_PROVIDERS: MetadataProvider[] = ['anilist'];
