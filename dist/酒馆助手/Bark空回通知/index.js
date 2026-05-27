
;// ./src/酒馆助手/Bark空回通知/constants.ts
/** 控制台可见，用于确认 CDN 是否加载到最新脚本 */
const SCRIPT_VERSION = '2.3.6';
const PANEL_ID = 'bark-notify-ext-settings';
const STYLE_ID = 'bark-notify-ext-style';
const IFRAME_NAME = 'bark-notify-iframe';

;// ./src/酒馆助手/Bark空回通知/bootstrap.ts
/**
 * 引导：index.js 建议用 @main（见 gen-import-json）。
 * testingcf 无 @main 的 version.json / index 常为旧缓存（如 2.3.0），只从 @main / raw 读版本。
 */

const REPO = 'triishiu/st-bark-notify';
const DIST_REL = 'dist/酒馆助手/Bark空回通知';
const PINNED_DIST = `https://testingcf.jsdelivr.net/gh/${REPO}@main/${DIST_REL}`;
/** 读 version.json（必须 @main，勿用无 @ 路径） */
const VERSION_BASES = [
    'http://localhost:5500/dist/酒馆助手/Bark空回通知',
    'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
    PINNED_DIST,
    `https://cdn.jsdelivr.net/gh/${REPO}@main/${DIST_REL}`,
];
/** 加载 main.js（仅 @main） */
const MAIN_BASES = [
    'http://localhost:5500/dist/酒馆助手/Bark空回通知',
    'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
    PINNED_DIST,
    `https://cdn.jsdelivr.net/gh/${REPO}@main/${DIST_REL}`,
];
function semverOlder(a, b) {
    const pa = a.split('.').map(n => Number(n) || 0);
    const pb = b.split('.').map(n => Number(n) || 0);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) < (pb[i] ?? 0))
            return true;
        if ((pa[i] ?? 0) > (pb[i] ?? 0))
            return false;
    }
    return false;
}
function normalizeBase(base) {
    return base.replace(/\/?$/, '');
}
async function readVersion() {
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${DIST_REL}/version.json`, {
            cache: 'no-store',
        });
        if (res.ok) {
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0) {
                return resolveVersion(data.version, 'raw.githubusercontent');
            }
        }
    }
    catch {
        /* ignore */
    }
    for (const base of VERSION_BASES) {
        try {
            const res = await fetch(`${normalizeBase(base)}/version.json`, { cache: 'no-store' });
            if (!res.ok)
                continue;
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0) {
                return resolveVersion(data.version, base);
            }
        }
        catch {
            /* try next */
        }
    }
    const fallback = SCRIPT_VERSION;
    console.warn(`[Bark通知] version.json 不可用，使用内置版本 ${fallback}`);
    return fallback;
}
function resolveVersion(fetched, source) {
    const v = semverOlder(fetched, SCRIPT_VERSION) ? SCRIPT_VERSION : fetched;
    if (v !== fetched) {
        console.warn(`[Bark通知] CDN 版本 ${fetched} 过旧 (${source})，改用 ${v}`);
    }
    return v;
}
async function runBootstrap(entryLabel) {
    const version = await readVersion();
    let lastErr;
    for (const base of MAIN_BASES) {
        const mainUrl = `${normalizeBase(base)}/main.js?v=${encodeURIComponent(version)}`;
        try {
            console.info(`[Bark通知] ${entryLabel} → ${mainUrl}`);
            await import(/* webpackIgnore: true */ mainUrl);
            return;
        }
        catch (err) {
            lastErr = err;
            console.warn('[Bark通知] main 加载失败，尝试下一源:', mainUrl, err);
        }
    }
    throw lastErr ?? new Error('无法加载 main.js');
}

;// ./src/酒馆助手/Bark空回通知/index.ts
/**
 * 固定入口 index.js（JSON 导入本文件）。
 * 见 gen-import-json（@main）；内部用 bootstrap 拉 version + main。
 */

void runBootstrap('index').catch(err => {
    console.error('[Bark通知] 引导加载失败:', err);
});


//# sourceMappingURL=index.js.map