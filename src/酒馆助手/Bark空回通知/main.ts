// Bark 空回/截断通知 — 主逻辑（由 index.ts 按 version.json 动态加载）

import { SCRIPT_VERSION } from './constants';
import { bindGenerationGate, bindStopDetector, isGenerationActive, scheduleCheck } from './detection';
import { focusExtensionsSettings, mountUI, teardownUI } from './panel';

bindStopDetector();
bindGenerationGate();

// 仅作 GENERATION_ENDED 缺失时的兜底；swipe 会误报且与 generation_ended 重复推送
eventOn(tavern_events.MESSAGE_RECEIVED, (message_id: number, type: string) => {
  if (type === 'append' || type === 'swipe') return;
  if (isGenerationActive()) return;
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
