# STS2 Analyzer

STS2 Analyzer 是一个基于 `Nuxt 4 + Vue 3 + TypeScript + Pinia + sql.js + Drizzle + ECharts` 的 Slay the Spire 2 存档分析器。

应用运行在浏览器端，解析 `.run` 存档文件并将结构化结果持久化到浏览器本地 SQLite（`sql.js` + IndexedDB）。

## 环境要求

- Node.js 20+
- `pnpm` 10+
- Chrome / Edge

## 安装

```bash
pnpm install
```

`postinstall` 会自动执行 `nuxt prepare`。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
pnpm lint
pnpm typecheck
pnpm test:run
```

## 技术栈

- Nuxt 4
- Vue 3
- Pinia
- sql.js + Drizzle ORM
- ECharts + vue-echarts
- Vitest
- Biome + ESLint

## 项目结构

- `app/`：应用源码
- `app/data/`：存档类型、解析器和分析逻辑
- `app/db/`：Drizzle schema 与迁移
- `app/lib/`：通知、存储、数据库与基础设施代码
- `app/stores/`：Pinia 状态
- `scripts/`：数据提取与本地化脚本
- `tests/`：单元测试与组件测试

## 开发检查

提交前建议至少执行：

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

## 说明

- `public/sql-wasm.wasm` 必须存在，否则本地数据库无法初始化。
- 修改 UI 翻译后需运行 `node scripts/generate-locales.cjs`。
- 旧版本 IndexedDB JSON 数据会在启动时自动迁移到 SQLite。
