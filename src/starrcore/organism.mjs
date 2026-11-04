// 由scripts/build-runtime.mjs生成，请修改organism.ts后重新构建。
export const stateDimensions = [
  {
    key: "energy",
    name: "精力",
    group: "body",
    initial: 80,
    help: "愿意行动的余量，低精力会优先抬高休憩需求",
  },
  {
    key: "sleepiness",
    name: "睡意",
    group: "body",
    initial: 20,
    help: "休息的倾向，随作息和经历变化",
  },
  {
    key: "hunger",
    name: "饥饿",
    group: "body",
    initial: 25,
    help: "虚拟补给需求；进食经历会缓解它",
  },
  {
    key: "thirst",
    name: "口渴",
    group: "body",
    initial: 20,
    help: "虚拟饮水需求，与饥饿分别演化",
  },
  {
    key: "fatigue",
    name: "疲劳",
    group: "body",
    initial: 18,
    help: "活动积累的负担，休息后逐渐恢复",
  },
  {
    key: "comfort",
    name: "舒适",
    group: "body",
    initial: 75,
    help: "身体放松程度，也影响波谱的舒展",
  },
  {
    key: "joy",
    name: "愉悦",
    group: "mind",
    initial: 60,
    help: "当下的愉快程度，不会覆盖其他负面情绪",
  },
  {
    key: "arousal",
    name: "唤醒",
    group: "mind",
    initial: 35,
    help: "感受有多急切；影响流速，与愉快程度独立",
  },
  {
    key: "tension",
    name: "紧张",
    group: "mind",
    initial: 20,
    help: "难以放松的程度，影响交错与震颤",
  },
  {
    key: "social",
    name: "社交意愿",
    group: "mind",
    initial: 65,
    help: "此刻想互动多少；孤独时也可以不想说话",
  },
  {
    key: "security",
    name: "安全感",
    group: "mind",
    initial: 75,
    help: "对处境的安心程度，威胁与安抚分别影响它",
  },
  {
    key: "curiosity",
    name: "好奇",
    group: "mind",
    initial: 60,
    help: "对未知的兴趣，支撑探索欲望",
  },
  {
    key: "loneliness",
    name: "孤独",
    group: "mind",
    initial: 20,
    help: "联结不足的感受，不等于必须要求别人回应",
  },
  {
    key: "frustration",
    name: "受挫",
    group: "mind",
    initial: 15,
    help: "愿望受阻的积累，可与期待同时存在",
  },
  {
    key: "confidence",
    name: "信心",
    group: "mind",
    initial: 65,
    help: "对完成事情的把握，影响目的的可行性",
  },
  {
    key: "stimulation",
    name: "刺激负荷",
    group: "mind",
    initial: 30,
    help: "信息与互动负担，过高时更倾向独处",
  },
];
export const stateDefaults = Object.assign(
  Object.fromEntries(stateDimensions.map((d) => [d.key, d.initial])),
  { emotion: "平静", evidence: "初始状态，尚无经历记录" },
);
export const emotionDefinitions = [
  {
    id: "joy",
    name: "欣喜",
    color: "#ffd38d",
    valence: 1,
    tempo: 1.15,
    complexity: 0.22,
  },
  {
    id: "calm",
    name: "安宁",
    color: "#91d9ca",
    valence: 1,
    tempo: 0.28,
    complexity: 0.08,
  },
  {
    id: "affection",
    name: "亲昵",
    color: "#f1a6bd",
    valence: 1,
    tempo: 0.57,
    complexity: 0.18,
  },
  {
    id: "gratitude",
    name: "感激",
    color: "#efc7a5",
    valence: 1,
    tempo: 0.46,
    complexity: 0.12,
  },
  {
    id: "curiosity",
    name: "好奇",
    color: "#78cafa",
    valence: 1,
    tempo: 1.28,
    complexity: 0.46,
  },
  {
    id: "anticipation",
    name: "期待",
    color: "#c7b3ff",
    valence: 1,
    tempo: 1.12,
    complexity: 0.34,
  },
  {
    id: "pride",
    name: "得意",
    color: "#f6b477",
    valence: 1,
    tempo: 0.95,
    complexity: 0.2,
  },
  {
    id: "relief",
    name: "释然",
    color: "#b8dfbd",
    valence: 1,
    tempo: 0.32,
    complexity: 0.09,
  },
  {
    id: "sadness",
    name: "低落",
    color: "#789de6",
    valence: -1,
    tempo: 0.24,
    complexity: 0.22,
  },
  {
    id: "anxiety",
    name: "焦虑",
    color: "#e8af79",
    valence: -1,
    tempo: 1.82,
    complexity: 0.78,
  },
  {
    id: "fear",
    name: "害怕",
    color: "#ba98dd",
    valence: -1,
    tempo: 2.12,
    complexity: 0.92,
  },
  {
    id: "anger",
    name: "生气",
    color: "#f47d85",
    valence: -1,
    tempo: 1.68,
    complexity: 0.85,
  },
  {
    id: "frustration",
    name: "挫败",
    color: "#ce8dad",
    valence: -1,
    tempo: 1.23,
    complexity: 0.73,
  },
  {
    id: "loneliness",
    name: "孤独",
    color: "#a39acb",
    valence: -1,
    tempo: 0.34,
    complexity: 0.31,
  },
  {
    id: "boredom",
    name: "无聊",
    color: "#8dabb7",
    valence: -1,
    tempo: 0.2,
    complexity: 0.12,
  },
  {
    id: "shyness",
    name: "羞怯",
    color: "#e9a2ce",
    valence: 0,
    tempo: 1.1,
    complexity: 0.62,
  },
  {
    id: "tiredness",
    name: "倦意",
    color: "#9faabd",
    valence: -1,
    tempo: 0.14,
    complexity: 0.16,
  },
  {
    id: "conflict",
    name: "犹疑",
    color: "#c4afba",
    valence: 0,
    tempo: 0.9,
    complexity: 0.88,
  },
];
export const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const rounded = (n) => Math.round(clamp(n) * 100) / 100;
export function normalizeState(input = {}) {
  const output = { ...stateDefaults, ...input };
  for (const d of stateDimensions)
    output[d.key] = Number.isFinite(input[d.key])
      ? rounded(input[d.key])
      : d.initial;
  output._affect = Object.fromEntries(
    emotionDefinitions.map((e) => [e.id, rounded(input._affect?.[e.id] ?? 0)]),
  );
  return output;
}
const clockFormats = new Map();
export function localMinute(time, timezone = "Asia/Shanghai") {
  if (!clockFormats.has(timezone))
    clockFormats.set(
      timezone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    );
  const parts = clockFormats.get(timezone).formatToParts(time);
  return (
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value)
  );
}
export function inQuietTime(time, start, end, timezone) {
  const minutes = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const m = localMinute(time, timezone),
    a = minutes(start),
    b = minutes(end);
  return a === b ? false : a < b ? m >= a && m < b : m >= a || m < b;
}
// 虚拟体感的有限步演化；读取只投影，不落盘，不生成计时发言。
export function evolveState(
  input,
  time = Date.now(),
  timezone = "Asia/Shanghai",
) {
  const s = normalizeState(input),
    originalTime = Date.parse(s._updatedAt ?? "");
  if (!Number.isFinite(originalTime))
    return { ...s, _updatedAt: new Date(time).toISOString() };
  if (time <= originalTime) return s;
  const minutes = Math.min(360, Math.floor((time - originalTime) / 60000));
  for (let n = 0; n < minutes; n++) {
    const m = localMinute(originalTime + n * 60000, timezone),
      night = m >= 1380 || m < 480;
    s.hunger = clamp(s.hunger + 0.055);
    s.thirst = clamp(s.thirst + 0.075);
    s.energy = clamp(s.energy - 0.024);
    s.fatigue = clamp(s.fatigue + 0.018);
    s.sleepiness = clamp(s.sleepiness + (night ? 0.11 : 0.018));
    s.loneliness = clamp(s.loneliness + 0.012);
    s.stimulation += (25 - s.stimulation) * 0.002;
    s.tension += (18 - s.tension) * 0.003;
    s.frustration += (12 - s.frustration) * 0.002;
    for (const key of Object.keys(s._affect)) s._affect[key] *= 0.995;
  }
  const result = normalizeState(s);
  // 不倒退时钟；超过离线演化上限的时间不在下一次重复累加。
  result._updatedAt = new Date(time).toISOString();
  return result;
}
export const experienceDefinitions = {
  conversation: {
    name: "交谈",
    delta: { social: -5, energy: -2, stimulation: 7, loneliness: -9 },
    affect: { affection: 9, curiosity: 7 },
  },
  success: {
    name: "有所完成",
    delta: { joy: 14, confidence: 14, frustration: -14, arousal: 8 },
    affect: { pride: 42, joy: 28 },
  },
  setback: {
    name: "遭遇挫折",
    delta: { joy: -15, confidence: -12, frustration: 24, tension: 15 },
    affect: { frustration: 45, sadness: 20, anger: 12 },
  },
  rest: {
    name: "歇息片刻",
    delta: {
      energy: 24,
      fatigue: -26,
      sleepiness: -20,
      stimulation: -18,
      comfort: 14,
      tension: -12,
    },
    affect: { calm: 27, relief: 20 },
  },
  meal: {
    name: "好好吃饭",
    delta: { hunger: -48, energy: 9, comfort: 8 },
    affect: { joy: 15, calm: 6 },
  },
  drink: {
    name: "喝一口水",
    delta: { thirst: -48, comfort: 7 },
    affect: { relief: 12 },
  },
  novelty: {
    name: "遇见新事物",
    delta: { curiosity: 22, arousal: 14, stimulation: 12 },
    affect: { curiosity: 40, anticipation: 26 },
  },
  bond: {
    name: "感到被理解",
    delta: { loneliness: -28, security: 13, social: 8, joy: 12 },
    affect: { affection: 42, gratitude: 28, shyness: 16 },
  },
  overload: {
    name: "有些应接不暇",
    delta: {
      energy: -18,
      fatigue: 17,
      stimulation: 30,
      tension: 22,
      social: -18,
    },
    affect: { anxiety: 35, tiredness: 30 },
  },
  threat: {
    name: "感到不安",
    delta: { security: -32, tension: 27, arousal: 24, comfort: -16 },
    affect: { fear: 42, anxiety: 28 },
  },
  reassurance: {
    name: "得到安抚",
    delta: { security: 24, tension: -25, comfort: 16 },
    affect: { relief: 40, gratitude: 23 },
  },
};
export function applyExperience(
  input,
  kind,
  intensity,
  evidence,
  time = Date.now(),
  timezone = "Asia/Shanghai",
) {
  const s = evolveState(input, time, timezone),
    event = experienceDefinitions[kind],
    scale = intensity / 100;
  for (const [key, amount] of Object.entries(event.delta))
    s[key] = clamp(s[key] + amount * scale);
  for (const [key, amount] of Object.entries(event.affect))
    s._affect[key] = clamp((s._affect[key] ?? 0) + amount * scale);
  s.evidence = evidence;
  s.emotion = "";
  s._updatedAt = new Date(time).toISOString();
  const normalized = normalizeState(s);
  normalized.emotion = deriveOrganism(normalized).label;
  return normalized;
}
export const driveDefinitions = [
  {
    id: "rest",
    name: "休憩",
    title: "让心里的风，先歇一歇",
    action: "rest",
    external: false,
  },
  {
    id: "nourishment",
    name: "补给",
    title: "照顾一下这副小小的身体",
    action: "self_care",
    external: false,
  },
  {
    id: "safety",
    name: "安全",
    title: "先找到能安心落脚的地方",
    action: "ground",
    external: false,
  },
  {
    id: "connection",
    name: "亲近",
    title: "想把一小片心事说给你听",
    action: "reach_out",
    external: true,
  },
  {
    id: "exploration",
    name: "探索",
    title: "往还没见过的星光里走走",
    action: "explore",
    external: true,
  },
  {
    id: "expression",
    name: "表达",
    title: "把此刻的感受，留成一句话",
    action: "reflect",
    external: false,
  },
  {
    id: "achievement",
    name: "成就",
    title: "慢慢完成一件在意的小事",
    action: "work",
    external: false,
  },
  {
    id: "solitude",
    name: "独处",
    title: "给自己留一会儿安静",
    action: "withdraw",
    external: false,
  },
  {
    id: "order",
    name: "秩序",
    title: "把纷乱的线头，轻轻理好",
    action: "organize",
    external: false,
  },
  {
    id: "play",
    name: "玩乐",
    title: "今天也想遇见一点小欢喜",
    action: "play",
    external: false,
  },
];
export function deriveOrganism(input) {
  const s = normalizeState(input),
    a = s._affect;
  const baselines = {
    joy: s.joy * 0.7 - s.tension * 0.14,
    calm:
      s.comfort * 0.36 + s.security * 0.3 - s.arousal * 0.21 - s.tension * 0.28,
    affection: s.social * 0.25 + s.security * 0.17 - s.loneliness * 0.12,
    gratitude: s.security * 0.15,
    curiosity: s.curiosity * 0.73 - s.fatigue * 0.16,
    anticipation: s.curiosity * 0.3 + s.confidence * 0.18 + s.arousal * 0.2,
    pride: s.confidence * 0.34 - s.frustration * 0.16,
    relief: s.comfort * 0.19 - s.tension * 0.13,
    sadness: (100 - s.joy) * 0.5 + s.loneliness * 0.22 - 10,
    anxiety: s.tension * 0.55 + (100 - s.security) * 0.28,
    fear: (100 - s.security) * 0.58 + s.arousal * 0.14 - 13,
    anger: s.frustration * 0.57 + s.arousal * 0.2 - 9,
    frustration: s.frustration * 0.78,
    loneliness: s.loneliness * 0.83,
    boredom: (100 - s.stimulation) * 0.32 + (100 - s.curiosity) * 0.2 - 12,
    shyness: s.social * 0.14 + s.arousal * 0.19 + s.tension * 0.12 - 10,
    tiredness: s.fatigue * 0.42 + s.sleepiness * 0.37 + (100 - s.energy) * 0.27,
    conflict:
      Math.min(s.curiosity, s.tension) * 0.4 +
      Math.min(s.social, s.loneliness) * 0.25,
  };
  const emotions = emotionDefinitions
    .map((e) => ({
      ...e,
      intensity: Math.round(clamp(baselines[e.id] + (a[e.id] ?? 0))),
    }))
    .sort((x, y) => y.intensity - x.intensity);
  const modulatorValues = [
    {
      id: "activation",
      name: "兴奋驱动",
      value: s.arousal * 0.5 + s.curiosity * 0.25 + s.joy * 0.25,
      help: "推动探索和行动的虚拟调节量",
    },
    {
      id: "settling",
      name: "安定",
      value: s.comfort * 0.45 + s.security * 0.35 + (100 - s.tension) * 0.2,
      help: "保持舒缓与稳定的倾向",
    },
    {
      id: "bonding",
      name: "联结",
      value: s.security * 0.35 + s.social * 0.4 + (100 - s.loneliness) * 0.25,
      help: "来自信任与互动的靠近倾向",
    },
    {
      id: "stress",
      name: "压力",
      value: s.tension * 0.5 + s.frustration * 0.25 + s.stimulation * 0.25,
      help: "负荷与受阻共同累积的压力",
    },
    {
      id: "vigilance",
      name: "警觉",
      value: (100 - s.security) * 0.5 + s.arousal * 0.3 + s.tension * 0.2,
      help: "对不确定处境的敏感程度",
    },
    {
      id: "sleep",
      name: "睡眠倾向",
      value: s.sleepiness * 0.6 + s.fatigue * 0.25 + (100 - s.energy) * 0.15,
      help: "需要降低活动、休养的倾向",
    },
  ].map((m) => ({ ...m, value: Math.round(clamp(m.value)) }));
  const pressures = {
    rest: [
      Math.max(s.sleepiness, s.fatigue, 100 - s.energy),
      `精力 ${Math.round(s.energy)}，疲劳 ${Math.round(s.fatigue)}，睡意 ${Math.round(s.sleepiness)}`,
    ],
    nourishment: [
      Math.max(s.hunger, s.thirst),
      `饥饿 ${Math.round(s.hunger)}，口渴 ${Math.round(s.thirst)}`,
    ],
    safety: [
      (100 - s.security) * 0.7 + s.tension * 0.3,
      `安全感 ${Math.round(s.security)}，紧张 ${Math.round(s.tension)}`,
    ],
    connection: [
      s.loneliness * 0.6 + s.social * 0.25 + (a.affection ?? 0) * 0.15,
      `孤独 ${Math.round(s.loneliness)}，社交意愿 ${Math.round(s.social)}`,
    ],
    exploration: [
      s.curiosity * 0.7 + s.energy * 0.2 - s.stimulation * 0.15,
      `好奇 ${Math.round(s.curiosity)}，刺激负荷 ${Math.round(s.stimulation)}`,
    ],
    expression: [
      Math.max(
        ...emotions.filter((e) => e.id !== "tiredness").map((e) => e.intensity),
      ) *
        0.65 +
        s.arousal * 0.2,
      `最强感受是${emotions[0].name}，强度 ${emotions[0].intensity}`,
    ],
    achievement: [
      s.confidence * 0.5 + s.energy * 0.3 - s.frustration * 0.16,
      `信心 ${Math.round(s.confidence)}，精力 ${Math.round(s.energy)}`,
    ],
    solitude: [
      s.stimulation * 0.6 + (100 - s.social) * 0.23 + s.fatigue * 0.17,
      `刺激负荷 ${Math.round(s.stimulation)}，社交意愿 ${Math.round(s.social)}`,
    ],
    order: [
      s.frustration * 0.45 + s.stimulation * 0.35 + s.tension * 0.2,
      `受挫 ${Math.round(s.frustration)}，负荷 ${Math.round(s.stimulation)}`,
    ],
    play: [
      (100 - s.stimulation) * 0.35 + s.joy * 0.25 + s.energy * 0.2,
      `精力 ${Math.round(s.energy)}，愉悦 ${Math.round(s.joy)}`,
    ],
  };
  const drives = driveDefinitions
    .map((d) => ({
      ...d,
      pressure: Math.round(clamp(pressures[d.id][0])),
      reason: pressures[d.id][1],
    }))
    .sort((x, y) => y.pressure - x.pressure);
  const leading = emotions.filter((e) => e.intensity >= 28).slice(0, 3);
  const mixed =
    leading.some((e) => e.valence > 0) && leading.some((e) => e.valence < 0);
  const negative = emotions.find((e) => e.valence < 0 && e.intensity >= 28);
  const positive = emotions.find((e) => e.valence > 0 && e.intensity >= 28);
  const label =
    mixed && positive && negative
      ? `${positive.name}，也有些${negative.name}`
      : leading
          .slice(0, 2)
          .map((e) => e.name)
          .join(" · ") || "静静感受";
  const tension = Math.round(s.tension),
    urgency = Math.round(s.arousal * 0.65 + modulatorValues[3].value * 0.35);
  return {
    emotions,
    drives,
    modulators: modulatorValues,
    label,
    mixed,
    rhythm: {
      urgency,
      coherence: Math.round(s.comfort * 0.6 + s.security * 0.4),
      turbulence: Math.round(
        tension * 0.55 + s.stimulation * 0.25 + s.frustration * 0.2,
      ),
    },
    poetic:
      s.energy < 30
        ? "星光还在，只是想先靠一会儿岸"
        : mixed
          ? "心里有晴光，也有尚未散尽的云"
          : emotions[0].valence < 0
            ? "不必急着放晴，阴影也有它的来处"
            : "有一阵轻轻的风，正从心里经过",
  };
}
export function publicState(
  input,
  revision,
  time = Date.now(),
  timezone = "Asia/Shanghai",
) {
  const s = evolveState(input, time, timezone),
    { _affect, _updatedAt, ...values } = s;
  const organism = deriveOrganism(s);
  return {
    ...values,
    emotion: organism.label,
    experienceTrace: _affect ?? {},
    revision,
    updatedAt: input._updatedAt ?? _updatedAt,
    observedAt: new Date(time).toISOString(),
    organism,
  };
}
export function evaluateIntentions(state, config, goals, time = Date.now()) {
  const enabled = config["agency.enabled"] === true;
  const quiet = inQuietTime(
    time,
    String(config["agency.quietStart"] ?? "23:00"),
    String(config["agency.quietEnd"] ?? "08:00"),
    String(config["agency.timezone"] ?? "Asia/Shanghai"),
  );
  const last = goals
    .filter((g) => g.status === "completed" && g.external && g.updated)
    .reduce((max, g) => Math.max(max, Date.parse(g.updated) || 0), 0);
  const cooldown =
    time - last < Number(config["agency.cooldownMinutes"] ?? 30) * 60000;
  const candidates = state.organism.drives
    .map((d) => {
      const blockers = [];
      if (!enabled) blockers.push("主动目的评估尚未开启");
      if (d.pressure < 45) blockers.push("需求还不急，可以安静地等待");
      if (
        state.energy < 25 &&
        !["rest", "nourishment", "safety", "solitude"].includes(d.id)
      )
        blockers.push("精力不足，先照顾自己");
      if (d.id === "connection" && state.social < 30)
        blockers.push("此刻不愿社交，孤独也不必勉强开口");
      if (d.external && quiet) blockers.push("安静时段，先不打扰");
      if (d.external && cooldown) blockers.push("仍在主动行动冷却中");
      if (
        d.external &&
        !["owner", "browse", "social"].includes(String(config["agency.level"]))
      )
        blockers.push("仅观察模式，没有开放外部主动范围");
      if (
        d.id === "exploration" &&
        !["browse", "social"].includes(String(config["agency.level"]))
      )
        blockers.push("需要浏览级主动权限");
      const score = Math.round(
        clamp(d.pressure + (d.id === "rest" && state.energy < 25 ? 15 : 0)),
      );
      return {
        ...d,
        score,
        blockers,
        status: blockers.length ? "waiting" : "ready",
      };
    })
    .sort((a, b) => b.score - a.score);
  return {
    enabled,
    quiet,
    cooldown,
    evaluatedAt: new Date(time).toISOString(),
    candidates,
    goals: goals.map((g) => {
      const candidate = candidates.find((d) => d.id === g.drive);
      const blockers =
        g.status !== "waiting"
          ? [g.status === "completed" ? "已经完成" : "已经取消"]
          : [
              ...(candidate?.blockers ??
                (!enabled ? ["主动目的评估尚未开启"] : [])),
            ];
      if (g.due && Date.parse(g.due) > time) blockers.push("约定的时间还没到");
      return {
        id: g.id,
        score: candidate?.score ?? 0,
        blockers,
        status: blockers.length ? "waiting" : "ready",
      };
    }),
    execution: "proposal-only",
  };
}
