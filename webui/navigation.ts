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
  Heart,
} from "lucide-react";
export const navigation = [
  {
    id: "overview",
    label: "首页概览",
    name: "观星台",
    purpose: "近况与需要关注的事",
    icon: Home,
  },
  {
    id: "character",
    label: "人设与说话方式",
    name: "卿本星辰",
    purpose: "名字、人设与相处方式",
    icon: UserRound,
  },
  {
    id: "chat-rules",
    label: "聊天与连续接听",
    name: "言有缓急",
    purpose: "接收消息、分段回复与等待",
    icon: SlidersHorizontal,
  },
  {
    id: "qq",
    label: "QQ 连接与群聊",
    name: "鹊桥结契",
    purpose: "连接QQ，选择好友与群聊",
    icon: MessagesSquare,
  },
  {
    id: "expressions",
    label: "表情包",
    name: "眉目传情",
    purpose: "常用表情与收藏",
    icon: Smile,
  },
  {
    id: "state",
    label: "情绪与体感",
    name: "心潮晴雨",
    purpose: "最近的感受、原因与变化",
    icon: Activity,
  },
  {
    id: "vision",
    label: "看图与视频",
    name: "万象入眸",
    purpose: "图片、动图和视频理解",
    icon: Eye,
  },
  {
    id: "hearing",
    label: "听语音",
    name: "听风知意",
    purpose: "接收语音并转成文字",
    icon: Headphones,
  },
  {
    id: "media",
    label: "说话与音色",
    name: "清音寄意",
    purpose: "文字转语音与音色",
    icon: AudioLines,
  },
  {
    id: "singing",
    label: "唱歌与曲库",
    name: "弦歌入梦",
    purpose: "选歌、曲库与翻唱",
    icon: Music2,
  },
  {
    id: "intentions",
    label: "自主活动",
    name: "逐光而行",
    purpose: "她想做什么、做到了哪一步",
    icon: Heart,
  },
  {
    id: "bili",
    label: "B站",
    name: "山海来信",
    purpose: "账号、浏览、分享与发布",
    icon: Globe2,
  },
  {
    id: "bili-activities",
    label: "B站浏览与分享",
    name: "漫游拾趣",
    purpose: "浏览时间与分享对象",
    icon: Eye,
  },
  {
    id: "bili-publish",
    label: "B站发布与互动",
    name: "寄语人间",
    purpose: "评论、私信与动态",
    icon: Radio,
  },
  {
    id: "bridge",
    label: "跨平台分享",
    name: "星桥传笺",
    purpose: "将已授权内容分享到QQ",
    icon: Link2,
  },
  {
    id: "memory",
    label: "笔记与日记",
    name: "星海拾忆",
    purpose: "阅读经历与持续形成的长期理解",
    icon: Orbit,
  },
  {
    id: "memory-care",
    label: "日记与记忆设置",
    name: "拾光成册",
    purpose: "日记时间与笔记维护",
    icon: Clock3,
  },
  {
    id: "chat-sharing",
    label: "共享与隐私",
    name: "同一片星空",
    purpose: "同一角色跨平台的记忆范围",
    icon: Link2,
  },
  {
    id: "settings",
    label: "查找功能与设置",
    name: "万象星枢",
    purpose: "按想做的事情寻找入口",
    icon: Settings2,
  },
  {
    id: "permissions",
    label: "能力授权",
    name: "信契有度",
    purpose: "允许角色使用哪些能力",
    icon: ShieldCheck,
  },
  {
    id: "appearance",
    label: "外观与性能",
    name: "星庭设色",
    purpose: "背景、动效与性能",
    icon: Palette,
  },
  {
    id: "maintenance",
    label: "备份与排查",
    name: "藏星问脉",
    purpose: "备份数据与检查异常",
    icon: Wrench,
  },
];
export const workspaces = [
  {
    id: "chat",
    name: "回廊共语",
    label: "聊天",
    entry: "chat-rules",
    pages: ["character", "chat-rules", "qq", "expressions"],
    primary: ["character", "chat-rules", "qq", "expressions"],
    caption: "人设、聊天方式与QQ",
  },
  {
    id: "senses",
    name: "心观万象",
    label: "感受与表达",
    entry: "state",
    pages: ["state", "vision", "hearing", "media", "singing"],
    primary: ["state", "vision", "hearing", "media", "singing"],
    caption: "情绪、看图、听语音和声音",
  },
  {
    id: "agency",
    name: "逐光而行",
    label: "自主活动",
    entry: "intentions",
    pages: ["intentions", "bili", "bili-activities", "bili-publish", "bridge"],
    primary: ["intentions", "bili", "bridge"],
    caption: "她的心事、平台活动与分享",
  },
  {
    id: "memory",
    name: "星海拾忆",
    label: "记忆",
    entry: "memory",
    pages: ["memory", "memory-care", "chat-sharing"],
    primary: ["memory", "memory-care", "chat-sharing"],
    caption: "自由笔记、日记与长期理解",
  },
];
export const commonPages = [
  "settings",
  "permissions",
  "appearance",
  "maintenance",
];
const redirects: Record<string, string> = {
  platforms: "qq",
  conversation: "chat-rules",
  "host-chat": "chat-rules",
  "qq-private": "qq",
  "qq-group": "qq",
  "chat-context": "chat-rules",
  "memory-sync": "memory-care",
  browser: "settings",
};
export function resolvePage(page: string) {
  return (
    redirects[page] ||
    (navigation.some((item) => item.id === page) ? page : "overview")
  );
}
export const poems: Record<string, [string, string, string]> = {
  character: ["有美一人", "清扬婉兮", "《诗经》"],
  memory: ["此情可待成追忆", "只是当时已惘然", "李商隐《锦瑟》"],
  state: ["人有悲欢离合", "月有阴晴圆缺", "苏轼《水调歌头》"],
  intentions: ["长风破浪会有时", "直挂云帆济沧海", "李白《行路难》"],
  "chat-rules": ["大弦嘈嘈如急雨", "小弦切切如私语", "白居易《琵琶行》"],
  "chat-sharing": ["但愿人长久", "千里共婵娟", "苏轼《水调歌头》"],
  qq: ["桃花潭水深千尺", "不及汪伦送我情", "李白《赠汪伦》"],
  bili: ["欲穷千里目", "更上一层楼", "王之涣《登鹳雀楼》"],
  media: ["此曲只应天上有", "人间能得几回闻", "杜甫《赠花卿》"],
  hearing: ["空山不见人", "但闻人语响", "王维《鹿柴》"],
  vision: ["行到水穷处", "坐看云起时", "王维《终南别业》"],
  singing: ["嘈嘈切切错杂弹", "大珠小珠落玉盘", "白居易《琵琶行》"],
  expressions: ["巧笑倩兮", "美目盼兮", "《诗经》"],
  maintenance: ["明月松间照", "清泉石上流", "王维《山居秋暝》"],
  permissions: ["从心所欲", "不逾矩", "《论语》"],
  appearance: ["星垂平野阔", "月涌大江流", "杜甫《旅夜书怀》"],
  "memory-care": ["随风潜入夜", "润物细无声", "杜甫《春夜喜雨》"],
  settings: ["问渠那得清如许", "为有源头活水来", "朱熹《观书有感》"],
  bridge: ["海内存知己", "天涯若比邻", "王勃《送杜少府之任蜀州》"],
};
export function fieldRoute(page: string) {
  if (page === "qq" || page === "chat-social") return "qq";
  if (["appearance", "permissions"].includes(page)) return page;
  if (
    page === "memory" ||
    page.startsWith("memory-job") ||
    page.startsWith("jobs")
  )
    return "memory-care";
  if (["state", "agency"].includes(page)) return "intentions";
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
