# st-bark-notify

基于 [StageDog/tavern_helper_template](https://github.com/StageDog/tavern_helper_template) 的酒馆助手项目仓库，内置脚本 **Bark 空回/截断通知**。

环境准备、实时编写、jsDelivr 用法等请阅读官方教程：

- [环境准备](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/环境准备/)
- [模板 README 说明](https://github.com/StageDog/tavern_helper_template/blob/main/README.md)

## 本仓库脚本位置

| 用途 | 路径 |
|------|------|
| 源码 | `src/酒馆助手/Bark空回通知/`（`index.ts` 入口） |
| 构建产物 | `dist/酒馆助手/Bark空回通知/index.js` |
| 酒馆导入（CDN） | 根目录 [`Bark空回通知.json`](./Bark空回通知.json) |
| 本地热重载导入 | [`初始模板/脚本/导入到酒馆中/Bark空回通知.json`](./初始模板/脚本/导入到酒馆中/Bark空回通知.json) |

## 用户：安装脚本

1. 下载 [Bark空回通知.json](https://raw.githubusercontent.com/triishiu/st-bark-notify/main/Bark空回通知.json) 或 [Releases](https://github.com/triishiu/st-bark-notify/releases/latest)
2. 酒馆 → **酒馆助手** → **脚本** → **导入**
3. **扩展** → **Bark 空回/截断通知** → 填写 Bark Key → **保存**

## 开发者

```bash
pnpm install
pnpm run build    # 打包 src + 示例，并生成根目录 Bark空回通知.json
pnpm run watch    # 监听构建（需酒馆助手「允许监听」+ 本地导入 JSON）
```

修改 `src/酒馆助手/Bark空回通知/` 后 push 到 `main`，**bundle** 工作流会自动提交 `dist` 并打版本 tag。

GitHub **Settings → Actions → General**：Workflow permissions 设为 **Read and write**，并允许 Actions 创建 PR。

## 许可

见 [LICENSE](LICENSE)。
