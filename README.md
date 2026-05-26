# st-bark-notify

在 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 中配合 **[酒馆助手](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/关于酒馆助手/介绍.html)** 使用的脚本：当 AI 回复**空回**、**过短无效**或疑似**截断**时，通过 [Bark](https://github.com/Finb/Bark) 向 iOS 设备推送通知。

## 功能

- 检测空回、无效短回复、截断（未以 `>` 结尾或过短等规则，见源码 `detection.ts`）
- 手动停止生成后短时间内不误报
- 扩展页配置 Bark Key、服务器、标题文案，并支持测试推送

## 使用（只需导入，无需克隆仓库）

1. 打开本仓库根目录的 [`Bark空回通知.json`](Bark空回通知.json)，下载或复制内容。
2. 酒馆 → **酒馆助手** → **脚本** → **导入**，粘贴/选择该 JSON。
3. 启用脚本 → **扩展** → **Bark 空回/截断通知** → 填写 Bark Key → **保存**。

脚本实际从 CDN 加载（与 JSON 内 `content` 一致）：

```js
import('https://testingcf.jsdelivr.net/gh/triishiu/st-bark-notify/dist/酒馆助手/Bark空回通知/index.js');
```

> **若行为像旧版**：在脚本列表中删除其它重复的 Bark 相关脚本后，重新导入上述 JSON。

---

## 仓库里都有什么？

本仓库是从「酒馆助手前端/脚本模板」精简而来，只保留 **Bark 通知** 这一条脚本，以及构建、类型定义所需的基础设施。

```
st-bark-notify/
├── Bark空回通知.json          ← 给酒馆「导入」用（推荐下载这个）
├── src/酒馆助手/Bark空回通知/      ← 源码（开发时改这里）
│   ├── index.ts                  入口
│   ├── detection.ts              空回/截断检测
│   ├── send-bark.ts              推送请求
│   ├── settings.ts               配置读写
│   ├── panel.ts                  扩展页 UI
│   └── constants.ts              常量
├── dist/酒馆助手/Bark空回通知/     ← 构建产物（CDN / 酒馆真正加载的 JS）
│   ├── index.js
│   ├── index.js.map              调试用，酒馆运行不依赖
│   └── Bark空回通知.json     与根目录导入 JSON 内容相同
├── scripts/gen-import-json.mjs   根据 CDN 地址生成两份导入 JSON
├── @types/                       酒馆助手 API 类型（仅开发用）
├── webpack.config.ts 等          打包配置（仅开发用）
└── package.json
```

### `src` 和 `dist` 是什么关系？

| 目录 | 作用 | 要不要改 / 提交 |
|------|------|------------------|
| **`src/…`** | 可读的 TypeScript 源码，按模块拆分 | **改功能只改这里**；随 Git 提交 |
| **`dist/…/index.js`** | `npm run build` 打出来的单文件 JS | **不要手改**；改完 `src` 后 build，再提交，供 jsDelivr 拉取 |
| **根目录 `Bark空回通知.json`** | 酒馆助手脚本导入格式 | `npm run gen:import` 可自动同步 CDN 地址 |
| **`dist/…/Bark空回通知.json`** | 同上，放在 `dist` 旁备用 | 与根目录文件由同一脚本生成，内容一致 |

一句话：**你写 `src`，用户和 CDN 用 `dist/index.js`，导入酒馆用根目录 JSON。**

---

## 开发

### 环境

- Node.js 18+（推荐 20+）
- 本仓库使用 `npm`（`package-lock.json`）；若用 `pnpm` 需自行保证依赖可安装

### 命令

```bash
npm install --legacy-peer-deps

npm run build        # src → dist/酒馆助手/Bark空回通知/index.js
npm run gen:import   # 同步根目录与 dist 下的导入 JSON（改 CDN 或脚本名后执行）
npm run watch        # 监听 src 变更并热构建（需酒馆助手「允许监听」）
npm run lint         # ESLint
```

**改完源码后的发布顺序：**

1. 编辑 `src/酒馆助手/Bark空回通知/`
2. `npm run build`
3. `npm run gen:import`（若改过仓库名、路径或 CDN 域名）
4. 提交 `src`、`dist`、`Bark空回通知.json` 并 push 到 GitHub
5. 等待 jsDelivr 刷新（通常数分钟）后，在酒馆重新导入或刷新脚本

也可在 GitHub Actions 中手动运行 **bundle** workflow（会执行 `build` + `gen:import`）。

### 修改 CDN 地址

编辑 [`scripts/gen-import-json.mjs`](scripts/gen-import-json.mjs) 顶部的 `cdnUrl`，再运行 `npm run gen:import`。

---

## 许可

见 [LICENSE](LICENSE)。
