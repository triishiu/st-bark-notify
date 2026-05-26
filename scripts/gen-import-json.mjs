/**
 * 生成酒馆助手脚本导入 JSON（两份内容相同）：
 * - 仓库根目录 Bark空回／截断通知.json（给用户下载导入）
 * - dist/酒馆助手/Bark空回通知/Bark空回／截断通知.json（与 index.js 同目录备用）
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回／截断通知.json';

const cdnUrl =
  'https://testingcf.jsdelivr.net/gh/triishiu/st-bark-notify/dist/酒馆助手/Bark空回通知/index.js';

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回/截断通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: `import('${cdnUrl}');`,
  info: '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

const json = `${JSON.stringify(script, null, 2)}\n`;
const outFiles = [
  path.join(root, importFileName),
  path.join(root, 'dist/酒馆助手/Bark空回通知', importFileName),
];

for (const file of outFiles) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json, 'utf8');
}

console.log('OK →', outFiles.join(', '));
