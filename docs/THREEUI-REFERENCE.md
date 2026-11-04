# ThreeUI 参考与原生适配

参考仓库：[MengTo/threeui](https://github.com/MengTo/threeui)。已读取社区源码、MIT 许可和素材说明，完整许可保存在 `licenses/THREEUI.txt`。

| 参考                                                        | 采用的设计方法                                       | starr 中的实现                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Kage](https://threeui.com/landing-pages/kage-landing-page) | 场景先行、远中近景、巨大字标、持续环境动态、滚动叙事 | 本地程序生成的月面与星光庭院、场景内字标、漂浮星屑、相机视差和滚动推进、章节入场 |
| [Sylva](https://threeui.com/hero/sylva)                     | 导航层次、克制的金属底板、双向锥形指针高光           | 原生按钮、标签栏、选择器和星团标签的局部高光，共用交互管理                       |

具体阅读的社区源码包括 `public/landing-pages/kage.html`、`public/landing-pages/inner-green-3d.html` 以及 liquid-metal-button 的示例。Sylva 高光边缘的 CSS 适配保留版权注释。Kage 场景作为设计参考，starr 的山脊、月面纹理、石柱、星环、字标和粒子由新代码生成，没有复制寺院资源、图片、字体或视频。

这里没有安装完整 ThreeUI 组件库，也没有把演示页面作为内嵌网页。界面仍为 React 原生组件，场景使用已有 Three.js，动效使用已有 GSAP；数据来自 starr 原有 API。

ThreeUI 的社区源码许可和远端展示媒体的授权范围不能混为一谈。本仓库只包含明确许可的源码适配以及自有程序场景，不捆绑远端目录展示媒体。GSAP 继续使用其标准许可，不将其描述为 MIT。
