/**
 * 写入 dist/酒馆助手/Bark空回通知/version.json，供 index.js 引导加载 main.js 时破缓存。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const constantsPath = path.join(root, 'src/酒馆助手/Bark空回通知/constants.ts');
const outPath = path.join(root, 'dist/酒馆助手/Bark空回通知/version.json');

const src = fs.readFileSync(constantsPath, 'utf8');
const m = src.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!m) throw new Error('未在 constants.ts 中找到 SCRIPT_VERSION');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({ version: m[1] }, null, 2)}\n`, 'utf8');
console.log('OK →', outPath, `v${m[1]}`);
