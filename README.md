# 单身搭子社交

一个轻量级的饭局社交应用，帮你找到志同道合的饭搭子。

## 技术栈

- 前端：Vue 3 + Vite + Tailwind CSS
- 后端：飞书多维表格
- 部署：阿里云（OSS + 函数计算）

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build
```

## 部署到阿里云

详见 [DEPLOY-ALIYUN.md](./DEPLOY-ALIYUN.md)

```bash
# 安装 Serverless Devs
npm install -g @serverless-devs/s

# 配置阿里云密钥
s config add

# 设置飞书凭证
export FEISHU_APP_ID="你的AppID"
export FEISHU_APP_SECRET="你的AppSecret"

# 一键部署
s deploy
```

## 飞书配置

### 需要的权限

- `bitable:app` - 创建和管理多维表格
- `bitable:app:readonly` - 读取多维表格
- `drive:drive` - 访问云空间

### 环境变量

| 变量名 | 说明 |
|--------|------|
| `FEISHU_APP_ID` | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret |

## 费用

- OSS 静态网站：~¥0.5/月
- 函数计算：免费额度内
- **总计：约 ¥0.5 - 5/月**

## License

MIT
