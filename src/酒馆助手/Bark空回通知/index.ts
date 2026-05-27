/**
 * 兼容旧 JSON：旧用户酒馆里仍是 import('.../index.js')。
 * 这里不复用 bootstrap.ts —— 直接最小化引导，强制从 raw.githubusercontent 拉 main，
 * 彻底跳过 testingcf / cdn.jsdelivr / 任何镜像对 index.js / main.js 的旧缓存。
 *
 * 一旦 testingcf 上这一份新 index.js 被刷新，之后每次刷新都走 raw 拿最新 main。
 */
import { GIT_BRANCH, REPO } from './constants';

const DIST_REL = 'dist/酒馆助手/Bark空回通知';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${GIT_BRANCH}/${DIST_REL}`;

void (async () => {
  try {
    const url = `${RAW_BASE}/main.js?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const source = await res.text();
    const blob = new Blob([source], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      await import(/* webpackIgnore: true */ blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (err) {
    console.error('[Bark通知] index 加载失败:', err);
  }
})();
