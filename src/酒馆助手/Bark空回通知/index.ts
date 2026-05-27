/**
 * 固定入口 index.js（JSON 导入本文件）。
 * 见 gen-import-json（固定 @main）；bootstrap 优先 raw GitHub 拉 main，刷新即更新。
 */
import { runBootstrap } from './bootstrap';
import { SCRIPT_VERSION } from './constants';

console.info(`[Bark通知] 引导 index v${SCRIPT_VERSION}（内置版本，用于确认是否加载到新 index）`);

void runBootstrap('index').catch(err => {
  console.error('[Bark通知] 引导加载失败:', err);
});
