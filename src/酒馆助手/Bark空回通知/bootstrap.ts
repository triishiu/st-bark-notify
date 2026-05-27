/**
 * 引导：JSON 固定 @main/index.js，发版后用户只刷新页面。
 * version / main 优先 raw.githubusercontent（跟 GitHub 同步），CDN @main 作备选；CI 会 purge jsDelivr。
 */

import { GIT_BRANCH, REPO, SCRIPT_VERSION } from './constants';

export { REPO };
export const DIST_REL = 'dist/酒馆助手/Bark空回通知';

const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${GIT_BRANCH}/${DIST_REL}`;

function cdnBase(host: string): string {
  return `https://${host}/gh/${REPO}@${GIT_BRANCH}/${DIST_REL}`;
}

const LOCAL_BASES = [
  'http://localhost:5500/dist/酒馆助手/Bark空回通知',
  'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
];

function semverOlder(a: string, b: string): boolean {
  const pa = a.split('.').map(n => Number(n) || 0);
  const pb = b.split('.').map(n => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return false;
  }
  return false;
}

function parseMainScriptVersion(source: string): string | null {
  const m = source.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
}

function assertMainContentVersion(source: string, expected: string, mainUrl: string): void {
  const got = parseMainScriptVersion(source);
  if (!got) {
    throw new Error(`main.js 未含 SCRIPT_VERSION: ${mainUrl}`);
  }
  if (semverOlder(got, expected)) {
    throw new Error(`main.js 内容 v${got} < 期望 v${expected}（${mainUrl}）`);
  }
}

export function normalizeBase(base: string): string {
  return base.replace(/\/?$/, '');
}

function resolveVersion(fetched: string, source: string): string {
  const v = semverOlder(fetched, SCRIPT_VERSION) ? SCRIPT_VERSION : fetched;
  if (v !== fetched) {
    console.warn(`[Bark通知] 远端版本 ${fetched} 过旧 (${source})，改用 ${v}`);
  }
  return v;
}

export async function readVersion(): Promise<string> {
  try {
    const res = await fetch(`${RAW_BASE}/version.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) {
        return resolveVersion(data.version, 'raw.githubusercontent');
      }
    }
  } catch {
    /* ignore */
  }
  for (const host of ['cdn.jsdelivr.net', 'gcore.jsdelivr.net'] as const) {
    try {
      const res = await fetch(`${cdnBase(host)}/version.json`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) {
        return resolveVersion(data.version, host);
      }
    } catch {
      /* try next */
    }
  }
  for (const base of LOCAL_BASES) {
    try {
      const res = await fetch(`${normalizeBase(base)}/version.json`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as { version?: unknown };
      if (typeof data.version === 'string' && data.version.length > 0) {
        return resolveVersion(data.version, base);
      }
    } catch {
      /* try next */
    }
  }
  console.warn(`[Bark通知] version.json 不可用，使用内置 ${SCRIPT_VERSION}`);
  return SCRIPT_VERSION;
}

async function importMainFromSource(mainUrl: string, source: string, expectedVersion: string): Promise<void> {
  assertMainContentVersion(source, expectedVersion, mainUrl);
  const blob = new Blob([source], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await import(/* webpackIgnore: true */ blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function mainUrlCandidates(version: string): { label: string; url: string }[] {
  const q = `?v=${encodeURIComponent(version)}`;
  return [
    ...LOCAL_BASES.map(base => ({ label: 'local', url: `${normalizeBase(base)}/main.js${q}` })),
    { label: 'raw', url: `${RAW_BASE}/main.js${q}` },
    { label: 'cdn', url: `${cdnBase('cdn.jsdelivr.net')}/main.js${q}` },
    { label: 'gcore', url: `${cdnBase('gcore.jsdelivr.net')}/main.js${q}` },
  ];
}

export async function runBootstrap(entryLabel: string): Promise<void> {
  const version = await readVersion();
  let lastErr: unknown;
  for (const { label, url: mainUrl } of mainUrlCandidates(version)) {
    try {
      console.info(`[Bark通知] ${entryLabel} → [${label}] ${mainUrl}`);
      const res = await fetch(mainUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const source = await res.text();
      const bodyVer = parseMainScriptVersion(source);
      await importMainFromSource(mainUrl, source, version);
      console.info(`[Bark通知] main 已加载 v${bodyVer ?? '?'} ← [${label}]`);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`[Bark通知] main 失败 [${label}]:`, err);
    }
  }
  throw lastErr ?? new Error('无法加载 main.js');
}
