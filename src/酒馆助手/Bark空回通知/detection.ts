import { SCRIPT_VERSION } from './constants';
import { sendBark } from './send-bark';
import { defaultSettings, loadSettings } from './settings';

function getMessageBody(msg: { message?: string; swipes?: string[]; swipe_id?: number } | undefined): string {
  if (!msg) return '';
  if (typeof msg.message === 'string') return msg.message;
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

function estimateTokens(text: string): number {
  const t = extractReplyText(text);
  if (!t) return 0;
  if (typeof getTokenCount === 'function') {
    try {
      const n = getTokenCount(t);
      if (typeof n === 'number' && n >= 0) return n;
    } catch {
      /* fallback */
    }
  }
  let tokens = 0;
  for (const ch of t) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch)) tokens += 1;
    else if (!/\s/.test(ch)) tokens += 0.25;
  }
  return Math.ceil(tokens);
}

/** 去掉 think 后原文仍较长：多为 HTML 状态栏，不应按「空回」处理 */
function hasSubstantialRawContent(raw: string): boolean {
  const remain = stripThinkAndComments(raw);
  if (remain.length >= 48) return true;
  return estimateTokens(raw) >= 40;
}

function analyzeReply(
  text: string,
  minTokens: number,
  truncatedIfNoGreaterThanEnd: boolean,
): { shouldNotify: boolean; reason: string; tokens: number } {
  const visible = extractReplyText(text);
  const tokens = estimateTokens(text);
  const threshold = Number(minTokens) > 0 ? Number(minTokens) : defaultSettings.minTokens;
  if (!visible) {
    if (hasSubstantialRawContent(text)) {
      /* 有实质内容但去标签后为空，继续走截断规则 */
    } else {
      return { shouldNotify: true, reason: '空回', tokens };
    }
  }
  if (/^[.\s…。·\-_*#?？!！,，;；:：'""`~～^]+$/u.test(visible)) {
    return { shouldNotify: true, reason: '无效短回复', tokens };
  }
  if (truncatedIfNoGreaterThanEnd && !text.trimEnd().endsWith('>')) {
    return { shouldNotify: true, reason: '截断(未以>结尾)', tokens };
  }
  if (tokens < threshold) {
    // HTML 状态栏等：原文很长但去标签后 token 为 0，不算过短截断
    if (!visible && hasSubstantialRawContent(text)) {
      return { shouldNotify: false, reason: '', tokens };
    }
    return { shouldNotify: true, reason: '截断(过短)', tokens };
  }
  return { shouldNotify: false, reason: '', tokens };
}

let generationActive = false;
const checkTimers = new Map<number | string, ReturnType<typeof setTimeout>>();
const notifiedIds = new Set<number | string>();

function clearPendingChecks(): void {
  for (const timer of checkTimers.values()) clearTimeout(timer);
  checkTimers.clear();
}

function resetNotifyStateForMessage(message_id: number | string | undefined): void {
  if (message_id == null) return;
  notifiedIds.delete(normalizeMessageId(message_id));
}

/** 仅在生成结束后检测；无 GENERATION_ENDED 时用 MESSAGE_UPDATED 防抖兜底 */
export function bindGenerationGate(): void {
  if (tavern_events.GENERATION_STARTED) {
    eventOn(tavern_events.GENERATION_STARTED, () => {
      generationActive = true;
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
      generationActive = false;
    });
  }
  if (tavern_events.GENERATION_ENDED) {
    eventOn(tavern_events.GENERATION_ENDED, (message_id: number) => {
      generationActive = false;
      clearPendingChecks();
      resetNotifyStateForMessage(message_id);
      scheduleCheck(message_id, 'generation_ended');
    });
    return;
  }
  console.warn('[Bark通知] 无 GENERATION_ENDED，使用 MESSAGE_UPDATED 防抖兜底（3s）');
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

async function readAssistantBody(
  message_id: number | string,
  trigger: string,
): Promise<{ msg: ReturnType<typeof getChatMessages>[0]; body: string } | null> {
  const id = normalizeMessageId(message_id);
  const attempts = trigger.includes('generation_ended') ? 4 : 1;
  for (let i = 0; i < attempts; i++) {
    let msg = getChatMessages(id as number)[0];
    if (!isAssistantMessage(msg)) {
      const last = getChatMessages(-1)[0];
      if (isAssistantMessage(last)) msg = last;
    }
    if (!isAssistantMessage(msg)) return null;
    const body = getMessageBody(msg);
    if (body.length > 0 || i === attempts - 1) return { msg, body };
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

async function checkAndNotify(message_id: number | string, trigger: string): Promise<void> {
  const s = loadSettings();
  const id = normalizeMessageId(message_id);
  if (shouldSkipUserStop(trigger) || !s.enabled || !s.barkKey.trim()) return;
  if (generationActive) return;
  if (notifiedIds.has(id)) return;
  try {
    const read = await readAssistantBody(message_id, trigger);
    if (!read) return;
    const { msg, body } = read;
    const truncGt = s.truncatedIfNoGreaterThanEnd;
    const analysis = analyzeReply(body, s.minTokens, truncGt);
    const visibleLen = extractReplyText(body).length;
    console.info(
      `[Bark通知 v${SCRIPT_VERSION}] ${trigger} tokens=${analysis.tokens} visible=${visibleLen} raw=${body.length}` +
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
  if (checkTimers.has(id)) clearTimeout(checkTimers.get(id)!);
  const delay = trigger.includes('generation_ended')
    ? 1200
    : trigger.includes('updated_settled')
      ? 3000
      : 1000;
  checkTimers.set(
    id,
    setTimeout(() => {
      checkTimers.delete(id);
      void checkAndNotify(id, trigger);
    }, delay),
  );
}
