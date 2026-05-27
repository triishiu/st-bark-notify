
;// ./src/酒馆助手/Bark空回通知/constants.ts
const REPO = 'triishiu/st-bark-notify';
/** 控制台可见，用于确认 CDN 是否加载到最新脚本 */
const SCRIPT_VERSION = '2.3.10';
/** 与本次 build 的 git 提交一致；postbuild 写入。勿指望 @main 刷新即更新。 */
const CDN_GIT_REF = '71cca44';
const PANEL_ID = 'bark-notify-ext-settings';
const STYLE_ID = 'bark-notify-ext-style';
const IFRAME_NAME = 'bark-notify-iframe';

;// external "Vue"
const external_Vue_namespaceObject = Vue;
;// ./src/酒馆助手/Bark空回通知/bootstrap.ts
/**
 * 引导：index 与 main 必须用同一 git ref（见 CDN_GIT_REF / 调用栈里的 @提交）。
 * jsDelivr 的 @main 分支别名缓存可达约 7 天，刷新页面不会立刻拿到新 main。
 */




const DIST_REL = 'dist/酒馆助手/Bark空回通知';
function detectCdnRefFromStack() {
    try {
        const stack = new Error().stack ?? '';
        const m = stack.match(new RegExp(`gh/${REPO.replace('/', '\\/')}@([^/?#\\s]+)`, 'i')) ||
            stack.match(new RegExp(`raw\\.githubusercontent\\.com/${REPO.replace('/', '\\/')}/([^/?#\\s]+)`, 'i'));
        return m?.[1] ?? null;
    }
    catch {
        return null;
    }
}
/** 与 index.js 的 import URL 同 ref，避免 index@提交 + main@main 混用 */
function resolveCdnRef() {
    const fromStack = detectCdnRefFromStack();
    if (fromStack)
        return fromStack;
    return CDN_GIT_REF;
}
function cdnBase(host, ref) {
    return `https://${host}/gh/${REPO}@${ref}/${DIST_REL}`;
}
function basesForRef(ref) {
    return [
        'http://localhost:5500/dist/酒馆助手/Bark空回通知',
        'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
        cdnBase('cdn.jsdelivr.net', ref),
        cdnBase('gcore.jsdelivr.net', ref),
    ];
}
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
function parseMainScriptVersion(source) {
    const m = source.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return m?.[1] ?? null;
}
function assertMainContentVersion(source, expected, mainUrl) {
    const got = parseMainScriptVersion(source);
    if (!got) {
        throw new Error(`main.js 未含 SCRIPT_VERSION: ${mainUrl}`);
    }
    if (semverOlder(got, expected)) {
        throw new Error(`main.js 内容 v${got} < 期望 v${expected}（${mainUrl}）`);
    }
}
function normalizeBase(base) {
    return base.replace(/\/?$/, '');
}
async function readVersion(cdnRef) {
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${cdnRef}/${DIST_REL}/version.json`, {
            cache: 'no-store',
        });
        if (res.ok) {
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0) {
                return resolveVersion(data.version, `raw.githubusercontent@${cdnRef}`);
            }
        }
    }
    catch {
        /* ignore */
    }
    for (const base of basesForRef(cdnRef)) {
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
async function importMainFromSource(mainUrl, source, expectedVersion) {
    assertMainContentVersion(source, expectedVersion, mainUrl);
    const blob = new Blob([source], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
        await import(/* webpackIgnore: true */ blobUrl);
    }
    finally {
        URL.revokeObjectURL(blobUrl);
    }
}
async function runBootstrap(entryLabel) {
    const cdnRef = resolveCdnRef();
    console.info(`[Bark通知] CDN ref=${cdnRef}（index 与 main 同源）`);
    const version = await readVersion(cdnRef);
    const mainBases = basesForRef(cdnRef);
    let lastErr;
    for (const base of mainBases) {
        const mainUrl = `${normalizeBase(base)}/main.js?v=${encodeURIComponent(version)}`;
        try {
            console.info(`[Bark通知] ${entryLabel} → ${mainUrl}`);
            const res = await fetch(mainUrl, { cache: 'no-store' });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const source = await res.text();
            const bodyVer = parseMainScriptVersion(source);
            await importMainFromSource(mainUrl, source, version);
            console.info(`[Bark通知] main 已加载 v${bodyVer ?? '?'} ← ${mainUrl}`);
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
 * 见 gen-import-json（cdn.jsdelivr.net @main）；内部用 bootstrap 拉 version + main。
 */


console.info(`[Bark通知] 引导 index v${SCRIPT_VERSION}（内置版本，用于确认是否加载到新 index）`);
void runBootstrap('index').catch(err => {
    console.error('[Bark通知] 引导加载失败:', err);
});


//# sourceMappingURL=index.js.map