/**
 * 生成酒馆助手脚本导入 JSON（根目录 Bark空回通知.json）
 *
 * CDN 使用 jsDelivr 的 @版本号（与 constants.ts 中 SCRIPT_VERSION、CI autotag 一致）
 *
 * 用法：npm run gen:import
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const importFileName = 'Bark空回通知.json';
const constantsPath = path.join(root, 'src/酒馆助手/Bark空回通知/constants.ts');

function readScriptVersion() {
  const src = fs.readFileSync(constantsPath, 'utf8');
  const m = src.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('未在 constants.ts 中找到 SCRIPT_VERSION');
  return m[1];
}

const version = process.env.BARK_CDN_VERSION?.replace(/^v/, '') || readScriptVersion();
const repo = 'triishiu/st-bark-notify';
// 使用 ?v= 打破缓存；CI 可在 autotag 后设 BARK_CDN_VERSION。也可用 @vX.Y.Z（需存在同名 git tag）
const cdnUrl = `https://cdn.jsdelivr.net/gh/${repo}/dist/酒馆助手/Bark空回通知/index.js?v=${version}`;

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
console.log('OK →', outFile, `(v${version})`);
