/**
 * 引导核心：JSON 可用干净 CDN 路径（无 @main）。
 * - version.json：testingcf/cdn 干净路径即可
 * - main.js：testingcf 须 @main，否则易命中旧缓存
 */

export const REPO = 'triishiu/st-bark-notify';
export const DIST_REL = 'dist/酒馆助手/Bark空回通知';

/** 读 version.json（干净路径在 testingcf 上可用） */
export const VERSION_BASES = [
  'http://localhost:5500/dist/酒馆助手/Bark空回通知',
  'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
  `https://testingcf.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
  `https://cdn.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
];

/** 加载 main.js（testingcf 无 @main 的 main/index 易为旧缓存） */
export const MAIN_BASES = [
  'http://localhost:5500/dist/酒馆助手/Bark空回通知',
  'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
  `https://testingcf.jsdelivr.net/gh/${REPO}@main/${DIST_REL}`,
  `https://cdn.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
];

export function normalizeBase(base: string): string {
  return base.replace(/\/?$/, '');
}

export async function readVersion(): Promise<string> {
  for (const base of VERSION_BASES) {
    try {
      const res = await fetch(`${normalizeBase(base)}/version.json`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) return data.version;
    } catch {
      /* try next */
    }
  }
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${DIST_REL}/version.json`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) return data.version;
    }
  } catch {
    /* ignore */
  }
  return String(Date.now());
}

export async function runBootstrap(entryLabel: string): Promise<void> {
  const version = await readVersion();
  let lastErr: unknown;
  for (const base of MAIN_BASES) {
    const mainUrl = `${normalizeBase(base)}/main.js?v=${encodeURIComponent(version)}`;
    try {
      console.info(`[Bark通知] ${entryLabel} → ${mainUrl}`);
      await import(/* webpackIgnore: true */ mainUrl);
      return;
    } catch (err) {
      lastErr = err;
      console.warn('[Bark通知] main 加载失败，尝试下一源:', mainUrl, err);
    }
  }
  throw lastErr ?? new Error('无法加载 main.js');
}
