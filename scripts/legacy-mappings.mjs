// 这里只记录已接回运行服务的配置；对应字段仍由统一定义决定页面。
export const fieldMappings = {
  "socialV2.initialPromptMaxChars": "context.maxChars",
  "socialV2.tokenGuard.maxOutboundPerTurn": "chat.reply.maxOutboundPerTurn",
  "socialV2.feedback.maxLength": "chat.feedback.maxChars",
  "socialV2.media.maxPixels": "chat.media.maxPixels",
  "socialV2.tools.getPrompt": "chat.tools.prompt",
  "socialV2.tools.feedback": "chat.tools.feedback",
  "socialV2.tools.getActiveMembers": "chat.tools.members",
  "socialV2.tools.sendPoke": "chat.tools.poke",
  "chat.contextMessages": "chat.context.recentMessages",
  "purpose.gapMinMs": "agency.cooldownMinutes",
  "biliBridge.enabled": "bridge.enabled",
  "biliBridge.share.enabled": "bridge.videos",
  "biliBridge.share.times": "bridge.times",
  "biliBridge.share.groups": "bridge.targets",
  "biliBridge.dynamics.enabled": "bridge.dynamics",
  "biliBridge.dynamics.pollIntervalMs": "bridge.pollSeconds",
  "biliBridge.dynamics.groups": "bridge.targets",
  "socialV2.wake.defaultMode": "chat.wake.mode",
  "socialV2.wake.recommendedProbability": "chat.wake.probability",
  "socialV2.wake.recommendedKeywords": "chat.wake.keywords",
  "socialV2.wake.recommendedNameMention": "chat.wake.names",
  "socialV2.wake.recommendedQuestion": "chat.wake.questions",
  "socialV2.wake.maxWakePerMinute": "chat.wake.maxPerMinute",
  "socialV2.wake.maxWakePerHour": "chat.wake.maxPerHour",
  "socialV2.send.burstEnabled": "chat.reply.burstEnabled",
  "socialV2.send.burstMaxMessages": "chat.reply.burstMax",
  "socialV2.send.burstIntervalMinMs": "chat.reply.delayMinMs",
  "socialV2.send.burstIntervalMaxMs": "chat.reply.delayMaxMs",
  "socialV2.send.longGapProbability": "chat.reply.longPauseChance",
  "socialV2.send.longGapMinMs": "chat.reply.longPauseMs",
  "socialV2.send.longGapMaxMs": "chat.reply.longPauseMs",
  "socialV2.send.maxSendPerMinute": "chat.reply.maxPerMinute",
  "socialV2.send.maxSendPerHour": "chat.reply.maxPerHour",
  "socialV2.send.maxMessageChars": "chat.reply.maxChars",
  "socialV2.send.maxGapMs": "chat.reply.maxDelayMs",
  "socialV2.send.gapBaseMs": "chat.reply.delayMinMs",
  "socialV2.send.gapPerCharMs": "chat.reply.perCharMs",
  "socialV2.wait.defaultMs": "chat.wait.defaultMs",
  "socialV2.wait.minMs": "chat.wait.minMs",
  "socialV2.wait.maxMs": "chat.wait.maxMs",
  "socialV2.context.recentLimit": "chat.context.recentMessages",
  "socialV2.context.unreadLimit": "chat.context.batchMessages",
  "socialV2.context.wakeMessageLimit": "chat.context.batchMessages",
  "socialV2.context.wakeRecentLimit": "chat.context.recentMessages",
  "socialV2.closure.enabled": "chat.close.enabled",
  "socialV2.closure.cooldownMs": "chat.close.cooldownMs",
  "socialV2.closure.requireNoOpenQuestion": "chat.close.checkQuestion",
  "socialV2.history.enabled": "chat.history.enabled",
  "socialV2.history.limit": "chat.history.limit",
  "socialV2.history.maxAgeMinutes": "chat.history.maxAgeMinutes",
  "socialV2.history.wake": "chat.history.wake",
  "socialV2.history.includePrivate": "chat.history.includePrivate",
  "socialV2.tokenGuard.enabled": "chat.budget.enabled",
  "socialV2.tokenGuard.maxWakesPerDay": "chat.wake.maxPerDay",
  "socialV2.tokenGuard.privateMaxWakesPerDay": "chat.wake.privatePerDay",
  "socialV2.tokenGuard.minWakeGapMs": "chat.wake.minGapMs",
  "socialV2.tokenGuard.directBypassGap": "chat.wake.directBypass",
  "socialV2.tokenGuard.maxDailyCostCNY": "chat.budget.maxCostCNY",
  "slang.enabled": "slang.enabled",
  "slang.extractMinMessages": "slang.minEvidence",
  "slang.extractCooldownMs": "slang.cooldownMinutes",
  "slang.injectMax": "slang.injectMax",
  "chat.addressFilter.enabled": "chat.access.addressFilter",
  "chat.addressFilter.silenceWhenAddressedToOther": "chat.access.addressFilter",
  "deny.users": "chat.access.deniedUsers",
  "deny.private": "chat.access.deniedUsers",
  "deny.groups": "chat.access.deniedGroups",
  "socialV2.media.maxBytes": "chat.media.maxBytes",
  "socialV2.media.maxCount": "chat.media.maxCount",
  "socialV2.tools.getRecent": "chat.tools.history",
  "socialV2.tools.getMyRecent": "chat.tools.history",
  "socialV2.tools.getMessageDetail": "chat.tools.history",
  "socialV2.tools.sendBurst": "chat.reply.burstEnabled",
  "socialV2.tools.waitMessages": "chat.tools.wait",
  "socialV2.tools.closeConversation": "chat.tools.close",
  "socialV2.tools.slangQuery": "slang.enabled",
  "socialV2.tools.slangSubmit": "slang.enabled",
  "socialV2.tools.getImages": "chat.tools.images",
  "socialV2.tools.getForwardMsg": "chat.tools.forward",
  "socialV2.tools.listStickers": "chat.tools.stickers",
  "socialV2.tools.getStickerImage": "chat.tools.stickers",
  "socialV2.tools.sendSticker": "chat.tools.stickers",
  "socialV2.tools.setStickerRemark": "chat.tools.collectSticker",
  "socialV2.tools.collectSticker": "chat.tools.collectSticker",
  "socialV2.tools.sendVoice": "chat.tools.voice",
  "voice.enabled": "tts.connection",
  "voice.port": "tts.local.port",
  "voice.character": "tts.voice",
  "voice.idleSec": "tts.local.idleSeconds",
  "voice.gpuIndex": "tts.local.gpuIndex",
  "voice.bin": "tts.local.bin",
  "voice.model": "tts.local.modelPath",
  "voice.voicesDir": "tts.local.voicesDir",
  "voice.instructions": "tts.instructions",
  "voice.startTimeoutSec": "tts.local.startTimeoutSeconds",
  "voice.requestTimeoutSec": "tts.timeoutSeconds",
  "sing.enabled": "sing.mode",
  "sing.port": "sing.local.port",
  "sing.idleSec": "sing.local.idleSeconds",
  "sing.timeoutMs": "sing.timeoutSeconds",
  "sing.promptWav": "sing.referenceId",
  "sing.cache": "sing.cache",
  "sing.python": "sing.local.python",
  "sing.serverScript": "sing.local.serverScript",
  "sing.model": "sing.local.modelPath",
  "sing.repo": "sing.local.repo",
  "sing.preModels": "sing.local.preModels",
  "sing.device": "sing.local.device",
  "sing.fp16": "sing.local.fp16",
  "media.tts.connection": "tts.connection",
  "media.tts.mode": "tts.connection",
  "media.tts.baseUrl": "tts.baseUrl",
  "media.tts.secretRef": "tts.secretEnv",
  "media.asr.connection": "asr.connection",
  "media.asr.mode": "asr.connection",
  "media.asr.baseUrl": "asr.baseUrl",
  "media.asr.secretRef": "asr.secretEnv",
  "media.svc.mode": "sing.mode",
  "media.svc.remoteBaseUrl": "sing.baseUrl",
  "media.svc.jobTimeoutMs": "sing.timeoutSeconds",
  "media.svc.secretRef": "sing.secretEnv",
};
export const biliMappings = {
  "diary.enabled": "jobs.diaryNight.enabled",
  "night.skipChance": "bili.watch.skipChance",
  "night.maxVideos": "bili.watch.candidates",
  "night.maxWakesPerDay": "bili.watch.dailyMax",
  "night.minGapMin": "bili.watch.gapMinutes",
  "night.windows": "bili.watch.windows",
  "preferences.like": "bili.preferences.like",
  "preferences.dislike": "bili.preferences.dislike",
  "preferences.keywords": "bili.preferences.keywords",
  "share.enabled": "bili.share.enabled",
  "quota.shareDaily": "bili.share.dailyMax",
  "share.minScore": "bili.share.minScore",
  "limits.replyDaily": "bili.dailyReplies",
  "limits.perUpMin": "bili.personGapMinutes",
  "limits.perThreadMin": "bili.threadGapMinutes",
  "limits.globalMin": "bili.globalGapSeconds",
  "fishGuard.failCooldownMinutes": "bili.riskCooldownMinutes",
  "dynamics.enabled": "bili.dynamics.enabled",
  "dynamics.gapMin": "bili.dynamics.gapMinutes",
  "listen.comment": "bili.comment.enabled",
  "listen.commentIntervalSec": "bili.pollSeconds",
  "listen.dm": "bili.dm.enabled",
  "listen.live": "bili.live.enabled",
  "listen.liveRoom": "bili.live.rooms",
};
for (const kind of ["best", "game", "anime", "gaming"])
  for (const [old, current] of Object.entries({
    enabled: "enabled",
    slot: "at",
    minLen: "minChars",
    maxLen: "maxChars",
    prefix: "prefix",
  }))
    biliMappings[`dynamics.kinds.${kind}.${old}`] =
      `bili.dynamics.${kind}.${current}`;

export function mappingNote(oldKey, newKey) {
  if (oldKey === "sing.promptWav")
    return "参考音频先导入本角色曲库，再选择编号；不直接沿用旧本地路径。";
  if (oldKey.startsWith("media.svc."))
    return "远程唱歌改用音频字节协议；旧地址、作业轮询协议不能直接复用，需部署并验证包装节点。";
  if (oldKey.endsWith("secretRef"))
    return "凭据改为环境变量引用，先在 DSH 启动环境设置；不会导入旧明文。";
  if (oldKey === "sing.enabled" || oldKey === "voice.enabled")
    return "开关整合为连接方式，选择停用即可关闭；其他方式需重新确认模型配置。";
  if (oldKey === "night.maxVideos")
    return "控制本轮候选数量；每轮细读最多三个，不代表读取完整视频画面。";
  if (oldKey === "socialV2.wake.recommendedNameMention")
    return "改为额外角色称呼列表；当前角色名始终参与直接称呼判断。";
  if (oldKey.startsWith("socialV2.tools.getMyRecent"))
    return "合并为当前对象的历史读取，收件与本轮回执可查；未复刻旧模型正文的独立历史索引。";
  if (oldKey === "share.enabled")
    return "本字段控制 B站私信分享；跨平台 QQ 分享已独立归入星桥传书，两个通道分别授权与计额。";
  if (oldKey.endsWith(".groups") && newKey === "bridge.targets")
    return "明确目标改为 group:群号 或 private:QQ号；同时要求 QQ 允许名单，不能直接复制旧群号字符串。";
  if (oldKey.includes("longGap"))
    return "长停顿合并为单一时长，仍受最大停顿上限约束；不自动套用旧随机上下限。";
  if (/Ms$/.test(oldKey) && /(Seconds|Minutes)$/.test(newKey))
    return "计时单位已改为秒或分钟，需按新字段重新填写；不自动导入旧毫秒数。";
  if (oldKey === "limits.globalMin")
    return "全局间隔改为秒；旧分钟值需要乘以 60，且本版私信、评论与弹幕合并计数。";
  if (oldKey.startsWith("slang."))
    return "用语由角色根据本会话多条真实收件证据提交，不再启动另一套自动学习会话。";
  return "已归并到本版实际运行配置；范围、单位和作用按新字段说明重新确认，不自动导入旧值。";
}

// 业务等价入口不表示兼容旧命令名，也不代表真实平台已通过验收。
export const capabilityTargets = {};
function equivalents(names, page, entry, note) {
  for (const name of names.split(" "))
    capabilityTargets[name] = { page, entry, note };
}
equivalents(
  "qq_get_group_members qq_get_active_members",
  "qq",
  "当前 QQ 会话 → 成员工具",
  "只查询当前可信群，不枚举任意群；由群成员授权开关控制。浏览器不代发消息。",
);
equivalents(
  "qq_get_prompt",
  "character",
  "角色人设 / starr_qq_prompt",
  "读取当前角色人设和实际注入；需管理员授权。",
);
equivalents(
  "qq_send_poke",
  "qq",
  "starr_qq_poke",
  "只回应本批真实发言者，一批一次；实际桥接是否支持仍需验证。",
);
equivalents(
  "qq_report_feedback",
  "maintenance",
  "会话留下的反馈",
  "反馈存本机维护记录，不私信管理员。",
);
equivalents(
  "qq_memory_remove",
  "memory-care",
  "归档与恢复 / starr_memory_archive",
  "可恢复归档代替直接删正文；角色操作仅限本会话可见记录。",
);
equivalents(
  "qq_list_voices",
  "media",
  "音色清单 / starr_voice_list",
  "本地列音色文件，云端只显示已配名称，不虚构枚举接口。",
);
equivalents(
  "link_parse starr_link_parse",
  "bili-publish",
  "starr_link_parse",
  "解析完整视频与动态链接；短链与任意网页解析未并入。",
);
equivalents(
  "song_remove song_cache_clear",
  "singing",
  "曲库移除 / 清理生成成品",
  "移除音源保留回收文件；清理仅处理当前角色成品。",
);
equivalents(
  "memory_reindex reindexMemory memoryTopics",
  "memory-care",
  "索引重建 / 主题关联建议",
  "关联建议需管理员确认，不将推测伪装成真实关系。",
);
equivalents(
  "memoryDecay",
  "memory-care",
  "按时间计算记忆权重",
  "召回时计算新鲜度，保留完整正文，不启动删除型衰减任务。",
);
equivalents(
  "feed check-dynamic watch-history search covers whois fav dynamic-image dynamic-edit reply-draft",
  "bili-publish",
  "公开资料与动态操作",
  "网页资料、草稿、图文发布与编辑；每次外部写入须预览确认，历史收藏仅管理员读取。",
);
equivalents(
  "share-dynamic",
  "bridge",
  "星桥传书",
  "同账号公开动态同步 QQ；首次仅建水位，明确目标与双重授权。",
);
equivalents(
  "qq_status snowluma_status",
  "conversation",
  "QQ 接入 → 连接与收件状态",
  "检查当前 SnowLuma 协议与登录，不发送测试消息。",
);
equivalents(
  "qq_reply qq_send_group_message qq_send_private_message qq_send_message",
  "conversation",
  "starr_qq_reply",
  "只回复当前可信收件对象，受允许名单、额度与回执约束；不提供任意目标发送。",
);
equivalents(
  "qq_get_group_history qq_get_recent_messages qq_get_my_recent_messages qq_get_message_detail",
  "conversation",
  "starr_qq_history",
  "合并为当前对象历史与已持久化消息查询，不复刻旧的独立正文索引。",
);
equivalents(
  "qq_get_unread_messages qq_mark_read",
  "conversation",
  "starr_qq_read / starr_qq_silence",
  "读取当前可信批次，显式回复或安静后完成；不暴露任意会话水位修改。",
);
equivalents(
  "qq_social_state qq_close_conversation qq_set_wake_config qq_send_burst qq_wait_for_messages",
  "conversation",
  "规则与节奏 / 当前会话工具",
  "对应清醒、观察、沉睡、收尾、等待与分条；授权以当前配置为准。",
);
equivalents(
  "qq_memory_append qq_memory_query memory_search bili_diary",
  "memory",
  "starr_memory_write / starr_memory_search",
  "共用角色记忆服务，保留会话来源与可见范围，不自动共享所有私聊。",
);
equivalents(
  "qq_slang_query qq_slang_submit",
  "conversation",
  "starr_slang_query / starr_slang_submit",
  "提交需要当前会话多条真实收件证据；候选不直接注入。",
);
equivalents(
  "qq_get_message_images",
  "conversation",
  "starr_qq_attachment",
  "仅读取当前可信消息中的受限平台图片地址。",
);
equivalents(
  "qq_list_stickers qq_get_sticker_image qq_send_sticker qq_collect_sticker qq_sticker_note qq_set_sticker_remark",
  "expressions",
  "表情库 / 当前 QQ 表情工具",
  "在当前角色表情库中查询、发送、收藏与备注，依各工具授权执行。",
);
equivalents(
  "qq_get_forward_msg",
  "conversation",
  "starr_qq_forward",
  "读取当前消息中实际存在的合并转发标识。",
);
equivalents(
  "qq_send_voice",
  "media",
  "starr_qq_voice",
  "使用本角色已配置的语音合成服务，取得真实音频后发送。",
);
equivalents(
  "song_list song_search starr_song_search starr_song_list",
  "media",
  "starr_song_list / 唱歌曲库",
  "查询本角色曲库；不提供跨角色曲库读取。",
);
equivalents(
  "song_add starr_song_add",
  "media",
  "唱歌 → 曲库与转换记录",
  "通过网页导入音源和参考音色；不允许模型导入任意本机路径。",
);
equivalents(
  "sing starr_sing",
  "media",
  "starr_sing / starr_qq_sing",
  "需曲库、参考音色与已验证的转换服务，bot 翻唱必须额外授权。",
);
equivalents(
  "sticker_list sticker_update sticker_limit_set starr_emoji_like",
  "expressions",
  "表情库",
  "统一角色表情资产及喜爱、备注、额度配置；不兼容旧管理工具名。",
);
equivalents(
  "config_get config_set starr_config_set starr_config_audit",
  "settings",
  "starr_config_read / starr_config_update / 配置审计",
  "模型仅可修改统一白名单，路径、密钥、执行程序和自身授权均不可改。",
);
equivalents(
  "starr_status starr_emotion_record",
  "state",
  "starr_state_read / starr_experience_record",
  "共用角色状态与经历服务，不接回旧状态计算引擎。",
);
equivalents(
  "memory_stats",
  "memory",
  "记忆概览",
  "显示本角色实际持久化记忆与关联统计。",
);
equivalents(
  "bili_whoami",
  "conversation",
  "B站接入 → 验证登录",
  "只检查账号认证，凭据不回显。",
);
equivalents(
  "bili_dm_latest bili_dm_history dm-await dm-history dm",
  "conversation",
  "B站私信 / Starr-chat",
  "按账号与允许对象隔离，通过实际收件驱动回复；不开放任意对象发送。",
);
equivalents(
  "check-comment check-mention comment-await comment",
  "conversation",
  "B站接入 → 评论与提及",
  "回读真实评论楼层并核验允许对象，受额度和冷却约束。",
);
equivalents(
  "bili_video video subtitles watch-video watch",
  "conversation",
  "B站资料阅读 / starr_bili_activity_read",
  "读取标题、简介与可用字幕；没有视频画面验证时不声称看过完整视频。",
);
equivalents(
  "prefs night quota fish-guard score",
  "conversation",
  "B站兴趣、资料阅读、额度与冷却",
  "整合为业务配置和实际活动状态，不保留另一套命令引擎。",
);
equivalents(
  "daily gamefeed dynamic",
  "conversation",
  "B站接入 → 定时文字动态",
  "四类文字动态独立配置，实际发布以回执为准；不含图片、编辑与删除。",
);
equivalents(
  "danmaku",
  "conversation",
  "B站接入 → 直播",
  "仅在配置直播间的实际收件会话中回应；受理不等于已验证画面送达。",
);
equivalents(
  "diaryDay diaryNight organize weeklyLayers monthlyLayers yearlyLayers diary starr_run_job",
  "memory",
  "保存与整理 → 定时任务",
  "日记和回顾走独立 DSH 会话，按稳定事件标识真正保存记忆后才算完成。",
);
