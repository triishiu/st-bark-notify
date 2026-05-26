export interface Settings {
  enabled: boolean;
  /** 未以 > 结尾时视为截断（默认开启） */
  truncatedIfNoGreaterThanEnd: boolean;
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
  truncatedIfNoGreaterThanEnd: true,
  barkKey: '',
  barkServer: 'https://api.day.app',
  title: '酒馆提醒',
  emptyMsg: '空回/截断了！快来看看',
  minTokens: 500,
  level: 'timeSensitive',
  sound: 'default',
};

function scriptVarOption(): { type: 'script'; script_id?: string } {
  const opt: { type: 'script'; script_id?: string } = { type: 'script' };
  if (typeof getScriptId === 'function') {
    try {
      opt.script_id = getScriptId();
    } catch {
      /* ignore */
    }
  }
  return opt;
}

/** 酒馆变量里布尔有时是字符串，需显式解析 */
function parseBoolish(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'false' || value === '0' || value === 0) return false;
  if (value === 'true' || value === '1' || value === 1) return true;
  return fallback;
}

export function loadSettings(): Settings {
  try {
    const raw = getVariables(scriptVarOption());
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      const partial = raw as Partial<Settings>;
      return {
        ...defaultSettings,
        ...partial,
        enabled: parseBoolish(partial.enabled, defaultSettings.enabled),
        truncatedIfNoGreaterThanEnd: parseBoolish(
          partial.truncatedIfNoGreaterThanEnd,
          defaultSettings.truncatedIfNoGreaterThanEnd,
        ),
      };
    }
  } catch {
    /* ignore */
  }
  return { ...defaultSettings };
}

export function saveSettings(settings: Settings): void {
  replaceVariables({ ...settings }, scriptVarOption());
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
    enabled: $root.find('#bn-enabled').is(':checked'),
    truncatedIfNoGreaterThanEnd: $root.find('#bn-trunc-no-gt').is(':checked'),
    barkKey,
    barkServer: get('bn-server').trim() || s.barkServer,
    title: get('bn-title').trim() || defaultSettings.title,
    emptyMsg: get('bn-empty').trim() || defaultSettings.emptyMsg,
    minTokens: Math.max(1, parseInt(get('bn-min-tokens'), 10) || defaultSettings.minTokens),
    level: (get('bn-level') as Settings['level']) || s.level,
    sound: s.sound,
  };
}
