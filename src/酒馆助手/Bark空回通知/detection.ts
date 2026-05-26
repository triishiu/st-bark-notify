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

/** 生成未结束前不判定，避免流式中途误判空回并锁死 notifiedIds */
export function bindGenerationGate(): void {
  if (tavern_events.GENERATION_STARTED) {
    eventOn(tavern_events.GENERATION_STARTED, () => {
      generationActive = true;
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
      scheduleCheck(message_id, 'generation_ended');
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

const checkTimers = new Map<number | string, ReturnType<typeof setTimeout>>();
const notifiedIds = new Set<number | string>();

async function checkAndNotify(message_id: number | string, trigger: string): Promise<void> {
  const s = loadSettings();
  const id = normalizeMessageId(message_id);
  if (shouldSkipUserStop(trigger) || !s.enabled || !s.barkKey.trim()) return;
  if (generationActive && !trigger.includes('generation_ended')) {
    scheduleCheck(id, 'waitGen');
    return;
  }
  if (notifiedIds.has(id)) return;
  try {
    let msg = getChatMessages(id as number)[0];
    if (!isAssistantMessage(msg)) {
      const last = getChatMessages(-1)[0];
      if (isAssistantMessage(last)) msg = last;
    }
    if (!isAssistantMessage(msg)) return;
    const body = getMessageBody(msg);
    const truncGt = s.truncatedIfNoGreaterThanEnd ?? defaultSettings.truncatedIfNoGreaterThanEnd;
    const analysis = analyzeReply(body, s.minTokens, truncGt);
    const visibleLen = extractReplyText(body).length;
    console.log(
      `[Bark通知] ${trigger} tokens=${analysis.tokens} visible=${visibleLen} raw=${body.length}` +
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
  const delay = trigger.includes('generation_ended') ? 400 : 1000;
  checkTimers.set(
    id,
    setTimeout(() => {
      checkTimers.delete(id);
      void checkAndNotify(id, trigger);
    }, delay),
  );
}
