
;// ./src/酒馆助手/Bark空回通知/constants.ts
const REPO = 'triishiu/st-bark-notify';
const GIT_BRANCH = 'main';
/** jsDelivr 官方 CDN */
const CDN_HOST = 'cdn.jsdelivr.net';
/** 控制台可见，用于确认是否加载到最新脚本 */
const SCRIPT_VERSION = '2.3.28';
const PANEL_ID = 'bark-notify-ext-settings';
const STYLE_ID = 'bark-notify-ext-style';
const IFRAME_NAME = 'bark-notify-iframe';

;// ./src/酒馆助手/Bark空回通知/index.ts
/**
 * 兼容旧 JSON：旧用户酒馆里仍是 import('.../index.js')。
 * 这里不复用 bootstrap.ts —— 直接最小化引导，强制从 raw.githubusercontent 拉 main，
 * 彻底跳过 testingcf / cdn.jsdelivr / 任何镜像对 index.js / main.js 的旧缓存。
 *
 * 一旦 testingcf 上这一份新 index.js 被刷新，之后每次刷新都走 raw 拿最新 main。
 */

const DIST_REL = 'dist/酒馆助手/Bark空回通知';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${GIT_BRANCH}/${DIST_REL}`;
void (async () => {
    try {
        const url = `${RAW_BASE}/main.js?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const source = await res.text();
        const blob = new Blob([source], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        try {
            await import(/* webpackIgnore: true */ blobUrl);
        }
        finally {
            URL.revokeObjectURL(blobUrl);
        }
    }
    catch (err) {
        console.error('[Bark通知] index 加载失败:', err);
    }
})();


//# sourceMappingURL=index.js.map