
;// ./src/酒馆助手/Bark空回通知/constants.ts
const REPO = 'triishiu/st-bark-notify';
/** 与 GitHub / 导入 JSON 的 @main 一致 */
const GIT_BRANCH = 'main';
/** 控制台可见，用于确认 CDN 是否加载到最新脚本 */
const SCRIPT_VERSION = '2.3.11';
const PANEL_ID = 'bark-notify-ext-settings';
const STYLE_ID = 'bark-notify-ext-style';
const IFRAME_NAME = 'bark-notify-iframe';

;// ./src/酒馆助手/Bark空回通知/bootstrap.ts
/**
 * 引导：JSON 固定 @main/index.js，发版后用户只刷新页面。
 * version / main 优先 raw.githubusercontent（跟 GitHub 同步），CDN @main 作备选；CI 会 purge jsDelivr。
 */


const DIST_REL = 'dist/酒馆助手/Bark空回通知';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${GIT_BRANCH}/${DIST_REL}`;
function cdnBase(host) {
    return `https://${host}/gh/${REPO}@${GIT_BRANCH}/${DIST_REL}`;
}
const LOCAL_BASES = [
    'http://localhost:5500/dist/酒馆助手/Bark空回通知',
    'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
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
function resolveVersion(fetched, source) {
    const v = semverOlder(fetched, SCRIPT_VERSION) ? SCRIPT_VERSION : fetched;
    if (v !== fetched) {
        console.warn(`[Bark通知] 远端版本 ${fetched} 过旧 (${source})，改用 ${v}`);
    }
    return v;
}
async function readVersion() {
    try {
        const res = await fetch(`${RAW_BASE}/version.json`, { cache: 'no-store' });
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
    for (const host of ['cdn.jsdelivr.net', 'gcore.jsdelivr.net']) {
        try {
            const res = await fetch(`${cdnBase(host)}/version.json`, { cache: 'no-store' });
            if (!res.ok)
                continue;
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0) {
                return resolveVersion(data.version, host);
            }
        }
        catch {
            /* try next */
        }
    }
    for (const base of LOCAL_BASES) {
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
    console.warn(`[Bark通知] version.json 不可用，使用内置 ${SCRIPT_VERSION}`);
    return SCRIPT_VERSION;
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
function mainUrlCandidates(version) {
    const q = `?v=${encodeURIComponent(version)}`;
    return [
        ...LOCAL_BASES.map(base => ({ label: 'local', url: `${normalizeBase(base)}/main.js${q}` })),
        { label: 'raw', url: `${RAW_BASE}/main.js${q}` },
        { label: 'cdn', url: `${cdnBase('cdn.jsdelivr.net')}/main.js${q}` },
        { label: 'gcore', url: `${cdnBase('gcore.jsdelivr.net')}/main.js${q}` },
    ];
}
async function runBootstrap(entryLabel) {
    const version = await readVersion();
    let lastErr;
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
        }
        catch (err) {
            lastErr = err;
            console.warn(`[Bark通知] main 失败 [${label}]:`, err);
        }
    }
    throw lastErr ?? new Error('无法加载 main.js');
}

;// ./src/酒馆助手/Bark空回通知/index.ts
/**
 * 固定入口 index.js（JSON 导入本文件）。
 * 见 gen-import-json（固定 @main）；bootstrap 优先 raw GitHub 拉 main，刷新即更新。
 */


console.info(`[Bark通知] 引导 index v${SCRIPT_VERSION}（内置版本，用于确认是否加载到新 index）`);
void runBootstrap('index').catch(err => {
    console.error('[Bark通知] 引导加载失败:', err);
});


//# sourceMappingURL=index.js.map