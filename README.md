# 视频分镜助手 (Storyboard Assistant)

专为视频创作者打造的专业工具，使用 Google Gemini AI 生成详细分镜脚本与 3x3 网格提示词。

## 🚀 Cloudflare Pages 部署教程

本项目使用 **Workers KV** 存储数据 (如项目列表、API Key)，使用 **R2** 存储图片文件。请严格按照以下步骤操作。

### 1. 创建 KV 数据库
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2.  在左侧菜单点击 **Workers & Pages** -> **KV**。
3.  点击 **Create a namespace**。
4.  名称：`storyboard-kv`，点击 **Add**。

### 2. 创建 R2 存储桶 (图片存储)
1.  在左侧菜单点击 **R2**。
2.  点击 **Create bucket**。
3.  名称：`storyboard-assets` (或者任意你喜欢的名字)。
4.  点击 **Create Bucket**。

### 3. 配置 R2 (关键步骤)
为了让应用能正确读取和切分图片，必须配置 **公开访问** 和 **CORS**。

#### 3.1 开启公开访问
1.  进入刚创建的 Bucket。
2.  点击顶部 **Settings (设置)** 选项卡。
3.  向下滚动找到 **Public Access** -> **R2.dev subdomain**。
4.  点击 **Allow Access**。
5.  **复制链接**: 复制显示的链接 (例如 `https://pub-xxxxxxxx.r2.dev`)，稍后配置环境变量时需要用到。

#### 3.2 配置 CORS (解决图片切分报错)
**注意**：如果不配置此项，前端 Canvas 在处理跨域图片时会报错 (Tainted Canvas)，导致无法生成九宫格切片。

1.  仍在 **Settings** 页面，向下滚动找到 **CORS Policy**。
2.  点击 **Add/Edit CORS Policy**。
3.  粘贴以下 JSON 配置 (允许所有域名访问，或者你可以只填你的网站域名)：
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
        "AllowedHeaders": ["*"]
      }
    ]
    ```
4.  点击 **Save**。

### 4. 绑定资源到 Pages 项目
这一步是将数据库和存储桶连接到你的网站代码。

1.  进入 **Workers & Pages** -> **Overview** -> 选择你的项目。
2.  点击 **Settings (设置)** -> **Functions (函数)**。
3.  向下滚动找到 **KV Namespace Bindings**：
    *   Variable name: `KV` (必须大写)。
    *   Namespace: 选择第 1 步创建的 `storyboard-kv`。
    *   点击 **Add binding**。
4.  向下滚动找到 **R2 Bucket Bindings**：
    *   Variable name: `BUCKET` (必须大写)。
    *   R2 Bucket: 选择第 2 步创建的 `storyboard-assets`。
    *   点击 **Add binding**。
5.  点击 **Save (保存)**。

### 5. 配置环境变量
1.  点击 **Settings (设置)** -> **Environment variables (环境变量)**。
2.  点击 **Add variable**，添加以下变量：
    *   `API_KEY`: 您的 Google Gemini API Key。
    *   `R2_PUBLIC_URL`: 第 3.1 步中复制的 R2.dev 链接 (例如 `https://pub-xxxxxxxx.r2.dev`)。**注意：不要带结尾的斜杠**。
3.  点击 **Save**。

### 6. 重新部署
配置修改（特别是绑定资源）后，必须重新部署才能生效。

1.  点击 **Deployments (部署)**。
2.  找到最新的部署记录 (Latest)，点击右侧 **(...)** -> **Retry deployment**。

---

## 🛠️ 技术栈

*   **Frontend**: React 19, Tailwind CSS, Lucide React
*   **Backend**: Cloudflare Pages Functions
*   **Database**: Cloudflare Workers KV (NoSQL)
*   **Storage**: Cloudflare R2 (Object Storage)
*   **AI**: Google GenAI SDK (Gemini 3.0 Flash/Pro)
