/**
 * 外层 boot.js：testingcf 无 @main 时 index.js 可能被旧缓存占用，
 * 可改用干净路径 …/boot.js 导入（与 index 相同逻辑）。
 */
import { runBootstrap } from './bootstrap';

void runBootstrap('boot').catch(err => {
  console.error('[Bark通知] 引导加载失败:', err);
});
