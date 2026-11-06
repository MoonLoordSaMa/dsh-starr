import type {
  StateValues,
  Organism,
  EmotionKey,
  evaluateIntentions,
} from "../src/starrcore/organism";
export type Config = Record<string, string | number | boolean>;
export type Character = {
  id: string;
  name: string;
  persona: string;
  config: Config;
  created: string;
  revision: number;
};
export type Memory = {
  id: string;
  title: string;
  content: string;
  kind: string;
  importance: number;
  confidence: number;
  anchor: number;
  source: string;
  created: string;
  score: number;
  revision: number;
  visibility?: string;
  visibility_session?: string;
};
export type Link = {
  source: string;
  target: string;
  kind: string;
  weight: number;
};
export type State = StateValues & {
  revision: number;
  updatedAt: string;
  observedAt: string;
  organism: Organism;
  experienceTrace: Partial<Record<EmotionKey, number>>;
};
export type Intentions = ReturnType<typeof evaluateIntentions>;
export type Goal = {
  id: string;
  title: string;
  reason: string;
  status: string;
  due: string | null;
  drive?: string | null;
  action?: string;
  external?: boolean;
  updated?: string;
  created: string;
};
export type Overview = {
  character: Character;
  state: State;
  memories: Memory[];
  goals: Goal[];
  counts: { memories: number; links: number; pending: number };
};
export type Field = {
  key: string;
  label: string;
  type: string;
  default: string | number | boolean;
  page: string;
  help: string;
  min?: number;
  max?: number;
  options?: string[];
  bot?: boolean;
};
export type Bootstrap = {
  version: string;
  stage: string;
  host?: { connected: boolean };
  installation: { memoryRoot: string; backupRoot: string } | null;
  characters: Pick<Character, "id" | "name" | "revision">[];
  fields: Field[];
  recommended: { memoryRoot: string; backupRoot: string };
  onboarding: OnboardingState;
};
export type CheckResult = {
  status: string;
  detail: string;
  checkedAt?: string;
  code?: string;
};
export type OnboardingState = {
  revision: number;
  step: number;
  completedAt: string | null;
  characterId: string | null;
  required: boolean;
  installed: boolean;
  preset: CheckResult;
  draft: {
    name: string;
    persona: string;
    timezone: string;
    memoryRoot: string;
    backupRoot: string;
    allowExistingVault: boolean;
    httpPort: number;
    wsPort: number;
    snowluma: string;
    bili: string;
    media: string;
    qqProvider: string;
    qqModel: string;
    qqTokenEnv: string;
    qqPrivateUsers: string;
    qqGroups: string;
    qqEnabled: boolean;
  };
  checks: Record<string, CheckResult>;
};
export type Expression = {
  id: string;
  name: string;
  tags: string;
  favorite: number;
  mime: string;
  bytes: number;
  created: string;
};
export const kindNames: Record<string, string> = {
  moment: "浮生一刻",
  person: "故人星影",
  promise: "星下之约",
  interest: "心向之光",
  diary: "朝暮手札",
  summary: "流年回眸",
  self: "照见此身",
};
export const kindColors: Record<string, string> = {
  moment: "#8fbaff",
  person: "#d8a3dd",
  promise: "#f3c77e",
  interest: "#a8a0f4",
  diary: "#83cdbb",
  summary: "#dae6ff",
  self: "#eac49f",
};
// 宿主内嵌与独立控制台共用构建，所有资源都跟随当前挂载路径。
export const apiUrl = (url: string) =>
  new URL(url.replace(/^\/+/, ""), document.baseURI).href;
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(url), {
    ...options,
    headers: {
      ...(options.body && typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "服务没有响应，请检查连接" }));
    throw new Error(error.error);
  }
  return response.json();
}
export const json = (value: unknown) => JSON.stringify(value);
export const date = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
