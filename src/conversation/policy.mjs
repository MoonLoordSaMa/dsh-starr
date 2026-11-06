const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const field = (key, label, type, value, page, help, extra = {}) => [
  key,
  label,
  type,
  value,
  page,
  help,
  extra,
];
const number = (key, label, value, min, max, page, help) =>
  field(key, label, "number", value, page, help, { min, max, integer: true });
export const policyFields = [
  field(
    "chat.reply.mention",
    "群内回复时 @ 对方",
    "boolean",
    true,
    "chat-reply",
    "仅群聊文字回复，对本批真实发言者生成原生 @ 消息段；私聊不添加。",
  ),
  field(
    "chat.wait.afterReply",
    "回复后接听下一句",
    "boolean",
    true,
    "chat-reply",
    "首次回复后，角色可在当前会话回合内等待一次 30–60 秒；收到补充后沿用当前回合，不额外创建唤醒。",
  ),
  field(
    "chat.reply.statePacing",
    "状态影响回复节奏",
    "boolean",
    true,
    "chat-reply",
    "在已设置的回复停顿内，疲惫时稍慢、急切时稍快；停顿为零时仍立即发送。状态同时影响表达提示，不改变人设。",
  ),
  field(
    "chat.wake.mode",
    "默认会话状态",
    "select",
    "awake",
    "chat-wake",
    "清醒时处理允许范围内的消息；观察只由直接叫到或关键词唤醒；沉睡仅由明确的直接叫到唤醒。",
    { options: ["awake", "observe", "sleep"] },
  ),
  field(
    "chat.wake.keywords",
    "唤醒关键词",
    "text",
    "",
    "chat-wake",
    "以逗号或换行分隔；仍需通过 QQ 允许名单。",
  ),
  field(
    "chat.wake.names",
    "角色称呼",
    "text",
    "",
    "chat-wake",
    "额外的角色名字，以逗号分隔；当前角色名始终参与直接称呼判断。",
  ),
  field(
    "chat.wake.questions",
    "问句参与唤醒",
    "boolean",
    false,
    "chat-wake",
    "观察状态下，带问号的消息也可以唤醒；不越过平台的群内 @ 要求。",
  ),
  field(
    "chat.wake.probability",
    "普通消息唤醒概率",
    "number",
    1,
    "chat-wake",
    "0 到 1；只作用于未直接叫到角色的清醒消息。",
    { min: 0, max: 1 },
  ),
  number(
    "chat.wake.minGapMs",
    "两轮最短间隔（毫秒）",
    0,
    0,
    3600000,
    "chat-wake",
    "0 表示不额外等待；收件仍会合并短时补充。",
  ),
  field(
    "chat.wake.directBypass",
    "直接叫到时越过等待",
    "boolean",
    true,
    "chat-wake",
    "只越过软等待与最短间隔，不越过次数额度和黑名单。",
  ),
  number(
    "chat.wake.maxPerMinute",
    "角色每分钟最多唤醒",
    0,
    0,
    120,
    "chat-wake",
    "0 表示不设此额度；QQ 各对象合计。",
  ),
  number(
    "chat.wake.maxPerHour",
    "角色每小时最多唤醒",
    0,
    0,
    2000,
    "chat-wake",
    "达到额度后保留收件，时间窗口释放后继续。",
  ),
  number(
    "chat.wake.maxPerDay",
    "群会话近24小时最多唤醒",
    0,
    0,
    10000,
    "chat-wake",
    "按每段群会话分别计数，0 表示不限。",
  ),
  number(
    "chat.wake.privatePerDay",
    "私聊近24小时最多唤醒",
    0,
    0,
    10000,
    "chat-wake",
    "每个私聊对象分别计数，0 表示不限。",
  ),
  number(
    "chat.context.batchMessages",
    "单轮最多读取的新消息",
    12,
    1,
    50,
    "chat-context",
    "超过上限的消息留给后续批次，不会提前确认已读。",
  ),
  number(
    "chat.context.batchChars",
    "单轮收件摘要字符上限",
    12000,
    500,
    40000,
    "chat-context",
    "约束初次投递的消息摘录；完整单条消息可按编号读取。",
  ),
  number(
    "chat.context.recentMessages",
    "历史工具最多返回条数",
    30,
    1,
    100,
    "chat-context",
    "历史工具只读当前平台对象已接收的消息。",
  ),
  number(
    "chat.reply.maxChars",
    "单条回复最大字符数",
    4000,
    100,
    12000,
    "chat-reply",
    "超过上限明确拒绝，不静默截断回复。",
  ),
  field(
    "chat.reply.burstEnabled",
    "允许私聊分条回复",
    "boolean",
    false,
    "chat-reply",
    "私聊默认保持单条；群聊分段回复默认可用并受单轮条数与外发额度限制。每条独立记录回执，结果不明时停止剩余条目。",
  ),
  number(
    "chat.reply.burstMax",
    "一轮分条最多条数",
    3,
    1,
    8,
    "chat-reply",
    "所有条目合计也要满足外发额度。",
  ),
  number(
    "chat.reply.delayMinMs",
    "回复基础停顿下限（毫秒）",
    0,
    0,
    15000,
    "chat-reply",
    "模拟自然节奏，0 表示立即发送；停顿可被停止连接中断。",
  ),
  number(
    "chat.reply.delayMaxMs",
    "回复基础停顿上限（毫秒）",
    0,
    0,
    30000,
    "chat-reply",
    "在上下限之间随机选择。",
  ),
  number(
    "chat.reply.perCharMs",
    "每字符追加停顿（毫秒）",
    0,
    0,
    100,
    "chat-reply",
    "按消息长度追加，最终不超过最大停顿。",
  ),
  number(
    "chat.reply.maxDelayMs",
    "单条最大停顿（毫秒）",
    30000,
    0,
    60000,
    "chat-reply",
    "包含基础停顿与字数追加。",
  ),
  field(
    "chat.reply.longPauseChance",
    "额外长停顿概率",
    "number",
    0,
    "chat-reply",
    "0 到 1；用于分条间偶尔稍作停顿。",
    { min: 0, max: 1 },
  ),
  number(
    "chat.reply.longPauseMs",
    "额外长停顿时长（毫秒）",
    3000,
    0,
    30000,
    "chat-reply",
    "仍受单条最大停顿限制。",
  ),
  number(
    "chat.reply.maxPerMinute",
    "角色每分钟最多外发条数",
    0,
    0,
    120,
    "chat-reply",
    "按实际尝试发送计数，0 表示不限；分条逐条计入。",
  ),
  number(
    "chat.reply.maxPerHour",
    "角色每小时最多外发条数",
    0,
    0,
    2000,
    "chat-reply",
    "结果不明的外发也占用额度，避免回执丢失造成重复。",
  ),
  number(
    "chat.wait.defaultMs",
    "默认等待新消息（毫秒）",
    5000,
    200,
    3600000,
    "chat-reply",
    "等待会持久保存截止时间，不占住模型请求；后续收件到期后再处理。",
  ),
  number(
    "chat.wait.minMs",
    "最短等待（毫秒）",
    200,
    0,
    60000,
    "chat-reply",
    "角色提出的等待时长不能低于此值。",
  ),
  number(
    "chat.wait.maxMs",
    "最长等待（毫秒）",
    3600000,
    200,
    86400000,
    "chat-reply",
    "角色不能借等待工具无限休眠；直接叫到是否越过等待由唤醒设置决定。",
  ),
  field(
    "chat.close.enabled",
    "允许自然结束对话",
    "boolean",
    true,
    "chat-reply",
    "结束工具会保存接续并进入观察；下一条明确呼唤可继续。",
  ),
  number(
    "chat.close.cooldownMs",
    "结束后的软冷却（毫秒）",
    0,
    0,
    3600000,
    "chat-reply",
    "冷却期间普通消息等待，直接呼唤按唤醒设置处理。",
  ),
  field(
    "chat.close.checkQuestion",
    "问号未答时提示不要收尾",
    "boolean",
    true,
    "chat-reply",
    "最近收件含问号时拒绝直接收尾；这是明确的字面规则，不能替代模型理解。",
  ),
  field(
    "chat.access.deniedUsers",
    "拒收用户",
    "text",
    "",
    "chat-access",
    "QQ 号以逗号分隔；对私聊和允许群内的发言均生效。",
  ),
  field(
    "chat.access.deniedGroups",
    "拒收群聊",
    "text",
    "",
    "chat-access",
    "在允许名单中也会拒收，不让模型修改此项。",
  ),
  field(
    "chat.access.addressFilter",
    "群内叫到别人时保持安静",
    "boolean",
    false,
    "chat-access",
    "只有 @ 其他人且没有 @ 自己时拒收；普通引用不算直接叫到。",
  ),
  field(
    "chat.guard.enabled",
    "启用连续刷屏保护",
    "boolean",
    false,
    "chat-access",
    "在允许的会话内按实际消息计数，不靠昵称推断人的身份。",
  ),
  number(
    "chat.guard.windowMs",
    "刷屏统计窗口（毫秒）",
    30000,
    1000,
    600000,
    "chat-access",
    "只统计当前平台对象的消息。",
  ),
  number(
    "chat.guard.maxMessages",
    "窗口内最多消息数",
    30,
    2,
    500,
    "chat-access",
    "超过后暂停本会话处理，消息保留在收件记录中。",
  ),
  number(
    "chat.guard.maxConsecutive",
    "同一人最多连续消息",
    8,
    2,
    100,
    "chat-access",
    "群内连续刷屏与窗口总量分别判断。",
  ),
  number(
    "chat.guard.cooldownMs",
    "保护冷却（毫秒）",
    60000,
    1000,
    3600000,
    "chat-access",
    "到期后自动恢复；管理员可调整设置。",
  ),
  field(
    "chat.guard.exemptUsers",
    "刷屏保护豁免用户",
    "text",
    "",
    "chat-access",
    "仅豁免刷屏保护，不能越过拒收和允许名单。",
  ),
  field(
    "chat.tools.history",
    "允许读取当前会话历史",
    "boolean",
    true,
    "chat-tools",
    "只读当前对象的已接收记录与消息详情。",
  ),
  field(
    "chat.tools.wait",
    "允许暂缓当前回复",
    "boolean",
    true,
    "chat-tools",
    "角色可选择先不回复当前来信，等待后续消息或进入观察；这与成功回复后短暂接听下一句是两种不同流程。",
  ),
  field(
    "chat.tools.close",
    "允许主动收尾",
    "boolean",
    true,
    "chat-tools",
    "关闭后角色不能自行把会话切为观察。",
  ),
];
const split = (value) =>
  String(value || "")
    .split(/[,，\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export class ChatPolicy {
  constructor(store) {
    this.store = store;
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS chat_runtime(session_id TEXT PRIMARY KEY,mode TEXT NOT NULL DEFAULT '',wake_after INTEGER NOT NULL DEFAULT 0,last_wake INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS chat_rates(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,kind TEXT NOT NULL,created INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS chat_rate_window ON chat_rates(character_id,kind,created);`);
  }
  config(characterId) {
    return this.store.character(characterId).config;
  }
  direct(message, c, characterId) {
    return (
      !!message.mentioned ||
      [
        this.store.character(characterId).name,
        ...split(c["chat.wake.names"]),
      ].some((name) => name && message.text.includes(name))
    );
  }
  accepts(message, c) {
    return (
      !split(c["chat.access.deniedUsers"]).includes(message.userId) &&
      !split(c["chat.access.deniedGroups"]).includes(
        message.type === "group" ? message.target : "",
      ) &&
      !(
        c["chat.access.addressFilter"] &&
        message.type === "group" &&
        message.addressedToOther &&
        !message.mentioned
      )
    );
  }
  runtime(sessionId) {
    return this.store.db
      .prepare("SELECT * FROM chat_runtime WHERE session_id=?")
      .get(sessionId);
  }
  update(sessionId, { mode, wakeAfter }) {
    this.store.conversations.get(sessionId);
    const current = this.runtime(sessionId);
    this.store.db
      .prepare(
        "INSERT INTO chat_runtime VALUES(?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET mode=excluded.mode,wake_after=excluded.wake_after,updated=excluded.updated",
      )
      .run(
        sessionId,
        mode ?? current?.mode ?? "",
        wakeAfter ?? current?.wake_after ?? 0,
        current?.last_wake ?? 0,
        Date.now(),
      );
    return this.runtime(sessionId);
  }
  incoming(message, characterId, sessionId) {
    const c = this.config(characterId),
      runtime = this.runtime(sessionId),
      mode = runtime?.mode || c["chat.wake.mode"];
    if (!this.accepts(message, c))
      return { accept: false, reason: "ACCESS_POLICY" };
    const direct = this.direct(message, c, characterId),
      keyword = split(c["chat.wake.keywords"]).some((word) =>
        message.text.includes(word),
      );
    const wake =
      direct ||
      (mode !== "sleep" &&
        (keyword ||
          (c["chat.wake.questions"] && /[?？]/.test(message.text)) ||
          (mode === "awake" && Math.random() < c["chat.wake.probability"])));
    if (direct && runtime && c["chat.wake.directBypass"])
      this.update(sessionId, { mode: "awake", wakeAfter: 0 });
    return { accept: true, wake, direct, reason: wake ? null : "OBSERVING" };
  }
  reserve(characterId, sessionId, kind, key, c = this.config(characterId)) {
    const db = this.store.db,
      at = Date.now();
    if (db.prepare("SELECT id FROM chat_rates WHERE id=?").get(key))
      return { allowed: true };
    const limits =
      kind === "wake"
        ? [
            [c["chat.wake.maxPerMinute"], 60000, false],
            [c["chat.wake.maxPerHour"], 3600000, false],
            [
              c[
                this.store.conversations.get(sessionId).type === "private"
                  ? "chat.wake.privatePerDay"
                  : "chat.wake.maxPerDay"
              ],
              86400000,
              true,
            ],
          ]
        : [
            [c["chat.reply.maxPerMinute"], 60000, false],
            [c["chat.reply.maxPerHour"], 3600000, false],
          ];
    for (const [max, window, perSession] of limits) {
      if (!max) continue;
      const recent = db
        .prepare(
          `SELECT created FROM chat_rates WHERE character_id=? AND kind=? AND created>? ${perSession ? "AND session_id=?" : ""} ORDER BY created DESC LIMIT ?`,
        )
        .all(
          characterId,
          kind,
          at - window,
          ...(perSession ? [sessionId] : []),
          max,
        );
      if (recent.length >= max)
        return {
          allowed: false,
          nextAt: recent.at(-1).created + window + 10,
          reason: "RATE_LIMIT",
        };
    }
    db.prepare("INSERT INTO chat_rates VALUES(?,?,?,?,?)").run(
      key,
      characterId,
      sessionId,
      kind,
      at,
    );
    if (kind === "wake") {
      this.update(sessionId, {});
      db.prepare("UPDATE chat_runtime SET last_wake=? WHERE session_id=?").run(
        at,
        sessionId,
      );
    }
    db.prepare("DELETE FROM chat_rates WHERE created<?").run(at - 86400000);
    return { allowed: true };
  }
  delay(thread, rows) {
    const c = this.config(thread.character_id),
      runtime = this.runtime(thread.session_id),
      now = Date.now();
    const direct = rows.some((row) =>
      this.direct(JSON.parse(row.payload), c, thread.character_id),
    );
    if (runtime && !(direct && c["chat.wake.directBypass"])) {
      const deadline = Math.max(
        runtime.wake_after,
        runtime.last_wake + c["chat.wake.minGapMs"],
      );
      if (deadline > now) return { nextAt: deadline, reason: "WAITING" };
    }
    if (c["chat.guard.enabled"]) {
      const messages = this.store.db
        .prepare(
          "SELECT payload FROM qq_inbox WHERE thread_key=? AND created>? ORDER BY seq DESC LIMIT 501",
        )
        .all(thread.key, now - c["chat.guard.windowMs"])
        .map((r) => JSON.parse(r.payload));
      const filtered = messages.filter(
        (m) => !split(c["chat.guard.exemptUsers"]).includes(m.userId),
      );
      let same = 0;
      for (const msg of filtered) {
        if (msg.userId !== filtered[0].userId) break;
        same++;
      }
      if (
        filtered.length > c["chat.guard.maxMessages"] ||
        same > c["chat.guard.maxConsecutive"]
      ) {
        const nextAt = now + c["chat.guard.cooldownMs"];
        this.update(thread.session_id, { wakeAfter: nextAt });
        return { nextAt, reason: "SPAM_COOLDOWN" };
      }
    }
    return null;
  }
  wait(sessionId, ms, reason) {
    const session = this.store.conversations.get(sessionId),
      c = this.config(session.character_id);
    if (!c["chat.tools.wait"]) throw fail("管理员未允许等待工具", 403);
    const duration = ms ?? c["chat.wait.defaultMs"];
    if (
      !Number.isInteger(duration) ||
      duration < c["chat.wait.minMs"] ||
      duration > c["chat.wait.maxMs"]
    )
      throw fail("等待时长超出配置范围");
    if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
      throw fail("请填写等待的具体理由");
    return this.update(sessionId, { wakeAfter: Date.now() + duration });
  }
  close(sessionId, { revision, summary, pending = "" }, hasQuestion) {
    const session = this.store.conversations.get(sessionId),
      c = this.config(session.character_id);
    if (!c["chat.tools.close"] || !c["chat.close.enabled"])
      throw fail("管理员未允许角色主动收尾", 403);
    if (c["chat.close.checkQuestion"] && hasQuestion)
      throw fail("最近收件仍带有问号，请先回应或明确保持安静");
    this.store.conversations.patch(
      sessionId,
      { revision, patch: { summary, pending } },
      "bot",
    );
    return this.update(sessionId, {
      mode: "observe",
      wakeAfter: Date.now() + c["chat.close.cooldownMs"],
    });
  }
}
