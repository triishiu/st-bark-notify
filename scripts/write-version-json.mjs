/**
 * 写入 dist/.../version.json，并同步 constants.ts 的 CDN_GIT_REF（与当前 git HEAD 一致）。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const constantsPath = path.join(root, 'src/酒馆助手/Bark空回通知/constants.ts');
const outPath = path.join(root, 'dist/酒馆助手/Bark空回通知/version.json');

function readGitRef() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'main';
  }
}

const src = fs.readFileSync(constantsPath, 'utf8');
const versionMatch = src.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) throw new Error('未在 constants.ts 中找到 SCRIPT_VERSION');

const gitRef = readGitRef();
let nextConstants = src.replace(/export const CDN_GIT_REF = '[^']*';/, `export const CDN_GIT_REF = '${gitRef}';`);
if (!/CDN_GIT_REF/.test(nextConstants)) {
  throw new Error('未在 constants.ts 中找到 CDN_GIT_REF');
}
fs.writeFileSync(constantsPath, nextConstants, 'utf8');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({ version: versionMatch[1], ref: gitRef }, null, 2)}\n`, 'utf8');
console.log('OK →', outPath, `v${versionMatch[1]} ref=${gitRef}`);
