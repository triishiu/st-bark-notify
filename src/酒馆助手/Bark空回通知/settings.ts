export interface Settings {
  enabled: boolean;
  barkKey: string;
  barkServer: string;
  title: string;
  emptyMsg: string;
  minTokens: number;
  level: 'passive' | 'active' | 'timeSensitive';
  sound: string;
}

export const defaultSettings: Settings = {
  enabled: true,
  barkKey: '',
  barkServer: 'https://api.day.app',
  title: '酒馆提醒',
  emptyMsg: '空回/截断了！快来看看',
  minTokens: 500,
  level: 'timeSensitive',
  sound: 'default',
};

export function loadSettings(): Settings {
  try {
    const raw = getVariables({ type: 'script' });
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return { ...defaultSettings, ...(raw as Partial<Settings>) };
    }
  } catch {
    /* ignore */
  }
  return { ...defaultSettings };
}

export function saveSettings(settings: Settings): void {
  insertOrAssignVariables(settings, { type: 'script' });
}

export function parseBarkKey(raw: string): string {
  let t = String(raw || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    try {
      const parts = new URL(t).pathname.split('/').filter(Boolean);
      if (parts[0]) return parts[0];
    } catch {
      /* ignore */
    }
  }
  if (t.includes('api.day.app/')) t = t.split('api.day.app/')[1] || t;
  return t.split(/[/?#\s]/)[0]!.trim();
}

export function readForm($root: JQuery<HTMLElement>): Settings {
  const s = loadSettings();
  const get = (id: string): string => String($root.find(`#${id}`).val() ?? '');
  const barkKey = parseBarkKey(get('bn-key')) || s.barkKey;
  return {
    enabled: ($root.find('#bn-enabled').prop('checked') as boolean) ?? s.enabled,
    barkKey,
    barkServer: get('bn-server').trim() || s.barkServer,
    title: get('bn-title').trim() || defaultSettings.title,
    emptyMsg: get('bn-empty').trim() || defaultSettings.emptyMsg,
    minTokens: Math.max(1, parseInt(get('bn-min-tokens'), 10) || defaultSettings.minTokens),
    level: (get('bn-level') as Settings['level']) || s.level,
    sound: s.sound,
  };
}
