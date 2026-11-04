# v0.1.7 旧配置与能力核验

这份清单保留全部411项旧注册字段，区分当前有实际消费者的配置、宿主管理、退役与尚待实现。移除日常迁入页面不等于所有旧能力完成。已归并仅表示新入口存在，不能据此声称真实账号、所有模型或旧值兼容已验收。

| 状态        | 数量 |
| ----------- | ---- |
| 已归并配置  | 198  |
| 交由DSH管理 | 21   |
| 已退役机制  | 46   |
| 待实现      | 146  |

本版新增的免费听写、Breeze参考音色、See Now画面管线、45秒本地翻唱、QQ社交动作与B站主动评论/私信/动态详见V017.md；它们以新权限和配置承接，不照搬旧脚本。尚待实现的purpose目的调度、向量检索、自动联网考据、浏览器提供者等不是技术冲突，仍需后续独立实现。

| 编号 | 旧分区/字段                                         | 标签                        | 当前状态    | 实际目标                      | 说明                                                                                      |
| ---- | --------------------------------------------------- | --------------------------- | ----------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | qq / dsh.baseUrl                                    | DSH 地址                    | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 2    | qq / dsh.provider                                   | 模型提供方                  | 已归并配置  | provider                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 3    | qq / dsh.model                                      | 模型                        | 已归并配置  | model                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 4    | qq / dsh.reasoningEffort                            | 思考强度                    | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 5    | qq / dsh.authToken                                  | DSH token                   | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 6    | qq / dsh.allowRemote                                | 允许远程 DSH                | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 7    | qq / agentPreset                                    | 一代 preset                 | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 8    | qq / workspaceTitle                                 | 工作区名称                  | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 9    | qq / sessionCwd                                     | 会话工作目录                | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 10   | qq / socialV2.enabled                               | 启用二代仿真                | 已归并配置  | enabled                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 11   | qq / socialV2.autoReplyCheckMs                      | 自动回复检查间隔            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 12   | qq / socialV2.agentPreset                           | 二代 preset                 | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 13   | qq / socialV2.provideRecommendations                | 提供推荐值                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 14   | qq / socialV2.initialPromptMaxChars                 | 初始提示词上限              | 已归并配置  | context.maxChars              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 15   | qq / purpose.enabled                                | 启用主动机制                | 已归并配置  | agency.enabled                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 16   | qq / purpose.gapMinMs                               | 最短主动间隔                | 已归并配置  | agency.cooldownMinutes        | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 17   | qq / purpose.gapMaxMs                               | 最长主动间隔                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 18   | qq / purpose.initialDelayMinMs                      | 启动后首次延迟              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 19   | qq / purpose.dailyMax                               | 每天最多主动                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 20   | qq / purpose.quietStart                             | 安静时段开始                | 已归并配置  | agency.quietStart             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 21   | qq / purpose.quietEnd                               | 安静时段结束                | 已归并配置  | agency.quietEnd               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 22   | qq / purpose.idleThresholdMs                        | 多久没说话才主动            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 23   | qq / purpose.materialWindowHours                    | 素材回看窗口（小时）        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 24   | qq / purpose.biliWindowDays                         | B站素材回看（天）           | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 25   | qq / purpose.maxMaterials                           | 最多素材条数                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 26   | qq / purpose.minMaterials                           | 最少素材条数                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 27   | qq / purpose.retryMs                                | 失败后重试间隔              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 28   | qq / purpose.maxAttempts                            | 单次最多尝试                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 29   | qq / purpose.maxCandidates                          | 每次生成候选数              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 30   | qq / purpose.promptMaxChars                         | 提示词上限（字符）          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 31   | qq / socialV2.wake.defaultMode                      | 默认状态                    | 已归并配置  | chat.wake.mode                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 32   | qq / socialV2.wake.preSleepWaitEnabled              | 沉睡前必须观察              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 33   | qq / socialV2.wake.preSleepWaitMs                   | 沉睡前观察时长              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 34   | qq / socialV2.wake.recommendedDefaultInfinite       | 推荐无限期潜水              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 35   | qq / socialV2.wake.sleepMinMs                       | 潜水最短                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 36   | qq / socialV2.wake.sleepMaxMs                       | 潜水最长（0=无限）          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 37   | qq / socialV2.wake.recommendedSleepMinMs            | 推荐最短潜水                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 38   | qq / socialV2.wake.recommendedSleepMaxMs            | 推荐最长潜水                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 39   | qq / socialV2.wake.recommendedProbability           | 普通消息唤醒概率            | 已归并配置  | chat.wake.probability         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 40   | qq / socialV2.wake.recommendedKeywords              | 推荐唤醒关键词              | 已归并配置  | chat.wake.keywords            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 41   | qq / socialV2.wake.recommendedAtMention             | 推荐 @ 唤醒                 | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 42   | qq / socialV2.wake.recommendedNameMention           | 推荐名字唤醒                | 已归并配置  | chat.wake.names               | 改为额外角色称呼列表；当前角色名始终参与直接称呼判断。                                    |
| 43   | qq / socialV2.wake.recommendedQuestion              | 推荐提问唤醒                | 已归并配置  | chat.wake.questions           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 44   | qq / socialV2.wake.recommendedPoke                  | 推荐拍一拍唤醒              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 45   | qq / socialV2.wake.recommendedHint                  | 推荐提示词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 46   | qq / socialV2.wake.batchWindowMs                    | 合并唤醒窗口                | 已归并配置  | mergeMs                       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 47   | qq / socialV2.wake.maxWakePerMinute                 | 每分钟最多唤醒              | 已归并配置  | chat.wake.maxPerMinute        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 48   | qq / socialV2.wake.maxWakePerHour                   | 每小时最多唤醒              | 已归并配置  | chat.wake.maxPerHour          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 49   | qq / socialV2.wake.noActionLimit                    | 无动作上限                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 50   | qq / socialV2.wake.maxWakeConfigReminders           | 唤醒配置提醒上限            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 51   | qq / socialV2.send.burstEnabled                     | 分条发送                    | 已归并配置  | chat.reply.burstEnabled       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 52   | qq / socialV2.send.burstMaxMessages                 | 单轮最多条数                | 已归并配置  | chat.reply.burstMax           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 53   | qq / socialV2.send.burstIntervalMinMs               | 分条最小间隔                | 已归并配置  | chat.reply.delayMinMs         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 54   | qq / socialV2.send.burstIntervalMaxMs               | 分条最大间隔                | 已归并配置  | chat.reply.delayMaxMs         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 55   | qq / socialV2.send.longGapProbability               | 长间隔概率                  | 已归并配置  | chat.reply.longPauseChance    | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 56   | qq / socialV2.send.longGapMinMs                     | 长间隔最小                  | 已归并配置  | chat.reply.longPauseMs        | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 57   | qq / socialV2.send.longGapMaxMs                     | 长间隔最大                  | 已归并配置  | chat.reply.longPauseMs        | 长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。                      |
| 58   | qq / socialV2.send.maxSendPerMinute                 | 每分钟最多发送              | 已归并配置  | chat.reply.maxPerMinute       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 59   | qq / socialV2.send.maxSendPerHour                   | 每小时最多发送              | 已归并配置  | chat.reply.maxPerHour         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 60   | qq / socialV2.send.maxMessageChars                  | 单条最大字符                | 已归并配置  | chat.reply.maxChars           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 61   | qq / socialV2.send.maxGapMs                         | 最大间隔                    | 已归并配置  | chat.reply.maxDelayMs         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 62   | qq / socialV2.send.gapBaseMs                        | 基础间隔                    | 已归并配置  | chat.reply.delayMinMs         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 63   | qq / socialV2.send.gapPerCharMs                     | 每字追加间隔                | 已归并配置  | chat.reply.perCharMs          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 64   | qq / socialV2.send.recommendedHint                  | 节奏提示词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 65   | qq / socialV2.wait.defaultMs                        | 默认等待                    | 已归并配置  | chat.wait.defaultMs           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 66   | qq / socialV2.wait.minMs                            | 最短等待                    | 已归并配置  | chat.wait.minMs               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 67   | qq / socialV2.wait.maxMs                            | 最长等待                    | 已归并配置  | chat.wait.maxMs               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 68   | qq / socialV2.wait.defaultQuietMs                   | 默认静默                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 69   | qq / socialV2.wait.minQuietAfterNewMs               | 新消息后最短静默            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 70   | qq / socialV2.context.recentLimit                   | 最近消息上限                | 已归并配置  | chat.context.recentMessages   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 71   | qq / socialV2.context.unreadLimit                   | 未读上限                    | 已归并配置  | chat.context.batchMessages    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 72   | qq / socialV2.context.contextWindow                 | 上下文窗口                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 73   | qq / socialV2.context.inlineWakeMessages            | 唤醒时内联消息              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 74   | qq / socialV2.context.wakeFoldOld                   | 唤醒只带最近一窗            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 75   | qq / socialV2.context.wakeMessageLimit              | 唤醒消息上限                | 已归并配置  | chat.context.batchMessages    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 76   | qq / socialV2.context.wakeRecentLimit               | 唤醒最近消息上限            | 已归并配置  | chat.context.recentMessages   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 77   | qq / socialV2.context.wakeMaxChars                  | 唤醒上下文最大字符          | 已归并配置  | context.maxChars              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 78   | qq / socialV2.closure.enabled                       | 启用对话收尾判断            | 已归并配置  | chat.close.enabled            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 79   | qq / socialV2.closure.cooldownMs                    | 收尾后软冷却                | 已归并配置  | chat.close.cooldownMs         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 80   | qq / socialV2.closure.requireNoOpenQuestion         | 对方还在问时拒绝收尾        | 已归并配置  | chat.close.checkQuestion      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 81   | qq / socialV2.closure.promptInWake                  | 每次唤醒注入判断参数        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 82   | qq / socialV2.closure.maxSummaryChars               | 收尾摘要上限                | 已归并配置  | context.summaryChars          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 83   | qq / socialV2.closure.maxNextOpeningChars           | 下次接法上限                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 84   | qq / socialV2.history.enabled                       | 每次上线补看历史消息        | 已归并配置  | chat.history.enabled          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 85   | qq / socialV2.history.limit                         | 每个会话最多补几条          | 已归并配置  | chat.history.limit            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 86   | qq / socialV2.history.maxAgeMinutes                 | 只补最近多少分钟            | 已归并配置  | chat.history.maxAgeMinutes    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 87   | qq / socialV2.history.wake                          | 发现漏消息时主动醒一次      | 已归并配置  | chat.history.wake             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 88   | qq / socialV2.history.includePrivate                | 也补私聊                    | 已归并配置  | chat.history.includePrivate   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 89   | qq / fishGuard.enabled                              | 启用 QQ 鱼群保护            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 90   | qq / fishGuard.windowMs                             | 统计窗口                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 91   | qq / fishGuard.cooldownMs                           | 触发后冷却                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 92   | qq / fishGuard.maxFish                              | 多少条不同的鱼算泛滥        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 93   | qq / fishGuard.maxConsecutiveFish                   | 连续多少条鱼算刷屏          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 94   | qq / fishGuard.singleFishMaxConsecutive             | 单只鱼连续多少条才拦        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 95   | qq / fishGuard.maxFishMessages                      | 鱼消息条数阈值              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 96   | qq / fishGuard.maxFishRatio                         | 鱼消息占比阈值              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 97   | qq / fishGuard.minSample                            | 最少样本条数                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 98   | qq / fishGuard.minFishSendersForRatio               | 至少几条不同的鱼            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 99   | qq / fishGuard.groupNestMaxFish                     | 鱼窝群收紧阈值              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 100  | qq / fishGuard.groupNestIds                         | 指定鱼窝群号                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 101  | qq / fishGuard.namePrefixes                         | 鱼名开头词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 102  | qq / fishGuard.nameContains                         | 鱼名包含词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 103  | qq / fishGuard.nameSuffixes                         | 鱼名结尾词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 104  | qq / fishGuard.groupNameSuffixes                    | 鱼窝群名包含词              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 105  | qq / fishGuard.exemptNames                          | 豁免昵称                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 106  | qq / fishGuard.exemptIds                            | 豁免 QQ                     | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 107  | qq / fishGuard.fishIds                              | 额外认定的鱼 QQ             | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 108  | qq / fishGuard.bypassDirectAddress                  | 被直接叫到时放行            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 109  | qq / fishGuard.blockSends                           | 保护期内硬拦发送            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 110  | qq / socialV2.tokenGuard.enabled                    | 启用 Token 防爆破           | 已归并配置  | chat.budget.enabled           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 111  | qq / socialV2.tokenGuard.maxWakesPerDay             | 单会话每天最多醒            | 已归并配置  | chat.wake.maxPerDay           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 112  | qq / socialV2.tokenGuard.privateMaxWakesPerDay      | 私聊每天最多醒              | 已归并配置  | chat.wake.privatePerDay       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 113  | qq / socialV2.tokenGuard.minWakeGapMs               | 两次苏醒最小间隔            | 已归并配置  | chat.wake.minGapMs            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 114  | qq / socialV2.tokenGuard.directBypassGap            | 被叫到时越过间隔            | 已归并配置  | chat.wake.directBypass        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 115  | qq / socialV2.tokenGuard.maxOutboundPerTurn         | 每次醒来最多发              | 已归并配置  | chat.reply.maxOutboundPerTurn | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 116  | qq / socialV2.tokenGuard.maxDailyCostCNY            | 近 24h 花费上限（元）       | 已归并配置  | chat.budget.maxCostCNY        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 117  | qq / slang.enabled                                  | 启用黑话学习                | 已归并配置  | slang.enabled                 | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 118  | qq / slang.extractMinMessages                       | 提取门槛（消息数）          | 已归并配置  | slang.minEvidence             | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 119  | qq / slang.extractCooldownMs                        | 学习冷却                    | 已归并配置  | slang.cooldownMinutes         | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 120  | qq / slang.inferenceThresholds                      | 推断阈值                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 121  | qq / slang.injectMax                                | 注入数量上限                | 已归并配置  | slang.injectMax               | 用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。                    |
| 122  | qq / slang.learnerPreset                            | 学习会话 preset             | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 123  | qq / slang.workspaceTitle                           | 学习工作区名称              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 124  | qq / slang.autoResearch                             | 自动研究                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 125  | qq / webSearch.provider                             | 搜索提供方                  | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 126  | qq / webSearch.apiKey                               | 搜索 API Key                | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 127  | qq / webSearch.apiKeyEnv                            | API Key 环境变量            | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 128  | qq / webSearch.baseURL                              | 接口地址（可选）            | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 129  | qq / webSearch.model                                | 搜索模型                    | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 130  | qq / webSearch.maxUses                              | 每次最多搜索                | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 131  | qq / webSearch.maxTokens                            | 结果最大 token              | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 132  | qq / webSearch.maxResults                           | 最多返回条数                | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 133  | qq / webSearch.timeoutMs                            | 超时                        | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 134  | qq / social.enabled                                 | 启用一代仿真                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 135  | qq / social.maxReplyChars                           | 单条最大字数                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 136  | qq / social.mustReplyKeywords                       | 必须回复关键词              | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 137  | qq / social.contextWindow                           | 上下文条数                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 138  | qq / social.triggerProbability                      | 普通消息触发概率            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 139  | qq / social.activeCheckMinMs                        | 活跃检测最小间隔            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 140  | qq / social.activeCheckMaxMs                        | 活跃检测最大间隔            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 141  | qq / social.idleWindowMs                            | 空闲窗口                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 142  | qq / social.idleRetryProbability                    | 空闲重试概率                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 143  | qq / social.proactiveEnabled                        | 主动搭话                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 144  | qq / social.proactiveIdleThresholdMs                | 主动搭话空闲阈值            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 145  | qq / social.proactiveCheckMinMs                     | 主动检查最小间隔            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 146  | qq / social.proactiveCheckMaxMs                     | 主动检查最大间隔            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 147  | qq / social.proactiveProbability                    | 主动搭话概率                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 148  | qq / social.activeReplyDelayMinMs                   | 回复延迟最小                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 149  | qq / social.activeReplyDelayMaxMs                   | 回复延迟最大                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 150  | qq / social.activeDurationEnabled                   | 活跃时长限制                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 151  | qq / social.activeDurationMinMs                     | 活跃时长最小                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 152  | qq / social.activeDurationMaxMs                     | 活跃时长最大                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 153  | qq / social.skipProbability                         | 跳过概率                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 154  | qq / social.surrenderProbability                    | 放弃概率（已弃用）          | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 155  | qq / social.idleRetryWaitMs                         | 空闲重试等待                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 156  | qq / social.burstEnabled                            | 分条发送                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 157  | qq / social.burstIntervalMinMs                      | 分条最小间隔                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 158  | qq / social.burstIntervalMaxMs                      | 分条最大间隔                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 159  | qq / social.longGapProbability                      | 长间隔概率                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 160  | qq / social.longGapMinMs                            | 长间隔最小                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 161  | qq / social.longGapMaxMs                            | 长间隔最大                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 162  | qq / chat.contextMessages                           | 群聊上下文条数              | 已归并配置  | chat.context.recentMessages   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 163  | qq / chat.groupContextMessages                      | 按群覆盖上下文              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 164  | qq / chat.addressFilter.enabled                     | 别人之间说话时过滤          | 已归并配置  | chat.access.addressFilter     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 165  | qq / chat.addressFilter.silenceWhenAddressedToOther | 别人互相说话时沉默概率      | 已归并配置  | chat.access.addressFilter     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 166  | qq / chat.presence.enabled                          | 群聊生物钟                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 167  | qq / chat.presence.onlineShare                      | 每小时在线/看群占比         | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 168  | qq / chat.presence.offlineMinMs                     | 最短离线                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 169  | qq / chat.presence.wakeWindowMs                     | 被叫醒后在线窗口            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 170  | qq / chat.proactive.enabled                         | 群聊主动搭话                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 171  | qq / chat.proactive.minIntervalMs                   | 最小间隔                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 172  | qq / chat.proactive.minMessages                     | 最少消息数                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 173  | qq / socialV2.proactive.enabled                     | 主动搭话                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 174  | qq / socialV2.proactive.checkIntervalMinMs          | 检查最小间隔                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 175  | qq / socialV2.proactive.checkIntervalMaxMs          | 检查最大间隔                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 176  | qq / socialV2.proactive.idleThresholdMs             | 空闲阈值                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 177  | qq / socialV2.proactive.probability                 | 主动概率                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 178  | qq / socialV2.feedback.maxLength                    | 反馈最大字符                | 已归并配置  | chat.feedback.maxChars        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 179  | qq / socialV2.feedback.notifyOwnerOnError           | 出错通知管理员              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 180  | qq / socialV2.media.maxBytes                        | 图片单条最大字节            | 已归并配置  | chat.media.maxBytes           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 181  | qq / socialV2.media.maxPixels                       | 单张最大像素                | 已归并配置  | chat.media.maxPixels          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 182  | qq / socialV2.media.maxCount                        | 单条最多图片                | 已归并配置  | chat.media.maxCount           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 183  | qq / ownerQQ                                        | 主人 QQ                     | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 184  | qq / allow.private                                  | 私聊白名单                  | 已归并配置  | privateUsers                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 185  | qq / allow.groups                                   | 群白名单                    | 已归并配置  | groups                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 186  | qq / deny.users                                     | 用户黑名单                  | 已归并配置  | chat.access.deniedUsers       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 187  | qq / deny.private                                   | 私聊黑名单                  | 已归并配置  | chat.access.deniedUsers       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 188  | qq / deny.groups                                    | 群黑名单                    | 已归并配置  | chat.access.deniedGroups      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 189  | qq / allowAllWhenEmpty                              | 白名单为空时放行所有人      | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 190  | qq / snowluma.wsUrl                                 | OneBot WebSocket            | 已归并配置  | wsPort                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 191  | qq / snowluma.httpUrl                               | OneBot HTTP                 | 已归并配置  | httpPort                      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 192  | qq / snowluma.accessToken                           | OneBot accessToken          | 已归并配置  | token                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 193  | qq / snowluma.followDiscoveredEndpoint              | 跟随自发现端点              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 194  | qq / snowluma.silenceWarnMs                         | 静默告警阈值                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 195  | qq / snowluma.allowLaunch                           | 允许插件打开 SnowLuma       | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 196  | qq / snowluma.launcherPath                          | SnowLuma 安装目录           | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 197  | qq / snowluma.launchScript                          | 启动脚本（可选）            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 198  | qq / snowluma.homeDir                               | SnowLuma home               | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 199  | qq / consolePort                                    | 控制台端口                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 200  | qq / consoleToken                                   | 控制台令牌                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 201  | qq / ackMessage                                     | 收到消息的自动回复          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 202  | qq / sendDelayMs                                    | 发送间隔                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 203  | qq / questionTimeoutMs                              | 提问/审批超时               | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 204  | qq / security.interceptNotify                       | 安全拦截通知                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 205  | qq / role.maxInjectChars                            | 人格注入上限                | 已归并配置  | context.personaChars          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 206  | qq / biliBridge.enabled                             | 启用 B站 桥接               | 已归并配置  | bridge.enabled                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 207  | qq / biliBridge.share.enabled                       | 启用定时视频分享            | 已归并配置  | bridge.videos                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 208  | qq / biliBridge.share.times                         | 分享时间点                  | 已归并配置  | bridge.times                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 209  | qq / biliBridge.share.groups                        | 只发这些群                  | 已归并配置  | bridge.targets                | 明确目标改为 group:群号 或 private:QQ号；同时要求 QQ 允许名单，不能直接复制旧群号字符串。 |
| 210  | qq / biliBridge.share.gapMs                         | 卡片到短评的间隔            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 211  | qq / biliBridge.share.cardMode                      | 分享形式                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 212  | qq / biliBridge.dynamics.enabled                    | B站新动态同步到 QQ          | 已归并配置  | bridge.dynamics               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 213  | qq / biliBridge.dynamics.pollIntervalMs             | 动态轮询间隔                | 已归并配置  | bridge.pollSeconds            | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 214  | qq / biliBridge.dynamics.groups                     | 动态只发这些群              | 已归并配置  | bridge.targets                | 明确目标改为 group:群号 或 private:QQ号；同时要求 QQ 允许名单，不能直接复制旧群号字符串。 |
| 215  | qq / socialV2.tools.getPrompt                       | 读取提示词                  | 已归并配置  | chat.tools.prompt             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 216  | qq / socialV2.tools.getUnread                       | 读未读消息                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 217  | qq / socialV2.tools.getRecent                       | 读最近消息                  | 已归并配置  | chat.tools.history            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 218  | qq / socialV2.tools.socialState                     | 查看社交状态                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 219  | qq / socialV2.tools.sendGroup                       | 发群消息                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 220  | qq / socialV2.tools.sendPrivate                     | 发私聊                      | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 221  | qq / socialV2.tools.reply                           | 引用回复                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 222  | qq / socialV2.tools.sendBurst                       | 分条发送                    | 已归并配置  | chat.reply.burstEnabled       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 223  | qq / socialV2.tools.sendMessage                     | 统一发送                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 224  | qq / socialV2.tools.waitMessages                    | 等待消息                    | 已归并配置  | chat.tools.wait               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 225  | qq / socialV2.tools.feedback                        | 反馈                        | 已归并配置  | chat.tools.feedback           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 226  | qq / socialV2.tools.getMyRecent                     | 我的最近消息                | 已归并配置  | chat.tools.history            | 合并为当前对象的历史读取，收件与本轮回执可查；未复刻旧模型正文的独立历史索引。            |
| 227  | qq / socialV2.tools.getMessageDetail                | 消息详情                    | 已归并配置  | chat.tools.history            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 228  | qq / socialV2.tools.getActiveMembers                | 活跃成员                    | 已归并配置  | chat.tools.members            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 229  | qq / socialV2.tools.setWakeConfig                   | 设置唤醒                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 230  | qq / socialV2.tools.markRead                        | 标记已读                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 231  | qq / socialV2.tools.closeConversation               | 结束对话                    | 已归并配置  | chat.tools.close              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 232  | qq / socialV2.tools.memory                          | 记忆                        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 233  | qq / socialV2.tools.slangQuery                      | 黑话查询                    | 已归并配置  | slang.enabled                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 234  | qq / socialV2.tools.slangSubmit                     | 黑话提交                    | 已归并配置  | slang.enabled                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 235  | qq / socialV2.tools.getImages                       | 查看图片                    | 已归并配置  | chat.tools.images             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 236  | qq / socialV2.tools.getForwardMsg                   | 合并转发                    | 已归并配置  | chat.tools.forward            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 237  | qq / socialV2.tools.sendPoke                        | 拍一拍                      | 已归并配置  | chat.tools.poke               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 238  | qq / socialV2.tools.listStickers                    | 表情列表                    | 已归并配置  | chat.tools.stickers           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 239  | qq / socialV2.tools.getStickerImage                 | 表情图片                    | 已归并配置  | chat.tools.stickers           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 240  | qq / socialV2.tools.sendSticker                     | 发表情                      | 已归并配置  | chat.tools.stickers           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 241  | qq / socialV2.tools.setStickerRemark                | 表情备注                    | 已归并配置  | chat.tools.collectSticker     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 242  | qq / socialV2.tools.stickerNote                     | 表情笔记                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 243  | qq / socialV2.tools.collectSticker                  | 收藏表情                    | 已归并配置  | chat.tools.collectSticker     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 244  | qq / socialV2.tools.getSelfImage                    | 自己的形象                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 245  | qq / socialV2.tools.sendVoice                       | 发语音                      | 已归并配置  | chat.tools.voice              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 246  | qq / pricing.models.<模型>.label                    | my-relay-model · 显示名     | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 247  | qq / pricing.models.<模型>.off.cacheHit             | my-relay-model · 缓存命中价 | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 248  | qq / pricing.models.<模型>.off.cacheMiss            | my-relay-model · 未命中价   | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 249  | qq / pricing.models.<模型>.off.output               | my-relay-model · 输出价     | 交由DSH管理 | —                             | 由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。                           |
| 250  | starr / botSelfConfig                               | 允许她自主修改              | 已归并配置  | permissions.botConfig         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 251  | starr / guard.enabled                               | 端口守护                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 252  | starr / guard.ports                                 | 守护端口                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 253  | starr / voice.enabled                               | 启用本地语音                | 已归并配置  | tts.connection                | 开关整合为连接方式，选择停用即可关闭；其他方式需重新确认模型配置。                        |
| 254  | starr / voice.port                                  | 语音服务端口                | 已归并配置  | tts.local.port                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 255  | starr / voice.adapterPort                           | 语音适配端口                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 256  | starr / voice.character                             | 语音角色                    | 已归并配置  | tts.voice                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 257  | starr / voice.idleSec                               | 闲置卸载（秒）              | 已归并配置  | tts.local.idleSeconds         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 258  | starr / voice.gpuIndex                              | GPU 序号                    | 已归并配置  | tts.local.gpuIndex            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 259  | starr / jobs.diaryDay.at                            | 白天日记时间                | 已归并配置  | jobs.diaryDay.at              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 260  | starr / jobs.diaryDay.catchUpHours                  | 白天补跑窗口（小时）        | 已归并配置  | jobs.diaryDay.catchUpHours    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 261  | starr / jobs.diaryNight.at                          | 晚上日记时间                | 已归并配置  | jobs.diaryNight.at            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 262  | starr / jobs.diaryNight.catchUpHours                | 晚上补跑窗口（小时）        | 已归并配置  | jobs.diaryNight.catchUpHours  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 263  | starr / jobs.organize.at                            | 收件箱整理时间              | 已归并配置  | jobs.organize.at              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 264  | starr / jobs.organize.catchUpHours                  | 整理补跑窗口（小时）        | 已归并配置  | jobs.organize.catchUpHours    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 265  | starr / ui.hideWorkspaces                           | 隐藏工作区                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 266  | starr / sing.enabled                                | 启用唱歌                    | 已归并配置  | sing.mode                     | 开关整合为连接方式，选择停用即可关闭；其他方式需重新确认模型配置。                        |
| 267  | starr / sing.port                                   | 唱歌服务端口                | 已归并配置  | sing.local.port               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 268  | starr / sing.idleSec                                | 闲置卸载（秒）              | 已归并配置  | sing.local.idleSeconds        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 269  | starr / sing.timeoutMs                              | 超时                        | 已归并配置  | sing.timeoutSeconds           | 计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。                          |
| 270  | starr / sing.promptWav                              | 参考音频路径                | 已归并配置  | sing.referenceId              | 参考音频先导入本角色曲库，再选择编号；不直接沿用旧本地路径。                              |
| 271  | starr / sing.autoAdd                                | 自动入库                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 272  | starr / sing.excerptSec                             | 片段长度（秒）              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 273  | starr / sing.cache                                  | 缓存翻唱                    | 已归并配置  | sing.cache                    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 274  | starr / sing.brightness                             | 亮度                        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 275  | starr / qq.engine                                   | QQ 引擎                     | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 276  | starr / qq.mode                                     | QQ 模式                     | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 277  | starr / qq.wsUrl                                    | 桥接 WebSocket              | 已归并配置  | wsPort                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 278  | starr / qq.accessToken                              | 桥接 accessToken            | 已归并配置  | token                         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 279  | starr / qq.ingest                                   | 接收消息                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 280  | starr / qq.rules.allow.groups                       | 允许的群                    | 已归并配置  | groups                        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 281  | starr / qq.rules.allow.privates                     | 允许的私聊                  | 已归并配置  | privateUsers                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 282  | starr / qq.rules.allowAllWhenEmpty                  | 白名单为空时放行            | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 283  | starr / qq.rules.group.requireAt                    | 群里必须 @                  | 已归并配置  | requireMention                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 284  | starr / voice.bin                                   | TTS 程序路径                | 已归并配置  | tts.local.bin                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 285  | starr / voice.model                                 | TTS 模型路径                | 已归并配置  | tts.local.modelPath           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 286  | starr / voice.voicesDir                             | 音色目录                    | 已归并配置  | tts.local.voicesDir           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 287  | starr / voice.instructions                          | 默认语气指令                | 已归并配置  | tts.instructions              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 288  | starr / voice.startTimeoutSec                       | 启动超时（秒）              | 已归并配置  | tts.local.startTimeoutSeconds | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 289  | starr / voice.requestTimeoutSec                     | 请求超时（秒）              | 已归并配置  | tts.timeoutSeconds            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 290  | starr / sing.python                                 | SoulX 的 Python             | 已归并配置  | sing.local.python             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 291  | starr / sing.serverScript                           | SoulX 服务脚本              | 已归并配置  | sing.local.serverScript       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 292  | starr / sing.model                                  | SVC 模型路径                | 已归并配置  | sing.local.modelPath          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 293  | starr / sing.repo                                   | SoulX 源码目录              | 已归并配置  | sing.local.repo               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 294  | starr / sing.tmpDir                                 | SoulX 临时目录              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 295  | starr / sing.preModels                              | 预处理模型目录              | 已归并配置  | sing.local.preModels          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 296  | starr / sing.device                                 | 推理设备                    | 已归并配置  | sing.local.device             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 297  | starr / sing.fp16                                   | 半精度推理                  | 已归并配置  | sing.local.fp16               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 298  | starr / sing.ffmpegPath                             | ffmpeg 路径                 | 已归并配置  | media.ffmpegPath              | v0.1.7统一音视频处理程序路径，实际用于音源和成品裁剪；不自动执行旧配置中的程序。          |
| 299  | starr / media.cloud.baseUrl                         | 共用云端地址                | 已归并配置  | media.baseUrl                 | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 300  | starr / media.tts.connection                        | 连接来源                    | 已归并配置  | tts.connection                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 301  | starr / media.asr.connection                        | 连接来源                    | 已归并配置  | asr.connection                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 302  | starr / media.tts.mode                              | 用哪种方式说话              | 已归并配置  | tts.connection                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 303  | starr / media.tts.voice                             | 云端音色                    | 已归并配置  | tts.voice                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 304  | starr / media.tts.model                             | 云端模型                    | 已归并配置  | tts.model                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 305  | starr / media.tts.baseUrl                           | 接口地址                    | 已归并配置  | tts.baseUrl                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 306  | starr / media.tts.secretRef                         | 凭据引用                    | 已归并配置  | tts.secretEnv                 | 凭据改为环境变量引用，先在 DSH 启动环境设置；不会导入旧明文。                             |
| 307  | starr / media.asr.mode                              | 用哪种方式听写              | 已归并配置  | asr.connection                | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 308  | starr / media.asr.baseUrl                           | 接口地址                    | 已归并配置  | asr.baseUrl                   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 309  | starr / media.asr.model                             | 转写模型                    | 已归并配置  | asr.model                     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 310  | starr / media.asr.language                          | 语言提示                    | 已归并配置  | asr.language                  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 311  | starr / media.asr.secretRef                         | 凭据引用                    | 已归并配置  | asr.secretEnv                 | 凭据改为环境变量引用，先在 DSH 启动环境设置；不会导入旧明文。                             |
| 312  | starr / media.svc.mode                              | 用哪种方式转换歌声          | 已归并配置  | sing.mode                     | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 313  | starr / media.svc.remoteBaseUrl                     | 远程节点地址                | 已归并配置  | sing.baseUrl                  | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 314  | starr / media.svc.pollMs                            | 任务轮询间隔                | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 315  | starr / media.svc.jobTimeoutMs                      | 远程任务超时                | 已归并配置  | sing.timeoutSeconds           | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 316  | starr / media.svc.secretRef                         | 凭据引用                    | 已归并配置  | sing.secretEnv                | 远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。        |
| 317  | bili / self.mid                                     | 她自己 mid                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 318  | bili / self.name                                    | 她自己昵称                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 319  | bili / night.skipChance                             | 今晚不看的概率              | 已归并配置  | bili.watch.skipChance         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 320  | bili / night.maxVideos                              | 单次初筛视频数              | 已归并配置  | bili.watch.candidates         | 控制本轮候选数量；每轮细读最多三个，不代表读取完整视频画面。                              |
| 321  | bili / night.maxWakesPerDay                         | 每天最多醒来                | 已归并配置  | bili.watch.dailyMax           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 322  | bili / night.minGapMin                              | 两次苏醒最小间隔（分钟）    | 已归并配置  | bili.watch.gapMinutes         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 323  | bili / night.windows                                | 作息窗口                    | 已归并配置  | bili.watch.windows            | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 324  | bili / preferences.like                             | 爱看                        | 已归并配置  | bili.preferences.like         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 325  | bili / preferences.dislike                          | 不爱看                      | 已归并配置  | bili.preferences.dislike      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 326  | bili / preferences.keywords                         | 额外关键词                  | 已归并配置  | bili.preferences.keywords     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 327  | bili / preferences.weights                          | 口味权重                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 328  | bili / share.enabled                                | 开启分享                    | 已归并配置  | bili.share.enabled            | 本字段控制 B站私信分享；跨平台 QQ 分享已独立归入星桥传书，两个通道分别授权与计额。        |
| 329  | bili / share.via                                    | 分享方式                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 330  | bili / quota.shareDaily                             | 每天上限                    | 已归并配置  | bili.share.dailyMax           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 331  | bili / share.minScore                               | 最低评分                    | 已归并配置  | bili.share.minScore           | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 332  | bili / share.silentAfterDays                        | 沉默几天后降额              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 333  | bili / share.decayPerDay                            | 每天降多少                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 334  | bili / limits.daily                                 | 普通评论 / 天               | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 335  | bili / limits.replyDaily                            | 回找我的人 / 天             | 已归并配置  | bili.dailyReplies             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 336  | bili / limits.taDaily                               | 主动搭话 / 天               | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 337  | bili / limits.mineDaily                             | 动态回复 / 类 / 天          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 338  | bili / limits.minePerPerson                         | 动态回复 / 人 / 类 / 天     | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 339  | bili / limits.perUpMin                              | 同一 UP 冷却（分钟）        | 已归并配置  | bili.personGapMinutes         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 340  | bili / limits.perVideoMin                           | 同一视频冷却（分钟）        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 341  | bili / limits.perThreadMin                          | 同一条评论冷却（分钟）      | 已归并配置  | bili.threadGapMinutes         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 342  | bili / limits.globalMin                             | 任意两条发言间隔（分钟）    | 已归并配置  | bili.globalGapSeconds         | 全局间隔改为秒；旧分钟值需要乘以 60，且本版私信、评论与弹幕合并计数。                     |
| 343  | bili / dynamics.enabled                             | 四类动态总开关              | 已归并配置  | bili.dynamics.enabled         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 344  | bili / dynamics.gapMin                              | 任意两条动态间隔（分钟）    | 已归并配置  | bili.dynamics.gapMinutes      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 345  | bili / dynamics.kinds.best.enabled                  | 早晨·最佳 · 启用            | 已归并配置  | bili.dynamics.best.enabled    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 346  | bili / dynamics.kinds.best.slot                     | 早晨·最佳 · 时段            | 已归并配置  | bili.dynamics.best.at         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 347  | bili / dynamics.kinds.best.minLen                   | 早晨·最佳 · 最少字数        | 已归并配置  | bili.dynamics.best.minChars   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 348  | bili / dynamics.kinds.best.maxLen                   | 早晨·最佳 · 最多字数        | 已归并配置  | bili.dynamics.best.maxChars   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 349  | bili / dynamics.kinds.best.prefix                   | 早晨·最佳 · 前缀            | 已归并配置  | bili.dynamics.best.prefix     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 350  | bili / dynamics.kinds.game.enabled                  | 中午·游戏 · 启用            | 已归并配置  | bili.dynamics.game.enabled    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 351  | bili / dynamics.kinds.game.slot                     | 中午·游戏 · 时段            | 已归并配置  | bili.dynamics.game.at         | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 352  | bili / dynamics.kinds.game.minLen                   | 中午·游戏 · 最少字数        | 已归并配置  | bili.dynamics.game.minChars   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 353  | bili / dynamics.kinds.game.maxLen                   | 中午·游戏 · 最多字数        | 已归并配置  | bili.dynamics.game.maxChars   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 354  | bili / dynamics.kinds.game.prefix                   | 中午·游戏 · 前缀            | 已归并配置  | bili.dynamics.game.prefix     | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 355  | bili / dynamics.kinds.anime.enabled                 | 下午·二次元 · 启用          | 已归并配置  | bili.dynamics.anime.enabled   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 356  | bili / dynamics.kinds.anime.slot                    | 下午·二次元 · 时段          | 已归并配置  | bili.dynamics.anime.at        | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 357  | bili / dynamics.kinds.anime.minLen                  | 下午·二次元 · 最少字数      | 已归并配置  | bili.dynamics.anime.minChars  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 358  | bili / dynamics.kinds.anime.maxLen                  | 下午·二次元 · 最多字数      | 已归并配置  | bili.dynamics.anime.maxChars  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 359  | bili / dynamics.kinds.anime.prefix                  | 下午·二次元 · 前缀          | 已归并配置  | bili.dynamics.anime.prefix    | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 360  | bili / dynamics.kinds.gaming.enabled                | 晚上·打电动 · 启用          | 已归并配置  | bili.dynamics.gaming.enabled  | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 361  | bili / dynamics.kinds.gaming.slot                   | 晚上·打电动 · 时段          | 已归并配置  | bili.dynamics.gaming.at       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 362  | bili / dynamics.kinds.gaming.minLen                 | 晚上·打电动 · 最少字数      | 已归并配置  | bili.dynamics.gaming.minChars | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 363  | bili / dynamics.kinds.gaming.maxLen                 | 晚上·打电动 · 最多字数      | 已归并配置  | bili.dynamics.gaming.maxChars | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 364  | bili / dynamics.kinds.gaming.prefix                 | 晚上·打电动 · 前缀          | 已归并配置  | bili.dynamics.gaming.prefix   | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 365  | bili / fishGuard.namePrefixes                       | 鱼名开头词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 366  | bili / fishGuard.nameContains                       | 鱼名包含词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 367  | bili / fishGuard.nameSuffixes                       | 鱼名结尾词                  | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 368  | bili / fishGuard.extraFishMids                      | 额外认定的鱼 mid            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 369  | bili / fishGuard.exemptNames                        | 豁免昵称                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 370  | bili / fishGuard.exemptMids                         | 豁免 mid                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 371  | bili / fishGuard.enabled                            | 启用 B站鱼群保护            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 372  | bili / fishGuard.sampleSize                         | 取样顶层评论数              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 373  | bili / fishGuard.maxFishTopLevel                    | 多少条鱼的楼层算泛滥        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 374  | bili / fishGuard.maxFishMids                        | 多少个鱼账号算泛滥          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 375  | bili / fishGuard.maxFishRatio                       | 鱼楼层占比阈值              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 376  | bili / fishGuard.minSample                          | 占比判定最少样本            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 377  | bili / fishGuard.includeHotSample                   | 同时取热度序样本            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 378  | bili / fishGuard.gatherEnabled                      | 聚拢：改成回鱼              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 379  | bili / fishGuard.forceGather                        | 每次醒来强制聚拢            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 380  | bili / fishGuard.gatherMaxReplies                   | 只回回复少的鱼楼            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 381  | bili / fishGuard.gatherMaxFishReplies               | 鱼楼里鱼回复太多就跳过      | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 382  | bili / fishGuard.gatherMaxAgeHours                  | 只回多新的鱼楼（小时）      | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 383  | bili / fishGuard.gatherCooldownHours                | 同一鱼楼冷却（小时）        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 384  | bili / fishGuard.likeEnabled                        | 点赞机制                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 385  | bili / fishGuard.maxLikesPerDay                     | 每天最多点赞                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 386  | bili / fishGuard.maxLikesPerRun                     | 每次最多点赞                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 387  | bili / fishGuard.likeFishReplies                    | 也赞楼里的鱼回复            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 388  | bili / fishGuard.likeAfterCommentMs                 | 发完评论等多久再点赞        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 389  | bili / fishGuard.likeGapMinMs                       | 两次点赞最小间隔            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 390  | bili / fishGuard.likeGapMaxMs                       | 两次点赞最大间隔            | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 391  | bili / fishGuard.failedLikeCooldownHours            | 点赞失败后冷却（小时）      | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 392  | bili / fishGuard.failCooldownMinutes                | 风控失败冷却（分钟）        | 已归并配置  | bili.riskCooldownMinutes      | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 393  | bili / agent.sandbox                                | B站会话权限                 | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 394  | bili / listen.comment                               | 评论区监听                  | 已归并配置  | bili.comment.enabled          | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 395  | bili / listen.commentIntervalSec                    | 检查间隔（秒）              | 已归并配置  | bili.pollSeconds              | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 396  | bili / listen.scope                                 | 评论监听范围                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 397  | bili / listen.oncePerPerson                         | 同一个人最多回一条          | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 398  | bili / listen.allDay                                | 全天监听                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 399  | bili / listen.dm                                    | 私信监听                    | 已归并配置  | bili.dm.enabled               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 400  | bili / listen.dmScope                               | 私信监听范围                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 401  | bili / listen.live                                  | 直播间监听                  | 已归并配置  | bili.live.enabled             | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 402  | bili / listen.liveRoom                              | 直播间房间号                | 已归并配置  | bili.live.rooms               | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 403  | bili / listen.liveScope                             | 直播间回复范围              | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 404  | bili / diary.push                                   | 推送日记摘要                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 405  | bili / diary.enabled                                | 写日记（锁定开）            | 已归并配置  | jobs.diaryNight.enabled       | 已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。          |
| 406  | bili / notify.type                                  | 推送方式                    | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 407  | bili / notify.url                                   | Webhook 地址                | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 408  | bili / notify.template                              | 模板                        | 待实现      | —                             | 对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。                          |
| 409  | bili / notify.cmd                                   | 自定义命令                  | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 410  | bili / notify.args                                  | 命令参数                    | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
| 411  | bili / toolsPath                                    | bili.mjs 路径               | 已退役机制  | —                             | 旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。                                  |
