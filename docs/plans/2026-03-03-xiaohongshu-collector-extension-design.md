# 小红书一键采集 Chrome 插件设计文档

## 目标
构建一个可扩展多平台的 Chrome 插件，第一期支持小红书帖子采集；用户点击“一键采集”后进入预览页，编辑后提交到 PlushVote 现有接口。插件自动读取平台登录态（Supabase access token）；未登录时提示并跳转登录。

## 范围
- 本期实现：
  - 小红书帖子采集（标题、正文、多图、来源链接）
  - 预览编辑与图片勾选
  - 一键提交到现有平台 `/api/submissions`
  - 平台地址可配置（默认 `http://localhost:3000`）
  - 登录态自动读取，未登录提示去平台登录
- 明确不做：
  - 平台后端多图结构改造（由其他进程负责）
  - 复杂登录自动化（仅复用已有浏览器登录态）

## 架构设计
### 1) 模块
- `background service worker`：跨页面消息总线、权限申请、登录态读取、提交请求。
- `popup`：触发“一键采集”，展示采集结果状态。
- `preview`：编辑标题/正文/分类，选择多图并提交。
- `options`：维护平台基础地址配置。
- `collectors`：平台采集适配器接口与实现。

### 2) 多平台扩展模型
定义 `CollectorAdapter`：
- `id`：平台标识（如 `xiaohongshu`）
- `label`：展示名称
- `match(url)`：判断当前 URL 是否适配
- `collectFromDocument(document, location)`：从 DOM 提取数据

后续新增平台仅需新增 adapter 并注册，无需修改提交主流程。

## 数据流与提交流程
1. 用户在帖子页点击 popup 的“一键采集”。
2. background 根据当前 tab URL 选择 adapter 并注入采集函数。
3. 采集结果写入 `chrome.storage.session` 作为当前草稿。
4. 打开 `preview.html`，用户编辑并选择图片。
5. 点击提交后：
   - background 校验平台地址与已选图片。
   - background 在平台域名上下文读取 Supabase token。
   - 调用 `${platformBaseUrl}/api/submissions`，携带 `Authorization: Bearer <token>`。
   - 请求体：`name`、`description`、`category`、`imageUrl`（取选中第一张），并附带 `imageUrls`（前向兼容字段，当前后端可忽略）。
6. 成功后给出提交成功提示并保留返回 ID。

## 登录态策略
- 优先读取用户在平台域名下的 localStorage/sessionStorage 中 Supabase auth token。
- 读取失败或无 token：
  - 在插件中提示“请先登录平台”。
  - 提供一键打开 `${platformBaseUrl}/login?next=/submit`。

## 错误处理
- 非支持页面：提示“当前页面不支持采集”。
- 采集字段缺失：允许在预览页人工补齐。
- 提交失败：透传 API 错误信息（401/429/500）并保留草稿。
- 权限不足：提示用户授权平台域名访问权限。

## 权限与安全
- `permissions`: `activeTab`, `tabs`, `scripting`, `storage`
- `host_permissions`: 小红书域名
- `optional_host_permissions`: 可配置平台域名（运行时请求）
- 原则：最小权限、仅采集当前页面公开可见内容。

## 验收标准
1. 在小红书帖子页点击“一键采集”可获取标题、正文与多图。
2. 预览页可编辑文本、勾选多图并选择分类。
3. 平台已登录时可成功调用 `/api/submissions` 完成提交。
4. 未登录时给出清晰提示并支持跳转登录。
5. options 修改平台地址后，popup/preview 提交链路立即生效。
6. 代码可通过新增 adapter 扩展到下一平台。
