import { SCRIPT_VERSION } from './constants';
import { sendBark } from './send-bark';
import { defaultSettings, loadSettings } from './settings';

function getMessageBody(
  msg: { message?: string; mes?: string; swipes?: string[]; swipe_id?: number } | undefined,
): string {
  if (!msg) return '';
  const m = msg as { message?: string; mes?: string };
  if (typeof m.message === 'string' && m.message.length > 0) return m.message;
  if (typeof m.mes === 'string' && m.mes.length > 0) return m.mes;
  const swipes = msg.swipes;
  const swipeId = msg.swipe_id ?? 0;
  if (Array.isArray(swipes) && typeof swipes[swipeId] === 'string') return swipes[swipeId];
  return '';
}

function isAssistantMessage(
  msg: { role?: string; is_user?: boolean; is_system?: boolean; message_id?: number } | undefined,
): boolean {
  if (!msg) return false;
  if (msg.is_system === true) return false;
  if (msg.role === 'user' || msg.is_user === true) return false;
  if (msg.role === 'assistant' || msg.role === 'char' || msg.is_user === false) return true;
  return false;
}

function normalizeMessageId(message_id: number | string): number | string {
  const id = Number(message_id);
  return Number.isFinite(id) ? id : message_id;
}

function stripThinkAndComments(raw: string): string {
  let t = raw;
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '');
  t = t.replace(/<redacted_reasoning[^>]*>[\s\S]*?<\/redacted_reasoning>/gi, '');
  return t.trim();
}

function extractReplyText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return stripThinkAndComments(raw).replace(/<[^>]+>/g, '').trim();
}

function countTokensHeuristic(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch)) tokens += 1;
    else if (!/\s/.test(ch)) tokens += 0.25;
  }
  return Math.ceil(tokens);
}

function countTokensWithTavern(text: string): number | null {
  if (!text) return 0;
  if (typeof getTokenCount === 'function') {
    try {
      const n = getTokenCount(text);
      if (typeof n === 'number' && n >= 0) return n;
    } catch {
      /* fallback */
    }
  }
  return null;
}

function tokenCountFromExtra(extra: Record<string, unknown> | undefined): number | null {
  const n = extra?.token_count;
  return typeof n === 'number' && n >= 0 ? n : null;
}

/** 与酒馆楼层「633t」一致：优先 extra.token_count，否则对原文（保留 HTML）计数 */
function readStoredTokenCount(
  msg: {
    message_id?: number;
    extra?: Record<string, unknown>;
    swipe_id?: number;
    swipes_info?: unknown[];
  },
): number | null {
  const swipeId = msg.swipe_id ?? 0;
  const infos = msg.swipes_info;
  if (Array.isArray(infos) && infos[swipeId] && typeof infos[swipeId] === 'object') {
    const fromSwipe = tokenCountFromExtra(
      (infos[swipeId] as { extra?: Record<string, unknown> }).extra,
    );
    if (fromSwipe != null) return fromSwipe;
  }
  const fromMsg = tokenCountFromExtra(msg.extra);
  if (fromMsg != null) return fromMsg;

  try {
    const chat = SillyTavern?.getContext?.()?.chat as
      | Record<number, { extra?: Record<string, unknown>; swipe_id?: number; swipes_info?: unknown[] }>
      | undefined;
    const mid = msg.message_id;
    if (chat && mid != null && chat[mid]) {
      const st = chat[mid];
      if (Array.isArray(st.swipes_info) && st.swipes_info[swipeId]) {
        const fromStSwipe = tokenCountFromExtra(
          (st.swipes_info[swipeId] as { extra?: Record<string, unknown> }).extra,
        );
        if (fromStSwipe != null) return fromStSwipe;
      }
      return tokenCountFromExtra(st.extra);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function estimateTokensForThreshold(rawBody: string, storedTokenCount: number | null): number {
  if (storedTokenCount != null) return storedTokenCount;
  const afterThink = stripThinkAndComments(rawBody).trim();
  const candidates: number[] = [];
  const rawCounted = countTokensWithTavern(afterThink);
  candidates.push(rawCounted ?? countTokensHeuristic(afterThink));
  const visible = extractReplyText(rawBody);
  const visibleCounted = countTokensWithTavern(visible);
  candidates.push(visibleCounted ?? countTokensHeuristic(visible));
  return Math.max(...candidates, 0);
}

/** 去掉 think 后原文仍较长：多为 HTML 状态栏，不应按「空回」处理 */
function hasSubstantialRawContent(raw: string): boolean {
  const remain = stripThinkAndComments(raw);
  if (remain.length >= 48) return true;
  return estimateTokensForThreshold(raw, null) >= 40;
}

function analyzeReply(
  text: string,
  minTokens: number,
  truncatedIfNoGreaterThanEnd: boolean,
  storedTokenCount: number | null,
): { shouldNotify: boolean; reason: string; tokens: number; stTokens: number | null } {
  const visible = extractReplyText(text);
  const tokens = estimateTokensForThreshold(text, storedTokenCount);
  const stTokens = storedTokenCount;
  const threshold = Number(minTokens) > 0 ? Number(minTokens) : defaultSettings.minTokens;
  if (!visible) {
    if (hasSubstantialRawContent(text)) {
      /* 有实质内容但去标签后为空，继续走截断规则 */
    } else {
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
let generationActiveClearTimer: ReturnType<typeof setTimeout> | null = null;
const checkTimers = new Map<number | string, ReturnType<typeof setTimeout>>();
const notifiedIds = new Set<number | string>();

function setGenerationActive(active: boolean): void {
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

function clearPendingChecks(): void {
  for (const timer of checkTimers.values()) clearTimeout(timer);
  checkTimers.clear();
}

function resetNotifyStateForMessage(message_id: number | string | undefined): void {
  if (message_id == null) return;
  notifiedIds.delete(normalizeMessageId(message_id));
}

/** 生成结束后检测；ENDED 缺失时用 MESSAGE_UPDATED / MESSAGE_RECEIVED 兜底 */
export function bindGenerationGate(): void {
  if (tavern_events.GENERATION_STARTED) {
    eventOn(tavern_events.GENERATION_STARTED, () => {
      setGenerationActive(true);
      clearPendingChecks();
      try {
        const last = getChatMessages(-1)[0];
        resetNotifyStateForMessage(last?.message_id);
      } catch {
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
    eventOn(tavern_events.GENERATION_ENDED, (message_id: number) => {
      setGenerationActive(false);
      clearPendingChecks();
      resetNotifyStateForMessage(message_id);
      scheduleCheck(message_id, 'generation_ended');
    });
  } else {
    console.warn('[Bark通知] 无 GENERATION_ENDED 事件，依赖 MESSAGE_UPDATED 兜底');
  }
  if (tavern_events.MESSAGE_UPDATED) {
    eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => {
      scheduleCheck(message_id, 'updated_settled');
    });
  }
}

let userStopIgnoreUntil = 0;

function markUserStopped(reason: string): void {
  userStopIgnoreUntil = Date.now() + 20_000;
  console.log('[Bark通知] 用户手动停止，20秒内跳过检测:', reason);
}

function shouldSkipUserStop(trigger: string): boolean {
  if (Date.now() <= userStopIgnoreUntil) {
    console.log('[Bark通知] 跳过（用户刚停止）:', trigger);
    return true;
  }
  return false;
}

export function bindStopDetector(): void {
  (['touchstart', 'pointerdown', 'mousedown', 'click'] as const).forEach(type => {
    document.addEventListener(
      type,
      (e: Event) => {
        const path = e.composedPath?.() ?? [];
        for (const el of path) {
          if (!(el instanceof Element)) continue;
          const info = `${el.id} ${el.className} ${el.textContent ?? ''}`.toLowerCase();
          if (info.includes('stop') || info.includes('停止') || info.includes('中止')) {
            markUserStopped(type);
            break;
          }
        }
      },
      true,
    );
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') markUserStopped('escape');
  }, true);
  (['GENERATION_STOPPED', 'GENERATION_INTERRUPTED', 'GENERATION_ABORTED'] as const).forEach(name => {
    if (tavern_events[name]) eventOn(tavern_events[name], () => markUserStopped(name));
  });
}

function fetchAssistantMessage(message_id: number | string): ReturnType<typeof getChatMessages>[0] | undefined {
  const id = normalizeMessageId(message_id);
  let msg = getChatMessages(id as number, { include_swipes: true })[0];
  if (!isAssistantMessage(msg)) {
    msg = getChatMessages(-1, { include_swipes: true })[0];
  }
  if (!isAssistantMessage(msg)) {
    msg = getChatMessages(-1, { role: 'assistant', include_swipes: true })[0];
  }
  return isAssistantMessage(msg) ? msg : undefined;
}

async function readAssistantBody(
  message_id: number | string,
  trigger: string,
): Promise<{ msg: ReturnType<typeof getChatMessages>[0]; body: string } | null> {
  const attempts =
    trigger.includes('generation_ended') || trigger.includes('updated_settled') ? 4 : 1;
  for (let i = 0; i < attempts; i++) {
    const msg = fetchAssistantMessage(message_id);
    if (!msg) return null;
    const body = getMessageBody(msg);
    if (body.length > 0 || i === attempts - 1) return { msg, body };
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

async function checkAndNotify(message_id: number | string, trigger: string): Promise<void> {
  const s = loadSettings();
  const id = normalizeMessageId(message_id);
  if (shouldSkipUserStop(trigger) || !s.enabled || !s.barkKey.trim()) return;
  const settled =
    trigger.includes('generation_ended') || trigger.includes('updated_settled');
  if (generationActive && !settled) {
    scheduleCheck(id, 'wait_gen');
    return;
  }
  if (settled) setGenerationActive(false);
  if (notifiedIds.has(id)) return;
  try {
    const read = await readAssistantBody(message_id, trigger);
    if (!read) return;
    const { msg, body } = read;
    const truncGt = s.truncatedIfNoGreaterThanEnd;
    const stTokens = readStoredTokenCount(msg);
    const analysis = analyzeReply(body, s.minTokens, truncGt, stTokens);
    const visibleLen = extractReplyText(body).length;
    console.info(
      `[Bark通知 v${SCRIPT_VERSION}] ${trigger} tokens=${analysis.tokens}` +
        (analysis.stTokens != null ? ` stTokens=${analysis.stTokens}` : '') +
        ` visible=${visibleLen} raw=${body.length}` +
        ` notify=${analysis.shouldNotify} reason=${analysis.reason || '-'}` +
        ` truncGt=${truncGt} minTokens=${s.minTokens}`,
    );
    if (!analysis.shouldNotify) return;
    notifiedIds.add(msg.message_id ?? id);
    await sendBark(s.emptyMsg, s);
  } catch (err) {
    console.error('[Bark通知] 检测出错:', err);
  }
}

export function scheduleCheck(message_id: number | string, trigger: string): void {
  const id = normalizeMessageId(message_id);
  const settled =
    trigger.includes('generation_ended') || trigger.includes('updated_settled');
  // 流式输出会连续 MESSAGE_UPDATED；若每次重置 3s 定时器，通知会被推到生成结束后很久（体感 ~10s）
  if (settled && checkTimers.has(id)) return;

  if (checkTimers.has(id)) clearTimeout(checkTimers.get(id)!);
  const delay = trigger.includes('generation_ended')
    ? 800
    : trigger.includes('updated_settled')
      ? 1200
      : 800;
  checkTimers.set(
    id,
    setTimeout(() => {
      checkTimers.delete(id);
      void checkAndNotify(id, trigger);
    }, delay),
  );
}
