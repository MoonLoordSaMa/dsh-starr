# v0.1.5 旧功能逐项核验表

由仓库内不含用户值的 legacy-catalog.json 生成。这里记录代码与入口对应，不代表真实账号或模型已经验收；没有读取个人记忆、密钥或生产配置。

“已归并”不等于旧值可以原样导入。旧范围、单位、服务商、模型、目标与权限均须根据新字段重新确认；不匹配的旧引擎与无人确认的任意目标外发不恢复。

| 旧注册字段状态 | 数量 |
| -------------- | ---- |
| 已归并配置     | 197  |
| 交由 DSH 管理  | 21   |
| 已退役机制     | 46   |
| 待接入         | 147  |

旧能力盘点 140 项，其中 110 项由新入口承接、30 项待接入。额外参数声明 243 项仅作参考，不额外增加有效配置数量。

## 411 项旧注册字段

| 编号 | 原分区 / 字段                                        | 标签                        | 当前状态      | 目标字段 / 配置分组                                   | 处理说明                                                                                  |
| ---- | ---------------------------------------------------- | --------------------------- | ------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | qq<br>dsh.baseUrl                                    | DSH 地址                    | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 2    | qq<br>dsh.provider                                   | 模型提供方                  | 已归并配置    | provider<br>qq                                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 3    | qq<br>dsh.model                                      | 模型                        | 已归并配置    | model<br>qq                                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 4    | qq<br>dsh.reasoningEffort                            | 思考强度                    | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 5    | qq<br>dsh.authToken                                  | DSH token                   | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 6    | qq<br>dsh.allowRemote                                | 允许远程 DSH                | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 7    | qq<br>agentPreset                                    | 一代 preset                 | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 8    | qq<br>workspaceTitle                                 | 工作区名称                  | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 9    | qq<br>sessionCwd                                     | 会话工作目录                | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 10   | qq<br>socialV2.enabled                               | 启用二代仿真                | 已归并配置    | enabled<br>qq                                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 11   | qq<br>socialV2.autoReplyCheckMs                      | 自动回复检查间隔            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 12   | qq<br>socialV2.agentPreset                           | 二代 preset                 | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 13   | qq<br>socialV2.provideRecommendations                | 提供推荐值                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 14   | qq<br>socialV2.initialPromptMaxChars                 | 初始提示词上限              | 已归并配置    | context.maxChars<br>chat-context                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 15   | qq<br>purpose.enabled                                | 启用主动机制                | 已归并配置    | agency.enabled<br>state                               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 16   | qq<br>purpose.gapMinMs                               | 最短主动间隔                | 已归并配置    | agency.cooldownMinutes<br>state                       | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 17   | qq<br>purpose.gapMaxMs                               | 最长主动间隔                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 18   | qq<br>purpose.initialDelayMinMs                      | 启动后首次延迟              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 19   | qq<br>purpose.dailyMax                               | 每天最多主动                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 20   | qq<br>purpose.quietStart                             | 安静时段开始                | 已归并配置    | agency.quietStart<br>state                            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 21   | qq<br>purpose.quietEnd                               | 安静时段结束                | 已归并配置    | agency.quietEnd<br>state                              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 22   | qq<br>purpose.idleThresholdMs                        | 多久没说话才主动            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 23   | qq<br>purpose.materialWindowHours                    | 素材回看窗口（小时）        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 24   | qq<br>purpose.biliWindowDays                         | B站素材回看（天）           | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 25   | qq<br>purpose.maxMaterials                           | 最多素材条数                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 26   | qq<br>purpose.minMaterials                           | 最少素材条数                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 27   | qq<br>purpose.retryMs                                | 失败后重试间隔              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 28   | qq<br>purpose.maxAttempts                            | 单次最多尝试                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 29   | qq<br>purpose.maxCandidates                          | 每次生成候选数              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 30   | qq<br>purpose.promptMaxChars                         | 提示词上限（字符）          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 31   | qq<br>socialV2.wake.defaultMode                      | 默认状态                    | 已归并配置    | chat.wake.mode<br>chat-wake                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 32   | qq<br>socialV2.wake.preSleepWaitEnabled              | 沉睡前必须观察              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 33   | qq<br>socialV2.wake.preSleepWaitMs                   | 沉睡前观察时长              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 34   | qq<br>socialV2.wake.recommendedDefaultInfinite       | 推荐无限期潜水              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 35   | qq<br>socialV2.wake.sleepMinMs                       | 潜水最短                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 36   | qq<br>socialV2.wake.sleepMaxMs                       | 潜水最长（0=无限）          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 37   | qq<br>socialV2.wake.recommendedSleepMinMs            | 推荐最短潜水                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 38   | qq<br>socialV2.wake.recommendedSleepMaxMs            | 推荐最长潜水                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 39   | qq<br>socialV2.wake.recommendedProbability           | 普通消息唤醒概率            | 已归并配置    | chat.wake.probability<br>chat-wake                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 40   | qq<br>socialV2.wake.recommendedKeywords              | 推荐唤醒关键词              | 已归并配置    | chat.wake.keywords<br>chat-wake                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 41   | qq<br>socialV2.wake.recommendedAtMention             | 推荐 @ 唤醒                 | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 42   | qq<br>socialV2.wake.recommendedNameMention           | 推荐名字唤醒                | 已归并配置    | chat.wake.names<br>chat-wake                          | 改为额外角色称呼列表；当前角色名始终参与直接称呼判断。                                    |
| 43   | qq<br>socialV2.wake.recommendedQuestion              | 推荐提问唤醒                | 已归并配置    | chat.wake.questions<br>chat-wake                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 44   | qq<br>socialV2.wake.recommendedPoke                  | 推荐拍一拍唤醒              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 45   | qq<br>socialV2.wake.recommendedHint                  | 推荐提示词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 46   | qq<br>socialV2.wake.batchWindowMs                    | 合并唤醒窗口                | 已归并配置    | mergeMs<br>qq                                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 47   | qq<br>socialV2.wake.maxWakePerMinute                 | 每分钟最多唤醒              | 已归并配置    | chat.wake.maxPerMinute<br>chat-wake                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 48   | qq<br>socialV2.wake.maxWakePerHour                   | 每小时最多唤醒              | 已归并配置    | chat.wake.maxPerHour<br>chat-wake                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 49   | qq<br>socialV2.wake.noActionLimit                    | 无动作上限                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 50   | qq<br>socialV2.wake.maxWakeConfigReminders           | 唤醒配置提醒上限            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 51   | qq<br>socialV2.send.burstEnabled                     | 分条发送                    | 已归并配置    | chat.reply.burstEnabled<br>chat-reply                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 52   | qq<br>socialV2.send.burstMaxMessages                 | 单轮最多条数                | 已归并配置    | chat.reply.burstMax<br>chat-reply                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 53   | qq<br>socialV2.send.burstIntervalMinMs               | 分条最小间隔                | 已归并配置    | chat.reply.delayMinMs<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 54   | qq<br>socialV2.send.burstIntervalMaxMs               | 分条最大间隔                | 已归并配置    | chat.reply.delayMaxMs<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 55   | qq<br>socialV2.send.longGapProbability               | 长间隔概率                  | 已归并配置    | chat.reply.longPauseChance<br>chat-reply              | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 56   | qq<br>socialV2.send.longGapMinMs                     | 长间隔最小                  | 已归并配置    | chat.reply.longPauseMs<br>chat-reply                  | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 57   | qq<br>socialV2.send.longGapMaxMs                     | 长间隔最大                  | 已归并配置    | chat.reply.longPauseMs<br>chat-reply                  | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 58   | qq<br>socialV2.send.maxSendPerMinute                 | 每分钟最多发送              | 已归并配置    | chat.reply.maxPerMinute<br>chat-reply                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 59   | qq<br>socialV2.send.maxSendPerHour                   | 每小时最多发送              | 已归并配置    | chat.reply.maxPerHour<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 60   | qq<br>socialV2.send.maxMessageChars                  | 单条最大字符                | 已归并配置    | chat.reply.maxChars<br>chat-reply                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 61   | qq<br>socialV2.send.maxGapMs                         | 最大间隔                    | 已归并配置    | chat.reply.maxDelayMs<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 62   | qq<br>socialV2.send.gapBaseMs                        | 基础间隔                    | 已归并配置    | chat.reply.delayMinMs<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 63   | qq<br>socialV2.send.gapPerCharMs                     | 每字追加间隔                | 已归并配置    | chat.reply.perCharMs<br>chat-reply                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 64   | qq<br>socialV2.send.recommendedHint                  | 节奏提示词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 65   | qq<br>socialV2.wait.defaultMs                        | 默认等待                    | 已归并配置    | chat.wait.defaultMs<br>chat-reply                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 66   | qq<br>socialV2.wait.minMs                            | 最短等待                    | 已归并配置    | chat.wait.minMs<br>chat-reply                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 67   | qq<br>socialV2.wait.maxMs                            | 最长等待                    | 已归并配置    | chat.wait.maxMs<br>chat-reply                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 68   | qq<br>socialV2.wait.defaultQuietMs                   | 默认静默                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 69   | qq<br>socialV2.wait.minQuietAfterNewMs               | 新消息后最短静默            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 70   | qq<br>socialV2.context.recentLimit                   | 最近消息上限                | 已归并配置    | chat.context.recentMessages<br>chat-context           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 71   | qq<br>socialV2.context.unreadLimit                   | 未读上限                    | 已归并配置    | chat.context.batchMessages<br>chat-context            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 72   | qq<br>socialV2.context.contextWindow                 | 上下文窗口                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 73   | qq<br>socialV2.context.inlineWakeMessages            | 唤醒时内联消息              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 74   | qq<br>socialV2.context.wakeFoldOld                   | 唤醒只带最近一窗            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 75   | qq<br>socialV2.context.wakeMessageLimit              | 唤醒消息上限                | 已归并配置    | chat.context.batchMessages<br>chat-context            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 76   | qq<br>socialV2.context.wakeRecentLimit               | 唤醒最近消息上限            | 已归并配置    | chat.context.recentMessages<br>chat-context           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 77   | qq<br>socialV2.context.wakeMaxChars                  | 唤醒上下文最大字符          | 已归并配置    | context.maxChars<br>chat-context                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 78   | qq<br>socialV2.closure.enabled                       | 启用对话收尾判断            | 已归并配置    | chat.close.enabled<br>chat-reply                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 79   | qq<br>socialV2.closure.cooldownMs                    | 收尾后软冷却                | 已归并配置    | chat.close.cooldownMs<br>chat-reply                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 80   | qq<br>socialV2.closure.requireNoOpenQuestion         | 对方还在问时拒绝收尾        | 已归并配置    | chat.close.checkQuestion<br>chat-reply                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 81   | qq<br>socialV2.closure.promptInWake                  | 每次唤醒注入判断参数        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 82   | qq<br>socialV2.closure.maxSummaryChars               | 收尾摘要上限                | 已归并配置    | context.summaryChars<br>chat-context                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 83   | qq<br>socialV2.closure.maxNextOpeningChars           | 下次接法上限                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 84   | qq<br>socialV2.history.enabled                       | 每次上线补看历史消息        | 已归并配置    | chat.history.enabled<br>chat-media                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 85   | qq<br>socialV2.history.limit                         | 每个会话最多补几条          | 已归并配置    | chat.history.limit<br>chat-media                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 86   | qq<br>socialV2.history.maxAgeMinutes                 | 只补最近多少分钟            | 已归并配置    | chat.history.maxAgeMinutes<br>chat-media              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 87   | qq<br>socialV2.history.wake                          | 发现漏消息时主动醒一次      | 已归并配置    | chat.history.wake<br>chat-media                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 88   | qq<br>socialV2.history.includePrivate                | 也补私聊                    | 已归并配置    | chat.history.includePrivate<br>chat-media             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 89   | qq<br>fishGuard.enabled                              | 启用 QQ 鱼群保护            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 90   | qq<br>fishGuard.windowMs                             | 统计窗口                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 91   | qq<br>fishGuard.cooldownMs                           | 触发后冷却                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 92   | qq<br>fishGuard.maxFish                              | 多少条不同的鱼算泛滥        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 93   | qq<br>fishGuard.maxConsecutiveFish                   | 连续多少条鱼算刷屏          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 94   | qq<br>fishGuard.singleFishMaxConsecutive             | 单只鱼连续多少条才拦        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 95   | qq<br>fishGuard.maxFishMessages                      | 鱼消息条数阈值              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 96   | qq<br>fishGuard.maxFishRatio                         | 鱼消息占比阈值              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 97   | qq<br>fishGuard.minSample                            | 最少样本条数                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 98   | qq<br>fishGuard.minFishSendersForRatio               | 至少几条不同的鱼            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 99   | qq<br>fishGuard.groupNestMaxFish                     | 鱼窝群收紧阈值              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 100  | qq<br>fishGuard.groupNestIds                         | 指定鱼窝群号                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 101  | qq<br>fishGuard.namePrefixes                         | 鱼名开头词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 102  | qq<br>fishGuard.nameContains                         | 鱼名包含词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 103  | qq<br>fishGuard.nameSuffixes                         | 鱼名结尾词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 104  | qq<br>fishGuard.groupNameSuffixes                    | 鱼窝群名包含词              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 105  | qq<br>fishGuard.exemptNames                          | 豁免昵称                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 106  | qq<br>fishGuard.exemptIds                            | 豁免 QQ                     | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 107  | qq<br>fishGuard.fishIds                              | 额外认定的鱼 QQ             | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 108  | qq<br>fishGuard.bypassDirectAddress                  | 被直接叫到时放行            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 109  | qq<br>fishGuard.blockSends                           | 保护期内硬拦发送            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 110  | qq<br>socialV2.tokenGuard.enabled                    | 启用 Token 防爆破           | 已归并配置    | chat.budget.enabled<br>chat-budget                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 111  | qq<br>socialV2.tokenGuard.maxWakesPerDay             | 单会话每天最多醒            | 已归并配置    | chat.wake.maxPerDay<br>chat-wake                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 112  | qq<br>socialV2.tokenGuard.privateMaxWakesPerDay      | 私聊每天最多醒              | 已归并配置    | chat.wake.privatePerDay<br>chat-wake                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 113  | qq<br>socialV2.tokenGuard.minWakeGapMs               | 两次苏醒最小间隔            | 已归并配置    | chat.wake.minGapMs<br>chat-wake                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 114  | qq<br>socialV2.tokenGuard.directBypassGap            | 被叫到时越过间隔            | 已归并配置    | chat.wake.directBypass<br>chat-wake                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 115  | qq<br>socialV2.tokenGuard.maxOutboundPerTurn         | 每次醒来最多发              | 已归并配置    | chat.reply.maxOutboundPerTurn<br>chat-social          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 116  | qq<br>socialV2.tokenGuard.maxDailyCostCNY            | 近 24h 花费上限（元）       | 已归并配置    | chat.budget.maxCostCNY<br>chat-budget                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 117  | qq<br>slang.enabled                                  | 启用黑话学习                | 已归并配置    | slang.enabled<br>chat-slang                           | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 118  | qq<br>slang.extractMinMessages                       | 提取门槛（消息数）          | 已归并配置    | slang.minEvidence<br>chat-slang                       | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 119  | qq<br>slang.extractCooldownMs                        | 学习冷却                    | 已归并配置    | slang.cooldownMinutes<br>chat-slang                   | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 120  | qq<br>slang.inferenceThresholds                      | 推断阈值                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 121  | qq<br>slang.injectMax                                | 注入数量上限                | 已归并配置    | slang.injectMax<br>chat-slang                         | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 122  | qq<br>slang.learnerPreset                            | 学习会话 preset             | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 123  | qq<br>slang.workspaceTitle                           | 学习工作区名称              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 124  | qq<br>slang.autoResearch                             | 自动研究                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 125  | qq<br>webSearch.provider                             | 搜索提供方                  | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 126  | qq<br>webSearch.apiKey                               | 搜索 API Key                | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 127  | qq<br>webSearch.apiKeyEnv                            | API Key 环境变量            | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 128  | qq<br>webSearch.baseURL                              | 接口地址（可选）            | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 129  | qq<br>webSearch.model                                | 搜索模型                    | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 130  | qq<br>webSearch.maxUses                              | 每次最多搜索                | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 131  | qq<br>webSearch.maxTokens                            | 结果最大 token              | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 132  | qq<br>webSearch.maxResults                           | 最多返回条数                | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 133  | qq<br>webSearch.timeoutMs                            | 超时                        | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 134  | qq<br>social.enabled                                 | 启用一代仿真                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 135  | qq<br>social.maxReplyChars                           | 单条最大字数                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 136  | qq<br>social.mustReplyKeywords                       | 必须回复关键词              | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 137  | qq<br>social.contextWindow                           | 上下文条数                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 138  | qq<br>social.triggerProbability                      | 普通消息触发概率            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 139  | qq<br>social.activeCheckMinMs                        | 活跃检测最小间隔            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 140  | qq<br>social.activeCheckMaxMs                        | 活跃检测最大间隔            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 141  | qq<br>social.idleWindowMs                            | 空闲窗口                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 142  | qq<br>social.idleRetryProbability                    | 空闲重试概率                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 143  | qq<br>social.proactiveEnabled                        | 主动搭话                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 144  | qq<br>social.proactiveIdleThresholdMs                | 主动搭话空闲阈值            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 145  | qq<br>social.proactiveCheckMinMs                     | 主动检查最小间隔            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 146  | qq<br>social.proactiveCheckMaxMs                     | 主动检查最大间隔            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 147  | qq<br>social.proactiveProbability                    | 主动搭话概率                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 148  | qq<br>social.activeReplyDelayMinMs                   | 回复延迟最小                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 149  | qq<br>social.activeReplyDelayMaxMs                   | 回复延迟最大                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 150  | qq<br>social.activeDurationEnabled                   | 活跃时长限制                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 151  | qq<br>social.activeDurationMinMs                     | 活跃时长最小                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 152  | qq<br>social.activeDurationMaxMs                     | 活跃时长最大                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 153  | qq<br>social.skipProbability                         | 跳过概率                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 154  | qq<br>social.surrenderProbability                    | 放弃概率（已弃用）          | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 155  | qq<br>social.idleRetryWaitMs                         | 空闲重试等待                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 156  | qq<br>social.burstEnabled                            | 分条发送                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 157  | qq<br>social.burstIntervalMinMs                      | 分条最小间隔                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 158  | qq<br>social.burstIntervalMaxMs                      | 分条最大间隔                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 159  | qq<br>social.longGapProbability                      | 长间隔概率                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 160  | qq<br>social.longGapMinMs                            | 长间隔最小                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 161  | qq<br>social.longGapMaxMs                            | 长间隔最大                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 162  | qq<br>chat.contextMessages                           | 群聊上下文条数              | 已归并配置    | chat.context.recentMessages<br>chat-context           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 163  | qq<br>chat.groupContextMessages                      | 按群覆盖上下文              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 164  | qq<br>chat.addressFilter.enabled                     | 别人之间说话时过滤          | 已归并配置    | chat.access.addressFilter<br>chat-access              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 165  | qq<br>chat.addressFilter.silenceWhenAddressedToOther | 别人互相说话时沉默概率      | 已归并配置    | chat.access.addressFilter<br>chat-access              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 166  | qq<br>chat.presence.enabled                          | 群聊生物钟                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 167  | qq<br>chat.presence.onlineShare                      | 每小时在线/看群占比         | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 168  | qq<br>chat.presence.offlineMinMs                     | 最短离线                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 169  | qq<br>chat.presence.wakeWindowMs                     | 被叫醒后在线窗口            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 170  | qq<br>chat.proactive.enabled                         | 群聊主动搭话                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 171  | qq<br>chat.proactive.minIntervalMs                   | 最小间隔                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 172  | qq<br>chat.proactive.minMessages                     | 最少消息数                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 173  | qq<br>socialV2.proactive.enabled                     | 主动搭话                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 174  | qq<br>socialV2.proactive.checkIntervalMinMs          | 检查最小间隔                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 175  | qq<br>socialV2.proactive.checkIntervalMaxMs          | 检查最大间隔                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 176  | qq<br>socialV2.proactive.idleThresholdMs             | 空闲阈值                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 177  | qq<br>socialV2.proactive.probability                 | 主动概率                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 178  | qq<br>socialV2.feedback.maxLength                    | 反馈最大字符                | 已归并配置    | chat.feedback.maxChars<br>chat-social                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 179  | qq<br>socialV2.feedback.notifyOwnerOnError           | 出错通知管理员              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 180  | qq<br>socialV2.media.maxBytes                        | 图片单条最大字节            | 已归并配置    | chat.media.maxBytes<br>chat-media                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 181  | qq<br>socialV2.media.maxPixels                       | 单张最大像素                | 已归并配置    | chat.media.maxPixels<br>chat-social                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 182  | qq<br>socialV2.media.maxCount                        | 单条最多图片                | 已归并配置    | chat.media.maxCount<br>chat-media                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 183  | qq<br>ownerQQ                                        | 主人 QQ                     | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 184  | qq<br>allow.private                                  | 私聊白名单                  | 已归并配置    | privateUsers<br>qq                                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 185  | qq<br>allow.groups                                   | 群白名单                    | 已归并配置    | groups<br>qq                                          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 186  | qq<br>deny.users                                     | 用户黑名单                  | 已归并配置    | chat.access.deniedUsers<br>chat-access                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 187  | qq<br>deny.private                                   | 私聊黑名单                  | 已归并配置    | chat.access.deniedUsers<br>chat-access                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 188  | qq<br>deny.groups                                    | 群黑名单                    | 已归并配置    | chat.access.deniedGroups<br>chat-access               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 189  | qq<br>allowAllWhenEmpty                              | 白名单为空时放行所有人      | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 190  | qq<br>snowluma.wsUrl                                 | OneBot WebSocket            | 已归并配置    | wsPort<br>qq                                          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 191  | qq<br>snowluma.httpUrl                               | OneBot HTTP                 | 已归并配置    | httpPort<br>qq                                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 192  | qq<br>snowluma.accessToken                           | OneBot accessToken          | 已归并配置    | token<br>qq                                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 193  | qq<br>snowluma.followDiscoveredEndpoint              | 跟随自发现端点              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 194  | qq<br>snowluma.silenceWarnMs                         | 静默告警阈值                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 195  | qq<br>snowluma.allowLaunch                           | 允许插件打开 SnowLuma       | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 196  | qq<br>snowluma.launcherPath                          | SnowLuma 安装目录           | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 197  | qq<br>snowluma.launchScript                          | 启动脚本（可选）            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 198  | qq<br>snowluma.homeDir                               | SnowLuma home               | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 199  | qq<br>consolePort                                    | 控制台端口                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 200  | qq<br>consoleToken                                   | 控制台令牌                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 201  | qq<br>ackMessage                                     | 收到消息的自动回复          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 202  | qq<br>sendDelayMs                                    | 发送间隔                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 203  | qq<br>questionTimeoutMs                              | 提问/审批超时               | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 204  | qq<br>security.interceptNotify                       | 安全拦截通知                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 205  | qq<br>role.maxInjectChars                            | 人格注入上限                | 已归并配置    | context.personaChars<br>chat-context                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 206  | qq<br>biliBridge.enabled                             | 启用 B站 桥接               | 已归并配置    | bridge.enabled<br>bridge                              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 207  | qq<br>biliBridge.share.enabled                       | 启用定时视频分享            | 已归并配置    | bridge.videos<br>bridge                               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 208  | qq<br>biliBridge.share.times                         | 分享时间点                  | 已归并配置    | bridge.times<br>bridge                                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 209  | qq<br>biliBridge.share.groups                        | 只发这些群                  | 已归并配置    | bridge.targets<br>bridge                              | 明确目标改为 group:群号 或 private:QQ号；同时要求 QQ 允许名单，不能直接复制旧群号字符串。 |
| 210  | qq<br>biliBridge.share.gapMs                         | 卡片到短评的间隔            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 211  | qq<br>biliBridge.share.cardMode                      | 分享形式                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 212  | qq<br>biliBridge.dynamics.enabled                    | B站新动态同步到 QQ          | 已归并配置    | bridge.dynamics<br>bridge                             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 213  | qq<br>biliBridge.dynamics.pollIntervalMs             | 动态轮询间隔                | 已归并配置    | bridge.pollSeconds<br>bridge                          | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 214  | qq<br>biliBridge.dynamics.groups                     | 动态只发这些群              | 已归并配置    | bridge.targets<br>bridge                              | 明确目标改为 group:群号 或 private:QQ号；同时要求 QQ 允许名单，不能直接复制旧群号字符串。 |
| 215  | qq<br>socialV2.tools.getPrompt                       | 读取提示词                  | 已归并配置    | chat.tools.prompt<br>chat-social                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 216  | qq<br>socialV2.tools.getUnread                       | 读未读消息                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 217  | qq<br>socialV2.tools.getRecent                       | 读最近消息                  | 已归并配置    | chat.tools.history<br>chat-tools                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 218  | qq<br>socialV2.tools.socialState                     | 查看社交状态                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 219  | qq<br>socialV2.tools.sendGroup                       | 发群消息                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 220  | qq<br>socialV2.tools.sendPrivate                     | 发私聊                      | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 221  | qq<br>socialV2.tools.reply                           | 引用回复                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 222  | qq<br>socialV2.tools.sendBurst                       | 分条发送                    | 已归并配置    | chat.reply.burstEnabled<br>chat-reply                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 223  | qq<br>socialV2.tools.sendMessage                     | 统一发送                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 224  | qq<br>socialV2.tools.waitMessages                    | 等待消息                    | 已归并配置    | chat.tools.wait<br>chat-tools                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 225  | qq<br>socialV2.tools.feedback                        | 反馈                        | 已归并配置    | chat.tools.feedback<br>chat-social                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 226  | qq<br>socialV2.tools.getMyRecent                     | 我的最近消息                | 已归并配置    | chat.tools.history<br>chat-tools                      | 合并为当前对象的历史读取，收件与本轮回执可查；未复刻旧模型正文的独立历史索引。            |
| 227  | qq<br>socialV2.tools.getMessageDetail                | 消息详情                    | 已归并配置    | chat.tools.history<br>chat-tools                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 228  | qq<br>socialV2.tools.getActiveMembers                | 活跃成员                    | 已归并配置    | chat.tools.members<br>chat-social                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 229  | qq<br>socialV2.tools.setWakeConfig                   | 设置唤醒                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 230  | qq<br>socialV2.tools.markRead                        | 标记已读                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 231  | qq<br>socialV2.tools.closeConversation               | 结束对话                    | 已归并配置    | chat.tools.close<br>chat-tools                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 232  | qq<br>socialV2.tools.memory                          | 记忆                        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 233  | qq<br>socialV2.tools.slangQuery                      | 黑话查询                    | 已归并配置    | slang.enabled<br>chat-slang                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 234  | qq<br>socialV2.tools.slangSubmit                     | 黑话提交                    | 已归并配置    | slang.enabled<br>chat-slang                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 235  | qq<br>socialV2.tools.getImages                       | 查看图片                    | 已归并配置    | chat.tools.images<br>chat-media                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 236  | qq<br>socialV2.tools.getForwardMsg                   | 合并转发                    | 已归并配置    | chat.tools.forward<br>chat-media                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 237  | qq<br>socialV2.tools.sendPoke                        | 拍一拍                      | 已归并配置    | chat.tools.poke<br>chat-social                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 238  | qq<br>socialV2.tools.listStickers                    | 表情列表                    | 已归并配置    | chat.tools.stickers<br>chat-media                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 239  | qq<br>socialV2.tools.getStickerImage                 | 表情图片                    | 已归并配置    | chat.tools.stickers<br>chat-media                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 240  | qq<br>socialV2.tools.sendSticker                     | 发表情                      | 已归并配置    | chat.tools.stickers<br>chat-media                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 241  | qq<br>socialV2.tools.setStickerRemark                | 表情备注                    | 已归并配置    | chat.tools.collectSticker<br>chat-media               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 242  | qq<br>socialV2.tools.stickerNote                     | 表情笔记                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 243  | qq<br>socialV2.tools.collectSticker                  | 收藏表情                    | 已归并配置    | chat.tools.collectSticker<br>chat-media               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 244  | qq<br>socialV2.tools.getSelfImage                    | 自己的形象                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 245  | qq<br>socialV2.tools.sendVoice                       | 发语音                      | 已归并配置    | chat.tools.voice<br>chat-media                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 246  | qq<br>pricing.models.<模型>.label                    | my-relay-model · 显示名     | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 247  | qq<br>pricing.models.<模型>.off.cacheHit             | my-relay-model · 缓存命中价 | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 248  | qq<br>pricing.models.<模型>.off.cacheMiss            | my-relay-model · 未命中价   | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 249  | qq<br>pricing.models.<模型>.off.output               | my-relay-model · 输出价     | 交由 DSH 管理 | —                                                     | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 250  | starr<br>botSelfConfig                               | 允许她自主修改              | 已归并配置    | permissions.botConfig<br>permissions                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 251  | starr<br>guard.enabled                               | 端口守护                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 252  | starr<br>guard.ports                                 | 守护端口                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 253  | starr<br>voice.enabled                               | 启用本地语音                | 已归并配置    | tts.connection<br>tts                                 | 开关整合为连接方式，选择停用即可关闭；其他方式需重新确认模型配置。                        |
| 254  | starr<br>voice.port                                  | 语音服务端口                | 已归并配置    | tts.local.port<br>tts-local                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 255  | starr<br>voice.adapterPort                           | 语音适配端口                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 256  | starr<br>voice.character                             | 语音角色                    | 已归并配置    | tts.voice<br>tts                                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 257  | starr<br>voice.idleSec                               | 闲置卸载（秒）              | 已归并配置    | tts.local.idleSeconds<br>tts-local                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 258  | starr<br>voice.gpuIndex                              | GPU 序号                    | 已归并配置    | tts.local.gpuIndex<br>tts-local                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 259  | starr<br>jobs.diaryDay.at                            | 白天日记时间                | 已归并配置    | jobs.diaryDay.at<br>memory-job-diaryDay               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 260  | starr<br>jobs.diaryDay.catchUpHours                  | 白天补跑窗口（小时）        | 已归并配置    | jobs.diaryDay.catchUpHours<br>memory-job-diaryDay     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 261  | starr<br>jobs.diaryNight.at                          | 晚上日记时间                | 已归并配置    | jobs.diaryNight.at<br>memory-job-diaryNight           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 262  | starr<br>jobs.diaryNight.catchUpHours                | 晚上补跑窗口（小时）        | 已归并配置    | jobs.diaryNight.catchUpHours<br>memory-job-diaryNight | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 263  | starr<br>jobs.organize.at                            | 收件箱整理时间              | 已归并配置    | jobs.organize.at<br>memory-job-organize               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 264  | starr<br>jobs.organize.catchUpHours                  | 整理补跑窗口（小时）        | 已归并配置    | jobs.organize.catchUpHours<br>memory-job-organize     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 265  | starr<br>ui.hideWorkspaces                           | 隐藏工作区                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 266  | starr<br>sing.enabled                                | 启用唱歌                    | 已归并配置    | sing.mode<br>sing                                     | 开关整合为连接方式，选择停用即可关闭；其他方式需重新确认模型配置。                        |
| 267  | starr<br>sing.port                                   | 唱歌服务端口                | 已归并配置    | sing.local.port<br>sing-local                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 268  | starr<br>sing.idleSec                                | 闲置卸载（秒）              | 已归并配置    | sing.local.idleSeconds<br>sing-local                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 269  | starr<br>sing.timeoutMs                              | 超时                        | 已归并配置    | sing.timeoutSeconds<br>sing                           | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 270  | starr<br>sing.promptWav                              | 参考音频路径                | 已归并配置    | sing.referenceId<br>sing                              | 参考音频先导入本角色曲库，再选择编号；不直接沿用旧本地路径。                              |
| 271  | starr<br>sing.autoAdd                                | 自动入库                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 272  | starr<br>sing.excerptSec                             | 片段长度（秒）              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 273  | starr<br>sing.cache                                  | 缓存翻唱                    | 已归并配置    | sing.cache<br>sing                                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 274  | starr<br>sing.brightness                             | 亮度                        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 275  | starr<br>qq.engine                                   | QQ 引擎                     | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 276  | starr<br>qq.mode                                     | QQ 模式                     | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 277  | starr<br>qq.wsUrl                                    | 桥接 WebSocket              | 已归并配置    | wsPort<br>qq                                          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 278  | starr<br>qq.accessToken                              | 桥接 accessToken            | 已归并配置    | token<br>qq                                           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 279  | starr<br>qq.ingest                                   | 接收消息                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 280  | starr<br>qq.rules.allow.groups                       | 允许的群                    | 已归并配置    | groups<br>qq                                          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 281  | starr<br>qq.rules.allow.privates                     | 允许的私聊                  | 已归并配置    | privateUsers<br>qq                                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 282  | starr<br>qq.rules.allowAllWhenEmpty                  | 白名单为空时放行            | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 283  | starr<br>qq.rules.group.requireAt                    | 群里必须 @                  | 已归并配置    | requireMention<br>qq                                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 284  | starr<br>voice.bin                                   | TTS 程序路径                | 已归并配置    | tts.local.bin<br>tts-local                            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 285  | starr<br>voice.model                                 | TTS 模型路径                | 已归并配置    | tts.local.modelPath<br>tts-local                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 286  | starr<br>voice.voicesDir                             | 音色目录                    | 已归并配置    | tts.local.voicesDir<br>tts-local                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 287  | starr<br>voice.instructions                          | 默认语气指令                | 已归并配置    | tts.instructions<br>tts                               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 288  | starr<br>voice.startTimeoutSec                       | 启动超时（秒）              | 已归并配置    | tts.local.startTimeoutSeconds<br>tts-local            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 289  | starr<br>voice.requestTimeoutSec                     | 请求超时（秒）              | 已归并配置    | tts.timeoutSeconds<br>tts                             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 290  | starr<br>sing.python                                 | SoulX 的 Python             | 已归并配置    | sing.local.python<br>sing-local                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 291  | starr<br>sing.serverScript                           | SoulX 服务脚本              | 已归并配置    | sing.local.serverScript<br>sing-local                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 292  | starr<br>sing.model                                  | SVC 模型路径                | 已归并配置    | sing.local.modelPath<br>sing-local                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 293  | starr<br>sing.repo                                   | SoulX 源码目录              | 已归并配置    | sing.local.repo<br>sing-local                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 294  | starr<br>sing.tmpDir                                 | SoulX 临时目录              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 295  | starr<br>sing.preModels                              | 预处理模型目录              | 已归并配置    | sing.local.preModels<br>sing-local                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 296  | starr<br>sing.device                                 | 推理设备                    | 已归并配置    | sing.local.device<br>sing-local                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 297  | starr<br>sing.fp16                                   | 半精度推理                  | 已归并配置    | sing.local.fp16<br>sing-local                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 298  | starr<br>sing.ffmpegPath                             | ffmpeg 路径                 | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 299  | starr<br>media.cloud.baseUrl                         | 共用云端地址                | 已归并配置    | media.baseUrl<br>media                                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 300  | starr<br>media.tts.connection                        | 连接来源                    | 已归并配置    | tts.connection<br>tts                                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 301  | starr<br>media.asr.connection                        | 连接来源                    | 已归并配置    | asr.connection<br>asr                                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 302  | starr<br>media.tts.mode                              | 用哪种方式说话              | 已归并配置    | tts.connection<br>tts                                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 303  | starr<br>media.tts.voice                             | 云端音色                    | 已归并配置    | tts.voice<br>tts                                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 304  | starr<br>media.tts.model                             | 云端模型                    | 已归并配置    | tts.model<br>tts                                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 305  | starr<br>media.tts.baseUrl                           | 接口地址                    | 已归并配置    | tts.baseUrl<br>tts                                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 306  | starr<br>media.tts.secretRef                         | 凭据引用                    | 已归并配置    | tts.secretEnv<br>tts                                  | 凭据改为环境变量引用，先在 DSH 启动环境设置；不会导入旧明文。                             |
| 307  | starr<br>media.asr.mode                              | 用哪种方式听写              | 已归并配置    | asr.connection<br>asr                                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 308  | starr<br>media.asr.baseUrl                           | 接口地址                    | 已归并配置    | asr.baseUrl<br>asr                                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 309  | starr<br>media.asr.model                             | 转写模型                    | 已归并配置    | asr.model<br>asr                                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 310  | starr<br>media.asr.language                          | 语言提示                    | 已归并配置    | asr.language<br>asr                                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 311  | starr<br>media.asr.secretRef                         | 凭据引用                    | 已归并配置    | asr.secretEnv<br>asr                                  | 凭据改为环境变量引用，先在 DSH 启动环境设置；不会导入旧明文。                             |
| 312  | starr<br>media.svc.mode                              | 用哪种方式转换歌声          | 已归并配置    | sing.mode<br>sing                                     | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 313  | starr<br>media.svc.remoteBaseUrl                     | 远程节点地址                | 已归并配置    | sing.baseUrl<br>sing                                  | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 314  | starr<br>media.svc.pollMs                            | 任务轮询间隔                | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 315  | starr<br>media.svc.jobTimeoutMs                      | 远程任务超时                | 已归并配置    | sing.timeoutSeconds<br>sing                           | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 316  | starr<br>media.svc.secretRef                         | 凭据引用                    | 已归并配置    | sing.secretEnv<br>sing                                | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 317  | bili<br>self.mid                                     | 她自己 mid                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 318  | bili<br>self.name                                    | 她自己昵称                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 319  | bili<br>night.skipChance                             | 今晚不看的概率              | 已归并配置    | bili.watch.skipChance<br>bili-watch                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 320  | bili<br>night.maxVideos                              | 单次初筛视频数              | 已归并配置    | bili.watch.candidates<br>bili-watch                   | 控制本轮候选数量；每轮细读最多三个，不代表读取完整视频画面。                              |
| 321  | bili<br>night.maxWakesPerDay                         | 每天最多醒来                | 已归并配置    | bili.watch.dailyMax<br>bili-watch                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 322  | bili<br>night.minGapMin                              | 两次苏醒最小间隔（分钟）    | 已归并配置    | bili.watch.gapMinutes<br>bili-watch                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 323  | bili<br>night.windows                                | 作息窗口                    | 已归并配置    | bili.watch.windows<br>bili-watch                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 324  | bili<br>preferences.like                             | 爱看                        | 已归并配置    | bili.preferences.like<br>bili-preferences             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 325  | bili<br>preferences.dislike                          | 不爱看                      | 已归并配置    | bili.preferences.dislike<br>bili-preferences          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 326  | bili<br>preferences.keywords                         | 额外关键词                  | 已归并配置    | bili.preferences.keywords<br>bili-preferences         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 327  | bili<br>preferences.weights                          | 口味权重                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 328  | bili<br>share.enabled                                | 开启分享                    | 已归并配置    | bili.share.enabled<br>bili-share                      | 本字段控制 B站私信分享；跨平台 QQ 分享已独立归入星桥传书，两个通道分别授权与计额。        |
| 329  | bili<br>share.via                                    | 分享方式                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 330  | bili<br>quota.shareDaily                             | 每天上限                    | 已归并配置    | bili.share.dailyMax<br>bili-share                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 331  | bili<br>share.minScore                               | 最低评分                    | 已归并配置    | bili.share.minScore<br>bili-share                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 332  | bili<br>share.silentAfterDays                        | 沉默几天后降额              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 333  | bili<br>share.decayPerDay                            | 每天降多少                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 334  | bili<br>limits.daily                                 | 普通评论 / 天               | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 335  | bili<br>limits.replyDaily                            | 回找我的人 / 天             | 已归并配置    | bili.dailyReplies<br>bili-limits                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 336  | bili<br>limits.taDaily                               | 主动搭话 / 天               | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 337  | bili<br>limits.mineDaily                             | 动态回复 / 类 / 天          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 338  | bili<br>limits.minePerPerson                         | 动态回复 / 人 / 类 / 天     | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 339  | bili<br>limits.perUpMin                              | 同一 UP 冷却（分钟）        | 已归并配置    | bili.personGapMinutes<br>bili-limits                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 340  | bili<br>limits.perVideoMin                           | 同一视频冷却（分钟）        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 341  | bili<br>limits.perThreadMin                          | 同一条评论冷却（分钟）      | 已归并配置    | bili.threadGapMinutes<br>bili-limits                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 342  | bili<br>limits.globalMin                             | 任意两条发言间隔（分钟）    | 已归并配置    | bili.globalGapSeconds<br>bili-limits                  | 全局间隔改为秒；旧分钟值需要乘以 60，且本版私信、评论与弹幕合并计数。                     |
| 343  | bili<br>dynamics.enabled                             | 四类动态总开关              | 已归并配置    | bili.dynamics.enabled<br>bili-dynamics                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 344  | bili<br>dynamics.gapMin                              | 任意两条动态间隔（分钟）    | 已归并配置    | bili.dynamics.gapMinutes<br>bili-dynamics             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 345  | bili<br>dynamics.kinds.best.enabled                  | 早晨·最佳 · 启用            | 已归并配置    | bili.dynamics.best.enabled<br>bili-dynamic-best       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 346  | bili<br>dynamics.kinds.best.slot                     | 早晨·最佳 · 时段            | 已归并配置    | bili.dynamics.best.at<br>bili-dynamic-best            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 347  | bili<br>dynamics.kinds.best.minLen                   | 早晨·最佳 · 最少字数        | 已归并配置    | bili.dynamics.best.minChars<br>bili-dynamic-best      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 348  | bili<br>dynamics.kinds.best.maxLen                   | 早晨·最佳 · 最多字数        | 已归并配置    | bili.dynamics.best.maxChars<br>bili-dynamic-best      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 349  | bili<br>dynamics.kinds.best.prefix                   | 早晨·最佳 · 前缀            | 已归并配置    | bili.dynamics.best.prefix<br>bili-dynamic-best        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 350  | bili<br>dynamics.kinds.game.enabled                  | 中午·游戏 · 启用            | 已归并配置    | bili.dynamics.game.enabled<br>bili-dynamic-game       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 351  | bili<br>dynamics.kinds.game.slot                     | 中午·游戏 · 时段            | 已归并配置    | bili.dynamics.game.at<br>bili-dynamic-game            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 352  | bili<br>dynamics.kinds.game.minLen                   | 中午·游戏 · 最少字数        | 已归并配置    | bili.dynamics.game.minChars<br>bili-dynamic-game      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 353  | bili<br>dynamics.kinds.game.maxLen                   | 中午·游戏 · 最多字数        | 已归并配置    | bili.dynamics.game.maxChars<br>bili-dynamic-game      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 354  | bili<br>dynamics.kinds.game.prefix                   | 中午·游戏 · 前缀            | 已归并配置    | bili.dynamics.game.prefix<br>bili-dynamic-game        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 355  | bili<br>dynamics.kinds.anime.enabled                 | 下午·二次元 · 启用          | 已归并配置    | bili.dynamics.anime.enabled<br>bili-dynamic-anime     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 356  | bili<br>dynamics.kinds.anime.slot                    | 下午·二次元 · 时段          | 已归并配置    | bili.dynamics.anime.at<br>bili-dynamic-anime          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 357  | bili<br>dynamics.kinds.anime.minLen                  | 下午·二次元 · 最少字数      | 已归并配置    | bili.dynamics.anime.minChars<br>bili-dynamic-anime    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 358  | bili<br>dynamics.kinds.anime.maxLen                  | 下午·二次元 · 最多字数      | 已归并配置    | bili.dynamics.anime.maxChars<br>bili-dynamic-anime    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 359  | bili<br>dynamics.kinds.anime.prefix                  | 下午·二次元 · 前缀          | 已归并配置    | bili.dynamics.anime.prefix<br>bili-dynamic-anime      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 360  | bili<br>dynamics.kinds.gaming.enabled                | 晚上·打电动 · 启用          | 已归并配置    | bili.dynamics.gaming.enabled<br>bili-dynamic-gaming   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 361  | bili<br>dynamics.kinds.gaming.slot                   | 晚上·打电动 · 时段          | 已归并配置    | bili.dynamics.gaming.at<br>bili-dynamic-gaming        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 362  | bili<br>dynamics.kinds.gaming.minLen                 | 晚上·打电动 · 最少字数      | 已归并配置    | bili.dynamics.gaming.minChars<br>bili-dynamic-gaming  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 363  | bili<br>dynamics.kinds.gaming.maxLen                 | 晚上·打电动 · 最多字数      | 已归并配置    | bili.dynamics.gaming.maxChars<br>bili-dynamic-gaming  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 364  | bili<br>dynamics.kinds.gaming.prefix                 | 晚上·打电动 · 前缀          | 已归并配置    | bili.dynamics.gaming.prefix<br>bili-dynamic-gaming    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 365  | bili<br>fishGuard.namePrefixes                       | 鱼名开头词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 366  | bili<br>fishGuard.nameContains                       | 鱼名包含词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 367  | bili<br>fishGuard.nameSuffixes                       | 鱼名结尾词                  | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 368  | bili<br>fishGuard.extraFishMids                      | 额外认定的鱼 mid            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 369  | bili<br>fishGuard.exemptNames                        | 豁免昵称                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 370  | bili<br>fishGuard.exemptMids                         | 豁免 mid                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 371  | bili<br>fishGuard.enabled                            | 启用 B站鱼群保护            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 372  | bili<br>fishGuard.sampleSize                         | 取样顶层评论数              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 373  | bili<br>fishGuard.maxFishTopLevel                    | 多少条鱼的楼层算泛滥        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 374  | bili<br>fishGuard.maxFishMids                        | 多少个鱼账号算泛滥          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 375  | bili<br>fishGuard.maxFishRatio                       | 鱼楼层占比阈值              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 376  | bili<br>fishGuard.minSample                          | 占比判定最少样本            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 377  | bili<br>fishGuard.includeHotSample                   | 同时取热度序样本            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 378  | bili<br>fishGuard.gatherEnabled                      | 聚拢：改成回鱼              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 379  | bili<br>fishGuard.forceGather                        | 每次醒来强制聚拢            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 380  | bili<br>fishGuard.gatherMaxReplies                   | 只回回复少的鱼楼            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 381  | bili<br>fishGuard.gatherMaxFishReplies               | 鱼楼里鱼回复太多就跳过      | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 382  | bili<br>fishGuard.gatherMaxAgeHours                  | 只回多新的鱼楼（小时）      | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 383  | bili<br>fishGuard.gatherCooldownHours                | 同一鱼楼冷却（小时）        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 384  | bili<br>fishGuard.likeEnabled                        | 点赞机制                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 385  | bili<br>fishGuard.maxLikesPerDay                     | 每天最多点赞                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 386  | bili<br>fishGuard.maxLikesPerRun                     | 每次最多点赞                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 387  | bili<br>fishGuard.likeFishReplies                    | 也赞楼里的鱼回复            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 388  | bili<br>fishGuard.likeAfterCommentMs                 | 发完评论等多久再点赞        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 389  | bili<br>fishGuard.likeGapMinMs                       | 两次点赞最小间隔            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 390  | bili<br>fishGuard.likeGapMaxMs                       | 两次点赞最大间隔            | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 391  | bili<br>fishGuard.failedLikeCooldownHours            | 点赞失败后冷却（小时）      | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 392  | bili<br>fishGuard.failCooldownMinutes                | 风控失败冷却（分钟）        | 已归并配置    | bili.riskCooldownMinutes<br>bili-limits               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 393  | bili<br>agent.sandbox                                | B站会话权限                 | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 394  | bili<br>listen.comment                               | 评论区监听                  | 已归并配置    | bili.comment.enabled<br>bili-comment                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 395  | bili<br>listen.commentIntervalSec                    | 检查间隔（秒）              | 已归并配置    | bili.pollSeconds<br>bili-limits                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 396  | bili<br>listen.scope                                 | 评论监听范围                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 397  | bili<br>listen.oncePerPerson                         | 同一个人最多回一条          | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 398  | bili<br>listen.allDay                                | 全天监听                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 399  | bili<br>listen.dm                                    | 私信监听                    | 已归并配置    | bili.dm.enabled<br>bili-dm                            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 400  | bili<br>listen.dmScope                               | 私信监听范围                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 401  | bili<br>listen.live                                  | 直播间监听                  | 已归并配置    | bili.live.enabled<br>bili-live                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 402  | bili<br>listen.liveRoom                              | 直播间房间号                | 已归并配置    | bili.live.rooms<br>bili-live                          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 403  | bili<br>listen.liveScope                             | 直播间回复范围              | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 404  | bili<br>diary.push                                   | 推送日记摘要                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 405  | bili<br>diary.enabled                                | 写日记（锁定开）            | 已归并配置    | jobs.diaryNight.enabled<br>memory-job-diaryNight      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 406  | bili<br>notify.type                                  | 推送方式                    | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 407  | bili<br>notify.url                                   | Webhook 地址                | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 408  | bili<br>notify.template                              | 模板                        | 待接入        | —                                                     | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 409  | bili<br>notify.cmd                                   | 自定义命令                  | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 410  | bili<br>notify.args                                  | 命令参数                    | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 411  | bili<br>toolsPath                                    | bili.mjs 路径               | 已退役机制    | —                                                     | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |

## 140 项工具、命令与任务

“由新入口承接”表示主要用途由当前服务提供，不保证旧名字、旧参数和旧实现完全一致。保留原盘点中的重复名称，避免漏算跨来源声明。私人历史与收藏不向角色公开资料工具开放；平台外发必须走当前授权。

| 编号 | 类型 / 原名                       | 当前状态     | 新入口或旧决策                                     | 说明                                                                           |
| ---- | --------------------------------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | tool<br>bili_whoami               | 由新入口承接 | B站接入 → 验证登录                                 | 只检查账号认证，凭据不回显。                                                   |
| 2    | tool<br>bili_dm_latest            | 由新入口承接 | B站私信 / Starr-chat                               | 按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。               |
| 3    | tool<br>bili_dm_history           | 由新入口承接 | B站私信 / Starr-chat                               | 按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。               |
| 4    | tool<br>bili_video                | 由新入口承接 | B站资料阅读 / starr_bili_activity_read             | 读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。               |
| 5    | tool<br>bili_diary                | 由新入口承接 | starr_memory_write / starr_memory_search           | 共用角色记忆服务，保留会话来源与可见范围，不自动共享所有私聊。                 |
| 6    | tool<br>snowluma_status           | 由新入口承接 | QQ 接入 → 连接与收件状态                           | 检查当前 SnowLuma 协议与登录，不发送测试消息。                                 |
| 7    | tool<br>qq_status                 | 由新入口承接 | QQ 接入 → 连接与收件状态                           | 检查当前 SnowLuma 协议与登录，不发送测试消息。                                 |
| 8    | tool<br>qq_list_groups            | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 9    | tool<br>qq_get_group_members      | 由新入口承接 | 当前 QQ 会话 → 成员工具                            | 只查询当前可信群，不枚举任意群；由群成员授权开关控制。浏览器不代发消息。       |
| 10   | tool<br>qq_get_group_history      | 由新入口承接 | starr_qq_history                                   | 合并为当前对象历史与已持久化消息查询，不复刻旧的独立正文索引。                 |
| 11   | tool<br>qq_send_group_message     | 由新入口承接 | starr_qq_reply                                     | 只回复当前可信收件对象，受允许名单、额度与回执约束；不提供任意目标发送。       |
| 12   | tool<br>qq_reply                  | 由新入口承接 | starr_qq_reply                                     | 只回复当前可信收件对象，受允许名单、额度与回执约束；不提供任意目标发送。       |
| 13   | tool<br>qq_send_private_message   | 由新入口承接 | starr_qq_reply                                     | 只回复当前可信收件对象，受允许名单、额度与回执约束；不提供任意目标发送。       |
| 14   | tool<br>qq_get_prompt             | 由新入口承接 | 角色人设 / starr_qq_prompt                         | 读取当前角色人设和实际注入；需管理员授权。                                     |
| 15   | tool<br>qq_get_unread_messages    | 由新入口承接 | starr_qq_read / starr_qq_silence                   | 读取当前可信批次，显式回复或安静后完成；不暴露任意会话水位修改。               |
| 16   | tool<br>qq_get_recent_messages    | 由新入口承接 | starr_qq_history                                   | 合并为当前对象历史与已持久化消息查询，不复刻旧的独立正文索引。                 |
| 17   | tool<br>qq_social_state           | 由新入口承接 | 规则与节奏 / 当前会话工具                          | 对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。                   |
| 18   | tool<br>qq_mark_read              | 由新入口承接 | starr_qq_read / starr_qq_silence                   | 读取当前可信批次，显式回复或安静后完成；不暴露任意会话水位修改。               |
| 19   | tool<br>qq_close_conversation     | 由新入口承接 | 规则与节奏 / 当前会话工具                          | 对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。                   |
| 20   | tool<br>qq_set_wake_config        | 由新入口承接 | 规则与节奏 / 当前会话工具                          | 对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。                   |
| 21   | tool<br>qq_send_burst             | 由新入口承接 | 规则与节奏 / 当前会话工具                          | 对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。                   |
| 22   | tool<br>qq_send_message           | 由新入口承接 | starr_qq_reply                                     | 只回复当前可信收件对象，受允许名单、额度与回执约束；不提供任意目标发送。       |
| 23   | tool<br>qq_send_poke              | 由新入口承接 | starr_qq_poke                                      | 只回应本批真实发言者，一批一次；实际桥接是否支持仍需验证。                     |
| 24   | tool<br>qq_wait_for_messages      | 由新入口承接 | 规则与节奏 / 当前会话工具                          | 对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。                   |
| 25   | tool<br>qq_report_feedback        | 由新入口承接 | 会话留下的反馈                                     | 反馈存本机维护记录，不私信管理员。                                             |
| 26   | tool<br>qq_get_my_recent_messages | 由新入口承接 | starr_qq_history                                   | 合并为当前对象历史与已持久化消息查询，不复刻旧的独立正文索引。                 |
| 27   | tool<br>qq_get_message_detail     | 由新入口承接 | starr_qq_history                                   | 合并为当前对象历史与已持久化消息查询，不复刻旧的独立正文索引。                 |
| 28   | tool<br>qq_get_active_members     | 由新入口承接 | 当前 QQ 会话 → 成员工具                            | 只查询当前可信群，不枚举任意群；由群成员授权开关控制。浏览器不代发消息。       |
| 29   | tool<br>qq_memory_append          | 由新入口承接 | starr_memory_write / starr_memory_search           | 共用角色记忆服务，保留会话来源与可见范围，不自动共享所有私聊。                 |
| 30   | tool<br>qq_memory_query           | 由新入口承接 | starr_memory_write / starr_memory_search           | 共用角色记忆服务，保留会话来源与可见范围，不自动共享所有私聊。                 |
| 31   | tool<br>qq_memory_remove          | 由新入口承接 | 归档与恢复 / starr_memory_archive                  | 可恢复归档代替直接删正文；角色操作仅限本会话可见记录。                         |
| 32   | tool<br>qq_memory_clear           | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 33   | tool<br>qq_slang_query            | 由新入口承接 | starr_slang_query / starr_slang_submit             | 提交需要当前会话多条真实收件证据；候选不直接注入。                             |
| 34   | tool<br>qq_slang_submit           | 由新入口承接 | starr_slang_query / starr_slang_submit             | 提交需要当前会话多条真实收件证据；候选不直接注入。                             |
| 35   | tool<br>qq_get_message_images     | 由新入口承接 | starr_qq_attachment                                | 仅读取当前可信消息中的受限平台图片地址。                                       |
| 36   | tool<br>qq_list_stickers          | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 37   | tool<br>qq_get_sticker_image      | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 38   | tool<br>qq_send_sticker           | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 39   | tool<br>qq_collect_sticker        | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 40   | tool<br>qq_send_voice             | 由新入口承接 | starr_qq_voice                                     | 使用本角色已配置的语音合成服务，取得真实音频后发送。                           |
| 41   | tool<br>qq_list_voices            | 由新入口承接 | 音色清单 / starr_voice_list                        | 本地列音色文件，云端只显示已配名称，不虚构枚举接口。                           |
| 42   | tool<br>qq_get_self_image         | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 43   | tool<br>qq_sticker_note           | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 44   | tool<br>qq_set_sticker_remark     | 由新入口承接 | 表情库 / 当前 QQ 表情工具                          | 在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。                   |
| 45   | tool<br>qq_get_forward_msg        | 由新入口承接 | starr_qq_forward                                   | 读取当前消息中实际存在的合并转发标识。                                         |
| 46   | tool<br>song_list                 | 由新入口承接 | starr_song_list / 唱歌曲库                         | 查询本角色曲库；不提供跨角色曲库读取。                                         |
| 47   | tool<br>song_search               | 由新入口承接 | starr_song_list / 唱歌曲库                         | 查询本角色曲库；不提供跨角色曲库读取。                                         |
| 48   | tool<br>song_add                  | 由新入口承接 | 唱歌 → 曲库与转换记录                              | 通过网页导入音源和参考音色；不允许模型导入任意本机路径。                       |
| 49   | tool<br>sing                      | 由新入口承接 | starr_sing / starr_qq_sing                         | 需曲库、参考音色与已验证的转换服务，bot 翻唱必须额外授权。                     |
| 50   | tool<br>link_parse                | 由新入口承接 | starr_link_parse                                   | 解析完整视频与动态链接；短链与任意网页解析未并入。                             |
| 51   | tool<br>song_remove               | 由新入口承接 | 曲库移除 / 清理生成成品                            | 移除音源保留回收文件；清理仅处理当前角色成品。                                 |
| 52   | tool<br>song_cache_clear          | 由新入口承接 | 曲库移除 / 清理生成成品                            | 移除音源保留回收文件；清理仅处理当前角色成品。                                 |
| 53   | tool<br>sticker_list              | 由新入口承接 | 表情库                                             | 统一角色表情资产及喜爱、备注、额度配置；不兼容旧管理工具名。                   |
| 54   | tool<br>sticker_update            | 由新入口承接 | 表情库                                             | 统一角色表情资产及喜爱、备注、额度配置；不兼容旧管理工具名。                   |
| 55   | tool<br>config_get                | 由新入口承接 | starr_config_read / starr_config_update / 配置审计 | 模型仅可修改统一白名单，路径、密钥、执行程序和自身授权均不可改。               |
| 56   | tool<br>config_set                | 由新入口承接 | starr_config_read / starr_config_update / 配置审计 | 模型仅可修改统一白名单，路径、密钥、执行程序和自身授权均不可改。               |
| 57   | tool<br>sticker_limit_set         | 由新入口承接 | 表情库                                             | 统一角色表情资产及喜爱、备注、额度配置；不兼容旧管理工具名。                   |
| 58   | tool<br>starr_status              | 由新入口承接 | starr_state_read / starr_experience_record         | 共用角色状态与经历服务，不接回旧状态计算引擎。                                 |
| 59   | tool<br>memory_search             | 由新入口承接 | starr_memory_write / starr_memory_search           | 共用角色记忆服务，保留会话来源与可见范围，不自动共享所有私聊。                 |
| 60   | tool<br>memory_stats              | 由新入口承接 | 记忆概览                                           | 显示本角色实际持久化记忆与关联统计。                                           |
| 61   | tool<br>memory_reindex            | 由新入口承接 | 索引重建 / 主题关联建议                            | 关联建议需管理员确认，不将推测伪装成真实关系。                                 |
| 62   | tool<br>qzone_feed                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 63   | tool<br>qzone_post                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 64   | tool<br>qzone_comment             | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 65   | tool<br>starr_config_set          | 由新入口承接 | starr_config_read / starr_config_update / 配置审计 | 模型仅可修改统一白名单，路径、密钥、执行程序和自身授权均不可改。               |
| 66   | tool<br>starr_config_audit        | 由新入口承接 | starr_config_read / starr_config_update / 配置审计 | 模型仅可修改统一白名单，路径、密钥、执行程序和自身授权均不可改。               |
| 67   | tool<br>vision_describe_image     | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 68   | tool<br>vision_describe_sticker   | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 69   | tool<br>web_search                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 70   | tool<br>web_fetch                 | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 71   | tool<br>starr_status              | 由新入口承接 | starr_state_read / starr_experience_record         | 共用角色状态与经历服务，不接回旧状态计算引擎。                                 |
| 72   | tool<br>starr_save_bili_emote     | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 73   | tool<br>starr_emoji_like          | 由新入口承接 | 表情库                                             | 统一角色表情资产及喜爱、备注、额度配置；不兼容旧管理工具名。                   |
| 74   | tool<br>qzone_feed                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 75   | tool<br>qzone_post                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 76   | tool<br>qzone_comment             | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 77   | tool<br>starr_link_parse          | 由新入口承接 | starr_link_parse                                   | 解析完整视频与动态链接；短链与任意网页解析未并入。                             |
| 78   | tool<br>starr_emotion_record      | 由新入口承接 | starr_state_read / starr_experience_record         | 共用角色状态与经历服务，不接回旧状态计算引擎。                                 |
| 79   | tool<br>starr_media               | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 80   | tool<br>starr_sing                | 由新入口承接 | starr_sing / starr_qq_sing                         | 需曲库、参考音色与已验证的转换服务，bot 翻唱必须额外授权。                     |
| 81   | tool<br>starr_song_search         | 由新入口承接 | starr_song_list / 唱歌曲库                         | 查询本角色曲库；不提供跨角色曲库读取。                                         |
| 82   | tool<br>starr_song_add            | 由新入口承接 | 唱歌 → 曲库与转换记录                              | 通过网页导入音源和参考音色；不允许模型导入任意本机路径。                       |
| 83   | tool<br>starr_song_list           | 由新入口承接 | starr_song_list / 唱歌曲库                         | 查询本角色曲库；不提供跨角色曲库读取。                                         |
| 84   | tool<br>starr_run_job             | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 85   | command<br>session                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 86   | command<br>thread                 | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 87   | command<br>check-comment          | 由新入口承接 | B站接入 → 评论与提及                               | 回读真实评论楼层并核验允许对象，受额度和冷却约束。                             |
| 88   | command<br>check-dynamic          | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 89   | command<br>check-mention          | 由新入口承接 | B站接入 → 评论与提及                               | 回读真实评论楼层并核验允许对象，受额度和冷却约束。                             |
| 90   | command<br>watch                  | 由新入口承接 | B站资料阅读 / starr_bili_activity_read             | 读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。               |
| 91   | command<br>comment-await          | 由新入口承接 | B站接入 → 评论与提及                               | 回读真实评论楼层并核验允许对象，受额度和冷却约束。                             |
| 92   | command<br>comment-digest         | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 93   | command<br>recon                  | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 94   | command<br>video                  | 由新入口承接 | B站资料阅读 / starr_bili_activity_read             | 读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。               |
| 95   | command<br>subtitles              | 由新入口承接 | B站资料阅读 / starr_bili_activity_read             | 读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。               |
| 96   | command<br>watch-video            | 由新入口承接 | B站资料阅读 / starr_bili_activity_read             | 读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。               |
| 97   | command<br>debrief                | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 98   | command<br>feed                   | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 99   | command<br>prefs                  | 由新入口承接 | B站兴趣、资料阅读、额度与冷却                      | 整合为业务配置和实际活动状态，不保留另一套命令引擎。                           |
| 100  | command<br>quota                  | 由新入口承接 | B站兴趣、资料阅读、额度与冷却                      | 整合为业务配置和实际活动状态，不保留另一套命令引擎。                           |
| 101  | command<br>fish-guard             | 由新入口承接 | B站兴趣、资料阅读、额度与冷却                      | 整合为业务配置和实际活动状态，不保留另一套命令引擎。                           |
| 102  | command<br>watch-history          | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 103  | command<br>likes                  | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 104  | command<br>selftest               | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 105  | command<br>deps                   | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 106  | command<br>diary                  | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 107  | command<br>notify                 | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 108  | command<br>night                  | 由新入口承接 | B站兴趣、资料阅读、额度与冷却                      | 整合为业务配置和实际活动状态，不保留另一套命令引擎。                           |
| 109  | command<br>score                  | 由新入口承接 | B站兴趣、资料阅读、额度与冷却                      | 整合为业务配置和实际活动状态，不保留另一套命令引擎。                           |
| 110  | command<br>daily                  | 由新入口承接 | B站接入 → 定时文字动态                             | 四类文字动态独立配置，实际发布以回执为准；不含图片、编辑与删除。               |
| 111  | command<br>share-dynamic          | 由新入口承接 | 星桥传书                                           | 同账号公开动态同步 QQ；首次仅建水位，明确目标与双重授权。                      |
| 112  | command<br>gamefeed               | 由新入口承接 | B站接入 → 定时文字动态                             | 四类文字动态独立配置，实际发布以回执为准；不含图片、编辑与删除。               |
| 113  | command<br>attack                 | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 114  | command<br>search                 | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 115  | command<br>covers                 | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 116  | command<br>whois                  | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 117  | command<br>dm-await               | 由新入口承接 | B站私信 / Starr-chat                               | 按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。               |
| 118  | command<br>dm-history             | 由新入口承接 | B站私信 / Starr-chat                               | 按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。               |
| 119  | command<br>fav                    | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 120  | command<br>dm                     | 由新入口承接 | B站私信 / Starr-chat                               | 按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。               |
| 121  | command<br>comment                | 由新入口承接 | B站接入 → 评论与提及                               | 回读真实评论楼层并核验允许对象，受额度和冷却约束。                             |
| 122  | command<br>reply-draft            | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 123  | command<br>comment-del            | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 124  | command<br>dynamic                | 由新入口承接 | B站接入 → 定时文字动态                             | 四类文字动态独立配置，实际发布以回执为准；不含图片、编辑与删除。               |
| 125  | command<br>dynamic-image          | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 126  | command<br>dynamic-edit           | 由新入口承接 | 公开资料与动态操作                                 | 网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。 |
| 127  | command<br>danmaku                | 由新入口承接 | B站接入 → 直播                                     | 仅在配置直播间的实际收件会话中回应；受理不等于已验证画面送达。                 |
| 128  | command<br>auto                   | 待接入       | 退役缺失入口                                       | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 129  | command<br>await                  | 待接入       | 对接共享业务服务                                   | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 130  | command<br>dyn-keywords           | 待接入       | 退役缺失入口                                       | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 131  | command<br>dyn-page               | 待接入       | 退役缺失入口                                       | 没有对应的可运行入口；不显示为已实现或已实号验证。                             |
| 132  | job<br>diaryDay                   | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 133  | job<br>diaryNight                 | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 134  | job<br>organize                   | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 135  | job<br>weeklyLayers               | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 136  | job<br>monthlyLayers              | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |
| 137  | job<br>reindexMemory              | 由新入口承接 | 索引重建 / 主题关联建议                            | 关联建议需管理员确认，不将推测伪装成真实关系。                                 |
| 138  | job<br>memoryDecay                | 由新入口承接 | 按时间计算记忆权重                                 | 召回时计算新鲜度，保留完整正文，不启动删除型衰减任务。                         |
| 139  | job<br>memoryTopics               | 由新入口承接 | 索引重建 / 主题关联建议                            | 关联建议需管理员确认，不将推测伪装成真实关系。                                 |
| 140  | job<br>yearlyLayers               | 由新入口承接 | 保存与整理 → 定时任务                              | 日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。              |

## 243 项额外声明

以下来自旧配置或服务声明；原迁移决策供复核，不是本版实际运行状态。有效配置只以统一字段定义和功能页为准。

| 编号 | 来源 / 原键                                    | 标签                                      | 原迁移决策   |
| ---- | ---------------------------------------------- | ----------------------------------------- | ------------ |
| 1    | unified<br>version                             |                                           | 退役         |
| 2    | unified<br>qqbotRoot                           |                                           | 重新配置     |
| 3    | unified<br>bridge.autoStart                    |                                           | 待消费者复核 |
| 4    | unified<br>bridge.startupNotify                |                                           | 待消费者复核 |
| 5    | unified<br>bridge.consoleBase                  |                                           | 待消费者复核 |
| 6    | unified<br>bridge.startScript                  |                                           | 重新配置     |
| 7    | unified<br>persona.file                        |                                           | 重新确认     |
| 8    | unified<br>persona.injectInBili                |                                           | 重新确认     |
| 9    | unified<br>persona.compactChars                |                                           | 重新确认     |
| 10   | unified<br>admin.qq                            |                                           | 重新确认     |
| 11   | unified<br>admin.biliMid                       |                                           | 重新确认     |
| 12   | unified<br>admin.biliName                      |                                           | 重新确认     |
| 13   | unified<br>admin.displayName                   |                                           | 重新确认     |
| 14   | unified<br>admin.gentle                        |                                           | 重新确认     |
| 15   | unified<br>memory.qqToBili.enabled             |                                           | 重构         |
| 16   | unified<br>memory.qqToBili.lookbackDays        |                                           | 重构         |
| 17   | unified<br>memory.qqToBili.maxMessages         |                                           | 重构         |
| 18   | unified<br>memory.qqToBili.maxChars            |                                           | 重构         |
| 19   | unified<br>memory.qqToBili.intervalMs          |                                           | 重构         |
| 20   | unified<br>memory.qqToBili.includeOwner        |                                           | 重构         |
| 21   | unified<br>memory.qqToBili.includeAgentReplies |                                           | 重构         |
| 22   | unified<br>memory.qqToBili.useNicknames        |                                           | 重构         |
| 23   | unified<br>memory.qqToBili.includeGroups       |                                           | 重构         |
| 24   | unified<br>memory.biliToQq.previewOnly         |                                           | 重构         |
| 25   | unified<br>memory.privacy.blockPrivateMessages |                                           | 重构         |
| 26   | unified<br>memory.privacy.blockSecrets         |                                           | 重新配置     |
| 27   | unified<br>memory.privacy.blockPii             |                                           | 重构         |
| 28   | unified<br>memory.privacy.blockContact         |                                           | 重构         |
| 29   | unified<br>memory.privacy.dropUnsafeLines      |                                           | 重构         |
| 30   | unified<br>memory.privacy.audit                |                                           | 重构         |
| 31   | unified<br>memory.privacy.maxAuditEntries      |                                           | 重构         |
| 32   | unified<br>alignment.enabled                   |                                           | 重构         |
| 33   | unified<br>alignment.priority                  |                                           | 重构         |
| 34   | unified<br>alignment.injectInQQ                |                                           | 重构         |
| 35   | unified<br>alignment.injectInBili              |                                           | 重构         |
| 36   | unified<br>alignment.autoDetect                |                                           | 重构         |
| 37   | unified<br>alignment.requireApproval           |                                           | 重构         |
| 38   | unified<br>alignment.maxEntries                |                                           | 重构         |
| 39   | unified<br>memoryCard.enabled                  |                                           | 重构         |
| 40   | unified<br>memoryCard.maxChars                 |                                           | 重构         |
| 41   | unified<br>memoryCard.warnChars                |                                           | 重构         |
| 42   | unified<br>memoryCard.injectMaxChars.qq        |                                           | 重构         |
| 43   | unified<br>memoryCard.injectMaxChars.bili      |                                           | 重构         |
| 44   | unified<br>memoryCard.recentDays               |                                           | 重构         |
| 45   | unified<br>memoryCard.fuzzyAfterDays           |                                           | 重构         |
| 46   | unified<br>memoryCard.forgetAfterDays          |                                           | 重构         |
| 47   | unified<br>memoryCard.dailyHour                |                                           | 重构         |
| 48   | unified<br>memoryCard.minOwnerImportance       |                                           | 重构         |
| 49   | unified<br>memoryCard.autoCompact              |                                           | 重构         |
| 50   | unified<br>memoryCard.notifyOwner              |                                           | 重构         |
| 51   | unified<br>memoryCard.includeQqInBili          |                                           | 重构         |
| 52   | unified<br>memoryCard.maxRecords               |                                           | 重构         |
| 53   | unified<br>memoryCard.fullMaxBytes             |                                           | 重构         |
| 54   | unified<br>memoryCard.fullMaxRecords           |                                           | 重构         |
| 55   | unified<br>memoryCard.fullMarkdownMaxBytes     |                                           | 重构         |
| 56   | unified<br>extensions.enabled                  |                                           | 迁移候选     |
| 57   | unified<br>extensions.disabled                 |                                           | 迁移候选     |
| 58   | unified<br>platforms.enabled                   |                                           | 迁移候选     |
| 59   | unified<br>platforms.planned                   |                                           | 迁移候选     |
| 60   | unified<br>platforms.start.qq                  |                                           | 迁移候选     |
| 61   | unified<br>platforms.start.bili                |                                           | 迁移候选     |
| 62   | unified<br>ui.activeTab                        |                                           | 迁移候选     |
| 63   | unified<br>ui.showAdvanced                     |                                           | 迁移候选     |
| 64   | unified<br>updates.enabled                     |                                           | 迁移候选     |
| 65   | unified<br>updates.checkOnStart                |                                           | 迁移候选     |
| 66   | unified<br>updates.startDelayMs                |                                           | 迁移候选     |
| 67   | unified<br>updates.intervalMs                  |                                           | 迁移候选     |
| 68   | unified<br>updates.components                  |                                           | 迁移候选     |
| 69   | unified<br>updates.pet.versionUrl              |                                           | 迁移候选     |
| 70   | unified<br>updates.voice.localVersionUrl       |                                           | 重构         |
| 71   | unified<br>updates.voice.cloudVersionUrl       |                                           | 重构         |
| 72   | budget<br>qq.cny                               |                                           | 重构         |
| 73   | budget<br>qq.tokens                            |                                           | 重新配置     |
| 74   | budget<br>bili.cny                             |                                           | 迁移候选     |
| 75   | budget<br>bili.tokens                          |                                           | 重新配置     |
| 76   | budget<br>other.cny                            |                                           | 待消费者复核 |
| 77   | budget<br>other.tokens                         |                                           | 重新配置     |
| 78   | budget<br>total.cny                            |                                           | 待消费者复核 |
| 79   | budget<br>total.tokens                         |                                           | 重新配置     |
| 80   | starr<br>sing.provider                         |                                           | 替换         |
| 81   | starr<br>media.version                         |                                           | 退役         |
| 82   | starr<br>media.tts.format                      |                                           | 重构         |
| 83   | starr<br>python                                |                                           | 重新配置     |
| 84   | starr<br>stateDir                              |                                           | 重新配置     |
| 85   | starr<br>jobs.diaryDay.script                  |                                           | 重新配置     |
| 86   | starr<br>jobs.diaryDay.args                    |                                           | 重构         |
| 87   | starr<br>jobs.diaryDay.cwd                     |                                           | 重新配置     |
| 88   | starr<br>jobs.diaryDay.enabled                 |                                           | 重构         |
| 89   | starr<br>jobs.diaryDay.catchUp                 |                                           | 重构         |
| 90   | starr<br>jobs.diaryNight.script                |                                           | 重新配置     |
| 91   | starr<br>jobs.diaryNight.args                  |                                           | 重构         |
| 92   | starr<br>jobs.diaryNight.cwd                   |                                           | 重新配置     |
| 93   | starr<br>jobs.diaryNight.enabled               |                                           | 重构         |
| 94   | starr<br>jobs.diaryNight.catchUp               |                                           | 重构         |
| 95   | starr<br>jobs.organize.script                  |                                           | 重新配置     |
| 96   | starr<br>jobs.organize.args                    |                                           | 重构         |
| 97   | starr<br>jobs.organize.cwd                     |                                           | 重新配置     |
| 98   | starr<br>jobs.organize.enabled                 |                                           | 重构         |
| 99   | starr<br>jobs.organize.catchUp                 |                                           | 重构         |
| 100  | starr<br>jobs.weeklyLayers.script              |                                           | 重新配置     |
| 101  | starr<br>jobs.weeklyLayers.args                |                                           | 重构         |
| 102  | starr<br>jobs.weeklyLayers.at                  |                                           | 重构         |
| 103  | starr<br>jobs.weeklyLayers.dow                 |                                           | 重构         |
| 104  | starr<br>jobs.weeklyLayers.catchUpHours        |                                           | 重构         |
| 105  | starr<br>jobs.weeklyLayers.cwd                 |                                           | 重新配置     |
| 106  | starr<br>jobs.weeklyLayers.enabled             |                                           | 重构         |
| 107  | starr<br>jobs.weeklyLayers.catchUp             |                                           | 重构         |
| 108  | starr<br>jobs.monthlyLayers.script             |                                           | 重新配置     |
| 109  | starr<br>jobs.monthlyLayers.args               |                                           | 重构         |
| 110  | starr<br>jobs.monthlyLayers.at                 |                                           | 重构         |
| 111  | starr<br>jobs.monthlyLayers.dom                |                                           | 重构         |
| 112  | starr<br>jobs.monthlyLayers.catchUpHours       |                                           | 重构         |
| 113  | starr<br>jobs.monthlyLayers.cwd                |                                           | 重新配置     |
| 114  | starr<br>jobs.monthlyLayers.enabled            |                                           | 重构         |
| 115  | starr<br>jobs.monthlyLayers.catchUp            |                                           | 重构         |
| 116  | starr<br>jobs.reindexMemory.script             |                                           | 重新配置     |
| 117  | starr<br>jobs.reindexMemory.args               |                                           | 重构         |
| 118  | starr<br>jobs.reindexMemory.python             |                                           | 重新配置     |
| 119  | starr<br>jobs.reindexMemory.at                 |                                           | 重构         |
| 120  | starr<br>jobs.reindexMemory.catchUpHours       |                                           | 重构         |
| 121  | starr<br>jobs.reindexMemory.cwd                |                                           | 重新配置     |
| 122  | starr<br>jobs.reindexMemory.enabled            |                                           | 重构         |
| 123  | starr<br>jobs.reindexMemory.catchUp            |                                           | 重构         |
| 124  | starr<br>jobs.memoryDecay.script               |                                           | 重新配置     |
| 125  | starr<br>jobs.memoryDecay.args                 |                                           | 重构         |
| 126  | starr<br>jobs.memoryDecay.python               |                                           | 重新配置     |
| 127  | starr<br>jobs.memoryDecay.at                   |                                           | 重构         |
| 128  | starr<br>jobs.memoryDecay.catchUpHours         |                                           | 重构         |
| 129  | starr<br>jobs.memoryDecay.cwd                  |                                           | 重新配置     |
| 130  | starr<br>jobs.memoryDecay.enabled              |                                           | 重构         |
| 131  | starr<br>jobs.memoryDecay.catchUp              |                                           | 重构         |
| 132  | starr<br>jobs.memoryTopics.script              |                                           | 重新配置     |
| 133  | starr<br>jobs.memoryTopics.args                |                                           | 重构         |
| 134  | starr<br>jobs.memoryTopics.python              |                                           | 重新配置     |
| 135  | starr<br>jobs.memoryTopics.at                  |                                           | 重构         |
| 136  | starr<br>jobs.memoryTopics.catchUpHours        |                                           | 重构         |
| 137  | starr<br>jobs.memoryTopics.cwd                 |                                           | 重新配置     |
| 138  | starr<br>jobs.memoryTopics.enabled             |                                           | 重构         |
| 139  | starr<br>jobs.memoryTopics.catchUp             |                                           | 重构         |
| 140  | starr<br>jobs.yearlyLayers.script              |                                           | 重新配置     |
| 141  | starr<br>jobs.yearlyLayers.args                |                                           | 重构         |
| 142  | starr<br>jobs.yearlyLayers.at                  |                                           | 重构         |
| 143  | starr<br>jobs.yearlyLayers.months              |                                           | 重构         |
| 144  | starr<br>jobs.yearlyLayers.dom                 |                                           | 重构         |
| 145  | starr<br>jobs.yearlyLayers.catchUpHours        |                                           | 重构         |
| 146  | starr<br>jobs.yearlyLayers.cwd                 |                                           | 重新配置     |
| 147  | starr<br>jobs.yearlyLayers.enabled             |                                           | 重构         |
| 148  | starr<br>jobs.yearlyLayers.catchUp             |                                           | 重构         |
| 149  | starr<br>qq.rules                              |                                           | 重构         |
| 150  | starr<br>voice.startTimeoutMs                  |                                           | 重构         |
| 151  | starr<br>voice.requestTimeoutMs                |                                           | 重构         |
| 152  | starr<br>guard.checkIntervalSec                |                                           | 重构         |
| 153  | starr<br>guard.failBackoffSec                  |                                           | 重构         |
| 154  | starr<br>guard.startScript                     |                                           | 重新配置     |
| 155  | starr<br>guard.maxRestarts                     |                                           | 重构         |
| 156  | starr<br>logDir                                |                                           | 重新配置     |
| 157  | starr<br>bili.feedToQQ                         |                                           | 迁移候选     |
| 158  | qq<br>dsh.authHeader                           |                                           | 重新配置     |
| 159  | qq<br>dsh.authPrefix                           |                                           | 重新配置     |
| 160  | qq<br>biliBridge.memory.enabled                |                                           | 重构         |
| 161  | qq<br>biliBridge.memory.refreshIntervalMs      |                                           | 重构         |
| 162  | qq<br>biliBridge.share.card                    |                                           | 迁移候选     |
| 163  | qq<br>snowluma.downloadUrl                     |                                           | 重构         |
| 164  | qq<br>admin                                    |                                           | 重新确认     |
| 165  | qq<br>socialV2.sticker.enabled                 |                                           | 迁移候选     |
| 166  | qq<br>socialV2.sticker.syncTtlMs               |                                           | 迁移候选     |
| 167  | qq<br>socialV2.sticker.maxListCount            |                                           | 迁移候选     |
| 168  | qq<br>socialV2.sticker.includeInPrompt         |                                           | 迁移候选     |
| 169  | qq<br>socialV2.sticker.promptMaxStickers       |                                           | 迁移候选     |
| 170  | qq<br>socialV2.sticker.match.topK              |                                           | 迁移候选     |
| 171  | qq<br>socialV2.sticker.match.minScore          |                                           | 迁移候选     |
| 172  | qq<br>socialV2.sticker.collect.enabled         |                                           | 迁移候选     |
| 173  | qq<br>socialV2.sticker.collect.maxPerMinute    |                                           | 迁移候选     |
| 174  | qq<br>socialV2.sticker.collect.maxPerHour      |                                           | 迁移候选     |
| 175  | qq<br>socialV2.sticker.collect.maxRemarkChars  |                                           | 迁移候选     |
| 176  | qq<br>socialV2.voice.enabled                   |                                           | 重构         |
| 177  | qq<br>socialV2.voice.dir                       |                                           | 重新配置     |
| 178  | qq<br>socialV2.voice.maxSeconds                |                                           | 重构         |
| 179  | qq<br>socialV2.voice.maxBytes                  |                                           | 重构         |
| 180  | qq<br>socialV2.voice.maxPerMinute              |                                           | 重构         |
| 181  | qq<br>socialV2.voice.maxPerHour                |                                           | 重构         |
| 182  | qq<br>socialV2.voice.allowAbsolutePath         |                                           | 重新配置     |
| 183  | qq<br>socialV2.voice.defaultVolume             |                                           | 重构         |
| 184  | qq<br>socialV2.voice.loudness                  |                                           | 重构         |
| 185  | qq<br>socialV2.voice.ffmpegPath                |                                           | 重新配置     |
| 186  | qq<br>socialV2.voice.autoReadback              |                                           | 重构         |
| 187  | qq<br>socialV2.voice.tts.enabled               |                                           | 重构         |
| 188  | qq<br>socialV2.voice.tts.baseUrl               |                                           | 重构         |
| 189  | qq<br>socialV2.voice.tts.timeoutMs             |                                           | 重构         |
| 190  | qq<br>socialV2.voice.tts.maxChars              |                                           | 重构         |
| 191  | qq<br>socialV2.voice.tts.character             |                                           | 重构         |
| 192  | qq<br>socialV2.voice.tts.route                 |                                           | 重构         |
| 193  | qq<br>socialV2.voice.tts.endpoints.local       |                                           | 重构         |
| 194  | qq<br>socialV2.voice.tts.endpoints.cloud       |                                           | 重构         |
| 195  | qq<br>socialV2.voice.trigger.who               |                                           | 重构         |
| 196  | qq<br>socialV2.voice.trigger.groups            |                                           | 重构         |
| 197  | qq<br>socialV2.voice.trigger.members           |                                           | 重构         |
| 198  | qq<br>purpose.ownerUin                         |                                           | 重构         |
| 199  | qq<br>greetings.enabled                        |                                           | 重构         |
| 200  | qq<br>greetings.morning.time                   |                                           | 重构         |
| 201  | qq<br>greetings.morning.uin                    |                                           | 重构         |
| 202  | qq<br>greetings.morning.name                   |                                           | 重构         |
| 203  | bili<br>_readme                                |                                           | 退役         |
| 204  | bili<br>persona.name                           |                                           | 重新确认     |
| 205  | bili<br>persona.ownerTitle                     |                                           | 重新确认     |
| 206  | bili<br>persona.selfClaim                      |                                           | 重新确认     |
| 207  | bili<br>persona.diaryTitle                     |                                           | 重构         |
| 208  | bili<br>_preferences_readme                    |                                           | 退役         |
| 209  | bili<br>preferences.weights.AI 工具与插件      |                                           | 迁移候选     |
| 210  | bili<br>preferences.weights.猫咪               |                                           | 迁移候选     |
| 211  | bili<br>owner.mid                              |                                           | 重新确认     |
| 212  | bili<br>owner.name                             |                                           | 重新确认     |
| 213  | bili<br>aliases                                |                                           | 重新确认     |
| 214  | bili<br>_limits_readme                         |                                           | 退役         |
| 215  | bili<br>_dynamics_readme                       |                                           | 退役         |
| 216  | bili<br>notify.path                            |                                           | 重新配置     |
| 217  | unified<br>pet.chat.enabled                    | 启用桌宠对话                              | 待消费者复核 |
| 218  | unified<br>pet.chat.remember                   | 桌宠对话进入记忆                          | 待消费者复核 |
| 219  | unified<br>pet.chat.maxReplyChars              | 文字回复上限，40～800                     | 待消费者复核 |
| 220  | unified<br>pet.chat.voiceMaxChars              | 语音回复字数，20～300                     | 重构         |
| 221  | unified<br>pet.chat.historyTurns               | 历史轮数，2～60                           | 待消费者复核 |
| 222  | unified<br>pet.chat.temperature                | 生成温度，0～2                            | 待消费者复核 |
| 223  | unified<br>pet.chat.reasoningEffort            | 思考强度：off/low/high/max                | 待消费者复核 |
| 224  | qq<br>purpose.carrier                          | 主动联系载体：qq/pet                      | 重构         |
| 225  | qq<br>purpose.petModality                      | 桌宠主动联系：text/voice                  | 重构         |
| 226  | qq<br>purpose.petFallbackToQQ                  | 桌宠不可用时允许回退 QQ                   | 重构         |
| 227  | pet-install<br>source                          | 桌宠安装来源                              | 待消费者复核 |
| 228  | pet-install<br>electronPath                    | 桌宠 Electron 路径                        | 重新配置     |
| 229  | pet-install<br>appDir                          | 桌宠程序目录                              | 重新配置     |
| 230  | pet-install<br>mirror                          | 桌宠下载镜像                              | 待消费者复核 |
| 231  | action<br>tts.format                           | 单次试听格式 mp3/wav，不是持久注册字段    | 重构         |
| 232  | action<br>asr.uploadMaxBytes                   | 上传转写 25 MiB 上限                      | 重构         |
| 233  | constant<br>memory.chunkChars                  | 统一记忆分块字符数                        | 重构         |
| 234  | constant<br>memory.edgeMinSimilarity           | 旧相似边阈值                              | 重构         |
| 235  | constant<br>memory.edgePerNode                 | 旧相似边数量                              | 重构         |
| 236  | constant<br>memory.indexChunkChars             | 旧索引分块字符数                          | 重构         |
| 237  | constant<br>memory.indexChunkOverlap           | 旧索引分块重叠声明                        | 重构         |
| 238  | constant<br>memory.decayDays                   | 指数衰减时间常数，实际不是半衰期          | 重构         |
| 239  | constant<br>memory.archiveBelow                | 低于该重要度可进入归档判定                | 重构         |
| 240  | constant<br>memory.archiveAfterDays            | 归档判定使用天数阈值，需核对召回契约      | 重构         |
| 241  | constant<br>memory.maxDecaySteps               | 按累计 decay_steps 限制，非每次只处理30条 | 重构         |
| 242  | constant<br>relations.debounceMs               | 笔记关系去抖毫秒                          | 重构         |
| 243  | constant<br>relations.pollMs                   | 笔记关系兜底轮询毫秒                      | 重构         |
