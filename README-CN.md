<div align="right">
  <a title="English" href="/README.md">English</a>
</div>
<div align="left">
<img src="./.source/Quasar-logo.svg" height="220" alt="Quasar Logo" />

# 🌌 Quasar - A cosmic-inspired Astro theme

> 一款灵感源自宇宙的 Astro 主题，以地球的稳定性为基础。设计简洁、性能卓越，为流畅地书写博客而生。
> 基于 Astro v7 构建，抛弃臃肿的运行时框架，依靠纯原生 CSS + Vanilla JS 引擎驱动，实现毫秒级响应与丝滑微交互。

![Astro](https://img.shields.io/badge/Astro-v7-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![CSS3](https://img.shields.io/badge/Pure_CSS-Animations-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

## ✨ 设计哲学 (Philosophy)

Quasar 不仅仅是一个博客，它是你的「数字分身」。
项目采用 Astro 孤岛架构（Islands Architecture），将前端性能压榨到极致。完全依靠精密的 CSS `@keyframes` 动画与无阻塞的原生 JavaScript (`Vanilla JS`)，在保证极佳 SEO 的同时，提供了沉浸式的深浅色无缝切换、毛玻璃视差、以及类似 Native App 般的视图过渡（View Transitions）。

## 📸 截图预览 (Screenshots)

<img src="./.source/Screenshot-desktop.png" height="320" alt="Quasar Screenshot Desktop" />
<img src="./.source/Screenshot-mobile.png" height="320" alt="Quasar Screenshot Mobile" />

📢 **Demo**: [Quasar Official](https://demo.singyan.top/) | [Singyan Blog](https://singyan.top/)

## 🚀 核心功能图鉴 (Core Features)

Quasar 拆分了多个高度自治且富有表现力的频道模块：

* 📝 **深度长文 (Posts) & 灵感随记 (Notes)**
  * 基于 `Content Collections` 实现 100% 类型安全的 Markdown 渲染。
  * **Notes:** 采用纯 CSS 驱动的原位展开与分类检索机制，打造无界极简列表。
* 📸 **摄影集 (Albums)**
  * 集成 Google Photos API (`GooglePhotosFetcher.ts`) 获取云端图源。
  * 精密的自适应瀑布流 (Masonry) 布局，内置 `LazyLoad` 与全局 `Lightbox` 画廊守护。
* 💭 **瞬间动态 (Moments)**
  * 类朋友圈/即刻的碎片化记录流，包含定制的侧边栏、点赞交互 (`MomentsLikeButton`) 与详情扩展卡片。
* 🎵 **沉浸音乐室 (Music)**
  * 完全自研的原生 JS 播放器引擎 (`music-engine.js`)。
  * 具备动态背景视觉 (`MusicBackground`)、双侧边栏控制面板。
* 🪐 **互动主页 & 小组件生态 (Widgets)**
  * 首页搭载 3D 地球仪 (`Earth.astro`) 与视差欢迎辞 (`IntroWord.astro`)。
  * 内置多功能模块栈：天气观测 (`WeatherWidget`)、工作台状态 (`StudioWidget`)、名言展示 (`QuoteWidget`)。
* 🤝 **星系跃迁网络 (Friends & Relay)**
  * 基于 `GentleModal` 的优雅拦截弹窗。
  * 友链卡片、站点信息面板与高阶随机跳转网关 (`relay.js`) 结合，构筑个人站长互联星系。
* 🛠️ **内部生成器引擎 (Generators)**
  * 自建内部工具链 (`pages/generator/`)，一键生成封面 SVG、Favicon、以及站点全套主题色系资源。

## 📂 深度项目架构 (Architecture)

严密、模块化、极客风的文件拓扑结构：

```text
Quasar/
├── assets/                 # 核心静态资源引擎
│   ├── scripts/            # Vanilla JS 引擎族 (music-engine, navbar-engine, intro-engine 等)
│   └── styles/             # 按需加载的纯 CSS 动画与布局模块 (moments.css, notes.css 等)
├── components/             # 高度解耦的组件库
│   ├── about/              # 关于页雷达图、技术栈展台、悬浮 Dock
│   ├── albums/             # 瀑布流视图与相册标头
│   ├── common/             # 全局基建 (Lightbox 画廊, 视口懒加载, ExternalLinkGuard 外链守卫)
│   ├── friends/            # 友链网络与 Gentle 模态框
│   ├── head/               # <head> 层级注入 (无闪主题同步 ThemePerfInit)
│   ├── moments/            # 瞬间动态卡片、点赞与时间线侧栏
│   ├── music/              # 全定制音乐播放器面板界面
│   ├── navbar/             # 全局模糊检索与顶部交互中心
│   ├── notes/              # 纯 CSS 随记列表过滤器
│   ├── posts/              # 博客文章视图
│   ├── services/           # 外部接口聚合 (GooglePhotosFetcher)
│   └── widgets/            # 首页模块化小部件 (天气、工作室等)
├── content/                # Content Collections 数据枢纽 (Markdown)
│   ├── albums/ & friends/ 
│   ├── moments/ & music/ 
│   ├── notes/ & posts/     # 你的所有文字与数据源均存放于此
│   └── Empty.md            # 占位符结构
├── layouts/                # 站点核心骨架 (BaseLayout.astro)
├── pages/                  # 物理路由分发
│   ├── api/                # Serverless 接口 (如 albums.ts 数据拉取)
│   ├── generator/          # 仅本地/开发环境使用的资源生成器
│   ├── posts/              # 动态博文路由 ([...slug].astro)
│   └── index, about, music, moments, friends, notes... # 主频道入口
├── utils/                  # 通用函数链 (剪贴板 clipboard, 视区侦测 visibilityGuard 等)
├── config.ts               # 全局变量、模块开关与基础信息配置
└── content.config.ts       # Astro Content 类型结构安全定义
```

## 🚀 部署与使用 (Getting Started)

Node.js 环境要求：`v22.12.0` 或更高版本。推荐使用 `pnpm` 获得更快的依赖安装体验。

**1. 克隆数字星系**

```bash
git clone [https://github.com/](https://github.com/)<your-username>/Quasar.git
cd Quasar
```

**2. 安装依赖引擎**

```bash
# 推荐使用 pnpm
pnpm install

# 或使用 npm
npm install
```

**3. 启动本地开发舱**

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev

# 终端就绪后，访问 http://localhost:4321/
```

**4. 构建生产固件**

```bash
# 使用 pnpm
pnpm build

# 或使用 npm
npm run build
```

## ✍️ 数据源与创作 (Content Management)

Quasar 的数据高度分离，不依赖任何外部 CMS 数据库。所有的内容通过 `src/content/` 下的 Markdown 文件管理：

* **发布文章：** 在 `content/posts/` 目录下创建 Markdown，配置 frontmatter。
* **发送动态：** 在 `content/moments/` 写入你的灵感片段。
* **更新友链：** 编辑 `content/friends/` 数据。
* **添加音乐：** 补全 `content/music/` 下的单曲信息。

*项目已深度集成 TypeScript 校验，Frontmatter 格式如有遗漏会在编译期直接预警，保障数据绝对安全。*

## ⚙️ 核心配置 (Configuration)

无需深入代码深渊，站点的 80% 个性化均可通过修改根目录的 `config.ts` 解决。包括：

* 站点名称、SEO 描述
* 顶部导航栏路由与 Icon
* 各子页面（音乐、博客、动态）的专属文案与开关
* 社交网络直达链接

## 📜 许可证 (License)

本项目采用 [MIT License](https://mit-license.org/) 开源协议。
允许自由二次开发与分发，惟请保留原仓库的版权声明。

---

<div align="center">

*由 [SingyanLabs](https://github.com/singyanlabs) 倾❤️打造, Google Gemini 强力驱动.*

**✨ 若本主题对您有所裨益，还请不吝点亮一枚 ⭐ Star！ ✨**

</div>


