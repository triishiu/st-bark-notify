/**
 * 固定入口 index.js（JSON 导入本文件）。
 * 见 gen-import-json（testingcf @main）；version 信 raw，main 先试 testingcf 再 raw。
 */
import { runBootstrap } from './bootstrap';
import { SCRIPT_VERSION } from './constants';

console.info(`[Bark通知] 引导 index v${SCRIPT_VERSION}（内置版本，用于确认是否加载到新 index）`);

void runBootstrap('index').catch(err => {
  console.error('[Bark通知] 引导加载失败:', err);
});
