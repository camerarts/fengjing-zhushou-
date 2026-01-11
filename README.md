# 视频分镜助手 (Storyboard Assistant) - Cloudflare 配置指南

本项目使用 **Cloudflare Pages** 进行托管，并使用 **Cloudflare D1** 作为后端数据库。

## 1. 环境准备

确保您已安装 Node.js (v18+) 和 NPM。
本项目依赖 `wrangler` 命令行工具与 Cloudflare 交互。

安装依赖：
```bash
npm install
```

登录 Cloudflare 账号：
```bash
npx wrangler login
```
（浏览器会弹出授权页面，请点击允许）

## 2. 数据库配置 (Cloudflare D1)

### 2.1 创建数据库
在终端运行以下命令创建一个新的 D1 数据库：

```bash
npx wrangler d1 create storyboard-db
```

命令执行成功后，终端会输出一段类似以下的内容：

```toml
[[d1_databases]]
binding = "DB"
database_name = "storyboard-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2.2 修改配置文件
打开项目根目录下的 `wrangler.toml` 文件。
将 `database_id` 的值替换为您刚刚生成的 ID。

### 2.3 初始化表结构
将数据库表结构应用到您的数据库中。

**本地开发环境 (Local):**
```bash
npx wrangler d1 execute storyboard-db --local --file=./migrations/0001_init.sql
```

**生产环境 (Remote):**
```bash
npx wrangler d1 execute storyboard-db --remote --file=./migrations/0001_init.sql
```

## 3. 本地开发

启动带有 Cloudflare 模拟环境的开发服务器：

```bash
npm run dev
# 或者使用 wrangler 启动以完全模拟后端
npx wrangler pages dev . --d1 DB=storyboard-db
```

注意：标准的 `vite` (`npm run dev`) 可能无法直接连接本地 D1 模拟器，建议使用 `wrangler pages dev` 进行全栈调试。

## 4. 部署上线

### 方法 A: 使用 CLI 部署 (推荐)
构建并部署到 Cloudflare Pages：

```bash
npm run deploy
```
选择 "Create a new project" (如果是第一次)，输入项目名称（如 `storyboard-assistant`）。

### 方法 B: 连接 GitHub 自动部署
1. 将代码推送到 GitHub。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
3. 进入 **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**。
4. 选择您的仓库。
5. **Build Settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
6. **Environment variables**:
   - 如果需要，设置 `NODE_VERSION` 为 `20`。
7. **D1 Database Binding (至关重要)**:
   - 部署完成后，进入该 Pages 项目的 **Settings** -> **Functions**。
   - 找到 **D1 Database Bindings** 部分。
   - Variable name: `DB` (必须是大写 DB，与代码一致)。
   - D1 database: 选择您在第 2.1 步创建的 `storyboard-db`。
   - 点击 **Save**。
   - **重新部署**: 您需要去 **Deployments** 标签页，点击最新一次部署的三个点 -> **Retry deployment**，或者推送一个新的 commit，这样数据库绑定才会生效。

## 常见问题

- **刷新页面 404**: 确保 `public/_redirects` 文件存在。
- **数据库报错**: 检查 `wrangler.toml` 中的 `database_id` 是否正确，以及是否在 Cloudflare Dashboard 中正确配置了绑定（如果使用 Git 部署）。
