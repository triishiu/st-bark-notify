/**
 * 生成 Bark空回通知.json — 使用 HEAD 提交 hash，完全绕过缓存
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const repo = 'triishiu/st-bark-notify';
const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 7);
const distPath = 'dist/酒馆助手/Bark空回通知';
const bootUrl = `https://cdn.jsdelivr.net/gh/${repo}@${commitHash}/${distPath}/boot.js`;

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: `import('${bootUrl}');`,
  info: '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到\n3. 发版后刷新即可（入口 boot.js @main）',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

fs.writeFileSync(path.join(root, 'Bark空回通知.json'), `${JSON.stringify(script, null, 2)}\n`, 'utf8');
console.log('OK →', bootUrl);
