/**
 * 生成 Bark空回通知.json — 不用 CDN，从 raw.githubusercontent.com 拉 index。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const repo = 'triishiu/st-bark-notify';
const branch = 'main';
const distPath = 'dist/酒馆助手/Bark空回通知';
const rawIndex = `https://raw.githubusercontent.com/${repo}/${branch}/${distPath}/index.js`;

/** fetch + blob import，避免 CDN 与 raw 的 MIME 限制 */
const loader = `(async()=>{const u='${rawIndex}';try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const s=await r.text();const b=URL.createObjectURL(new Blob([s],{type:'text/javascript'}));try{await import(b)}finally{URL.revokeObjectURL(b)}}catch(e){console.error('[Bark通知] 加载失败',u,e);throw e}})();`;

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: loader,
  info: '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到\n3. 发版后刷新酒馆即可（GitHub raw，无 CDN）',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

fs.writeFileSync(path.join(root, 'Bark空回通知.json'), `${JSON.stringify(script, null, 2)}\n`, 'utf8');
console.log('OK → Bark空回通知.json (raw GitHub)');
