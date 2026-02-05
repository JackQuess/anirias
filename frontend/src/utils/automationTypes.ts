/** n8n control webhook action types */
export type AutomationAction =
  | 'DISCOVER_NEW_ANIME'
  | 'SCAN_NEW_EPISODES'
  | 'SCAN_MISSING_EPISODES'
  | 'SCAN_MISSING_METADATA';

export type AutomationProvider = 'anilist' | 'mal';

export interface AutomationRunPayload {
  action: AutomationAction;
  providers?: AutomationProvider[];
  limit?: number;
  only_existing?: boolean;
}

export const AUTOMATION_ACTIONS: AutomationAction[] = [
  'DISCOVER_NEW_ANIME',
  'SCAN_NEW_EPISODES',
  'SCAN_MISSING_EPISODES',
  'SCAN_MISSING_METADATA',
];

export const AUTOMATION_PROVIDERS: AutomationProvider[] = ['anilist', 'mal'];

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 500;
export const LIMIT_DEFAULT = 10;
