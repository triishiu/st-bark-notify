/**
 * 生成酒馆助手脚本导入 JSON（根目录 Bark空回通知.json）
 *
 * 使用 git 提交短 SHA 而非 @main：jsDelivr 对 @main 缓存约 7 天，仅刷新不会更新。
 * 每次发版 push 后重新导入本 JSON 即可。
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';
const constantsPath = path.join(root, 'src/酒馆助手/Bark空回通知/constants.ts');

const constants = fs.readFileSync(constantsPath, 'utf8');
const refMatch = constants.match(/CDN_GIT_REF\s*=\s*'([^']+)'/);
const ref = refMatch?.[1] ?? 'main';
const repoMatch = constants.match(/REPO\s*=\s*'([^']+)'/);
const repo = repoMatch?.[1] ?? 'triishiu/st-bark-notify';
const distPath = 'dist/酒馆助手/Bark空回通知';
const cdnUrl = `https://cdn.jsdelivr.net/gh/${repo}@${ref}/${distPath}/index.js`;

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: `import('${cdnUrl}');`,
  info:
    '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到\n3. 更新脚本：重新导入本 JSON（@main 缓存约 7 天，刷新不够）',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

const outFile = path.join(root, importFileName);
fs.writeFileSync(outFile, `${JSON.stringify(script, null, 2)}\n`, 'utf8');
console.log('OK →', outFile, `@${ref}`);
