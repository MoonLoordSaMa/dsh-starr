# 第三方依赖

本仓库原创代码使用 MIT 许可。下列依赖保留各自许可，不因被引用而改为本仓库许可。

v0.1.7在 `src/vendor/see-now` 集成 `SAOS-3624/dsh-see-now` 0.0.10的画面采集、变化检测、关键帧布局与PNG核心，使用Apache-2.0许可。原LICENSE、NOTICE、上游版本与修改说明随代码分发；未将其改标为MIT。免费听写按需安装的faster-whisper、CTranslate2及Whisper模型各自遵循上游许可，不把模型权重放入插件ZIP。

| 项目                          | 用途                                           | 许可                                                           |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| React / React DOM             | 网页界面                                       | MIT                                                            |
| Three.js                      | 三维记忆星图                                   | MIT                                                            |
| Lucide React                  | 图标                                           | ISC                                                            |
| ThreeUI Community / Meng To   | Sylva 指针高光适配、Kage 场景设计参考          | MIT，见 `licenses/THREEUI.txt` 与 `THREEUI-REFERENCE.md`       |
| SurfCore / Derpyu520 等贡献者 | 主动排程、等待合并、桌宠载体与配置页的架构参考 | MIT；见 `SURFCORE-REFERENCE.md` 与 `licenses/SURFCORE-MIT.txt` |
| GSAP                          | 内容入场、标签指示背景滑移                     | [GSAP 标准许可](https://gsap.com/standard-license/)            |
| @gsap/react                   | 动画作用域与卸载清理                           | 包内声明的 GSAP 标准许可；见 licenses/GSAP-REACT-LICENSE.txt   |
| qrcode                        | 本机生成扫码二维码                             | MIT，见 licenses/QRCODE-LICENSE.txt                            |
| Vite / TypeScript / Prettier  | 开发与构建                                     | 各项目所附许可                                                 |

GSAP 3.15.0 包声明为 `Standard 'no charge' license`，不将它描述为 MIT。构建与分发应保留依赖内的版权和许可说明。这里未引入额外付费插件或下载未经授权的素材。

Taste 仅为本次开发参考，源码保留在工作区方案证据中；未作为运行依赖或插件内容捆绑。Onetake 未捆绑。
SurfCore 仅作为架构与交互参考，未复制或改写其源码，也未将其作为运行依赖；来源、版本、作者和边界见
[`SURFCORE-REFERENCE.md`](SURFCORE-REFERENCE.md)。如果未来复制或改写 SurfCore 的代码，必须随对应文件保留
`licenses/SURFCORE-MIT.txt` 中的版权和许可声明，并在发布说明中标出改动范围。

v0.1.5 开发使用了 https://github.com/greensock/gsap-skills 中的 React、滚动动画与性能指引。技能安装在开发机器的 Codex 技能目录，不是最终用户必须安装的依赖。技能本身采用 MIT 许可，GSAP 运行库许可仍以上表为准。
