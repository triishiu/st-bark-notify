/** CI：清除 jsDelivr / testingcf 对 @main 下 Bark 文件的缓存 */
const repo = process.env.PURGE_REPO ?? 'triishiu/st-bark-notify';
const files = [
  'dist/酒馆助手/Bark空回通知/boot.js',
  'dist/酒馆助手/Bark空回通知/index.js',
  'dist/酒馆助手/Bark空回通知/main.js',
  'dist/酒馆助手/Bark空回通知/version.json',
];

for (const file of files) {
  const path = `/gh/${repo}@main/${file}`;
  const res = await fetch(`https://purge.jsdelivr.net${path}`);
  console.log(res.ok ? 'purge OK' : 'purge FAIL', path, (await res.text()).slice(0, 80));
}
