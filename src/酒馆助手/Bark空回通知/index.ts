/**
 * 固定入口 index.js（JSON 导入本文件）。
 * 干净 CDN 路径见 gen-import-json；内部用 bootstrap 拉 version + main。
 */
import { runBootstrap } from './bootstrap';

void runBootstrap('index').catch(err => {
  console.error('[Bark通知] 引导加载失败:', err);
});
