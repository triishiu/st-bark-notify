/**
 * 生成 Bark空回通知.json
 *
 * 固定一段「内联引导」——不再 import index.js（testingcf 上的 index 常卡死在 2.3.0）。
 * 每次刷新：raw 读 version → testingcf@main 拉 main → 过旧则 raw 兜底。
 * 这段 content 发版后不必改。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const repo = 'triishiu/st-bark-notify';
const branch = 'main';
const dist = 'dist/酒馆助手/Bark空回通知';

const loader = `(async()=>{const R='${repo}',B='${branch}',D='${dist}';const raw='https://raw.githubusercontent.com/'+R+'/'+B+'/'+D;const cdn='https://testingcf.jsdelivr.net/gh/'+R+'@'+B+'/'+D;const older=(a,b)=>{const pa=a.split('.').map(Number),pb=b.split('.').map(Number);for(let i=0;i<3;i++){if((pa[i]||0)<(pb[i]||0))return true;if((pa[i]||0)>(pb[i]||0))return false}return false};let ver='0.0.0';try{const j=await(await fetch(raw+'/version.json',{cache:'no-store'})).json();if(j.version)ver=j.version}catch(_){}const q='?v='+encodeURIComponent(ver);for(const [L,b] of [['testingcf',cdn],['raw',raw]]){const u=b+'/main.js'+q;try{const s=await(await fetch(u,{cache:'no-store'})).text();const m=s.match(/SCRIPT_VERSION\\s*=\\s*['"]([^'"]+)['"]/);if(!m||older(m[1],ver))throw new Error('stale v'+(m&&m[1]));const blob=URL.createObjectURL(new Blob([s],{type:'text/javascript'}));try{await import(blob)}finally{URL.revokeObjectURL(blob)}console.info('[Bark通知] main v'+m[1]+' ← '+L);return}catch(e){console.warn('[Bark通知] '+L+' 失败',e.message||e)}}throw new Error('无法加载 main.js')})().catch(e=>console.error('[Bark通知]',e));`;

const script = {
  type: 'script',
  enabled: true,
  name: 'Bark空回通知',
  id: '87fdc68e-d00e-482a-890a-569b99fb3da1',
  content: loader,
  info: '作者：@雨衣\n1. iOS 下载 Bark，复制 Key\n2. 扩展填 Key，点测试看能否收到\n3. 发版后刷新即可（内联引导，不依赖 index 缓存）',
  button: { enabled: true, buttons: [] },
  data: {},
  export_with: { data: false, button: false },
};

fs.writeFileSync(path.join(root, 'Bark空回通知.json'), `${JSON.stringify(script, null, 2)}\n`, 'utf8');
console.log('OK → Bark空回通知.json (inline loader)');
