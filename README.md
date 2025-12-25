# 手语通 (SignLanguage-AI-Dictionary) 🖐️📖

一个基于 Google Gemini AI 驱动的智能中文手语词典。

## 🚀 免构建部署指南 (本地打包)

如果您不想使用 GitHub Actions 自动构建，可以按照以下步骤操作：

1. **本地环境准备**：
   - 确保本地已安装 Node.js。
   - 在项目根目录执行 `npm install` 安装依赖。

2. **配置 API Key**：
   - 在本地终端执行 `export API_KEY=您的密钥` (Mac/Linux) 或 `set API_KEY=您的密钥` (Windows)。
   - 或者直接在 `vite.config.ts` 的 `JSON.stringify` 处暂时硬编码您的 Key（注意不要泄露）。

3. **本地打包**：
   - 运行命令：`npm run build`
   - 项目根目录下会出现一个 `docs` 文件夹。

4. **上传到 GitHub**：
   - 将 `docs` 文件夹连同代码一起提交并推送到 GitHub。
   - **重要**：请手动删除 `.github/workflows/deploy.yml` 文件以停止自动构建。

5. **开启 GitHub Pages**：
   - 进入 GitHub 仓库 `Settings` > `Pages`。
   - `Build and deployment` > `Source` 选择 `Deploy from a branch`。
   - `Branch` 选择 `main` (或您的主分支)，文件夹选择 `/docs`。
   - 点击 `Save`。

6. **访问**：
   - 几分钟后即可通过 `https://<用户名>.github.io/<仓库名>/` 访问。

---
© 2024 手语通团队 - 让沟通无界限