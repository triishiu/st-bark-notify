/** CI：清除 jsDelivr / testingcf 对 @main 下 Bark 文件的缓存 */
const repo = process.env.PURGE_REPO ?? 'triishiu/st-bark-notify';
const files = [
  'dist/酒馆助手/Bark空回通知/boot.js',
  'dist/酒馆助手/Bark空回通知/index.js',
  'dist/酒馆助手/Bark空回通知/main.js',
  'dist/酒馆助手/Bark空回通知/version.json',
];

// Purge both testingcf and official jsDelivr
const hosts = ['purge.jsdelivr.net', 'testingcf.jsdelivr.net'];

for (const host of hosts) {
  console.log(`\n=== Purging ${host} ===`);
  for (const file of files) {
    const path = `/gh/${repo}@main/${file}`;
    const url = `https://${host === 'testingcf.jsdelivr.net' ? 'purge.jsdelivr.net' : host}${path}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(res.ok ? 'purge OK' : 'purge FAIL', path, text.slice(0, 80));
    } catch (err) {
      console.log('purge ERROR', path, err.message);
    }
  }
}
