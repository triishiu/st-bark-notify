// Bark 空回/截断通知 — 入口（逻辑见同目录各模块；dist 保持可读格式供 GitHub / CDN）

import { bindStopDetector, scheduleCheck } from './detection';
import { focusExtensionsSettings, mountUI, teardownUI } from './panel';

bindStopDetector();

eventOn(tavern_events.MESSAGE_RECEIVED, (message_id: number, type: string) => {
  if (type === 'append') return;
  scheduleCheck(message_id, `received:${type ?? 'unknown'}`);
});

if (tavern_events.MESSAGE_UPDATED) {
  eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => scheduleCheck(message_id, 'updated'));
}

if (tavern_events.GENERATION_ENDED) {
  eventOn(tavern_events.GENERATION_ENDED, (message_id: number) => scheduleCheck(message_id, 'generation_ended'));
}

eventOn(getButtonEvent('Bark通知设置'), () => focusExtensionsSettings());

$(() => {
  mountUI();
  console.log('[Bark通知] 脚本已加载（含「未以>结尾视为截断」选项）');
});

$(window).on('pagehide', () => {
  teardownUI();
});
