# SurfCore 参考与署名

本项目在 v0.2.1 fix 的主动能力、等待合并、会话配置和载体抽象设计中，参考了
[SurfCore](https://github.com/Mieksido/surfcore) **v0.8.9** 的公开实现和文档。

SurfCore 的许可证为 MIT。原项目版权声明为：

> Copyright (c) 2026 Derpyu520 and qq-bridge / QSH contributors

本项目对 SurfCore 的使用范围是**借鉴架构、行为和交互思路**。当前 dsh-starr 源码没有复制、改写或打包
SurfCore 的源文件，因此本项目的运行时不依赖 SurfCore，也没有把 SurfCore 的代码重新标成 dsh-starr 的
MIT 代码。对应的原始 MIT 文本随本仓库保存在 [`licenses/SURFCORE-MIT.txt`](licenses/SURFCORE-MIT.txt)。

## 借鉴范围

- `src/purpose-engine.js`：参考目的状态迁移、定时排程、安静时段、失败重试和持久化边界。
- `src/v2-wait.js` 与 `src/bridge.js`：参考群聊等待、消息合并、分段回复、潜水和收尾判断。
- `plugins/surfcore/lib/pet-chat.js`：参考桌宠文本或语音对话、角色卡和记忆卡复用。
- `plugins/surfcore/lib/pet-purpose.js` 与 `pet-api.js`：参考主动行为载体、气泡事件和载体切换。
- `plugins/surfcore/lib/client.js`：参考“关键配置 + 高级配置”的信息架构；dsh-starr 按自身页面约束重新组织。

这些参考没有改变 dsh-starr 的控制边界：主动目的由 bot 自己创建、评估和结束；外发仍由会话授权、平台连接、
冷却和失败回执共同约束。

## 分发边界

1. 本仓库和发行包不包含 SurfCore 源码、构建产物、SnowLuma 二进制、SnowLuma 资源或 SurfCore 的运行时依赖。
2. 本仓库的 MIT 许可证只覆盖 dsh-starr 自己的原创代码，不覆盖 SurfCore 或其他第三方项目。
3. 如果后续直接复制或改写 SurfCore 的代码，必须保留原版权声明和 MIT 许可文本，在对应文件附近标明来源、修改内容，
   并在发行说明中更新第三方清单。
4. SurfCore 依赖的 SnowLuma 许可独立于 SurfCore；仅凭 SurfCore 的 MIT 许可不能取得 SnowLuma 的再分发权。

本文件是项目来源记录和合规说明，不构成法律意见。
