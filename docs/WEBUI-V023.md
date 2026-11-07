# v0.2.3 页面格式与完整配置统计

统计口径：24 个活动功能页面、284 项统一定义的角色配置。另有首次安装向导；旧会话列表和会话详情不作为功能入口。角色名字、人设、QQ 安装级连接参数、媒体密钥和临时测试表单独立于角色配置计数。

## 信息架构

独立首页 1 页；基础会话 4 页；感官、心理与生理 5 页；主动能力 6 页；记忆 4 页；通用设置 4 页。四类能力的排列不表示执行顺序。首页和配置页分工明确，导航保留诗意名称并附正常功能说明，功能页标题、字段、状态、记忆类别使用正常名称；首页景观首屏保留诗意文案。

| 分区             | 页面               | 导航名     | 角色配置数 | 路由               |
| ---------------- | ------------------ | ---------- | ---------: | ------------------ |
| 基础会话         | QQ 连接与授权      | 鹊桥结契   |         14 | `#qq`              |
| 独立首页         | 首页概览           | 观星台     |          0 | `#overview`        |
| 基础会话         | 人设与提示词       | 卿本星辰   |          0 | `#character`       |
| 记忆             | 记忆与关系         | 星海拾忆   |          0 | `#memory`          |
| 记忆             | 记忆保存与整理     | 拾光成册   |         32 | `#memory-care`     |
| 记忆             | 笔记与同步         | 星河同源   |          0 | `#memory-sync`     |
| 感官、心理与生理 | 情绪与体感         | 心潮晴雨   |          0 | `#state`           |
| 主动能力         | 目的与主动行为     | 逐光而行   |         20 | `#intentions`      |
| 基础会话         | 回复规则与节奏     | 言有缓急   |         91 | `#chat-rules`      |
| 记忆             | 共享记忆与隐私     | 同一片星空 |          4 | `#chat-sharing`    |
| 主动能力         | B站连接与登录      | 山海来信   |         18 | `#bili`            |
| 主动能力         | B站浏览与分享      | 漫游拾趣   |         16 | `#bili-activities` |
| 主动能力         | B站动态与操作      | 寄语人间   |          6 | `#bili-publish`    |
| 主动能力         | 跨平台分享与同步   | 星桥传笺   |          8 | `#bridge`          |
| 感官、心理与生理 | 语音合成           | 清音寄意   |         21 | `#media`           |
| 感官、心理与生理 | 语音识别           | 听风知意   |          9 | `#hearing`         |
| 感官、心理与生理 | 视觉理解           | 万象入眸   |         11 | `#vision`          |
| 感官、心理与生理 | 唱歌与曲库         | 弦歌入梦   |         24 | `#singing`         |
| 基础会话         | 表情包管理         | 眉目传情   |          0 | `#expressions`     |
| 通用设置         | 备份与诊断         | 藏星问脉   |          0 | `#maintenance`     |
| 通用设置         | 角色权限           | 信契有度   |          2 | `#permissions`     |
| 通用设置         | 外观与性能         | 星庭设色   |          4 | `#appearance`      |
| 主动能力         | 网页浏览与画面理解 | 览尽山河   |          4 | `#browser`         |
| 通用设置         | 全部设置           | 万象星枢   |          0 | `#settings`        |

共用媒体连接的 4 项字段归属语音合成页，在视觉与听写页也直接显示；显示复用不会增加唯一字段总数。QQ 语音与翻唱的快捷授权同样复用原字段。

## 每页结构与操作

| 页面               | 版式                                             | 最近预览或状态来源                            | 主要操作                                         |
| ------------------ | ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------ |
| QQ 连接与授权      | 连接设置＋工具授权＋接收记录；离线仍展示角色授权 | 连接、连续接听、收件与发送回执                | 选择角色、保存端口模型与范围、检测连接、授权工具 |
| 首页概览           | 独立景观首屏＋四段交错预览                       | 12 项状态、当前情绪、最近活动 4 项、记忆 3 条 | 打开对应功能、配置或记忆全文                     |
| 人设与提示词       | 主编辑区＋简明资料侧栏；窄屏上下排列             | 角色资料、行为偏好                            | 保存名字与完整人设                               |
| 记忆与关系         | 筛选＋图谱或时间线＋右侧完整正文；窄屏上下排列   | 真实记忆、关系边、全文与来源                  | 搜索、选择全文、添加或维护真实关系               |
| 记忆保存与整理     | 运行状态＋保存配置＋定时任务＋整理归档           | 执行结果、模型配置缺项、归档记录              | 保存策略、定时日记与整理、手动执行、归档或恢复   |
| 笔记与同步         | 同步状态＋修改核对＋冲突操作                     | 笔记修改差异、同步队列和冲突                  | 检查、预览导入或处理冲突                         |
| 情绪与体感         | 心理生理视图＋历史标签                           | 真实情绪波谱、身体数值、状态历史              | 记录经历、检查状态来源、必要时手动调节           |
| 目的与主动行为     | 运行状态＋自主配置＋最近活动＋角色目的           | 待机或执行状态、失败原因、角色实际目的        | 保存主动范围与节律、查看记录、暂停或恢复         |
| 回复规则与节奏     | 状态＋本页目录＋五组配置面板                     | 原生文件能力状态                              | 保存回复、唤醒、上下文、工具媒体、预算           |
| 共享记忆与隐私     | 共享记忆与隐私的直接配置                         | 主人绑定与默认可见范围                        | 设置跨会话共享范围与共享写入                     |
| B站连接与登录      | 运行状态＋模型对象配置＋登录与收件结果           | 最近平台轮询、账号状态、各收件通道            | 扫码登录、保存互动对象与回复规则、检测连接       |
| B站浏览与分享      | 浏览、兴趣、分享三组直接配置＋活动记录           | 最近浏览和分享结果                            | 设置作息、兴趣与分享对象                         |
| B站动态与操作      | 动态创作＋公开操作＋资料查询                     | 实际受理或执行结果、待核对状态                | 配置动态、准备内容、按权限执行平台操作           |
| 跨平台分享与同步   | 分享设置＋最近分享记录                           | 跨平台分享回执、失败原因                      | 设置内容类型、对象与分享时间                     |
| 语音合成           | 运行状态＋接入表单＋语音配置＋共用连接           | 连接、音色、单次试听结果                      | 选音色、配置语音合成并试听                       |
| 语音识别           | 运行状态＋接入表单＋听写配置＋共用连接           | 本地环境准备与实际转写结果                    | 配置本地或远程听写、启用QQ语音转写               |
| 视觉理解           | 运行状态＋接入表单＋视觉配置＋共用连接           | 宿主或兼容视觉配置、单次看图结果              | 选择模型、配置截图或相机、试用图片理解           |
| 唱歌与曲库         | 运行状态＋找歌区＋引擎配置＋可展开曲库           | 搜索结果、曲库、实际成品与错误                | 搜索音源、入库、配置音色模型、生成或管理成品     |
| 表情包管理         | 筛选工具栏＋图片网格＋详情弹窗                   | 表情缩略图、收藏与原文件缺失状态              | 搜索、导入、收藏、编辑标签、删除                 |
| 备份与诊断         | 状态＋反馈＋诊断＋备份＋迁移说明                 | 宿主连接、错误、备份实际结果                  | 刷新诊断、建立备份、查看迁移信息                 |
| 角色权限           | 直接权限配置＋可自行调整项说明                   | 当前管理员允许的配置范围                      | 保存角色可调整的日常习惯与记忆归档权限           |
| 外观与性能         | 直接外观配置                                     | 已保存动效、模糊、星点和性能档位              | 保存外观与性能设置                               |
| 网页浏览与画面理解 | 运行状态＋直接配置                               | 连续浏览、画面理解的授权与准备状态            | 启用阅读、连续交互与截图理解                     |
| 全部设置           | 快捷入口＋搜索＋四类能力索引＋通用设置           | 匹配配置与功能位置                            | 搜索后直达字段、打开功能                         |

## 版式规范

- 桌面顶部提供首页与四类能力；区内左侧栏只显示本区功能。窄屏使用两行顶栏和可关闭的导航抽屉。
- 首页首屏保留完整庭院，标题后不铺深色矩形；下面四段各有对应预览与直达入口，不用多屏诗句填充。
- 普通功能页进入后直接看到标题、用途、相关运行状态和配置；长页列出本页内容目录。页底继续滑动保持在当前功能。
- 功能内容最大宽度 1280 像素；桌面外侧留白按 20–48 像素自适应。窄屏使用 12–16 像素边距和单列配置。
- 普通正文 13–14 像素、行高约 1.8；面板标题 18 像素；页标题 22–30 像素。输入框最小高度 42 像素，普通按钮约 34–42 像素。
- 顶部导航栏保留夜蓝色玻璃底；其余面板、标签、按钮和输入框采用透明无色背景与局部模糊。状态圆点、开关和进度条保留用于表达功能的颜色。
- 不再用整体场景颜色遮罩支持文字。文字使用局部阴影和适度模糊；菜单与弹窗独立采样背景。
- 模糊限制在面板与控件覆盖范围，不模糊整张场景；减少动态时停止持续运动，滚动动画按页面卸载清理。
- “查找功能与配置”位于左下：首页使用固定入口，其余页面使用侧栏底部入口；窄屏在导航抽屉内保留入口。
- 所有按钮共用悬浮星光与透明流光折射，鼠标离开、滚动、切页或窗口失焦会清理效果；键盘焦点也有可见反馈。减少动态时显示静态散星，触屏不触发悬浮动画。
- 桌面记忆正文位于右侧，保存完整文字与换行，长文在详情区域独立滚动；窄屏选择记忆后滚到正文。首页摘要不替代原文。
- 未保存配置在页面内点击离开时提示；配置搜索结果直接滚到并聚焦字段，相关折叠项自动展开。

## 状态表达

| 对象                               | 可显示状态                                     | 判断依据                                         |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| DSH                                | 已连接、未连接                                 | 宿主实际来源与服务回报                           |
| QQ                                 | 在线、连续接听、未连接、异常、未启用、未绑定   | 当前角色绑定与 SnowLuma 运行状态                 |
| B站                                | 在线、部分通道异常、连接异常、尚未验证、未启用 | 实际平台轮询状态；不将登录等同所有操作成功       |
| 浏览、听写、视觉、语音、翻唱、文件 | 未启用、需要配置、已配置待验证                 | 当前角色授权、模型配置与宿主挂载；不伪报模型在线 |
| 自主行为                           | 未启用、仅观察、已暂停、等待时机、正在行动     | 角色设置、真实执行器与活动记录                   |
| 记忆任务                           | 未启用、需要配置、等待计划、正在整理           | 任务配置与实际运行任务                           |
| 本地记忆                           | 可读取、读取失败                               | 当前角色数据库实际查询                           |

首页在可见时每 20 秒读取一次，隐藏时不继续发起检查；接口失败清除状态卡并提供重试。读取状态不启动外部模型，不登录平台，也不发送测试消息。

## 空态与失败态

无记忆、无活动、无表情、无目的均给出普通名称和后续入口；没有数据时不生成假记录。独立预览未连接 QQ 或 B站操作服务时，明确说明需要宿主，角色配置仍保留。记忆读取失败、模型配置缺项、平台结果待核对分别显示，不统一包装为成功。

## 逐页验收统计

下表来自真实浏览器对 24 页的遍历；统计只包含页面实际渲染出的内容，按需展开的曲库和高级设置不强制全部展开。

| 页面               | 首次渲染面板数 | 配置字段出现次数 | 横向溢出 | 页面异常边界 |
| ------------------ | -------------: | ---------------: | -------- | ------------ |
| 首页概览           |              0 |                0 | 无       | 正常         |
| 人设与提示词       |              3 |                0 | 无       | 正常         |
| 回复规则与节奏     |              5 |               91 | 无       | 正常         |
| QQ 连接与授权      |              2 |               14 | 无       | 正常         |
| 表情包管理         |              1 |                0 | 无       | 正常         |
| 情绪与体感         |              4 |                0 | 无       | 正常         |
| 视觉理解           |              3 |               15 | 无       | 正常         |
| 语音识别           |              3 |               15 | 无       | 正常         |
| 语音合成           |              3 |               21 | 无       | 正常         |
| 唱歌与曲库         |              1 |               26 | 无       | 正常         |
| 目的与主动行为     |              3 |               20 | 无       | 正常         |
| 网页浏览与画面理解 |              1 |                4 | 无       | 正常         |
| B站连接与登录      |              4 |               18 | 无       | 正常         |
| B站浏览与分享      |              2 |               16 | 无       | 正常         |
| B站动态与操作      |              4 |                6 | 无       | 正常         |
| 跨平台分享与同步   |              2 |                8 | 无       | 正常         |
| 记忆与关系         |              2 |                0 | 无       | 正常         |
| 记忆保存与整理     |              4 |               32 | 无       | 正常         |
| 共享记忆与隐私     |              1 |                4 | 无       | 正常         |
| 笔记与同步         |              1 |                0 | 无       | 正常         |
| 全部设置           |              2 |                0 | 无       | 正常         |
| 角色权限           |              1 |                2 | 无       | 正常         |
| 外观与性能         |              1 |                4 | 无       | 正常         |
| 备份与诊断         |              4 |                0 | 无       | 正常         |

桌面遍历实际出现 284 个唯一配置字段，没有缺失字段。另完成 390 像素窄屏的 24 页遍历、配置搜索定位、首页到记忆全文跳转、滚动页底保持当前功能、真实空态和角色隔离检查。

## 完整字段清单

字段按唯一所属页面统计。字段名可用于搜索定位，具体说明和取值限制由统一配置定义提供。

### QQ 连接与授权（14 项）

| 名称                     | 字段                            | 配置分组      |
| ------------------------ | ------------------------------- | ------------- |
| 允许角色设置自身QQ状态   | `chat.tools.status`             | `chat-social` |
| 允许角色发布QQ空间文字   | `chat.tools.qzone`              | `chat-social` |
| QQ空间说说可见范围       | `chat.qzone.visibility`         | `chat-social` |
| 允许给当前私聊好友写备注 | `chat.tools.friendRemark`       | `chat-social` |
| 允许写QQ群分类标签       | `chat.tools.groupTag`           | `chat-social` |
| 允许写标签的QQ群分类编号 | `chat.qq.groupClass`            | `chat-social` |
| QQ社交操作近24小时额度   | `chat.social.dailyMax`          | `chat-social` |
| 读取当前群成员           | `chat.tools.members`            | `chat-social` |
| 回应本轮用户的拍一拍     | `chat.tools.poke`               | `chat-social` |
| 读取角色提示词           | `chat.tools.prompt`             | `chat-social` |
| 记录会话问题反馈         | `chat.tools.feedback`           | `chat-social` |
| 反馈字数上限             | `chat.feedback.maxChars`        | `chat-social` |
| 每轮最多外发条数         | `chat.reply.maxOutboundPerTurn` | `chat-social` |
| 图片最大像素数           | `chat.media.maxPixels`          | `chat-social` |

### 记忆保存与整理（32 项）

| 名称                            | 字段                           | 配置分组                |
| ------------------------------- | ------------------------------ | ----------------------- |
| 普通记忆半衰期                  | `memory.halfLifeDays`          | `memory`                |
| 每次召回条数                    | `memory.recallLimit`           | `memory`                |
| 输出 Obsidian 笔记              | `memory.projectionEnabled`     | `memory`                |
| 最低召回分数                    | `memory.minRecallScore`        | `memory`                |
| 长期锚点权重                    | `memory.anchorBoost`           | `memory`                |
| 整理模型连接                    | `jobs.provider`                | `memory-jobs`           |
| 整理模型                        | `jobs.model`                   | `memory-jobs`           |
| 白天日记 · 启用                 | `jobs.diaryDay.enabled`        | `memory-job-diaryDay`   |
| 白天日记 · 本地时间             | `jobs.diaryDay.at`             | `memory-job-diaryDay`   |
| 白天日记 · 补跑窗口（小时）     | `jobs.diaryDay.catchUpHours`   | `memory-job-diaryDay`   |
| 晚间日记 · 启用                 | `jobs.diaryNight.enabled`      | `memory-job-diaryNight` |
| 晚间日记 · 本地时间             | `jobs.diaryNight.at`           | `memory-job-diaryNight` |
| 晚间日记 · 补跑窗口（小时）     | `jobs.diaryNight.catchUpHours` | `memory-job-diaryNight` |
| 记忆整理 · 启用                 | `jobs.organize.enabled`        | `memory-job-organize`   |
| 记忆整理 · 本地时间             | `jobs.organize.at`             | `memory-job-organize`   |
| 记忆整理 · 补跑窗口（小时）     | `jobs.organize.catchUpHours`   | `memory-job-organize`   |
| 每周回顾 · 启用                 | `jobs.weekly.enabled`          | `memory-job-weekly`     |
| 每周回顾 · 本地时间             | `jobs.weekly.at`               | `memory-job-weekly`     |
| 每周回顾 · 补跑窗口（小时）     | `jobs.weekly.catchUpHours`     | `memory-job-weekly`     |
| 每月回顾 · 启用                 | `jobs.monthly.enabled`         | `memory-job-monthly`    |
| 每月回顾 · 本地时间             | `jobs.monthly.at`              | `memory-job-monthly`    |
| 每月回顾 · 补跑窗口（小时）     | `jobs.monthly.catchUpHours`    | `memory-job-monthly`    |
| 每年回顾 · 启用                 | `jobs.yearly.enabled`          | `memory-job-yearly`     |
| 每年回顾 · 本地时间             | `jobs.yearly.at`               | `memory-job-yearly`     |
| 每年回顾 · 补跑窗口（小时）     | `jobs.yearly.catchUpHours`     | `memory-job-yearly`     |
| 角色备份 · 启用                 | `jobs.backup.enabled`          | `memory-job-backup`     |
| 角色备份 · 本地时间             | `jobs.backup.at`               | `memory-job-backup`     |
| 角色备份 · 补跑窗口（小时）     | `jobs.backup.catchUpHours`     | `memory-job-backup`     |
| 笔记同步补漏 · 启用             | `jobs.projection.enabled`      | `memory-job-projection` |
| 笔记同步补漏 · 本地时间         | `jobs.projection.at`           | `memory-job-projection` |
| 笔记同步补漏 · 补跑窗口（小时） | `jobs.projection.catchUpHours` | `memory-job-projection` |
| 笔记双链的关系强度门槛          | `memory.linkThreshold`         | `memory`                |

### 目的与主动行为（20 项）

| 名称                           | 字段                        | 配置分组 |
| ------------------------------ | --------------------------- | -------- |
| 观察允许群的日常消息           | `agency.observeGroups`      | `agency` |
| 允许自主参与群聊               | `agency.groupEnabled`       | `agency` |
| 同一群主动发言间隔（分钟）     | `agency.groupGapMinutes`    | `agency` |
| 参与最近多少分钟的群话题       | `agency.groupRecentMinutes` | `agency` |
| 日常主动评估间隔（分钟）       | `agency.opportunityMinutes` | `agency` |
| 主动范围                       | `agency.level`              | `agency` |
| 暂停全部后台主动活动           | `agency.paused`             | `agency` |
| 近24小时主动评估最多轮数       | `agency.dailyDecisions`     | `agency` |
| 近24小时目的执行最多外发次数   | `agency.dailyActions`       | `agency` |
| 每轮最多模型请求               | `agency.maxRequests`        | `agency` |
| 每轮最多工具调用               | `agency.maxTools`           | `agency` |
| 近24小时主动模型令牌预算       | `agency.maxTokens`          | `agency` |
| 连续失败后自动停下             | `agency.failureLimit`       | `agency` |
| 互动结束后至少等待（分钟）     | `agency.recentMinutes`      | `agency` |
| 主人明确要求勿扰后等待（小时） | `agency.busyHours`          | `agency` |
| 开启自主活动                   | `agency.enabled`            | `state`  |
| 主动外发最短间隔（分钟）       | `agency.cooldownMinutes`    | `state`  |
| 安静时段开始                   | `agency.quietStart`         | `state`  |
| 安静时段结束                   | `agency.quietEnd`           | `state`  |
| 作息时区                       | `agency.timezone`           | `state`  |

### 回复规则与节奏（91 项）

| 名称                         | 字段                          | 配置分组       |
| ---------------------------- | ----------------------------- | -------------- |
| 角色文件工作区               | `files.workspaceRoot`         | `chat-context` |
| 每轮最近记忆条数             | `context.recentMemoryLimit`   | `chat-context` |
| 最近记忆时间窗（天）         | `context.recentMemoryDays`    | `chat-context` |
| 每轮长期锚点条数             | `context.anchorMemoryLimit`   | `chat-context` |
| 补入最近日记线索             | `context.includeDiary`        | `chat-context` |
| 启用动态上下文               | `context.enabled`             | `chat-context` |
| starr 注入总预算             | `context.maxChars`            | `chat-context` |
| 角色核心预算                 | `context.personaChars`        | `chat-context` |
| 会话摘要预算                 | `context.summaryChars`        | `chat-context` |
| 相关记忆总预算               | `context.memoryChars`         | `chat-context` |
| 单条记忆摘要长度             | `context.memoryPerItemChars`  | `chat-context` |
| 注入相关记忆                 | `context.includeMemories`     | `chat-context` |
| 注入会话接续                 | `context.includeSummary`      | `chat-context` |
| 注入当前心理与身体状态       | `context.includeState`        | `chat-context` |
| 注入当前目的                 | `context.includeGoals`        | `chat-context` |
| 每轮目的条数                 | `context.maxGoals`            | `chat-context` |
| 群内回复时 @ 对方            | `chat.reply.mention`          | `chat-reply`   |
| 回复后接听下一句             | `chat.wait.afterReply`        | `chat-reply`   |
| 回复后接听时长（秒）         | `chat.wait.afterReplySeconds` | `chat-reply`   |
| 状态影响回复节奏             | `chat.reply.statePacing`      | `chat-reply`   |
| 默认会话状态                 | `chat.wake.mode`              | `chat-wake`    |
| 唤醒关键词                   | `chat.wake.keywords`          | `chat-wake`    |
| 角色称呼                     | `chat.wake.names`             | `chat-wake`    |
| 问句参与唤醒                 | `chat.wake.questions`         | `chat-wake`    |
| 普通消息唤醒概率             | `chat.wake.probability`       | `chat-wake`    |
| 两轮最短间隔（毫秒）         | `chat.wake.minGapMs`          | `chat-wake`    |
| 直接叫到时越过等待           | `chat.wake.directBypass`      | `chat-wake`    |
| 角色每分钟最多唤醒           | `chat.wake.maxPerMinute`      | `chat-wake`    |
| 角色每小时最多唤醒           | `chat.wake.maxPerHour`        | `chat-wake`    |
| 群会话近24小时最多唤醒       | `chat.wake.maxPerDay`         | `chat-wake`    |
| 私聊近24小时最多唤醒         | `chat.wake.privatePerDay`     | `chat-wake`    |
| 单轮最多读取的新消息         | `chat.context.batchMessages`  | `chat-context` |
| 单轮收件摘要字符上限         | `chat.context.batchChars`     | `chat-context` |
| 历史工具最多返回条数         | `chat.context.recentMessages` | `chat-context` |
| 单条回复最大字符数           | `chat.reply.maxChars`         | `chat-reply`   |
| 允许私聊分条回复             | `chat.reply.burstEnabled`     | `chat-reply`   |
| 一轮分条最多条数             | `chat.reply.burstMax`         | `chat-reply`   |
| 回复基础停顿下限（毫秒）     | `chat.reply.delayMinMs`       | `chat-reply`   |
| 回复基础停顿上限（毫秒）     | `chat.reply.delayMaxMs`       | `chat-reply`   |
| 每字符追加停顿（毫秒）       | `chat.reply.perCharMs`        | `chat-reply`   |
| 单条最大停顿（毫秒）         | `chat.reply.maxDelayMs`       | `chat-reply`   |
| 额外长停顿概率               | `chat.reply.longPauseChance`  | `chat-reply`   |
| 额外长停顿时长（毫秒）       | `chat.reply.longPauseMs`      | `chat-reply`   |
| 角色每分钟最多外发条数       | `chat.reply.maxPerMinute`     | `chat-reply`   |
| 角色每小时最多外发条数       | `chat.reply.maxPerHour`       | `chat-reply`   |
| 默认等待新消息（毫秒）       | `chat.wait.defaultMs`         | `chat-reply`   |
| 最短等待（毫秒）             | `chat.wait.minMs`             | `chat-reply`   |
| 最长等待（毫秒）             | `chat.wait.maxMs`             | `chat-reply`   |
| 允许自然结束对话             | `chat.close.enabled`          | `chat-reply`   |
| 结束后的软冷却（毫秒）       | `chat.close.cooldownMs`       | `chat-reply`   |
| 问号未答时提示不要收尾       | `chat.close.checkQuestion`    | `chat-reply`   |
| 拒收用户                     | `chat.access.deniedUsers`     | `chat-access`  |
| 拒收群聊                     | `chat.access.deniedGroups`    | `chat-access`  |
| 群内叫到别人时保持安静       | `chat.access.addressFilter`   | `chat-access`  |
| 启用连续刷屏保护             | `chat.guard.enabled`          | `chat-access`  |
| 刷屏统计窗口（毫秒）         | `chat.guard.windowMs`         | `chat-access`  |
| 窗口内最多消息数             | `chat.guard.maxMessages`      | `chat-access`  |
| 同一人最多连续消息           | `chat.guard.maxConsecutive`   | `chat-access`  |
| 保护冷却（毫秒）             | `chat.guard.cooldownMs`       | `chat-access`  |
| 刷屏保护豁免用户             | `chat.guard.exemptUsers`      | `chat-access`  |
| 允许读取当前会话历史         | `chat.tools.history`          | `chat-tools`   |
| 允许暂缓当前回复             | `chat.tools.wait`             | `chat-tools`   |
| 允许主动收尾                 | `chat.tools.close`            | `chat-tools`   |
| 收到语音时自动转写           | `chat.media.autoTranscribe`   | `chat-media`   |
| 读取本会话图片               | `chat.tools.images`           | `chat-media`   |
| 听写本会话语音               | `chat.tools.audio`            | `chat-media`   |
| 读取合并转发                 | `chat.tools.forward`          | `chat-media`   |
| 使用角色表情库               | `chat.tools.stickers`         | `chat-media`   |
| 收藏收到的图片               | `chat.tools.collectSticker`   | `chat-media`   |
| 向本会话发语音               | `chat.tools.voice`            | `chat-media`   |
| 向本会话发翻唱               | `chat.tools.singing`          | `chat-media`   |
| 附件最大字节数               | `chat.media.maxBytes`         | `chat-media`   |
| 每条最多保留附件数           | `chat.media.maxCount`         | `chat-media`   |
| 重连后补看历史               | `chat.history.enabled`        | `chat-media`   |
| 每个对象补看条数             | `chat.history.limit`          | `chat-media`   |
| 仅补最近多少分钟             | `chat.history.maxAgeMinutes`  | `chat-media`   |
| 补看消息可触发回复           | `chat.history.wake`           | `chat-media`   |
| 补看私聊历史                 | `chat.history.includePrivate` | `chat-media`   |
| 启用模型用量闸门             | `chat.budget.enabled`         | `chat-budget`  |
| 近24小时最多令牌数           | `chat.budget.maxTokens`       | `chat-budget`  |
| 近24小时估算费用上限（元）   | `chat.budget.maxCostCNY`      | `chat-budget`  |
| 未命中输入每百万令牌（元）   | `chat.budget.inputPrice`      | `chat-budget`  |
| 缓存读取每百万令牌（元）     | `chat.budget.cachedPrice`     | `chat-budget`  |
| 输出每百万令牌（元）         | `chat.budget.outputPrice`     | `chat-budget`  |
| 服务未报告用量时停止下一请求 | `chat.budget.requireUsage`    | `chat-budget`  |
| 记住这段对话的用语           | `slang.enabled`               | `chat-slang`   |
| 形成解释至少需要的消息数     | `slang.minEvidence`           | `chat-slang`   |
| 同一用语重新学习间隔（分钟） | `slang.cooldownMinutes`       | `chat-slang`   |
| 最低理解置信度               | `slang.minConfidence`         | `chat-slang`   |
| 上下文最多带入用语数         | `slang.injectMax`             | `chat-slang`   |
| 每条解释字符上限             | `slang.definitionChars`       | `chat-slang`   |

### 共享记忆与隐私（4 项）

| 名称                     | 字段                       | 配置分组      |
| ------------------------ | -------------------------- | ------------- |
| 主人B站mid（仅私信认定） | `memory.ownerBili`         | `chat-memory` |
| 新记忆默认共享范围       | `memory.defaultVisibility` | `chat-memory` |
| 主人 QQ（个人历史记忆）  | `memory.ownerQQ`           | `chat-memory` |
| 允许角色写入共享记忆     | `memory.allowSharedWrites` | `chat-memory` |

### B站连接与登录（18 项）

| 名称                       | 字段                       | 配置分组       |
| -------------------------- | -------------------------- | -------------- |
| 启用 B站角色会话           | `bili.enabled`             | `bili`         |
| B站聊天模型连接            | `bili.provider`            | `bili`         |
| B站聊天模型                | `bili.model`               | `bili`         |
| 登录凭据环境变量名         | `bili.secretEnv`           | `bili`         |
| 监听间隔（秒）             | `bili.pollSeconds`         | `bili-limits`  |
| 监听私信                   | `bili.dm.enabled`          | `bili-dm`      |
| 允许互动的用户 mid         | `bili.allowedUsers`        | `bili`         |
| 监听回复与提及             | `bili.comment.enabled`     | `bili-comment` |
| 监听直播间                 | `bili.live.enabled`        | `bili-live`    |
| 允许的直播房间号           | `bili.live.rooms`          | `bili-live`    |
| 单条弹幕字数上限           | `bili.live.maxChars`       | `bili-live`    |
| 首次监听补看窗口（分钟）   | `bili.catchUpMinutes`      | `bili-limits`  |
| 私信与评论最大字符数       | `bili.maxReplyChars`       | `bili-limits`  |
| 每角色近24小时回复额度     | `bili.dailyReplies`        | `bili-limits`  |
| 任意两次发言至少间隔（秒） | `bili.globalGapSeconds`    | `bili-limits`  |
| 同一用户发言冷却（分钟）   | `bili.personGapMinutes`    | `bili-limits`  |
| 同一评论楼层冷却（分钟）   | `bili.threadGapMinutes`    | `bili-limits`  |
| 平台风控后冷却（分钟）     | `bili.riskCooldownMinutes` | `bili-limits`  |

### B站浏览与分享（16 项）

| 名称                     | 字段                             | 配置分组           |
| ------------------------ | -------------------------------- | ------------------ |
| 定时浏览时读取视频关键帧 | `bili.watch.visual`              | `bili-watch`       |
| 定时浏览与记录           | `bili.watch.enabled`             | `bili-watch`       |
| 浏览时间窗口             | `bili.watch.windows`             | `bili-watch`       |
| 近24小时最多浏览轮数     | `bili.watch.dailyMax`            | `bili-watch`       |
| 两轮最少间隔（分钟）     | `bili.watch.gapMinutes`          | `bili-watch`       |
| 跳过本次窗口的概率       | `bili.watch.skipChance`          | `bili-watch`       |
| 本轮候选最多条数         | `bili.watch.candidates`          | `bili-watch`       |
| 喜欢的主题               | `bili.preferences.like`          | `bili-preferences` |
| 不喜欢的主题             | `bili.preferences.dislike`       | `bili-preferences` |
| 额外兴趣关键词           | `bili.preferences.keywords`      | `bili-preferences` |
| 喜好匹配权重             | `bili.preferences.likeWeight`    | `bili-preferences` |
| 避开主题权重             | `bili.preferences.dislikeWeight` | `bili-preferences` |
| 允许从浏览中分享视频     | `bili.share.enabled`             | `bili-share`       |
| 分享接收者 mid           | `bili.share.target`              | `bili-share`       |
| 近24小时分享上限         | `bili.share.dailyMax`            | `bili-share`       |
| 分享最低评分             | `bili.share.minScore`            | `bili-share`       |

### B站动态与操作（6 项）

| 名称                         | 字段                    | 配置分组       |
| ---------------------------- | ----------------------- | -------------- |
| 允许角色主动评论视频         | `bili.autonomy.comment` | `bili-actions` |
| 允许角色主动私信已联系对象   | `bili.autonomy.dm`      | `bili-actions` |
| 允许角色随对话发布文字动态   | `bili.autonomy.dynamic` | `bili-actions` |
| 允许管理 B站公开内容         | `bili.actions.enabled`  | `bili-actions` |
| 手动平台操作近24小时额度     | `bili.actions.dailyMax` | `bili-actions` |
| 允许角色使用公开资料阅读工具 | `bili.actions.allowBot` | `bili-actions` |

### 跨平台分享与同步（8 项）

| 名称                       | 字段                   | 配置分组 |
| -------------------------- | ---------------------- | -------- |
| 启用 B站 → QQ 星桥         | `bridge.enabled`       | `bridge` |
| 明确授权的 QQ 目标         | `bridge.targets`       | `bridge` |
| 定时分享已读视频           | `bridge.videos`        | `bridge` |
| 视频分享时间               | `bridge.times`         | `bridge` |
| 同步本账号新动态           | `bridge.dynamics`      | `bridge` |
| 动态检查间隔（秒）         | `bridge.pollSeconds`   | `bridge` |
| 近24小时外发总额度         | `bridge.dailyMax`      | `bridge` |
| 两次星桥发送最小间隔（秒） | `bridge.minGapSeconds` | `bridge` |

### 语音合成（21 项）

| 名称               | 字段                            | 配置分组    |
| ------------------ | ------------------------------- | ----------- |
| 兼容服务地址       | `media.baseUrl`                 | `media`     |
| 凭据环境变量名     | `media.secretEnv`               | `media`     |
| 请求超时           | `media.timeoutSeconds`          | `media`     |
| 说话模型           | `tts.model`                     | `tts`       |
| 音色               | `tts.voice`                     | `tts`       |
| 说话速度           | `tts.speed`                     | `tts`       |
| 连接方式           | `tts.connection`                | `tts`       |
| 独立服务地址       | `tts.baseUrl`                   | `tts`       |
| 独立凭据环境变量名 | `tts.secretEnv`                 | `tts`       |
| 请求超时（秒）     | `tts.timeoutSeconds`            | `tts`       |
| 说话语气指引       | `tts.instructions`              | `tts`       |
| 音频输出格式       | `tts.responseFormat`            | `tts`       |
| 音视频处理程序     | `media.ffmpegPath`              | `media`     |
| 让情绪影响语音语气 | `tts.emotion.enabled`           | `tts`       |
| 本地服务端口       | `tts.local.port`                | `tts-local` |
| 闲置后卸载（秒）   | `tts.local.idleSeconds`         | `tts-local` |
| 启动等待上限（秒） | `tts.local.startTimeoutSeconds` | `tts-local` |
| 本地模型文件       | `tts.local.modelPath`           | `tts-local` |
| Breeze 服务程序    | `tts.local.bin`                 | `tts-local` |
| Breeze 音色目录    | `tts.local.voicesDir`           | `tts-local` |
| GPU 序号           | `tts.local.gpuIndex`            | `tts-local` |

### 语音识别（9 项）

| 名称                 | 字段                  | 配置分组 |
| -------------------- | --------------------- | -------- |
| 听写模型             | `asr.model`           | `asr`    |
| 听写语言             | `asr.language`        | `asr`    |
| 连接方式             | `asr.connection`      | `asr`    |
| 独立服务地址         | `asr.baseUrl`         | `asr`    |
| 独立凭据环境变量名   | `asr.secretEnv`       | `asr`    |
| 请求超时（秒）       | `asr.timeoutSeconds`  | `asr`    |
| 本地听写Python       | `asr.local.python`    | `asr`    |
| 免费听写模型大小     | `asr.local.model`     | `asr`    |
| 已下载的听写模型目录 | `asr.local.modelPath` | `asr`    |

### 视觉理解（11 项）

| 名称               | 字段                    | 配置分组 |
| ------------------ | ----------------------- | -------- |
| 看图模型           | `vision.model`          | `vision` |
| 连接方式           | `vision.connection`     | `vision` |
| 独立服务地址       | `vision.baseUrl`        | `vision` |
| 独立凭据环境变量名 | `vision.secretEnv`      | `vision` |
| 请求超时（秒）     | `vision.timeoutSeconds` | `vision` |
| DSH视觉服务        | `vision.host.provider`  | `vision` |
| DSH视觉模型        | `vision.host.model`     | `vision` |
| 图片回答长度上限   | `vision.maxTokens`      | `vision` |
| 允许角色读取屏幕   | `vision.screen.enabled` | `vision` |
| 允许角色读取摄像头 | `vision.camera.enabled` | `vision` |
| 摄像头设备名称     | `vision.camera.device`  | `vision` |

### 唱歌与曲库（24 项）

| 名称                       | 字段                             | 配置分组     |
| -------------------------- | -------------------------------- | ------------ |
| 本地服务端口               | `sing.local.port`                | `sing-local` |
| 闲置后卸载（秒）           | `sing.local.idleSeconds`         | `sing-local` |
| 启动等待上限（秒）         | `sing.local.startTimeoutSeconds` | `sing-local` |
| 本地模型文件               | `sing.local.modelPath`           | `sing-local` |
| SoulX Python 程序          | `sing.local.python`              | `sing-local` |
| SoulX 服务脚本             | `sing.local.serverScript`        | `sing-local` |
| SoulX 源码目录             | `sing.local.repo`                | `sing-local` |
| 预处理模型目录             | `sing.local.preModels`           | `sing-local` |
| 推理设备                   | `sing.local.device`              | `sing-local` |
| 半精度推理                 | `sing.local.fp16`                | `sing-local` |
| 曲库检索包含网易云         | `sing.search.netease`            | `sing`       |
| 允许角色查找并保存网络音源 | `sing.source.allowBot`           | `sing`       |
| 允许角色生成翻唱           | `sing.allowBot`                  | `sing`       |
| 唱歌连接方式               | `sing.mode`                      | `sing`       |
| 远程节点地址               | `sing.baseUrl`                   | `sing`       |
| 节点凭据环境变量名         | `sing.secretEnv`                 | `sing`       |
| 转换超时（秒）             | `sing.timeoutSeconds`            | `sing`       |
| 默认参考音色编号           | `sing.referenceId`               | `sing`       |
| 默认移调（半音）           | `sing.pitchShift`                | `sing`       |
| 自动匹配音高               | `sing.autoShift`                 | `sing`       |
| 自动分离人声               | `sing.vocalSeparation`           | `sing`       |
| 推理步数                   | `sing.steps`                     | `sing`       |
| 引导强度                   | `sing.guidance`                  | `sing`       |
| 复用同配置成品             | `sing.cache`                     | `sing`       |

### 角色权限（2 项）

| 名称                   | 字段                           | 配置分组      |
| ---------------------- | ------------------------------ | ------------- |
| 允许 bot 调整日常习惯  | `permissions.botConfig`        | `permissions` |
| 允许角色归档本会话记忆 | `permissions.botMemoryArchive` | `permissions` |

### 外观与性能（4 项）

| 名称         | 字段             | 配置分组     |
| ------------ | ---------------- | ------------ |
| 动态效果     | `ui.motion`      | `appearance` |
| 局部玻璃层次 | `ui.blur`        | `appearance` |
| 背景星光密度 | `ui.starDensity` | `appearance` |
| 背景渲染品质 | `ui.quality`     | `appearance` |

### 网页浏览与画面理解（4 项）

| 名称                           | 字段                   | 配置分组  |
| ------------------------------ | ---------------------- | --------- |
| 允许连续浏览与网页交互         | `browser.interact`     | `browser` |
| 允许角色浏览网页               | `browser.enabled`      | `browser` |
| Tabbit稳定启动器路径（可留空） | `browser.launcherPath` | `browser` |
| 允许理解网页画面               | `browser.visual`       | `browser` |
