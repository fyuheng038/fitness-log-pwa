# 健身日志 · Fitness Log PWA

一个适合手机使用的中文健身日志：记录训练、管理模板、探索人体肌肉图和动作演示。使用 React、TypeScript、Vite 和 IndexedDB 构建，无需账号或服务端数据库。

这是 2026-10-24 最新功能版本的开源副本。新安装从空白训练记录开始，不包含作者的私人训练历史或备份。

## 功能

- 训练记录：日期、编号、动作、重量、次数、组数和技巧备注。
- 自定义训练模板，从动作库添加动作或开始训练。
- 可交互的正面/背面人体肌肉图，按肌群、器械、中文及英文搜索。
- 24 个常用动作、48 张本地分解图、中文要点、主要及辅助肌群。两张姿势图可轮播，并非连续动作动画。
- 个人动作、名称别名、标准动作关联、个人技巧，以及自有或获授权的图片/视频演示。
- 训练频率和近 30 天已匹配动作的肌群统计；肌群统计不表示疲劳或恢复程度。
- 完整 JSON 导出/恢复、CSV 导出，以及兼容旧版备份。
- 可添加到手机主屏幕的 PWA。应用外壳离线缓存，动作图片访问后按需缓存。

## 本地运行

需要 Node.js 24 和 pnpm 11。项目提交了 pnpm 锁文件，使用冻结安装以保持依赖一致。

```sh
git clone https://github.com/fyuheng038/fitness-log-pwa.git
cd fitness-log-pwa
pnpm install --frozen-lockfile
pnpm dev
```

访问终端显示的本地地址。

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

## 部署

将构建生成的 `dist/` 上传到 Cloudflare Pages 或其他静态网站托管服务。无需设置环境变量或上传密钥。托管平台的构建命令为 `pnpm build`，输出目录为 `dist`。

当前配置面向域名根路径。如果使用 GitHub Pages 的 `/repository/` 子路径，需要同时调整 Vite base、PWA manifest、service worker 及资源路径，不能直接原样部署到子路径。

PWA 需要 HTTPS（localhost 除外）。演示媒体已经随源码提供，运行时无需访问第三方图片服务器。

## 数据与隐私

训练数据存在当前设备、当前网站来源的 IndexedDB 中，应用没有训练数据上传接口。不同域名、设备或浏览器的数据不会自动同步。首次访问仅创建默认模板，不会生成模拟训练。

请定期导出 JSON；清除网站数据会删除本机记录。自定义媒体也保存在本机并包含在 JSON 中，因此备份可能较大。不要将自己的导出备份提交到公共仓库。托管平台仍可能记录常规网络访问日志。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `src/App.tsx` | 训练、模板、统计和备份界面 |
| `src/ExerciseLibrary.tsx` | 动作浏览、选择、技巧与演示 |
| `src/BodyMap.tsx` | 交互肌肉图 |
| `src/catalog-data.json` | 标准动作及来源 |
| `src/storage.ts` / `src/initialData.ts` | 本地持久化和空白初始化 |
| `src/backup.ts` | 备份校验与旧格式兼容 |
| `public/exercise-media/` | 动作分解图 |
| `tests/` | 备份、关联、筛选、素材完整性及初始化测试 |

## 许可与致谢

本项目应用代码使用 [MIT License](LICENSE)。第三方素材保留各自许可，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- 人体图来自 [MuscleMap](https://github.com/melihcolpan/MuscleMap)，MIT。
- 动作照片及部分元数据来自 [free-exercise-db](https://github.com/yuhonas/free-exercise-db)，Unlicense。
- 功能探索受到 [openGym](https://github.com/DuarteSantos8/openGym) 启发；未复制其 AGPL 应用代码或需独立授权的 Gym visual 媒体。

欢迎提交 Issue 或 Pull Request。提交前请运行类型检查、测试和生产构建，并保留新增素材的来源与许可说明。

