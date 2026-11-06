import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "chat-social",
  help,
  extra,
];
export const socialFields = [
  f(
    "chat.tools.status",
    "允许角色设置自身QQ状态",
    "boolean",
    false,
    "仅调整当前登录QQ的在线、离开或忙碌状态；需要SnowLuma接口支持。",
  ),
  f(
    "chat.tools.qzone",
    "允许角色发布QQ空间文字",
    "boolean",
    false,
    "发布当前QQ账号的文字说说，权限固定使用管理员下方选择；结果不明不会重复。",
  ),
  f(
    "chat.qzone.visibility",
    "QQ空间说说可见范围",
    "select",
    "friends",
    "角色不能自行扩大这个范围。",
    { options: ["self", "friends", "public"] },
  ),
  f(
    "chat.tools.friendRemark",
    "允许给当前私聊好友写备注",
    "boolean",
    false,
    "只操作本轮实际私聊的好友，不修改其他好友资料。",
  ),
  f(
    "chat.tools.groupTag",
    "允许写QQ群分类标签",
    "boolean",
    false,
    "写入下方管理员指定的群分类；与记忆标签、个人好友标签不同。",
  ),
  f(
    "chat.qq.groupClass",
    "允许写标签的QQ群分类编号",
    "number",
    0,
    "填写真实群分类编号，0表示未指定。",
    { min: 0, max: 4294967295, integer: true },
  ),
  f(
    "chat.social.dailyMax",
    "QQ社交操作近24小时额度",
    "number",
    10,
    "状态、说说、备注和群分类标签共同计数，失败尝试也保留。",
    { min: 1, max: 100, integer: true },
  ),
  f(
    "chat.tools.members",
    "读取当前群成员",
    "boolean",
    false,
    "仅当前可信群聊，按需查询成员与活跃统计；不开放任意群枚举。",
  ),
  f(
    "chat.tools.poke",
    "回应本轮用户的拍一拍",
    "boolean",
    false,
    "只对本批真实发言的用户，单批一次。桥接不支持时明确失败。",
  ),
  f(
    "chat.tools.prompt",
    "读取角色提示词",
    "boolean",
    false,
    "仅返回当前角色人设与实际注入摘要，不含宿主密钥或其他角色。",
  ),
  f(
    "chat.tools.feedback",
    "记录会话问题反馈",
    "boolean",
    true,
    "保存在本机维护记录，不自动私信管理员。",
  ),
  f(
    "chat.feedback.maxChars",
    "反馈字数上限",
    "number",
    1000,
    "只记录当前会话定位和问题说明。",
    { min: 100, max: 4000, integer: true },
  ),
  f(
    "chat.reply.maxOutboundPerTurn",
    "每轮最多外发条数",
    "number",
    5,
    "文字分条、表情、语音与拍一拍共用单轮上限。",
    { min: 1, max: 20, integer: true },
  ),
  f(
    "chat.media.maxPixels",
    "图片最大像素数",
    "number",
    16000000,
    "图片解码前的尺寸门槛，用于本机表情收藏；超过则拒绝。",
    { min: 100000, max: 64000000, integer: true },
  ),
];
export function socialCapabilities({
  store,
  characterId,
  thread,
  messages,
  batchId,
  action,
  signal,
}) {
  store.db.exec(
    "CREATE TABLE IF NOT EXISTS qq_social_log(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL)",
  );
  const allow = (key) => {
    signal.throwIfAborted();
    const c = store.character(characterId).config;
    if (!c[key] || store.conversations.get(thread.session_id).paused)
      throw fail("管理员未授权或已暂停该会话能力", 403);
    return c;
  };
  const mutate = async (kind, permission, params, api) => {
    const c = allow(permission),
      id = `${kind}:${batchId}`;
    const parts = store.db
      .prepare("SELECT count(*) n FROM qq_send_parts WHERE batch_id=?")
      .get(batchId).n;
    const used = store.db
      .prepare(
        "SELECT count(*) n FROM qq_social_log WHERE json_extract(data,'$.batchId')=? OR id=?",
      )
      .get(batchId, `poke:${batchId}`).n;
    if (parts + used >= c["chat.reply.maxOutboundPerTurn"])
      throw fail("本轮外发额度已用尽", 429);
    if (
      store.db
        .prepare(
          "SELECT count(*) n FROM qq_social_log WHERE character_id=? AND kind IN ('status','qzone','friendRemark','groupTag') AND created>?",
        )
        .get(characterId, Date.now() - 86400000).n >= c["chat.social.dailyMax"]
    )
      throw fail("QQ社交操作额度已用尽", 429);
    if (store.db.prepare("SELECT 1 FROM qq_social_log WHERE id=?").get(id))
      throw fail("本轮此操作已执行或待核对", 409);
    store.db
      .prepare("INSERT INTO qq_social_log VALUES(?,?,?,?,'sending',?,?)")
      .run(
        id,
        characterId,
        thread.session_id,
        kind,
        JSON.stringify({ batchId, params }),
        Date.now(),
      );
    try {
      const version = await action("get_version_info", {});
      if (!/snowluma/i.test(version?.app_name || ""))
        throw fail("当前桥接未确认支持SnowLuma扩展接口", 409);
      allow(permission);
      const result = await action(api, params);
      signal.throwIfAborted();
      if (kind === "qzone" && !result?.tid)
        throw Object.assign(fail("空间发布未返回说说编号，请人工核对", 502), {
          uncertain: true,
        });
      store.db
        .prepare("UPDATE qq_social_log SET status='accepted' WHERE id=?")
        .run(id);
      return {
        status: "accepted",
        deliveryVerified: false,
        ...(kind === "qzone" ? { messageId: String(result.tid) } : {}),
      };
    } catch (e) {
      if (!store.closed)
        store.db
          .prepare("UPDATE qq_social_log SET status=? WHERE id=?")
          .run(e.uncertain || signal.aborted ? "uncertain" : "failed", id);
      throw e;
    }
  };
  return {
    status: ({ status }) => {
      const code = { online: 11, away: 31, busy: 50 }[status];
      if (!code) throw fail("状态只能选择online、away或busy");
      return mutate(
        "status",
        "chat.tools.status",
        { status: code, ext_status: 0, battery_status: 100 },
        "set_online_status",
      );
    },
    qzone: ({ text }) => {
      const c = allow("chat.tools.qzone");
      if (typeof text !== "string" || !text.trim() || text.length > 1000)
        throw fail("说说应为1–1000字");
      return mutate(
        "qzone",
        "chat.tools.qzone",
        {
          content: text,
          ugc_right:
            { self: 64, friends: 4, public: 1 }[c["chat.qzone.visibility"]] ||
            64,
        },
        "send_qzone_msg",
      );
    },
    friendRemark: ({ text }) => {
      if (
        thread.type !== "private" ||
        !messages.some((m) => m.userId === thread.target)
      )
        throw fail("只能备注本轮私聊的真实好友", 403);
      if (typeof text !== "string" || !text.trim() || text.length > 60)
        throw fail("备注应为1–60字");
      return mutate(
        "friendRemark",
        "chat.tools.friendRemark",
        { user_id: thread.target, remark: text },
        "set_friend_remark",
      );
    },
    groupTag: ({ text }) => {
      const c = allow("chat.tools.groupTag");
      if (thread.type !== "group" || !c["chat.qq.groupClass"])
        throw fail("请先由管理员指定当前账号的群分类", 403);
      if (typeof text !== "string" || !text.trim() || text.length > 30)
        throw fail("标签应为1–30字");
      return mutate(
        "groupTag",
        "chat.tools.groupTag",
        { group_class: c["chat.qq.groupClass"], name: text },
        "add_group_tag",
      );
    },
    members: async ({ userId, active = false, limit = 20 } = {}) => {
      allow("chat.tools.members");
      if (thread.type !== "group") throw fail("当前不是群聊", 409);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw fail("条数应为1–100");
      if (userId && !/^\d{5,20}$/.test(userId)) throw fail("成员编号无效");
      const data = userId
        ? await action("get_group_member_info", {
            group_id: thread.target,
            user_id: userId,
            no_cache: false,
          })
        : await action("get_group_member_list", {
            group_id: thread.target,
            no_cache: false,
          });
      const rows = userId ? [data] : Array.isArray(data) ? data : [];
      return rows
        .sort((a, b) =>
          active
            ? Number(b.last_sent_time || 0) - Number(a.last_sent_time || 0)
            : 0,
        )
        .slice(0, limit)
        .map((row) => ({
          userId: String(row.user_id),
          name: String(row.card || row.nickname || ""),
          role: row.role,
          lastSentAt: row.last_sent_time,
          level: row.level,
        }));
    },
    prompt: () => {
      allow("chat.tools.prompt");
      return {
        persona: store.character(characterId).persona,
        context: store.conversations.context(thread.session_id),
      };
    },
    feedback: ({ text }) => {
      const c = allow("chat.tools.feedback");
      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > c["chat.feedback.maxChars"]
      )
        throw fail("反馈正文超过上限");
      const id = crypto.randomUUID();
      store.db
        .prepare(
          "INSERT INTO qq_social_log VALUES(?,?,?,'feedback','saved',?,?)",
        )
        .run(
          id,
          characterId,
          thread.session_id,
          JSON.stringify({ text }),
          Date.now(),
        );
      return { id, status: "saved", externalSent: false };
    },
    poke: async ({ userId }) => {
      const c = allow("chat.tools.poke");
      if (!messages.some((message) => message.userId === userId))
        throw fail("只能回应本批真实发言者", 403);
      const parts = store.db
        .prepare("SELECT count(*) AS n FROM qq_send_parts WHERE batch_id=?")
        .get(batchId).n;
      const socialCount = store.db
        .prepare(
          "SELECT count(*) n FROM qq_social_log WHERE json_extract(data,'$.batchId')=?",
        )
        .get(batchId).n;
      if (parts + socialCount >= c["chat.reply.maxOutboundPerTurn"])
        throw fail("本轮外发额度已用尽", 429);
      const id = `poke:${batchId}`;
      if (store.db.prepare("SELECT 1 FROM qq_social_log WHERE id=?").get(id))
        throw fail("本批拍一拍已执行或待核对", 409);
      store.db
        .prepare("INSERT INTO qq_social_log VALUES(?,?,?,'poke','sending',?,?)")
        .run(
          id,
          characterId,
          thread.session_id,
          JSON.stringify({ userId }),
          Date.now(),
        );
      try {
        await action("send_poke", {
          user_id: userId,
          ...(thread.type === "group" ? { group_id: thread.target } : {}),
        });
        signal.throwIfAborted();
        store.db
          .prepare("UPDATE qq_social_log SET status='accepted' WHERE id=?")
          .run(id);
        return { status: "accepted", deliveryVerified: false };
      } catch (e) {
        if (!store.closed)
          store.db
            .prepare("UPDATE qq_social_log SET status=? WHERE id=?")
            .run(e.uncertain || signal.aborted ? "uncertain" : "failed", id);
        throw e;
      }
    },
  };
}
