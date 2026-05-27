/**
 * 固定入口 index.js：用户 JSON 永远 import 本文件。
 * 启动时探测 version.json 所在 CDN/本地地址，再加载 main.js?v=版本号。
 */

const REPO = 'triishiu/st-bark-notify';
const DIST_REL = 'dist/酒馆助手/Bark空回通知';

const DIST_BASE_CANDIDATES = [
  'http://localhost:5500/dist/酒馆助手/Bark空回通知',
  'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
  `https://testingcf.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
];

function normalizeBase(base: string): string {
  return base.replace(/\/?$/, '');
}

async function resolveDistBase(): Promise<string> {
  for (const base of DIST_BASE_CANDIDATES) {
    try {
      const res = await fetch(`${normalizeBase(base)}/version.json`, { cache: 'no-store' });
      if (res.ok) return normalizeBase(base);
    } catch {
      /* try next */
    }
  }
  return normalizeBase(DIST_BASE_CANDIDATES[DIST_BASE_CANDIDATES.length - 1]!);
}

async function readVersion(base: string): Promise<string> {
  try {
    const res = await fetch(`${base}/version.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) return data.version;
    }
  } catch {
    /* ignore */
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

async function boot(): Promise<void> {
  const base = await resolveDistBase();
  const version = await readVersion(base);
  const mainUrl = `${base}/main.js?v=${encodeURIComponent(version)}`;
  console.info(`[Bark通知] 引导加载 ${mainUrl}`);
  await import(/* webpackIgnore: true */ mainUrl);
}

void boot().catch(err => {
  console.error('[Bark通知] 引导加载失败:', err);
});
