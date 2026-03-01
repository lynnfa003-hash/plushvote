# PlushVote

PlushVote 是一个毛绒玩具创意投稿 + 投票平台（Next.js + Supabase）。

## 本地开发

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

如果项目根目录不存在 `.env.local`，可直接复制模板：

```bash
cp .env.local.example .env.local
```

然后填写以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase Project URL（必须是完整 `https://...`）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`：管理员服务端操作时使用（可先保留）
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`：可选，配置后会自动上报基础错误监控

### 3) 初始化 Supabase 数据库

在 Supabase SQL Editor 依次执行：

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_rls_policies.sql`

这会创建表、投票计数触发器、并开启 RLS：

- `plush_toys`
  - 公开可读：仅 `is_approved = true`
  - 管理员可读写（基于 `app_metadata.role = 'admin'` 或 `service_role`）
- `votes`
  - 公开可读
  - 公开可写（仅允许对已审核作品投票）

### 4) 启动开发环境

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 已实现的 P0 保障

- 投票 API 限流：同一 IP 每分钟最多 10 次（`/api/vote`）
- 基础错误处理：API/页面错误统一兜底
- 基础监控：默认 `console.error`，配置 Sentry DSN 后自动上报

## 常见问题

- 首页提示 Supabase 未配置：检查 `.env.local` 是否存在、URL 是否为完整 `http(s)` 地址。
- 投票返回 403：目标作品可能未审核通过（RLS 拒绝未审核作品投票）。
- 投票返回 409：同一 `toy_id + voter_id` 已投过票。
