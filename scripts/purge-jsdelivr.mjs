/**
 * 清除 jsDelivr 对 @main 下 Bark 脚本的 CDN 缓存（CI 发版后调用）。
 */
const repo = process.env.PURGE_REPO ?? 'triishiu/st-bark-notify';
const files = [
  'dist/酒馆助手/Bark空回通知/index.js',
  'dist/酒馆助手/Bark空回通知/main.js',
  'dist/酒馆助手/Bark空回通知/version.json',
];

for (const file of files) {
  const path = `/gh/${repo}@main/${file}`;
  const url = `https://purge.jsdelivr.net${path}`;
  const res = await fetch(url);
  const body = await res.text();
  console.log(res.ok ? 'purge OK' : 'purge FAIL', path, body.slice(0, 120));
}
