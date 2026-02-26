# 阿里云部署指南

## 前置准备

### 1. 安装 Serverless Devs

```bash
npm install -g @serverless-devs/s
```

### 2. 配置阿里云密钥

```bash
s config add
# 输入 AccessKey ID 和 AccessKey Secret
# 可在阿里云控制台 → 右上角头像 → AccessKey 管理 获取
```

### 3. 设置环境变量

```bash
# Linux/macOS
export FEISHU_APP_ID="cli_a917c4e3ae389bb3"
export FEISHU_APP_SECRET="你的新Secret"

# Windows PowerShell
$env:FEISHU_APP_ID="cli_a917c4e3ae389bb3"
$env:FEISHU_APP_SECRET="你的新Secret"
```

---

## 部署步骤

### 第一步：构建前端

```bash
npm install
npm run build
```

### 第二步：部署到阿里云

```bash
# 部署全部（前端 + API）
s deploy

# 只部署前端
s frontend deploy

# 只部署 API
s api deploy
```

---

## 配置说明

### OSS 静态网站

- Bucket 名称：`singles-dating-app-{账户ID}`
- 默认开启静态网站托管
- 自动配置 CORS

### 函数计算 API

- Runtime: Node.js 20
- Memory: 256MB
- Timeout: 30s
- 触发器: HTTP Trigger（匿名访问）

---

## 自定义域名（可选）

### 1. 添加域名解析

在你的域名 DNS 中添加 CNAME：
```
api.你的域名.com → {region}.fc.aliyuncs.com
```

### 2. 配置 SSL 证书

```bash
export API_DOMAIN="api.你的域名.com"
export SSL_CERT="证书内容"
export SSL_KEY="私钥内容"

s api-domain deploy
```

### 3. 更新前端 API 地址

修改 `src/App.vue`：
```javascript
const API_BASE = 'https://api.你的域名.com/api'
```

重新构建并部署：
```bash
npm run build
s frontend deploy
```

---

## 常用命令

```bash
# 查看部署状态
s info

# 查看日志
s api logs

# 移除部署
s remove

# 本地调试 API
s api local
```

---

## 费用估算

### OSS 静态网站
- 存储：~10MB，约 ¥0.01/月
- 流量：1GB/月，约 ¥0.5/月
- **小计：¥0.5/月**

### 函数计算
- 调用：10万次/月，免费额度内
- 执行：~100ms/次，免费额度内
- **小计：免费**

### 总计
**约 ¥0.5 - 5/月**（视流量而定）

---

## 故障排查

### API 调用失败
```bash
# 查看函数日志
s api logs --tail

# 检查环境变量
s api info
```

### 前端无法访问 API
- 检查 CORS 配置
- 确认 API 地址正确
- 检查函数计算触发器配置

### OSS 上传失败
```bash
# 检查 Bucket 权限
s frontend info
```
