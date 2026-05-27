
/**
 * 外层引导 boot.js：JSON 使用干净路径（无 @main）导入本文件。
 * version.json 可走干净 CDN；main.js 在镜像内用 @main，避免 testingcf 无分支旧缓存。
 */
const REPO = 'triishiu/st-bark-notify';
const DIST_REL = 'dist/酒馆助手/Bark空回通知';
/** 读取 version.json（干净路径在 testingcf 上可用） */
const VERSION_BASES = [
    'http://localhost:5500/dist/酒馆助手/Bark空回通知',
    'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
    `https://testingcf.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
    `https://cdn.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
];
/** 加载 main.js（testingcf 无 @main 会落到旧 main，故优先 @main / cdn） */
const MAIN_BASES = [
    'http://localhost:5500/dist/酒馆助手/Bark空回通知',
    'http://127.0.0.1:5500/dist/酒馆助手/Bark空回通知',
    `https://testingcf.jsdelivr.net/gh/${REPO}@main/${DIST_REL}`,
    `https://cdn.jsdelivr.net/gh/${REPO}/${DIST_REL}`,
];
function normalizeBase(base) {
    return base.replace(/\/?$/, '');
}
async function readVersion() {
    for (const base of VERSION_BASES) {
        try {
            const res = await fetch(`${normalizeBase(base)}/version.json`, { cache: 'no-store' });
            if (!res.ok)
                continue;
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0)
                return data.version;
        }
        catch {
            /* try next */
        }
    }
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${DIST_REL}/version.json`, {
            cache: 'no-store',
        });
        if (res.ok) {
            const data = (await res.json());
            if (typeof data.version === 'string' && data.version.length > 0)
                return data.version;
        }
    }
    catch {
        /* ignore */
    }
    return String(Date.now());
}
async function boot() {
    const version = await readVersion();
    let lastErr;
    for (const base of MAIN_BASES) {
        const mainUrl = `${normalizeBase(base)}/main.js?v=${encodeURIComponent(version)}`;
        try {
            console.info(`[Bark通知] 引导加载 ${mainUrl}`);
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
void boot().catch(err => {
    console.error('[Bark通知] 引导加载失败:', err);
});


//# sourceMappingURL=boot.js.map