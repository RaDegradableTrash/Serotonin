# Serotonin 本地开发

本地目录：`C:\Users\Ragon\Serotonin`。
远程仓库：<https://github.com/RaDegradableTrash/Serotonin>。
完整 Git 历史已保留，当前分支为 `main`，远程为 `origin`。

## 启动

Windows 下双击 `dev.cmd`，然后访问 <http://localhost:5173>。
关闭命令窗口或按 Ctrl+C 停止服务。端口被占用时会报错，不会悄悄切换到另一个端口。

也可以在新开的 PowerShell 窗口中执行：

```powershell
cd C:\Users\Ragon\Serotonin
npm.cmd run dev -- --host localhost --port 5173 --strictPort
```

本机 Node.js 24.14.1 / npm 安装在 `%LOCALAPPDATA%\Programs\node-v24.14.1-win-x64`，已加入用户 PATH。已有终端或编辑器可能需要重启才会读取新 PATH；`dev.cmd` 会自动找到此安装。

## 常用命令

```powershell
npm.cmd ci          # 根据锁文件重新安装依赖（需要联网）
npm.cmd run build   # TypeScript 检查及生产构建，输出到 dist
npm.cmd run preview # 访问 http://localhost:4173
npm.cmd run lint    # ESLint 检查
git status         # 查看本地改动
```

`preview` 也支持 PORT 环境变量，保持 Render 的动态端口兼容。
Inter 字体已改为本地 npm 包资源，启动应用无需访问 Google Fonts。

## 项目结构与数据（旧文件传输版本，已被替代）

- `src/App.tsx`：应用入口及交互状态。
- `src/Scene.tsx` 等组件：Three.js / React Three Fiber 场景。
- `src/utils/mockBackend.ts`：使用浏览器 localStorage 的模拟后端。
- `src/utils/cryptoUtils.ts`：浏览器 Web Crypto 加解密。
- `DevelopmentDocument1/2`、`FixDocument1/2`：原始设计与修复文档。
- `render.yaml`、`vite.config.ts`：原有 Render 部署配置和允许域名。

此仓库没有实际的数据库或服务端项目。本地数据只在同一浏览器、同一网址来源下保存；线上域名的数据不会自动出现在 localhost，不同端口也不会共享数据。读取后删除是现有模拟后端的行为。使用 localhost 可满足浏览器 Web Crypto 的安全上下文要求。

本地启动不会更新线上网站。需要自行提交并推送代码，线上是否自动部署取决于 Render 后台设置。

## 环境初始化时的验证结果（历史记录）

- `npm ci` 安装成功，随后添加本地字体包并同步锁文件。
- `npm run build` 通过；构建器提示主包超过 500 kB，后续可考虑拆包。
- 本地开发首页已在浏览器中确认显示。
- Windows 下生产预览启动成功，`PORT=4175` 生效；开发和预览 HTTP 均返回 200。
- `npm run lint` 检出原有源码中的 45 个错误和 2 个警告，包括 Hooks 调用顺序、any 类型和未使用变量；本次未改动这些业务组件。
- npm 安装审计报告 10 项依赖漏洞（1 low、3 moderate、6 high），尚未升级原有依赖处理。
- 本次环境适配改动保留为未提交状态，未推送远程。

## 效率工具改版

当前代码已移除 3D 文件传输界面。最新功能、Google OAuth 配置和限制见 README.md；上方旧架构与检查记录仅作历史参考。


