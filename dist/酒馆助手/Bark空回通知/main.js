import { klona as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_klona_esm_74666e88_klona__ } from "https://testingcf.jsdelivr.net/npm/klona/+esm";

;// ./src/酒馆助手/Bark空回通知/constants.ts
/** 控制台可见，用于确认 CDN 是否加载到最新脚本 */
const SCRIPT_VERSION = '2.3.1';
const PANEL_ID = 'bark-notify-ext-settings';
const STYLE_ID = 'bark-notify-ext-style';
const IFRAME_NAME = 'bark-notify-iframe';

;// external "https://testingcf.jsdelivr.net/npm/klona/+esm"

;// ./src/酒馆助手/Bark空回通知/settings.ts

const defaultSettings = {
    enabled: true,
    truncatedIfNoGreaterThanEnd: true,
    barkKey: '',
    barkServer: 'https://api.day.app',
    title: '酒馆提醒',
    emptyMsg: '空回/截断了！快来看看',
    minTokens: 500,
    level: 'timeSensitive',
    sound: 'default',
};
/** 保存后立即可用，避免 replaceVariables 与 getVariables 不同步导致检测仍用旧开关 */
let settingsCache = null;
function scriptVarOption() {
    const opt = { type: 'script' };
    if (typeof getScriptId === 'function') {
        try {
            opt.script_id = getScriptId();
        }
        catch {
            /* ignore */
        }
    }
    return opt;
}
/** 酒馆变量里布尔有时是字符串，需显式解析 */
function parseBoolish(value, fallback) {
    if (typeof value === 'boolean')
        return value;
    if (value === 'false' || value === '0' || value === 0)
        return false;
    if (value === 'true' || value === '1' || value === 1)
        return true;
    return fallback;
}
function normalizeSettings(partial) {
    return {
        enabled: parseBoolish(partial.enabled, defaultSettings.enabled),
        truncatedIfNoGreaterThanEnd: parseBoolish(partial.truncatedIfNoGreaterThanEnd, defaultSettings.truncatedIfNoGreaterThanEnd),
        barkKey: String(partial.barkKey ?? defaultSettings.barkKey).trim(),
        barkServer: String(partial.barkServer ?? defaultSettings.barkServer).trim() || defaultSettings.barkServer,
        title: String(partial.title ?? defaultSettings.title).trim() || defaultSettings.title,
        emptyMsg: String(partial.emptyMsg ?? defaultSettings.emptyMsg).trim() || defaultSettings.emptyMsg,
        minTokens: Math.max(1, Number(partial.minTokens) || defaultSettings.minTokens),
        level: partial.level === 'passive' || partial.level === 'active' || partial.level === 'timeSensitive'
            ? partial.level
            : defaultSettings.level,
        sound: String(partial.sound ?? defaultSettings.sound),
    };
}
function loadSettingsFromVariables() {
    try {
        const raw = getVariables(scriptVarOption());
        if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
            return normalizeSettings(raw);
        }
    }
    catch {
        /* ignore */
    }
    return { ...defaultSettings };
}
function loadSettings() {
    if (!settingsCache) {
        settingsCache = loadSettingsFromVariables();
    }
    return { ...settingsCache };
}
function saveSettings(settings) {
    const next = normalizeSettings(settings);
    settingsCache = next;
    replaceVariables(__WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_klona_esm_74666e88_klona__(next), scriptVarOption());
}
function parseBarkKey(raw) {
    let t = String(raw || '').trim();
    if (!t)
        return '';
    if (/^https?:\/\//i.test(t)) {
        try {
            const parts = new URL(t).pathname.split('/').filter(Boolean);
            if (parts[0])
                return parts[0];
        }
        catch {
            /* ignore */
        }
    }
    if (t.includes('api.day.app/'))
        t = t.split('api.day.app/')[1] || t;
    return t.split(/[/?#\s]/)[0].trim();
}
function readForm($root) {
    const s = loadSettings();
    const get = (id) => String($root.find(`#${id}`).val() ?? '');
    const barkKey = parseBarkKey(get('bn-key')) || s.barkKey;
    return normalizeSettings({
        enabled: $root.find('#bn-enabled').is(':checked'),
        truncatedIfNoGreaterThanEnd: $root.find('#bn-trunc-no-gt').is(':checked'),
        barkKey,
        barkServer: get('bn-server').trim() || s.barkServer,
        title: get('bn-title').trim() || defaultSettings.title,
        emptyMsg: get('bn-empty').trim() || defaultSettings.emptyMsg,
        minTokens: Math.max(1, parseInt(get('bn-min-tokens'), 10) || defaultSettings.minTokens),
        level: get('bn-level') || s.level,
        sound: s.sound,
    });
}

;// ./src/酒馆助手/Bark空回通知/send-bark.ts


function ensureIframe() {
    if (!document.querySelector(`iframe[name="${IFRAME_NAME}"]`)) {
        $('<iframe>')
            .attr({ name: IFRAME_NAME, id: 'bark-notify-iframe' })
            .css({ position: 'absolute', width: 0, height: 0, border: 0, visibility: 'hidden' })
            .appendTo('body');
    }
}
function postViaHiddenForm(url, fields) {
    ensureIframe();
    return new Promise(resolve => {
        const $form = $('<form>')
            .attr({ method: 'POST', action: url, target: IFRAME_NAME })
            .css('display', 'none');
        Object.entries(fields).forEach(([k, v]) => {
            $form.append($('<input>').attr({ type: 'hidden', name: k, value: String(v) }));
        });
        $('body').append($form);
        $form[0].submit();
        setTimeout(() => {
            $form.remove();
            resolve();
        }, 600);
    });
}
async function sendBark(message, override) {
    const s = { ...loadSettings(), ...(override ?? {}) };
    const key = (s.barkKey || '').trim();
    if (!key)
        return { ok: false, msg: '请先填写 Bark Key' };
    const server = (s.barkServer || defaultSettings.barkServer).replace(/\/$/, '');
    await postViaHiddenForm(`${server}/${key}`, {
        title: s.title || defaultSettings.title,
        body: message,
        level: s.level || 'timeSensitive',
        sound: s.sound || 'default',
    });
    return { ok: true, msg: '推送已发出' };
}

;// ./src/酒馆助手/Bark空回通知/detection.ts



function getMessageBody(msg) {
    if (!msg)
        return '';
    const m = msg;
    if (typeof m.message === 'string' && m.message.length > 0)
        return m.message;
    if (typeof m.mes === 'string' && m.mes.length > 0)
        return m.mes;
    const swipes = msg.swipes;
    const swipeId = msg.swipe_id ?? 0;
    if (Array.isArray(swipes) && typeof swipes[swipeId] === 'string')
        return swipes[swipeId];
    return '';
}
function isAssistantMessage(msg) {
    if (!msg)
        return false;
    if (msg.is_system === true)
        return false;
    if (msg.role === 'user' || msg.is_user === true)
        return false;
    if (msg.role === 'assistant' || msg.role === 'char' || msg.is_user === false)
        return true;
    return false;
}
function normalizeMessageId(message_id) {
    const id = Number(message_id);
    return Number.isFinite(id) ? id : message_id;
}
function stripThinkAndComments(raw) {
    let t = raw;
    t = t.replace(/<!--[\s\S]*?-->/g, '');
    t = t.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '');
    t = t.replace(/<redacted_reasoning[^>]*>[\s\S]*?<\/redacted_reasoning>/gi, '');
    return t.trim();
}
function extractReplyText(raw) {
    if (!raw || typeof raw !== 'string')
        return '';
    return stripThinkAndComments(raw).replace(/<[^>]+>/g, '').trim();
}
function countTokensHeuristic(text) {
    if (!text)
        return 0;
    let tokens = 0;
    for (const ch of text) {
        if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch))
            tokens += 1;
        else if (!/\s/.test(ch))
            tokens += 0.25;
    }
    return Math.ceil(tokens);
}
function countTokensWithTavern(text) {
    if (!text)
        return 0;
    if (typeof getTokenCount === 'function') {
        try {
            const n = getTokenCount(text);
            if (typeof n === 'number' && n >= 0)
                return n;
        }
        catch {
            /* fallback */
        }
    }
    return null;
}
function tokenCountFromExtra(extra) {
    const n = extra?.token_count;
    return typeof n === 'number' && n >= 0 ? n : null;
}
/** 与酒馆楼层「633t」一致：优先 extra.token_count，否则对原文（保留 HTML）计数 */
function readStoredTokenCount(msg) {
    const swipeId = msg.swipe_id ?? 0;
    const infos = msg.swipes_info;
    if (Array.isArray(infos) && infos[swipeId] && typeof infos[swipeId] === 'object') {
        const fromSwipe = tokenCountFromExtra(infos[swipeId].extra);
        if (fromSwipe != null)
            return fromSwipe;
    }
    const fromMsg = tokenCountFromExtra(msg.extra);
    if (fromMsg != null)
        return fromMsg;
    try {
        const chat = SillyTavern?.getContext?.()?.chat;
        const mid = msg.message_id;
        if (chat && mid != null && chat[mid]) {
            const st = chat[mid];
            if (Array.isArray(st.swipes_info) && st.swipes_info[swipeId]) {
                const fromStSwipe = tokenCountFromExtra(st.swipes_info[swipeId].extra);
                if (fromStSwipe != null)
                    return fromStSwipe;
            }
            return tokenCountFromExtra(st.extra);
        }
    }
    catch {
        /* ignore */
    }
    return null;
}
function estimateTokensForThreshold(rawBody, storedTokenCount) {
    if (storedTokenCount != null)
        return storedTokenCount;
    const afterThink = stripThinkAndComments(rawBody).trim();
    const candidates = [];
    const rawCounted = countTokensWithTavern(afterThink);
    candidates.push(rawCounted ?? countTokensHeuristic(afterThink));
    const visible = extractReplyText(rawBody);
    const visibleCounted = countTokensWithTavern(visible);
    candidates.push(visibleCounted ?? countTokensHeuristic(visible));
    return Math.max(...candidates, 0);
}
/** 去掉 think 后原文仍较长：多为 HTML 状态栏，不应按「空回」处理 */
function hasSubstantialRawContent(raw) {
    const remain = stripThinkAndComments(raw);
    if (remain.length >= 48)
        return true;
    return estimateTokensForThreshold(raw, null) >= 40;
}
function analyzeReply(text, minTokens, truncatedIfNoGreaterThanEnd, storedTokenCount) {
    const visible = extractReplyText(text);
    const tokens = estimateTokensForThreshold(text, storedTokenCount);
    const stTokens = storedTokenCount;
    const threshold = Number(minTokens) > 0 ? Number(minTokens) : defaultSettings.minTokens;
    if (!visible) {
        if (hasSubstantialRawContent(text)) {
            /* 有实质内容但去标签后为空，继续走截断规则 */
        }
        else {
            return { shouldNotify: true, reason: '空回', tokens, stTokens };
        }
    }
    if (/^[.\s…。·\-_*#?？!！,，;；:：'""`~～^]+$/u.test(visible)) {
        return { shouldNotify: true, reason: '无效短回复', tokens, stTokens };
    }
    if (truncatedIfNoGreaterThanEnd && !text.trimEnd().endsWith('>')) {
        return { shouldNotify: true, reason: '截断(未以>结尾)', tokens, stTokens };
    }
    if (tokens < threshold) {
        // HTML 状态栏等：原文很长但去标签后 token 为 0，不算过短截断
        if (!visible && hasSubstantialRawContent(text)) {
            return { shouldNotify: false, reason: '', tokens, stTokens };
        }
        return { shouldNotify: true, reason: '截断(过短)', tokens, stTokens };
    }
    return { shouldNotify: false, reason: '', tokens, stTokens };
}
let generationActive = false;
let generationActiveClearTimer = null;
const checkTimers = new Map();
const notifiedIds = new Set();
function setGenerationActive(active) {
    generationActive = active;
    if (generationActiveClearTimer) {
        clearTimeout(generationActiveClearTimer);
        generationActiveClearTimer = null;
    }
    if (active) {
        generationActiveClearTimer = setTimeout(() => {
            generationActive = false;
            generationActiveClearTimer = null;
            console.warn('[Bark通知] 未收到 GENERATION_ENDED，已自动结束「生成中」状态');
        }, 180_000);
    }
}
function clearPendingChecks() {
    for (const timer of checkTimers.values())
        clearTimeout(timer);
    checkTimers.clear();
}
function resetNotifyStateForMessage(message_id) {
    if (message_id == null)
        return;
    notifiedIds.delete(normalizeMessageId(message_id));
}
/** 生成结束后检测；ENDED 缺失时用 MESSAGE_UPDATED / MESSAGE_RECEIVED 兜底 */
function bindGenerationGate() {
    if (tavern_events.GENERATION_STARTED) {
        eventOn(tavern_events.GENERATION_STARTED, () => {
            setGenerationActive(true);
            clearPendingChecks();
            try {
                const last = getChatMessages(-1)[0];
                resetNotifyStateForMessage(last?.message_id);
            }
            catch {
                /* ignore */
            }
        });
    }
    if (tavern_events.GENERATION_STOPPED) {
        eventOn(tavern_events.GENERATION_STOPPED, () => {
            setGenerationActive(false);
        });
    }
    if (tavern_events.GENERATION_ENDED) {
        eventOn(tavern_events.GENERATION_ENDED, (message_id) => {
            setGenerationActive(false);
            clearPendingChecks();
            resetNotifyStateForMessage(message_id);
            scheduleCheck(message_id, 'generation_ended');
        });
    }
    else {
        console.warn('[Bark通知] 无 GENERATION_ENDED 事件，依赖 MESSAGE_UPDATED 兜底');
    }
    if (tavern_events.MESSAGE_UPDATED) {
        eventOn(tavern_events.MESSAGE_UPDATED, (message_id) => {
            scheduleCheck(message_id, 'updated_settled');
        });
    }
}
let userStopIgnoreUntil = 0;
function markUserStopped(reason) {
    userStopIgnoreUntil = Date.now() + 20_000;
    console.log('[Bark通知] 用户手动停止，20秒内跳过检测:', reason);
}
function shouldSkipUserStop(trigger) {
    if (Date.now() <= userStopIgnoreUntil) {
        console.log('[Bark通知] 跳过（用户刚停止）:', trigger);
        return true;
    }
    return false;
}
function bindStopDetector() {
    ['touchstart', 'pointerdown', 'mousedown', 'click'].forEach(type => {
        document.addEventListener(type, (e) => {
            const path = e.composedPath?.() ?? [];
            for (const el of path) {
                if (!(el instanceof Element))
                    continue;
                const info = `${el.id} ${el.className} ${el.textContent ?? ''}`.toLowerCase();
                if (info.includes('stop') || info.includes('停止') || info.includes('中止')) {
                    markUserStopped(type);
                    break;
                }
            }
        }, true);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape')
            markUserStopped('escape');
    }, true);
    ['GENERATION_STOPPED', 'GENERATION_INTERRUPTED', 'GENERATION_ABORTED'].forEach(name => {
        if (tavern_events[name])
            eventOn(tavern_events[name], () => markUserStopped(name));
    });
}
function fetchAssistantMessage(message_id) {
    const id = normalizeMessageId(message_id);
    let msg = getChatMessages(id, { include_swipes: true })[0];
    if (!isAssistantMessage(msg)) {
        msg = getChatMessages(-1, { include_swipes: true })[0];
    }
    if (!isAssistantMessage(msg)) {
        msg = getChatMessages(-1, { role: 'assistant', include_swipes: true })[0];
    }
    return isAssistantMessage(msg) ? msg : undefined;
}
async function readAssistantBody(message_id, trigger) {
    const attempts = trigger.includes('generation_ended') || trigger.includes('updated_settled') ? 4 : 1;
    for (let i = 0; i < attempts; i++) {
        const msg = fetchAssistantMessage(message_id);
        if (!msg)
            return null;
        const body = getMessageBody(msg);
        if (body.length > 0 || i === attempts - 1)
            return { msg, body };
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}
async function checkAndNotify(message_id, trigger) {
    const s = loadSettings();
    const id = normalizeMessageId(message_id);
    if (shouldSkipUserStop(trigger) || !s.enabled || !s.barkKey.trim())
        return;
    const settled = trigger.includes('generation_ended') || trigger.includes('updated_settled');
    if (generationActive && !settled) {
        scheduleCheck(id, 'wait_gen');
        return;
    }
    if (settled)
        setGenerationActive(false);
    if (notifiedIds.has(id))
        return;
    try {
        const read = await readAssistantBody(message_id, trigger);
        if (!read)
            return;
        const { msg, body } = read;
        const truncGt = s.truncatedIfNoGreaterThanEnd;
        const stTokens = readStoredTokenCount(msg);
        const analysis = analyzeReply(body, s.minTokens, truncGt, stTokens);
        const visibleLen = extractReplyText(body).length;
        console.info(`[Bark通知 v${SCRIPT_VERSION}] ${trigger} tokens=${analysis.tokens}` +
            (analysis.stTokens != null ? ` stTokens=${analysis.stTokens}` : '') +
            ` visible=${visibleLen} raw=${body.length}` +
            ` notify=${analysis.shouldNotify} reason=${analysis.reason || '-'}` +
            ` truncGt=${truncGt} minTokens=${s.minTokens}`);
        if (!analysis.shouldNotify)
            return;
        notifiedIds.add(msg.message_id ?? id);
        await sendBark(s.emptyMsg, s);
    }
    catch (err) {
        console.error('[Bark通知] 检测出错:', err);
    }
}
function scheduleCheck(message_id, trigger) {
    const id = normalizeMessageId(message_id);
    if (checkTimers.has(id))
        clearTimeout(checkTimers.get(id));
    const delay = trigger.includes('generation_ended')
        ? 1200
        : trigger.includes('updated_settled')
            ? 3000
            : 1000;
    checkTimers.set(id, setTimeout(() => {
        checkTimers.delete(id);
        void checkAndNotify(id, trigger);
    }, delay));
}

;// ./src/酒馆助手/Bark空回通知/panel.ts



function injectStyle() {
    $(`#${STYLE_ID}`).remove();
    const css = `
#${PANEL_ID} { display: block; margin: 0; padding: 0; }
#${PANEL_ID} .inline-drawer-content { padding: 0.5em 0.75em; margin: 0; }
#${PANEL_ID} .bn-body { display: block; padding: 0; margin: 0; }
#${PANEL_ID} .bn-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 4px; align-items: flex-end; }
#${PANEL_ID} .bn-field { display: block; flex: 1 1 200px; min-width: 0; margin: 0; }
#${PANEL_ID} .bn-field--full { flex: 1 1 100%; margin: 0 0 4px; }
#${PANEL_ID} .bn-label { display: block; font-size: 0.95em; opacity: 0.85; margin: 0 0 2px; line-height: 1.2; }
#${PANEL_ID} .text_pole { width: 100%; box-sizing: border-box; margin: 0; padding: 4px 6px; min-height: unset; }
#${PANEL_ID} select.text_pole { margin: 0; padding: 4px 6px; }
#${PANEL_ID} .checkbox_label { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; line-height: 1.2; }
#${PANEL_ID} .bn-actions {
  display: flex; flex-direction: row; flex-wrap: nowrap; gap: 8px;
  align-items: center; margin: 6px 0 0; width: 100%;
}
#${PANEL_ID} .bn-actions .menu_button {
  display: inline-flex !important; flex-direction: row !important; flex: 0 0 auto !important;
  align-items: center; justify-content: center; white-space: nowrap !important;
  width: auto !important; min-width: 88px; padding: 6px 14px !important;
  writing-mode: horizontal-tb !important; -webkit-writing-mode: horizontal-tb !important;
}
#${PANEL_ID} #bn-status {
  display: block; margin-top: 6px; padding: 6px 10px; border-radius: 6px;
  font-size: 0.95em; line-height: 1.35; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.2);
}
#${PANEL_ID} #bn-status:empty { display: none; }
#${PANEL_ID} #bn-status.is-ok { border-color: rgba(46,204,113,0.5); color: #6ee7a0; background: rgba(46,204,113,0.12); }
#${PANEL_ID} #bn-status.is-err { border-color: rgba(231,76,60,0.5); color: #f1948a; background: rgba(231,76,60,0.12); }
#${PANEL_ID} #bn-status.is-wait { border-color: rgba(52,152,219,0.5); color: #85c1e9; background: rgba(52,152,219,0.12); }
#${PANEL_ID} .menu_button.bn-test { background: #e94560 !important; border-color: #e94560 !important; color: #fff !important; }
#${PANEL_ID} .menu_button.disabled { opacity: 0.55; pointer-events: none; }
`.trim();
    $('<style>').attr('id', STYLE_ID).text(css).appendTo('head');
}
function setStatus(text, kind) {
    const el = document.querySelector(`#${PANEL_ID} #bn-status`) || document.getElementById('bn-status');
    if (!el)
        return;
    el.textContent = text;
    el.className = kind ? `is-${kind}` : '';
}
function toast(kind, msg) {
    try {
        if (kind === 'ok')
            toastr.success(msg, 'Bark通知');
        else if (kind === 'err')
            toastr.error(msg, 'Bark通知');
        else
            toastr.info(msg, 'Bark通知');
    }
    catch {
        console.log('[Bark通知]', msg);
    }
}
function bindUiEvents($root) {
    $root.on('click', '#bn-save', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const form = readForm($root);
        if (!form.barkKey) {
            setStatus('❌ 请填写 Bark Key', 'err');
            toast('err', '未读到 Bark Key');
            return;
        }
        saveSettings(form);
        setStatus(`✅ 已保存（>截断: ${form.truncatedIfNoGreaterThanEnd ? '开' : '关'}）Key: ${form.barkKey.slice(0, 6)}…`, 'ok');
        toast('ok', 'Bark 设置已保存');
    });
    $root.on('click', '#bn-test', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const $btn = $(this);
        if ($btn.data('busy'))
            return;
        const form = readForm($root);
        if (!form.barkKey) {
            setStatus('❌ 请先填 Bark Key', 'err');
            return;
        }
        saveSettings(form);
        setStatus('⏳ 正在发送测试推送…', 'wait');
        $btn.data('busy', true).addClass('disabled').text('发送中…');
        try {
            const result = await sendBark('测试推送：酒馆 Bark 通知配置成功 🎉', form);
            setStatus(`✅ ${result.msg}`, result.ok ? 'ok' : 'err');
            toast(result.ok ? 'ok' : 'err', result.msg);
        }
        finally {
            $btn.data('busy', false).removeClass('disabled').text('测试推送');
        }
    });
    $root.on('blur', '#bn-key', function () {
        const key = parseBarkKey($(this).val());
        if (key)
            $(this).val(key);
    });
    $root.on('change', '#bn-enabled, #bn-trunc-no-gt, #bn-level, #bn-min-tokens', () => {
        const form = readForm($root);
        saveSettings(form);
        setStatus(`设置已保存（>截断: ${form.truncatedIfNoGreaterThanEnd ? '开' : '关'}）`, 'ok');
    });
}
function focusExtensionsSettings() {
    const el = document.getElementById(PANEL_ID);
    if (!el)
        return;
    $('#extensions').trigger('click');
    const $content = $(el).find('.inline-drawer-content');
    if ($content.length && !$content.is(':visible')) {
        $(el).find('.inline-drawer-toggle').trigger('click');
    }
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
}
function mountUI() {
    const $target = $('#extensions_settings2');
    if (!$target.length) {
        setTimeout(mountUI, 400);
        return;
    }
    $(`#${PANEL_ID}`).remove();
    injectStyle();
    const s = loadSettings();
    const scriptId = typeof getScriptId === 'function' ? getScriptId() : 'bark-notify';
    const html = `
<div id="${PANEL_ID}" script_id="${scriptId}" class="inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>Bark 空回/截断通知</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content">
    <div class="bn-body">
      <div class="bn-row">
        <label class="checkbox_label bn-field bn-field--full">
          <input id="bn-enabled" type="checkbox" ${s.enabled ? 'checked' : ''}>
          <span>启用空回与截断通知</span>
        </label>
      </div>
      <div class="bn-row">
        <label class="checkbox_label bn-field bn-field--full">
          <input id="bn-trunc-no-gt" type="checkbox" ${s.truncatedIfNoGreaterThanEnd !== false ? 'checked' : ''}>
          <span>未以 &gt; 结尾时视为截断</span>
        </label>
      </div>
      <div class="bn-row">
        <div class="bn-field">
          <label class="bn-label" for="bn-level">通知级别</label>
          <select id="bn-level" class="text_pole">
            <option value="passive" ${s.level === 'passive' ? 'selected' : ''}>passive（静默）</option>
            <option value="active" ${s.level === 'active' ? 'selected' : ''}>active（普通）</option>
            <option value="timeSensitive" ${s.level === 'timeSensitive' ? 'selected' : ''}>timeSensitive（推荐）</option>
          </select>
        </div>
      </div>
      <div class="bn-field bn-field--full">
        <label class="bn-label" for="bn-key">Bark Key</label>
        <input id="bn-key" class="text_pole" type="text" placeholder="https://api.day.app/xxxxxxxxxxxx/" value="">
      </div>
      <div class="bn-field bn-field--full">
        <label class="bn-label" for="bn-server">Bark 服务器</label>
        <input id="bn-server" class="text_pole" type="text" placeholder="https://api.day.app" value="">
      </div>
      <div class="bn-row">
        <div class="bn-field">
          <label class="bn-label" for="bn-title">通知标题</label>
          <input id="bn-title" class="text_pole" type="text" value="">
        </div>
        <div class="bn-field">
          <label class="bn-label" for="bn-empty">通知内容</label>
          <input id="bn-empty" class="text_pole" type="text" value="">
        </div>
        <div class="bn-field">
          <label class="bn-label" for="bn-min-tokens">截断阈值 (token)</label>
          <input id="bn-min-tokens" class="text_pole" type="number" min="1" step="1" value="">
        </div>
      </div>
      <div class="bn-actions">
        <div id="bn-save" class="menu_button">保存设置</div>
        <div id="bn-test" class="menu_button bn-test">测试推送</div>
      </div>
      <div id="bn-status"></div>
    </div>
  </div>
</div>`;
    const $root = $(html);
    $root.find('#bn-key').val(s.barkKey);
    $root.find('#bn-server').val(s.barkServer);
    $root.find('#bn-title').val(s.title);
    $root.find('#bn-empty').val(s.emptyMsg);
    $root.find('#bn-min-tokens').val(s.minTokens);
    $root.appendTo($target);
    bindUiEvents($root);
}
function teardownUI() {
    $(`#${PANEL_ID}`).remove();
    $(`#${STYLE_ID}`).remove();
}

;// ./src/酒馆助手/Bark空回通知/main.ts
// Bark 空回/截断通知 — 主逻辑（由 index.ts 按 version.json 动态加载）



bindStopDetector();
bindGenerationGate();
eventOn(tavern_events.MESSAGE_RECEIVED, (message_id, type) => {
    if (type === 'append')
        return;
    scheduleCheck(message_id, `received:${type ?? 'unknown'}`);
});
eventOn(getButtonEvent('Bark通知设置'), () => focusExtensionsSettings());
$(() => {
    mountUI();
    console.info(`[Bark通知] 脚本 v${SCRIPT_VERSION} 已加载（仅在生成结束后检测）`);
});
$(window).on('pagehide', () => {
    teardownUI();
});


//# sourceMappingURL=main.js.map