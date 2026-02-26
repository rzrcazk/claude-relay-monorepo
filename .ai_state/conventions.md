# Project Conventions

## 项目信息
- 名称: claude-relay-monorepo
- 类型: Cloudflare Workers Monorepo (前后端统一部署)
- 语言: TypeScript
- 框架: Nuxt 4 (前端) + Hono (后端)

## 代码风格
- 分层架构: Routes → Services → Repositories
- 严格 TypeScript 类型检查
- 全链路类型定义在 shared/types

## 命名约定
- 文件: kebab-case (claude-proxy.ts)
- 类: PascalCase (KeyPoolService)
- 变量/函数: camelCase (getKeyPool)
- 常量: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)

## 禁止事项
- 禁止硬编码环境变量
- 禁止 console.log 上生产
- 禁止字符串拼接 SQL (参数化查询)
