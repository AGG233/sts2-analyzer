# BASE_URL 与 public/ 资源路径

## 问题背景

在 Vite 开发环境中，`import.meta.env.BASE_URL` 的值并非始终等于应用的根路径。

当 `nuxt.config.ts` 配置了 `app.baseURL: "/sts2-analyzer/"` 时：

- **开发环境 (dev)**：`BASE_URL` = `/sts2-analyzer/_nuxt/`
  - 这是因为 Vite 的 `base` 选项被设置为 `app.baseURL + buildAssetsDir`
  - `buildAssetsDir` 默认为 `/_nuxt/`
- **生产环境 (build)**：`BASE_URL` = `/sts2-analyzer/`
  - 构建后的资源通过 `buildAssetsDir` 分发，BASE_URL 保持为应用根路径

而 `public/` 目录下的文件（静态资源）始终通过应用的根路径提供服务：

```
开发: http://localhost:3000/sts2-analyzer/sql-wasm.wasm
生产: https://agg233.github.io/sts2-analyzer/sql-wasm.wasm
```

## 导致的问题

如果直接使用 `import.meta.env.BASE_URL` 拼接 public 资源路径：

```ts
// ❌ 错误：开发环境会请求到 /sts2-analyzer/_nuxt/sql-wasm.wasm
const wasmUrl = `${import.meta.env.BASE_URL}sql-wasm.wasm`;
```

在开发环境中，上述请求会命中 Nuxt 的 SPA fallback，返回 HTML 页面而非 WASM 二进制文件，导致：

- `WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 44 4f`（HTML 的 `<!DO` 被当作 WASM 解析）
- SQL.js 初始化失败，数据库无法加载
- 依赖数据库的组件（如 `CardPickRateChart`）报错

## 受影响资源

| 资源类型 | 文件位置 | 引用文件 |
|---|---|---|
| SQL.js WASM | `public/sql-wasm.wasm` | `app/lib/db.client.ts` |
| 卡牌数据 JSON | `public/card-pools-v0.15.json` | `app/lib/db.client.ts` |
| 卡牌元数据 JSON | `public/card-metadata-v0.15.json` | `app/lib/db.client.ts` |
| 卡牌变量 JSON | `public/card-vars-v0.15.json` | `app/lib/db.client.ts` |
| Spine 动画 | `public/spine/mainmenu/` | `app/components/layout/AnimatedBackground.vue` |
| 卡牌图片 | `public/cards/` | `app/data/card-assets.ts` |

## 修复方案

使用辅助函数去除开发环境中 `/_nuxt/` 的后缀：

```ts
function getPublicBaseURL(): string {
	return import.meta.env.BASE_URL.replace(/\/_nuxt\/$/, "/");
}
```

对于简单场景，也可以直接内联：

```ts
const appBaseURL = import.meta.env.BASE_URL.replace(/\/_nuxt\/$/, "/");
const resourceUrl = `${appBaseURL}resource-file.json`;
```

## 验证方法

启动开发服务器后，通过浏览器 DevTools Network 面板检查：

- `sql-wasm.wasm` 应从 `/sts2-analyzer/sql-wasm.wasm` 加载（而非 `/_nuxt/` 路径）
- Spine `.skel` 和 `.atlas` 文件应从 `/sts2-analyzer/spine/...` 加载
- 控制台不应出现 WASM 编译错误或资源加载失败
