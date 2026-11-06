import { BiliLogin } from "./BiliLogin";
import { Disclosure } from "./components";
import { LocalModelDiscovery } from "./LocalModelDiscovery";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  api,
  json,
  type Bootstrap,
  type OnboardingState,
  type CheckResult,
  type Character,
} from "./types";
import { Star, Badge, Select } from "./components";
import "./onboarding.css";

const steps = [
  "连接 QQ",
  "创建角色",
  "写下人格",
  "安放记忆",
  "连接 B站",
  "扩展感官",
  "准备出发",
];
const statusNames: Record<string, string> = {
  verified: "检查通过",
  reachable: "端口可达",
  unreachable: "尚未连通",
  failed: "调用失败",
  partial: "部分通过",
  registered: "已注册",
  registering: "注册中",
  standalone: "独立预览",
  unavailable: "待配置",
  error: "需要处理",
};
const personaTemplate = (name: string) =>
  `你叫「${name}」，有自己的偏好、表达节奏和判断\n\n自然交流，结合语境决定说多少；可以主动提出小建议，也可以安静倾听\n不确定的事情先问清楚，不编造经历、记忆、身份或工具执行结果\n记得真正发生、值得留下的事；只有自然相关时才提起过往\n被问到 AI 身份与能力时如实回答，亲昵与玩笑尊重对方的意愿`;

function Result({ value }: { value?: CheckResult }) {
  if (!value) return null;
  return (
    <div
      className={`guide-result ${["verified", "reachable", "registered"].includes(value.status) ? "good" : ""}`}
      role="status"
    >
      <Badge>{statusNames[value.status] || "未验证"}</Badge>
      <p>{value.detail}</p>
      {value.code && <code>{value.code}</code>}
    </div>
  );
}

export function OnboardingWizard({
  data,
  onDone,
}: {
  data: Bootstrap;
  onDone: () => void;
}) {
  const [state, setState] = useState<OnboardingState>(data.onboarding);
  const [draft, setDraft] = useState(data.onboarding.draft);
  const [selected, setSelected] = useState(data.onboarding.characterId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qqToken, setQQToken] = useState("");
  const [preset, setPreset] = useState(data.onboarding.preset);
  const [catalog, setCatalog] = useState<
    { id: string; name: string; models: { id: string; name: string }[] }[]
  >([]);
  const [media, setMedia] = useState({
    "media.baseUrl": "",
    "media.secretEnv": "",
    "tts.model": "",
    "asr.model": "",
    "vision.model": "",
  });
  const [mediaRevision, setMediaRevision] = useState<number | null>(null);
  const [mediaChanges, setMediaChanges] = useState<string[]>([]);
  const [mediaSaved, setMediaSaved] = useState(false);
  const [mediaRefresh, setMediaRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setMediaRevision(null);
    setMediaChanges([]);
    setMediaSaved(false);
    if (state.characterId)
      api<Character>(`/api/characters/${state.characterId}`)
        .then((character) => {
          if (!active) return;
          setMedia(
            (current) =>
              Object.fromEntries(
                Object.keys(current).map((key) => [
                  key,
                  String(character.config[key] ?? ""),
                ]),
              ) as typeof current,
          );
          setMediaRevision(character.revision);
        })
        .catch(() => {
          if (active) setError("扩展模型配置读取失败，请重新读取进度后再试");
        });
    return () => {
      active = false;
    };
  }, [state.characterId, mediaRefresh]);
  const characterOptions =
    data.characters.some((character) => character.id === state.characterId) ||
    !state.characterId
      ? data.characters
      : [
          ...data.characters,
          { id: state.characterId, name: state.draft.name, revision: 1 },
        ];
  const step = state.step;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  const adopt = (next: OnboardingState) => {
    setState(next);
    setDraft(next.draft);
    return next;
  };
  const save = async (nextStep = step) =>
    adopt(
      await api<OnboardingState>("/api/onboarding", {
        method: "PATCH",
        body: json({
          revision: state.revision,
          step: nextStep,
          draft,
          ...(selected ? { characterId: selected } : {}),
        }),
      }),
    );
  const run = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const next = () =>
    run(async () => {
      if (
        step === 0 &&
        draft.snowluma === "configure" &&
        (!["reachable", "verified"].includes(
          state.checks.snowluma?.status || "",
        ) ||
          draft.httpPort !== state.draft.httpPort ||
          draft.wsPort !== state.draft.wsPort ||
          draft.qqTokenEnv !== state.draft.qqTokenEnv ||
          qqToken)
      )
        throw new Error("请先检测当前端口，或选择稍后接入 QQ");
      if (step === 1 && !draft.name.trim() && !selected)
        throw new Error("先给角色取个名字吧");
      if (step === 2 && !draft.persona.trim() && !selected)
        throw new Error("请填写人格，或使用一份基础模板再调整");
      if (step === 5 && draft.media === "configure" && mediaChanges.length)
        throw new Error("请先保存扩展模型配置，或选择跳过，之后再配");
      if (step === 3) {
        let current = await save();
        if (!current.installed)
          current = adopt(
            await api<OnboardingState>("/api/onboarding/character", {
              method: "POST",
              body: json({ revision: current.revision }),
            }),
          );
        if (!current.characterId) throw new Error("请选择现有角色");
        setSelected(current.characterId);
        current = adopt(
          await api<OnboardingState>("/api/onboarding/memory", {
            method: "POST",
          }),
        );
        adopt(
          await api<OnboardingState>("/api/onboarding", {
            method: "PATCH",
            body: json({ revision: current.revision, step: 4 }),
          }),
        );
      } else await save(Math.min(6, step + 1));
    });
  const snow = () =>
    run(async () => {
      await save();
      adopt(
        await api<OnboardingState>("/api/onboarding/snowluma", {
          method: "POST",
          body: json({ token: qqToken || undefined }),
        }),
      );
      setQQToken("");
    });
  const loadModels = () =>
    run(async () => {
      const result = await api<{ providers: typeof catalog; detail: string }>(
        "/api/onboarding/models",
      );
      setCatalog(result.providers);
      if (!result.providers.length) setError(result.detail);
    });
  const testModel = () =>
    run(async () => {
      await save();
      adopt(
        await api<OnboardingState>("/api/onboarding/model-test", {
          method: "POST",
        }),
      );
    });
  const finish = () =>
    run(async () => {
      const current = await save(6);
      adopt(
        await api<OnboardingState>("/api/onboarding/finish", {
          method: "POST",
          body: json({ revision: current.revision }),
        }),
      );
      localStorage.removeItem("starr-onboarding");
      onDone();
    });
  return (
    <div className="onboarding onboarding-v2">
      <header className="guide-brand">
        <Star />
        <div>
          <strong>starr</strong>
          <span>初次相遇 · 新手调试</span>
        </div>
        {data.installation && (
          <button
            className="ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await save();
                onDone();
              })
            }
          >
            暂收此卷
          </button>
        )}
      </header>
      <div className="guide-layout">
        <aside className="guide-steps panel" aria-label="新手调试步骤">
          <small>把相遇，慢慢安顿好</small>
          <h1>七步，点亮她的世界</h1>
          <p>资料由插件保存，随时可以回来继续</p>
          <ol>
            {steps.map((name, index) => (
              <li key={name} aria-current={step === index ? "step" : undefined}>
                <span>
                  {index < step ? (
                    <Check size={14} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <strong>{name}</strong>
                  <small>
                    {index === 4 || index === 5
                      ? "可稍后配置"
                      : index === 3
                        ? "独立目录与备份"
                        : "按引导完成"}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <div className="guide-preset">
            <span>安装时自动准备</span>
            <code>会话回廊</code>
            <Result value={preset} />
            <button
              className="ghost"
              disabled={busy}
              onClick={() =>
                run(async () =>
                  setPreset(
                    await api<CheckResult>("/api/onboarding/preset", {
                      method: "POST",
                    }),
                  ),
                )
              }
            >
              <RefreshCw size={14} />
              试照星枢
            </button>
          </div>
        </aside>
        <section
          className="guide-main panel"
          aria-labelledby="guide-title"
          aria-busy={busy}
        >
          <div className="guide-eyebrow">
            第 {step + 1} / 7 步{" "}
            <span>{step === 4 || step === 5 ? "选配能力" : "安顿基础"}</span>
          </div>
          <div className="guide-stage" key={step}>
            {step === 0 ? (
              <>
                <h2 id="guide-title">先让 QQ 的门，轻轻打开</h2>
                <p className="intro">
                  SnowLuma 负责登录 QQ，starr
                  负责收件、角色对话与回复。填写一次，之后由插件维护连接
                </p>
                <div className="guide-choice">
                  <button
                    className={draft.snowluma === "configure" ? "selected" : ""}
                    aria-pressed={draft.snowluma === "configure"}
                    onClick={() => update("snowluma", "configure")}
                  >
                    此刻结鹊桥
                  </button>
                  <button
                    className={draft.snowluma === "later" ? "selected" : ""}
                    aria-pressed={draft.snowluma === "later"}
                    onClick={() => update("snowluma", "later")}
                  >
                    暂歇渡口
                  </button>
                </div>
                {draft.snowluma === "configure" ? (
                  <>
                    <ol className="guide-tutorial">
                      <li>
                        安装并启动 SnowLuma，在它的界面登录机器人的 QQ 账号
                      </li>
                      <li>
                        打开 OneBot 配置，启用 HTTP 服务与正向 WebSocket
                        服务，地址使用本机 127.0.0.1
                      </li>
                      <li>
                        将端口填在下方并检测。访问令牌在 SnowLuma
                        与后续连接设置中管理，不要贴进聊天提示词
                      </li>
                    </ol>
                    <div className="form-columns">
                      <label className="field">
                        鹊桥收信埠
                        <input
                          type="number"
                          min={1}
                          max={65535}
                          value={draft.httpPort}
                          onChange={(e) => update("httpPort", +e.target.value)}
                        />
                      </label>
                      <label className="field">
                        鹊桥应答埠
                        <input
                          type="number"
                          min={1}
                          max={65535}
                          value={draft.wsPort}
                          onChange={(e) => update("wsPort", +e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="field">
                      鹊桥信钥
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={qqToken}
                        onChange={(event) => setQQToken(event.target.value)}
                        placeholder="与 SnowLuma 中一致；已保存时留空"
                      />
                      <small>
                        Windows
                        下由系统加密保存，不进入人格提示词或网页返回值。未设置令牌的本机服务可留空
                      </small>
                    </label>
                    <div className="form-columns">
                      <label className="field">
                        私语故人
                        <input
                          value={draft.qqPrivateUsers}
                          onChange={(event) =>
                            update("qqPrivateUsers", event.target.value)
                          }
                          placeholder="你的 QQ 号，多个用逗号分隔"
                        />
                      </label>
                      <label className="field">
                        同席之所（选填）
                        <input
                          value={draft.qqGroups}
                          onChange={(event) =>
                            update("qqGroups", event.target.value)
                          }
                          placeholder="默认只处理群内 @ 她的消息"
                        />
                      </label>
                    </div>
                    <details className="guide-note">
                      <summary>使用环境变量管理令牌</summary>
                      <label className="field">
                        信钥藏名
                        <input
                          value={draft.qqTokenEnv}
                          onChange={(event) =>
                            update("qqTokenEnv", event.target.value)
                          }
                        />
                      </label>
                      <small>
                        填写变量名即可，变量中的值优先于本机加密令牌
                      </small>
                    </details>
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={draft.qqEnabled}
                        onChange={(event) =>
                          update("qqEnabled", event.target.checked)
                        }
                      />
                      完成向导后，自动回复上述私聊与群内 @ 消息
                    </label>
                    <button className="ghost" disabled={busy} onClick={snow}>
                      <RefreshCw size={15} />
                      验看鹊桥信契
                    </button>
                    <Result value={state.checks.snowluma} />
                    <p className="footnote">
                      通常是 3000 / 3001，以你的 SnowLuma 设置为准。17844
                      是旧独立桥接的端口，新插件直接连接
                      SnowLuma。成功检测后，还需在“扩展感官”选择 QQ 聊天模型
                    </p>
                  </>
                ) : (
                  <p className="footnote">
                    本步已选择稍后连接。现在只创建角色，不启用QQ自动回复；需要接入时点击“现在连接
                    QQ”再填写与检测
                  </p>
                )}
              </>
            ) : step === 1 ? (
              <>
                <h2 id="guide-title">从一个名字，开始认识她</h2>
                <p className="intro">
                  角色身份会保持稳定，之后可以改名，不会丢失她的记忆
                </p>
                {state.installed ? (
                  <>
                    <Select
                      label="重逢旧星"
                      value={selected}
                      onChange={(value) =>
                        run(async () => {
                          if (!value) {
                            setSelected("");
                            return;
                          }
                          const character = await api<Character>(
                            `/api/characters/${value}`,
                          );
                          setSelected(value);
                          setDraft((old) => ({
                            ...old,
                            name: character.name,
                            persona: character.persona,
                            ...data.installation,
                          }));
                        })
                      }
                      options={[
                        { value: "", label: "选择已创建的角色" },
                        ...characterOptions.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                    />
                    <p>
                      已有资料不会被本向导覆盖。需要创建其他角色时，可以在正式控制台操作
                    </p>
                  </>
                ) : (
                  <>
                    <label className="field">
                      星之名
                      <input
                        maxLength={40}
                        value={draft.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="例如：starr"
                      />
                    </label>
                    <label className="field">
                      更漏所在
                      <input
                        value={draft.timezone}
                        onChange={(e) => update("timezone", e.target.value)}
                      />
                      <small>
                        默认北京时间，可填写 Asia/Shanghai 等时区名称
                      </small>
                    </label>
                    <p className="footnote">
                      角色资料先保存在调试草稿中，选定记忆目录后一起创建
                    </p>
                  </>
                )}
              </>
            ) : step === 2 ? (
              <>
                <h2 id="guide-title">让她，拥有自己的说话方式</h2>
                <p className="intro">
                  写下性格、偏好、相处方式和分寸。工具与配置规则由插件负责，不必塞进人格里
                </p>
                <label className="field">
                  星魂入笺
                  <textarea
                    rows={11}
                    maxLength={20000}
                    value={draft.persona}
                    disabled={state.installed}
                    onChange={(e) => update("persona", e.target.value)}
                    placeholder="她喜欢什么，如何回应，有哪些自己的坚持……"
                  />
                  <small>{draft.persona.length} / 20000 字符</small>
                </label>
                {!state.installed && (
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      update("persona", personaTemplate(draft.name))
                    }
                  >
                    <Sparkles size={14} />
                    借笺起笔
                  </button>
                )}
                {state.installed && (
                  <p className="footnote">
                    这里预览已有角色的人格。修改请在“角色”页面保存，避免向导覆盖旧资料
                  </p>
                )}
              </>
            ) : step === 3 ? (
              <>
                <h2 id="guide-title">给记忆，一个安稳的家</h2>
                <p className="intro">
                  记忆和备份分开放置。推荐选择 Obsidian
                  库，普通文件夹也完全可以使用
                </p>
                <label className="field">
                  星海归处
                  <input
                    value={
                      state.installed
                        ? data.installation?.memoryRoot || draft.memoryRoot
                        : draft.memoryRoot
                    }
                    disabled={state.installed}
                    onChange={(e) => update("memoryRoot", e.target.value)}
                  />
                  <small>
                    填写本机绝对路径。每个角色使用自己的子目录，笔记与双链可由
                    Obsidian 浏览
                  </small>
                </label>
                <label className="field">
                  藏星之所
                  <input
                    value={
                      state.installed
                        ? data.installation?.backupRoot || draft.backupRoot
                        : draft.backupRoot
                    }
                    disabled={state.installed}
                    onChange={(e) => update("backupRoot", e.target.value)}
                  />
                  <small>选择独立的新目录，不能与记忆库相同或互相嵌套</small>
                </label>
                {!state.installed && (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.allowExistingVault}
                      onChange={(e) =>
                        update("allowExistingVault", e.target.checked)
                      }
                    />
                    旧笺续卷
                  </label>
                )}
                <p className="footnote">
                  使用已有库时会检查 .obsidian
                  标记，仅创建新的角色子目录。普通非空目录会拒绝覆盖；目录初始化后，本向导不会擅自搬动数据
                </p>
                <Result value={state.checks.memory} />
              </>
            ) : step === 4 ? (
              <>
                <h2 id="guide-title">也可以，看看 B站的世界</h2>
                <p className="intro">
                  先选择是否使用
                  B站。登录、浏览能力与对外互动各自确认，不会替你发评论或动态
                </p>
                <div className="guide-choice">
                  <button
                    className={draft.bili === "configure" ? "selected" : ""}
                    onClick={() => update("bili", "configure")}
                  >
                    愿赴山海
                  </button>
                  <button
                    className={draft.bili === "later" ? "selected" : ""}
                    onClick={() => update("bili", "later")}
                  >
                    暂缓此笺
                  </button>
                </div>
                {draft.bili === "configure" && state.characterId && (
                  <BiliLogin
                    characterId={state.characterId}
                    enabled={!!data.host?.connected}
                  />
                )}
                <ol className="guide-tutorial">
                  <li>在本页用手机扫码，亲自确认角色所用账号</li>
                  <li>
                    也可在“会话回廊 → 山海来信”重新扫码，或使用高级凭据入口
                  </li>
                  <li>
                    选择模型与允许互动的用户，再按需要开启私信、评论、直播、分享与动态
                  </li>
                </ol>
                <a
                  className="button ghost"
                  href="https://www.bilibili.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  启卷山海 <ExternalLink size={14} />
                </a>
                <div className="guide-note">
                  <AlertCircle size={18} />
                  <p>
                    扫码只保存账号凭据；模型、互动对象和平台权限在专门页面配置。
                    浏览器登录不会自动变成插件登录，验证账号也不会自动开启对外互动
                  </p>
                </div>
              </>
            ) : step === 5 ? (
              <>
                <h2 id="guide-title">听见、说出，或先聊聊天</h2>
                <p className="intro">
                  扩展模型可以跳过；聊天模型使用 DSH
                  已有连接，先检测后台调用能否工作
                </p>
                <h3>鹊桥试笺</h3>
                <button className="ghost" disabled={busy} onClick={loadModels}>
                  <RefreshCw size={14} />
                  寻访灯下灵枢
                </button>
                <div className="form-columns">
                  <Select
                    label="言语渡口"
                    value={draft.qqProvider}
                    onChange={(value) => {
                      update("qqProvider", value);
                      update("qqModel", "");
                    }}
                    options={[
                      { value: "", label: "选择已有连接" },
                      ...catalog.map((p) => ({
                        value: p.id,
                        label: p.name || p.id,
                      })),
                    ]}
                  />
                  <Select
                    label="执笺灵枢"
                    value={draft.qqModel}
                    onChange={(value) => update("qqModel", value)}
                    options={[
                      { value: "", label: "选择模型" },
                      ...(catalog
                        .find((p) => p.id === draft.qqProvider)
                        ?.models.map((m) => ({
                          value: m.id,
                          label: m.name || m.id,
                        })) || []),
                    ]}
                  />
                </div>
                <button
                  className="ghost"
                  disabled={busy || !draft.qqModel}
                  onClick={testModel}
                >
                  试问灵枢
                </button>
                <p className="footnote">
                  点击才会发送一条不含私人记忆的测试请求，可能消耗少量模型额度。测试不发送
                  QQ 消息、不更改 DSH 的默认模型，也不等于完整会话验收
                </p>
                <Result value={state.checks.model} />
                <h3>声色四时</h3>
                <div className="guide-choice">
                  <button
                    className={draft.media === "configure" ? "selected" : ""}
                    onClick={() => update("media", "configure")}
                  >
                    此刻添灵枢
                  </button>
                  <button
                    className={draft.media === "later" ? "selected" : ""}
                    onClick={() => update("media", "later")}
                  >
                    留待来日
                  </button>
                </div>
                {draft.media === "configure" && (
                  <div className="guide-media">
                    <Disclosure title="寻访近处灵枢">
                      <LocalModelDiscovery
                        onChoose={(patch) => {
                          setMedia((old) => ({ ...old, ...patch }));
                          setMediaSaved(false);
                        }}
                      />
                    </Disclosure>
                    {Object.entries({
                      "media.baseUrl": "兼容服务地址，通常以 /v1 结尾",
                      "media.secretEnv": "密钥环境变量名，可留空",
                      "tts.model": "说话模型",
                      "asr.model": "听写模型",
                      "vision.model": "看图模型",
                    }).map(([key, label]) => (
                      <label className="field" key={key}>
                        {label}
                        <input
                          value={media[key as keyof typeof media]}
                          disabled={busy || mediaRevision === null}
                          onChange={(e) => {
                            setMedia((old) => ({
                              ...old,
                              [key]: e.target.value,
                            }));
                            setMediaChanges((keys) => [
                              ...new Set([...keys, key]),
                            ]);
                            setMediaSaved(false);
                          }}
                        />
                      </label>
                    ))}
                    <button
                      className="ghost"
                      disabled={
                        busy || mediaRevision === null || !mediaChanges.length
                      }
                      onClick={() =>
                        run(async () => {
                          const character = await api<Character>(
                            `/api/characters/${state.characterId}/config`,
                            {
                              method: "PATCH",
                              body: json({
                                revision: mediaRevision,
                                patch: Object.fromEntries(
                                  mediaChanges.map((key) => [
                                    key,
                                    media[key as keyof typeof media],
                                  ]),
                                ),
                              }),
                            },
                          );
                          setMediaRevision(character.revision);
                          setMediaChanges([]);
                          setMediaSaved(true);
                          await save();
                        })
                      }
                    >
                      落定灵枢
                    </button>
                    {mediaSaved && (
                      <p role="status">
                        扩展模型配置已保存，实际调用仍需分别验证
                      </p>
                    )}
                    <p className="footnote">
                      密钥本身在启动环境或 DSH 中管理。填写后请在“TA
                      的五官”分别试听、听写和看图。唱歌与变声驱动尚待接入，不因填写模型名就启用
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 id="guide-title">星河已有归处，慢慢相识吧</h2>
                <p className="intro">
                  基础资料已留下。未通过的连接会保留真实状态，之后可从“新手调试”继续检查
                </p>
                <div className="guide-summary">
                  <span>
                    角色<strong>{draft.name}</strong>
                  </span>
                  <span>
                    拾星阁
                    <strong>
                      {data.installation?.memoryRoot || draft.memoryRoot}
                    </strong>
                  </span>
                  <span>
                    藏星之所
                    <strong>
                      {data.installation?.backupRoot || draft.backupRoot}
                    </strong>
                  </span>
                  <span>
                    SnowLuma
                    <strong>
                      {draft.snowluma === "later"
                        ? "稍后接入"
                        : statusNames[state.checks.snowluma?.status] ||
                          "未检测"}
                    </strong>
                  </span>
                  <span>
                    B站
                    <strong>
                      {draft.bili === "later" ? "已跳过" : "待配置账号与权限"}
                    </strong>
                  </span>
                  <span>
                    别有灵枢
                    <strong>
                      {draft.media === "later"
                        ? "已跳过"
                        : "需在能力页分别验证"}
                    </strong>
                  </span>
                  <span>
                    鹊桥应答
                    <strong>
                      {draft.snowluma === "configure" && draft.qqEnabled
                        ? "完成后启用 · 仅限允许的对话"
                        : "未启用"}
                    </strong>
                  </span>
                </div>
                <Result value={state.checks.model} />
                <div className="guide-note">
                  <AlertCircle size={18} />
                  <p>
                    完成后进入控制台。如果你已勾选自动回复，插件将按允许名单接收消息，再交给绑定角色处理；发送结果与失败原因可以在“对话”查看
                  </p>
                </div>
              </>
            )}
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
              <button
                className="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    adopt(await api<OnboardingState>("/api/onboarding"));
                    setMediaRefresh((value) => value + 1);
                    setError("");
                  })
                }
              >
                重拾此程
              </button>
            </p>
          )}
          <footer className="guide-footer">
            {step > 0 ? (
              <button
                className="ghost"
                disabled={busy}
                onClick={() => run(() => save(step - 1))}
              >
                <ArrowLeft size={14} />
                回看前笺
              </button>
            ) : (
              <small>QQ 可以稍后连接</small>
            )}
            <button
              className="primary"
              disabled={busy || (step === 1 && state.installed && !selected)}
              onClick={step === 6 ? finish : next}
            >
              {busy
                ? "星事未歇…"
                : step === 6
                  ? "星河启卷"
                  : step === 3
                    ? state.installed
                      ? "验阁续程"
                      : "点星筑阁"
                    : (step === 4 && draft.bili === "later") ||
                        (step === 5 && draft.media === "later")
                      ? "落笺续程"
                      : "循光续程"}
              {!busy && <ArrowRight size={15} />}
            </button>
          </footer>
        </section>
      </div>
      <p className="wizard-note">相逢一醉是前缘，风雨散、飘然何处</p>
    </div>
  );
}
