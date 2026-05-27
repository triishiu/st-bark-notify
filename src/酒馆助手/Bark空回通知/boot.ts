/**
 * 固定入口 boot.js（JSON import 本文件，勿用 index.js — testingcf 上 index 易卡旧缓存）。
 */
import { runBootstrap } from './bootstrap';
import { SCRIPT_VERSION } from './constants';

console.info(`[Bark通知] boot v${SCRIPT_VERSION}`);

void runBootstrap('boot').catch(err => {
  console.error('[Bark通知] boot 加载失败:', err);
});
