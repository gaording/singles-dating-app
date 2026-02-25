# 部署指南

## 第一步：部署 API 代理

### 1. 安装 Cloudflare Workers CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 设置飞书密钥

```bash
# 在飞书开放平台获取 App ID 和 App Secret
wrangler secret put FEISHU_APP_ID
wrangler secret put FEISHU_APP_SECRET
```

### 4. 部署 Workers

```bash
wrangler deploy
```

部署成功后，你会得到一个类似这样的地址：
```
https://singles-dating-api.YOUR_SUBDOMAIN.workers.dev
```

### 5. 更新前端 API 地址

编辑 `src/App.vue`，修改 `API_BASE`：

```javascript
const API_BASE = 'https://singles-dating-api.YOUR_SUBDOMAIN.workers.dev/api'
```

## 第二步：部署前端

### 方式一：GitHub Pages（推荐）

1. 推送代码到 GitHub
2. 在仓库设置中启用 GitHub Pages
3. 选择 GitHub Actions 自动部署

### 方式二：Vercel

```bash
npx vercel
```

### 方式三：Cloudflare Pages

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`

## 本地开发

```bash
# 终端 1：启动前端
npm run dev

# 终端 2：启动 API 代理
npm run api
```

然后修改 `src/App.vue` 中的 `API_BASE` 为：
```javascript
const API_BASE = 'http://localhost:8787/api'
```

## 故障排查

### API 调用失败
- 检查飞书应用权限是否正确
- 检查 `wrangler secret` 是否设置
- 查看 Workers 日志：`wrangler tail`

### CORS 错误
- 确保使用部署后的 Workers 地址，而不是本地地址
- 本地开发时，前端和 API 代理需要同时启动

### 数据不显示
- 检查飞书多维表格是否有数据
- 打开浏览器控制台查看错误日志
