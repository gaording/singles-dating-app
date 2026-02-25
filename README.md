# 单身搭子社交

一个轻量级的饭局社交应用，帮你找到志同道合的饭搭子。

## 技术栈

- 前端：Vue 3 + Vite + Tailwind CSS
- 后端：飞书多维表格
- API 代理：Cloudflare Workers

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端
npm run dev

# 启动 API 代理（需要先配置 wrangler）
npm run api
```

## 部署

### 1. 部署前端（GitHub Pages）

```bash
npm run build
# 推送到 GitHub，自动部署
```

### 2. 部署 API 代理（Cloudflare Workers）

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 设置飞书密钥
wrangler secret put FEISHU_APP_ID
wrangler secret put FEISHU_APP_SECRET

# 部署
wrangler deploy
```

### 3. 更新前端 API 地址

部署完 Workers 后，更新 `src/App.vue` 中的 `API_BASE`：

```javascript
const API_BASE = 'https://singles-dating-api.YOUR_SUBDOMAIN.workers.dev/api';
```

## 飞书配置

### 需要的权限

- `bitable:app` - 创建和管理多维表格
- `bitable:app:readonly` - 读取多维表格
- `drive:drive` - 访问云空间

### 多维表格结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 饭局名称 | 文本 | - |
| 描述 | 文本 | - |
| 地点 | 文本 | - |
| 距离 | 数字 | 公里 |
| 时间 | 文本 | - |
| 最大人数 | 数字 | - |
| 当前人数 | 数字 | - |
| 发起人 | 文本 | - |
| 发起人头像 | 文本 | emoji |
| 筛选问题 | 文本 | JSON |
| 状态 | 单选 | 招募中/已满员/已结束 |
| 创建时间 | 日期 | - |

## License

MIT
