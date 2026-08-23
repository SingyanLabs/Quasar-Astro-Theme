# 🌌 Quasar - Personal Digital Space

> 一个极具交互感、高性能且优雅的个人数字空间 / 博客系统。
> 基于 Astro 构建，纯原生 CSS + 精密 JS 动效驱动，支持深浅色模式无缝平滑切换。

![Astro](https://img.shields.io/badge/Astro-v4-FF5D01?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![CSS3](https://img.shields.io/badge/Pure_CSS-Animations-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

## ✨ 设计哲学 (Philosophy)

Quasar 不仅仅是一个博客，它被设计为一个「个人的数字星系」。
摒弃了臃肿的前端框架，采用 Astro 的孤岛架构（Islands Architecture）与极简的原生 Web 技术，在保证页面秒开、极佳 SEO 的同时，提供了极其细腻的微交互动画（Micro-interactions）与丝滑的视图过渡（View Transitions）。

## 🚀 核心功能模块 (Features)

Quasar 拥有高度模块化的页面与组件架构：

- 📝 **文章 (Posts) & 随记 (Notes):** 
  - 基于 Content Collections 的类型安全 Markdown/MDX 渲染。
  - 原位展开、无界极简列表视图与专属阅读排版。
- 📸 **相册 (Albums) & 瞬间 (Moments):**
  - 瀑布流 (Masonry) 布局相册，集成图片懒加载 (`LazyLoad`) 与全局画廊组件 (`Lightbox`)。
  - 仿朋友圈/即刻的碎片化灵感记录流。
- 🎵 **音乐室 (Music):**
  - 定制化的纯前端音乐播放器引擎 (`music-engine.js`)，支持后台静默加载与沉浸式 UI。
- 🪐 **视觉与交互探索 (Interactive UI):**
  - 首页集成互动式 3D 地球 (`Earth.astro`) 与动态迎宾文案 (`IntroWord.astro`)。
  - 精美的小组件系统（天气 `WeatherWidget`、格言 `QuoteWidget`、工作台 `StudioWidget`）。
- 🤝 **星系跃迁 (Friends & Relay):**
  - 友链页面自带毛玻璃浮现动效与 `GentleModal` 平滑拦截弹窗，内置 Relay 随机跃迁网络。
- 🌗 **无极主题同步 (Theme Sync):**
  - 深度优化的暗色/亮色模式切换 (`ThemePerfInit`)，彻底告别切页闪烁。

## 📂 项目架构 (Structure)

严谨而清晰的 Astro 项目骨架：

```text
├── assets/             # 静态资源 (背景 SVG, 核心独立 JS 引擎, CSS 模块)
├── components/         # 组件库
│   ├── about/          # 关于页模块 (能力雷达, 科技栈, 悬浮 Dock 等)
│   ├── common/         # 全局通用组件 (懒加载, 画廊, 外链守卫等)
│   ├── navbar/         # 顶部高阶导航栏与全局检索
│   ├── widgets/        # 多功能小组件生态
│   └── ...             # 各业务模块专属组件 (music, posts, friends)
├── content/            # 内容集合 (Markdown 数据源)
│   ├── albums/         # 图集数据
│   ├── friends/        # 友链数据
│   ├── moments/        # 瞬间记录
│   ├── music/          # 播放列表
│   └── posts/          # 长篇博文
├── layouts/            # 核心布局模板 (BaseLayout)
├── pages/              # Astro 物理路由页面 (index, about, posts...)
├── utils/              # 工具函数 (剪贴板, 视口侦测, 检索数据构建等)
└── config.ts           # 全局核心配置站点数据

```

## 🛠️ 开始使用 (Getting Started)

确保您的运行环境中已安装 `Node.js` (建议 v18+)。

**1. 克隆项目**

```bash
git clone [https://github.com/](https://github.com/)<your-username>/Quasar.git
cd Quasar

```

**2. 安装依赖**

```bash
npm install

```

**3. 启动开发服务器**

```bash
npm run dev

```

> 本地预览地址默认为：`http://localhost:4321/`

**4. 生产环境构建**

```bash
npm run build

```

## ✍️ 内容创作 (Content Creation)

本项目使用了 [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)，添加新内容极为简单：

* **写文章：** 在 `src/content/posts/` 目录下新建 `.md` 文件。
* **发动态：** 在 `src/content/moments/` 目录下新建 `.md` 文件。
* **加友链：** 修改 `src/content/friends/` 中的数据。
*(Frontmatter 格式请参考对应目录下的 `Demo.md` 示例文件)*

## ⚙️ 个性化配置 (Configuration)

站点的核心基础信息、导航栏、社交链接、以及各个模块的开关，均集中在项目根目录的 `config.ts` 文件中。您只需修改此文件，即可完成 80% 的个性化定制。

## 📜 许可证 (License)

本项目采用 [MIT License](https://www.google.com/search?q=./LICENSE) 开源协议。
您可以自由地使用、修改和分发，但请保留原作者的版权声明。

---


```

### 这个 README 的亮点：
1. **徽章展示**：顶部使用了精美的盾牌徽章，凸显技术栈（Astro + TS + Pure CSS）。
2. **极客术语与优雅表达**：用词贴合了您项目中 `Relay (星系跃迁)`、`Moments (瞬间)` 等高级感设定[cite: 6]。
3. **架构透视**：完美对应了 `Quasar.zip` 解析出来的真实目录结构[cite: 6]，并加上了清晰的注释。
4. **易读易用**：为其他想要 Fork 或了解您项目的人提供了开箱即用的「克隆 $\rightarrow$ 运行 $\rightarrow$ 创作」三步走指南。

```