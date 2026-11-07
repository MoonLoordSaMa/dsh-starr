import {
  Home,
  UserRound,
  Orbit,
  Activity,
  MessagesSquare,
  AudioLines,
  Smile,
  Wrench,
  Settings2,
  BookOpen,
  ShieldCheck,
  Palette,
  Globe2,
  Radio,
  Music2,
  Eye,
  Headphones,
  SlidersHorizontal,
  Link2,
  Clock3,
  Sparkles,
  Heart,
} from "lucide-react";

export const navigation = [
  {
    id: "host-chat",
    label: "DSH 角色会话",
    name: "灯下相逢",
    purpose: "宿主会话、接续与提示词",
    icon: MessagesSquare,
  },
  {
    id: "qq-private",
    label: "QQ 私聊",
    name: "尺素私语",
    purpose: "好友会话与私人接续",
    icon: MessagesSquare,
  },
  {
    id: "qq-group",
    label: "QQ 群聊",
    name: "四海同席",
    purpose: "群聊、@ 与群内互动",
    icon: MessagesSquare,
  },
  {
    id: "qq",
    label: "QQ 连接与授权",
    name: "鹊桥结契",
    purpose: "SnowLuma、对象与工具授权",
    icon: MessagesSquare,
  },
  {
    id: "overview",
    label: "首页概览",
    name: "观星台",
    purpose: "全局概览",
    icon: Home,
  },
  {
    id: "character",
    label: "人设与提示词",
    name: "卿本星辰",
    purpose: "人设与提示词",
    icon: UserRound,
  },
  {
    id: "memory",
    label: "记忆与关系",
    name: "星海拾忆",
    purpose: "记忆与关系星图",
    icon: Orbit,
  },
  {
    id: "memory-care",
    label: "记忆保存与整理",
    name: "拾光成册",
    purpose: "保存、日记与整理",
    icon: Clock3,
  },
  {
    id: "memory-sync",
    label: "笔记与同步",
    name: "星河同源",
    purpose: "Obsidian 与同步",
    icon: Link2,
  },
  {
    id: "state",
    label: "情绪与体感",
    name: "心潮晴雨",
    purpose: "情绪、身体与经历",
    icon: Activity,
  },
  {
    id: "intentions",
    label: "目的与主动行为",
    name: "逐光而行",
    purpose: "目的与主动节律",
    icon: Heart,
  },
  {
    id: "conversation",
    label: "全部会话",
    name: "西窗共语",
    purpose: "Starr-chat 会话",
    icon: MessagesSquare,
  },
  {
    id: "chat-context",
    label: "上下文注入",
    name: "言外之意",
    purpose: "上下文注入",
    icon: BookOpen,
  },
  {
    id: "chat-rules",
    label: "回复规则与节奏",
    name: "言有缓急",
    purpose: "唤醒、回复与额度",
    icon: SlidersHorizontal,
  },
  {
    id: "chat-sharing",
    label: "共享记忆与隐私",
    name: "同一片星空",
    purpose: "共享记忆与隐私",
    icon: Link2,
  },
  {
    id: "bili",
    label: "B站连接与登录",
    name: "山海来信",
    purpose: "B站扫码与接入",
    icon: Globe2,
  },
  {
    id: "bili-activities",
    label: "B站浏览与分享",
    name: "漫游拾趣",
    purpose: "B站浏览、兴趣与分享",
    icon: Eye,
  },
  {
    id: "bili-publish",
    label: "B站动态与操作",
    name: "寄语人间",
    purpose: "B站动态与操作",
    icon: Radio,
  },
  {
    id: "bridge",
    label: "跨平台分享与同步",
    name: "星桥传笺",
    purpose: "跨平台分享与同步",
    icon: Link2,
  },
  {
    id: "media",
    label: "语音合成",
    name: "清音寄意",
    purpose: "语音合成",
    icon: AudioLines,
  },
  {
    id: "hearing",
    label: "语音识别",
    name: "听风知意",
    purpose: "语音识别",
    icon: Headphones,
  },
  {
    id: "vision",
    label: "视觉理解",
    name: "万象入眸",
    purpose: "视觉理解",
    icon: Eye,
  },
  {
    id: "singing",
    label: "唱歌与曲库",
    name: "弦歌入梦",
    purpose: "唱歌、曲库与音色",
    icon: Music2,
  },
  {
    id: "expressions",
    label: "表情包管理",
    name: "眉目传情",
    purpose: "表情包库",
    icon: Smile,
  },
  {
    id: "maintenance",
    label: "备份与诊断",
    name: "藏星问脉",
    purpose: "备份、诊断与维护",
    icon: Wrench,
  },
  {
    id: "permissions",
    label: "角色权限",
    name: "信契有度",
    purpose: "角色授权与权限",
    icon: ShieldCheck,
  },
  {
    id: "appearance",
    label: "外观与性能",
    name: "星庭设色",
    purpose: "外观、动效与性能",
    icon: Palette,
  },
  {
    id: "browser",
    label: "网页浏览与画面理解",
    name: "览尽山河",
    purpose: "Tabbit网页阅读与画面理解",
    icon: Globe2,
  },
  {
    id: "settings",
    label: "全部设置",
    name: "万象星枢",
    purpose: "功能与配置总览",
    icon: Settings2,
  },
].filter(
  (item) =>
    ![
      "conversation",
      "host-chat",
      "qq-private",
      "qq-group",
      "chat-context",
    ].includes(item.id),
);
// 四类能力按配置归属组织，不代表执行顺序。
export const workspaces = [
  {
    id: "chat",
    name: "回廊共语",
    label: "基础会话",
    entry: "chat-rules",
    pages: ["overview", "character", "chat-rules", "qq", "expressions"],
    caption: "角色人设、回复设置与QQ连接",
  },
  {
    id: "senses",
    name: "心观万象",
    label: "感官、心理与生理",
    entry: "state",
    pages: ["state", "vision", "hearing", "media", "singing"],
    caption: "心理、生理、视觉、听觉与声音",
  },
  {
    id: "agency",
    name: "逐光而行",
    label: "主动能力",
    entry: "intentions",
    pages: [
      "intentions",
      "browser",
      "bili",
      "bili-activities",
      "bili-publish",
      "bridge",
    ],
    caption: "自主目的、浏览、平台活动与分享",
  },
  {
    id: "memory",
    name: "星海拾忆",
    label: "记忆",
    entry: "memory",
    pages: ["memory", "memory-care", "chat-sharing", "memory-sync"],
    caption: "记忆、日记、共享与同步",
  },
].map((group) => ({ ...group, primary: group.pages }));
export const commonPages = [
  "settings",
  "permissions",
  "appearance",
  "maintenance",
];
const retiredPages = new Set([
  "conversation",
  "host-chat",
  "qq-private",
  "qq-group",
  "chat-context",
]);
export function resolvePage(page: string) {
  if (page === "platforms" || retiredPages.has(page)) return "chat-rules";
  return navigation.some((item) => item.id === page) ? page : "overview";
}
export const poems: Record<string, [string, string, string]> = {
  browser: ["读万卷书", "行万里路", "读书与远行"],
  "host-chat": ["相知无远近", "万里尚为邻", "张九龄《送韦城李少府》"],
  "qq-private": ["相逢意气为君饮", "系马高楼垂柳边", "王维《少年行四首·其一》"],
  "qq-group": ["海上生明月", "天涯共此时", "张九龄《望月怀远》"],
  character: ["有美一人", "清扬婉兮", "《诗经·郑风·野有蔓草》"],
  memory: ["此情可待成追忆", "只是当时已惘然", "李商隐《锦瑟》"],
  "memory-care": ["随风潜入夜", "润物细无声", "杜甫《春夜喜雨》"],
  "memory-sync": ["海内存知己", "天涯若比邻", "王勃《送杜少府之任蜀州》"],
  state: ["人有悲欢离合", "月有阴晴圆缺", "苏轼《水调歌头·明月几时有》"],
  intentions: ["长风破浪会有时", "直挂云帆济沧海", "李白《行路难·其一》"],
  conversation: ["何当共剪西窗烛", "却话巴山夜雨时", "李商隐《夜雨寄北》"],
  "chat-context": [
    "身无彩凤双飞翼",
    "心有灵犀一点通",
    "李商隐《无题·昨夜星辰昨夜风》",
  ],
  "chat-rules": ["大弦嘈嘈如急雨", "小弦切切如私语", "白居易《琵琶行》"],
  "chat-sharing": ["但愿人长久", "千里共婵娟", "苏轼《水调歌头·明月几时有》"],
  qq: ["桃花潭水深千尺", "不及汪伦送我情", "李白《赠汪伦》"],
  bili: ["欲穷千里目", "更上一层楼", "王之涣《登鹳雀楼》"],
  "bili-activities": ["等闲识得东风面", "万紫千红总是春", "朱熹《春日》"],
  "bili-publish": ["江南无所有", "聊赠一枝春", "陆凯《赠范晔诗》"],
  bridge: [
    "我寄愁心与明月",
    "随君直到夜郎西",
    "李白《闻王昌龄左迁龙标遥有此寄》",
  ],
  media: ["此曲只应天上有", "人间能得几回闻", "杜甫《赠花卿》"],
  hearing: ["空山不见人", "但闻人语响", "王维《鹿柴》"],
  vision: ["行到水穷处", "坐看云起时", "王维《终南别业》"],
  singing: ["嘈嘈切切错杂弹", "大珠小珠落玉盘", "白居易《琵琶行》"],
  expressions: ["巧笑倩兮", "美目盼兮", "《诗经·卫风·硕人》"],
  maintenance: ["明月松间照", "清泉石上流", "王维《山居秋暝》"],
  permissions: ["从心所欲", "不逾矩", "《论语·为政》"],
  appearance: ["星垂平野阔", "月涌大江流", "杜甫《旅夜书怀》"],
  legacy: ["欲知大道", "必先为史", "龚自珍《古史钩沉论二》"],
  settings: ["问渠那得清如许", "为有源头活水来", "朱熹《观书有感·其一》"],
};
export function fieldRoute(page: string) {
  if (page === "browser") return "browser";
  if (page === "qq") return "qq";
  if (page === "chat-social") return "qq";
  if (page === "appearance" || page === "permissions") return page;
  if (
    page === "memory" ||
    page.startsWith("memory-job") ||
    page.startsWith("jobs")
  )
    return "memory-care";
  if (page === "state" || page === "agency") return "intentions";
  if (page === "chat-context") return "chat-rules";
  if (page === "chat-memory") return "chat-sharing";
  if (page.startsWith("chat")) return "chat-rules";
  if (page.startsWith("bridge")) return "bridge";
  if (page.startsWith("bili-dynamic") || page === "bili-actions")
    return "bili-publish";
  if (["bili-watch", "bili-preferences", "bili-share"].includes(page))
    return "bili-activities";
  if (page.startsWith("bili")) return "bili";
  if (page.startsWith("sing")) return "singing";
  if (page.startsWith("asr")) return "hearing";
  if (page.startsWith("vision")) return "vision";
  if (page.startsWith("tts") || page === "media") return "media";
  return "settings";
}
