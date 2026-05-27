/**
 * 引导：JSON import boot.js；version 只信 raw GitHub；
 * main 先试 testingcf @main，过旧则 raw。勿再用 index.js（镜像易卡 2.3.0）。
 */

import { CDN_HOST, GIT_BRANCH, REPO, SCRIPT_VERSION } from './constants';

export { REPO };
export const DIST_REL = 'dist/酒馆助手/Bark空回通知';

const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${GIT_BRANCH}/${DIST_REL}`;
const CDN_BASE = `https://${CDN_HOST}/gh/${REPO}@${GIT_BRANCH}/${DIST_REL}`;

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
    throw new Error(`testingcf 体 v${got} < 期望 v${expected}（镜像缓存过期）`);
  }
}

export function normalizeBase(base: string): string {
  return base.replace(/\/?$/, '');
}

function resolveVersion(fetched: string, source: string): string {
  const v = semverOlder(fetched, SCRIPT_VERSION) ? SCRIPT_VERSION : fetched;
  return v;
}

/** 不用 testingcf 的 version.json（常卡在旧版）；只信 raw GitHub */
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
    { label: 'testingcf', url: `${CDN_BASE}/main.js${q}` },
    { label: 'raw', url: `${RAW_BASE}/main.js${q}` },
  ];
}

export async function runBootstrap(entryLabel: string): Promise<void> {
  const version = await readVersion();
  let lastErr: unknown;
  for (const { label, url: mainUrl } of mainUrlCandidates(version)) {
    try {
      const res = await fetch(mainUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const source = await res.text();
      await importMainFromSource(mainUrl, source, version);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('无法加载 main.js');
}
