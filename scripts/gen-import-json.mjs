/**
 * 生成酒馆助手脚本导入 JSON（根目录 Bark空回通知.json）
 *
 * CDN 与 StageDog 资源一致：testingcf + index.js（引导）→ main.js?v=版本（见 version.json）
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';
const repo = 'triishiu/st-bark-notify';
const cdnUrl = `https://testingcf.jsdelivr.net/gh/${repo}/dist/酒馆助手/Bark空回通知/index.js`;

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
