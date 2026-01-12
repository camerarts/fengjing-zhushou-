# 视频分镜助手 (Storyboard Assistant)

专为视频创作者打造的专业工具，使用 Google Gemini AI 生成详细分镜脚本与 3x3 网格提示词。

## 🚀 部署配置教程 (Workers KV)

本项目使用 **Workers KV** 存储数据。请按照以下步骤配置。

### 1. 获取 KV Namespace ID
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2.  进入 **Workers & Pages** -> **KV**。
3.  点击 **Create a namespace**，命名为 `storyboard-kv`。
4.  创建成功后，复制显示的 **Namespace ID**（例如 `a1b2c3d4...`）。

### 2. 配置 wrangler.toml
在项目根目录创建或修改 `wrangler.toml` 文件，填入以下内容：

```toml
name = "storyboard-assistant"
pages_build_output_dir = "dist"
compatibility_date = "2025-02-24"

[[kv_namespaces]]
binding = "KV"
id = "将这里替换为您的_NAMESPACE_ID"
```

### 3. 部署项目
1.  将代码推送到 GitHub。
2.  在 Cloudflare Pages 中连接您的 GitHub 仓库。
3.  构建设置：
    *   **Framework preset**: Vite
    *   **Build command**: `npm run build`
    *   **Build output directory**: `dist`

### 4. 绑定 KV (至关重要)
代码上传后，还需要在 Cloudflare Pages 后台进行连接授权。

1.  进入 **Workers & Pages** -> 选择您的 Pages 项目。
2.  点击 **Settings (设置)** -> **Functions (函数)**。
3.  向下滚动找到 **KV Namespace Bindings** 区域。
4.  点击 **Add binding**：
    *   **Variable name**: `KV` (必须完全一致，大写)
    *   **KV namespace**: 选择您在第1步创建的 `storyboard-kv`
5.  点击 **Save**。

### 5. 设置 API Key
1.  点击 **Settings** -> **Environment variables**。
2.  添加变量 `API_KEY`，填入您的 Google Gemini Key。
3.  保存。
4.  **重新部署**：进入 **Deployments** 页面，点击最新部署右侧的三个点，选择 **Retry deployment** 以应用配置。

---

## 🛠️ 技术栈

*   **Frontend**: React 19, Tailwind CSS, Lucide React
*   **Backend**: Cloudflare Pages Functions
*   **Storage**: Cloudflare Workers KV
*   **AI**: Google GenAI SDK (Gemini 3.0 Flash/Pro)
