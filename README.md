# 视频分镜助手 (Storyboard Assistant)

专为视频创作者打造的专业工具，使用 Google Gemini AI 生成详细分镜脚本与 3x3 网格提示词。

## 🚀 部署方式 (Workers KV 版)

本项目已切换为使用 **Workers KV** 进行数据存储。

### 方式：GitHub 网页版部署

适合直接 Fork/Upload 代码到 GitHub 的用户。

#### 1. 创建 KV Namespace (Cloudflare 后台)
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2.  进入 **Workers & Pages** -> **KV**。
3.  点击 **Create a namespace**，命名为 `storyboard-kv`。
4.  **复制** 生成的 **Namespace ID**。

#### 2. 修改配置 (GitHub)
1.  在 GitHub 仓库中打开 `wrangler.toml` 文件。
2.  找到 `[[kv_namespaces]]` 部分。
3.  将 `id = "KV_ID_GOES_HERE"` 中的 ID 替换为您刚才复制的 ID。
4.  提交更改 (Commit)。

#### 3. 绑定 KV (重要步骤)
代码上传后，还需要在 Cloudflare 后台进行连接授权。

1.  进入 **Workers & Pages** -> 选择您的 Pages 项目。
2.  点击 **Settings (设置)** -> **Functions (函数)**。
3.  向下滚动找到 **KV Namespace Bindings** 区域 (注意不是 D1)。
4.  点击 **Add binding**：
    *   **Variable name**: `KV` (必须大写，不能改)
    *   **KV namespace**: 选择 `storyboard-kv`
5.  点击 **Save**。

#### 4. 设置 API Key
1.  点击 **Settings** -> **Environment variables**。
2.  添加变量 `API_KEY`，填入您的 Google Gemini Key。
3.  保存。

#### 5. 重新部署
修改配置后，请在 **Deployments** 页面 **Retry** 最新的一次部署，或者在 GitHub 推送任意修改触发新部署。

---

## 🛠️ 技术栈

*   **Frontend**: React 19, Tailwind CSS, Lucide React
*   **Backend**: Cloudflare Pages Functions
*   **Storage**: Cloudflare Workers KV
*   **AI**: Google GenAI SDK (Gemini 3.0 Flash/Pro)
