# 视频分镜助手 (Storyboard Assistant)

专为视频创作者打造的专业工具，使用 Google Gemini AI 生成详细分镜脚本与 3x3 网格提示词。

## 🚀 Cloudflare Pages 部署教程 (Workers KV 配置)

本项目使用 **Workers KV** 存储数据。由于您是连接 GitHub 自动部署，请严格按照以下步骤在 Cloudflare 后台操作。

### 第一步：创建 KV 数据库
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2.  在左侧菜单点击 **Workers & Pages** -> **KV**。
3.  点击右上角 **Create a namespace**。
4.  输入名称：`storyboard-kv`，点击 **Add**。
5.  创建成功即可，无需复制 ID。

### 第二步：绑定 KV 到项目 (至关重要)
这一步是连接数据库与程序的桥梁。

1.  在 Cloudflare 后台进入 **Workers & Pages** -> **Overview**。
2.  点击您部署的本项目 (e.g., `storyboard-assistant`)。
3.  点击顶部的 **Settings (设置)** 选项卡。
4.  在左侧菜单点击 **Functions (函数)**。
5.  向下滚动找到 **KV Namespace Bindings** 区域。
6.  点击 **Add binding (添加绑定)**：
    *   **Variable name (变量名称)**: 填写 `KV` (必须大写，完全一致)。
    *   **KV namespace**: 在下拉菜单中选择第一步创建的 `storyboard-kv`。
7.  点击 **Save (保存)**。

### 第三步：配置 API Key
1.  在同一个 **Settings** 页面，点击左侧 **Environment variables (环境变量)**。
2.  点击 **Add variable**。
3.  **Variable name**: `API_KEY`
4.  **Value**: 您的 Google Gemini API Key。
5.  点击 **Save**。

### 第四步：重新部署 (应用配置)
配置修改不会立即生效，必须重新触发一次部署。

1.  点击顶部的 **Deployments (部署)** 选项卡。
2.  在 **All deployments** 列表中，找到最上面的一行（Latest）。
3.  点击右侧的 **三个点图标 (...)** -> 选择 **Retry deployment (重试部署)**。
4.  等待部署完成后，打开网站，即可正常使用 KV 存储功能。

---

## 🛠️ 技术栈

*   **Frontend**: React 19, Tailwind CSS, Lucide React
*   **Backend**: Cloudflare Pages Functions
*   **Storage**: Cloudflare Workers KV (NoSQL)
*   **AI**: Google GenAI SDK (Gemini 3.0 Flash/Pro)
