/**
 * 生成酒馆助手脚本导入 JSON（仅根目录一份）
 * CDN 带 git 短 commit，避免 jsDelivr 缓存旧版 index.js
 *
 * 用法：npm run gen:import
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';

let ref = 'main';
try {
  ref = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {
  /* 非 git 环境时用 main */
}

const cdnUrl = `https://testingcf.jsdelivr.net/gh/triishiu/st-bark-notify@${ref}/dist/酒馆助手/Bark空回通知/index.js`;

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
console.log('OK', ref, '→', outFile);
