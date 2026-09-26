# Serotonin

个人效率空间，React + TypeScript + Vite。保留原版左侧动态圆角长方体导航及五档切换动效，移除文件上传、下载、加密存取与文件柜业务。

## 启动

Windows 双击 `dev.cmd`，或执行 `npm run dev -- --host localhost --port 5173 --strictPort`。

- `npm run build`：类型检查与生产构建
- `npm run lint`：静态检查
- `node --test tests/*.test.mjs`：日历日期与 Google 接口边界测试（Node 22.13+）

## 五个空间

- `~` / 反引号：主页。与原版主页标签共面的四列应用网格、搜索、自定义快捷链接、应用整理、组合工作流、25 分钟专注、今日安排与待办、账号连接状态。
- `1`：日历。周/月视图、日期导航、创建/编辑/删除、颜色、备注、全天及跨天、重叠提示、拖动改期、待办排期。
- `2`：待办。新增、完成、恢复、重命名、优先级、截止日期、过滤、安排进日历。
- `3`：留白。
- `4`：音乐。音频直链播放列表，浏览器原生播放/暂停/进度/音量控制、自动下一首；切换页面不中断。

输入文字、选择日期、使用组合键或打开对话框时，不触发数字导航。数据默认为空，避免演示内容混入真实计划。

## Google Calendar / Gmail

这是用户运行的网站的 Google API 接入，不依赖 Codex 的个人 Google 插件。

1. 在 Google Cloud 创建项目，启用 Calendar API 和 Gmail API。
2. 配置 OAuth 同意屏幕；测试阶段添加你的 Google 账号为测试用户。
3. 创建 **Web application** OAuth Client ID，把实际网址来源（例如 `http://localhost:5173`）加入 **Authorized JavaScript origins**。部署后添加 HTTPS 线上来源。
4. 复制 `.env.example` 为 `.env.local`，填写 `VITE_GOOGLE_CLIENT_ID`，重启开发服务；也可以在应用右上角「连接与设置」直接填写 Client ID。不要放 Client Secret。
5. 分别点击 Calendar / Gmail 的「授权连接」。首次使用需要允许 Google 授权弹窗。

Google Calendar 使用 `calendar.events.readonly`，读取主日历当前可见月份前后各一个月，展开重复日程、处理分页和全天结束日期。Google 日程只读，可跳到 Google 编辑；本地新增日程不回写 Google。浏览日期时重新读取，可在设置里手动刷新。Gmail 使用 `gmail.labels` 获取 INBOX 未读数量，不读取邮件正文，支持手动刷新。

Token 只保存在内存；关闭、刷新页面或过期后需再次授权。断开操作清除两项连接并请求 Google 撤销授权。网络失败、拒绝授权、过期和弹窗拦截均显示实际状态，不伪装为已同步。

**尚未完成真实账号联调**：需要应用所有者的 Client ID 和授权。Discord、Instagram、微信目前只有快捷跳转与未接入提示，尚未读取账号状态。

官方文档：[Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model)、[Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)、[Gmail labels.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/get)。

## 工作流与桌面能力

组合工作流保存多个网页或已注册应用协议链接，点击打开全部；若弹窗被拦截可逐个点击。允许 http(s)、mailto、discord、weixin、unityhub、vscode，拒绝 javascript/file 等链接。

**新建 Windows 虚拟桌面 + 启动 Codex + 指定 Unity 项目尚未实现**。需要后续加入受限本地执行器（例如 Tauri/Electron 或显式注册的本地协议）。当前纯浏览器版本不执行 shell，也不显示虚假的执行成功状态。微信等应用协议是否可用取决于本机安装与注册情况。

音乐只支持浏览器可访问的音频直链，Spotify/网易云等页面链接不是音频源。没有上传/下载入口。

## 数据与工程

本地日程、待办、快捷方式、工作流、音乐列表和公开 OAuth Client ID 保存到版本化 localStorage。Google 事件及 Token 不持久化。数据仅在同一浏览器/来源下可用，清除站点数据会删除本地记录；尚无跨设备同步。旧文件传输的 localStorage 数据不会被自动删除，但新应用不再读取。

- `src/Scene.tsx` / `src/MenuCards.tsx` / `src/ReceptorGrid.tsx`：原版动态圆角长方体导航
- `src/HomeOrbit.tsx`：共面四边形应用网格、快捷工作流与今日摘要
- `src/App.tsx`：空间切换、连接与业务状态
- `src/Calendar.tsx` / `src/EventEditor.tsx`：日历与日程编辑
- `src/Tasks.tsx` / `src/Music.tsx`：待办与音乐
- `src/google.ts`：OAuth、Google API
- `src/model.ts` / `src/useStored.ts`：数据模型、日期运算与本地持久化

历史 `DevelopmentDocument*` / `FixDocument*` 保留作旧文件传输版本的参考，不再描述当前功能。


## 视觉与交互

保留原版完整 3D 场景、动态圆角标签、流体背景和刻度环。主页使用四列四边形网格，所有页面直接跟随活动标签的三维平面与运动，沿用原版字体、材质和强调色。移除装饰性标语。日历周视图支持左键拖选时间范围、15 分钟吸附、反向拖选与 Esc 取消；指针靠近上下边缘时连续滚动，跨过 00:00 / 24:00 后衔接相邻日期，并保留选区与日期过渡动画。松开鼠标即可编辑该时间范围。窄屏调整镜头以保留左侧标签。
