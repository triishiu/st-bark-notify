/**
 * 生成酒馆助手脚本导入 JSON（仅根目录一份）
 *
 * JSON 只含 import 指向仓库 dist；勿用 testingcf 镜像（易长期缓存旧版）。
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';

// 与 GitHub main 上 dist 同步；cdn.jsdelivr.net 会随 push 更新（勿用 testingcf）
// 查询参数仅用于打破浏览器/CDN 旧模块缓存，不影响仓库内脚本路径
const cdnUrl =
  'https://cdn.jsdelivr.net/gh/triishiu/st-bark-notify/dist/酒馆助手/Bark空回通知/index.js?v=2.2.0';

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: `import('${cdnUrl}');`,
  info: '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

const outFile = path.join(root, importFileName);
fs.writeFileSync(outFile, `${JSON.stringify(script, null, 2)}\n`, 'utf8');
console.log('OK →', outFile);
