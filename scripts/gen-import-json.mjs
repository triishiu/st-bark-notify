/**
 * 生成酒馆助手脚本导入 JSON（仅根目录一份）
 * 使用 raw.githubusercontent.com：路径干净，且与 main 同步（不依赖 jsDelivr 缓存）
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';

// 与 GitHub main 同步；testingcf/jsDelivr 可能长期缓存旧版 index.js
const cdnUrl =
  'https://raw.githubusercontent.com/triishiu/st-bark-notify/main/dist/酒馆助手/Bark空回通知/index.js';

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
