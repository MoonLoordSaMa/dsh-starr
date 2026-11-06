import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, RefreshCw, Check, X } from "lucide-react";
import { api } from "./types";

type Login = { id: string; url: string; expiresAt: number; status: string };
export function BiliLogin({
  characterId,
  enabled = true,
  onSaved,
}: {
  characterId: string;
  enabled?: boolean;
  onSaved?: () => void;
}) {
  const [login, setLogin] = useState<Login | null>(null);
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const saved = useRef(onSaved);
  saved.current = onSaved;
  const root = `/api/characters/${characterId}/bili/login`;
  useEffect(() => {
    generation.current++;
    setLogin(null);
    setImage("");
    setStatus("idle");
    setError("");
    setBusy(false);
    return () => {
      generation.current++;
    };
  }, [characterId]);
  useEffect(() => {
    if (!login) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const poll = async () => {
      if (!active) return;
      if (Date.now() >= login.expiresAt) {
        setStatus("expired");
        return;
      }
      if (document.hidden) {
        timer = setTimeout(poll, 2500);
        return;
      }
      try {
        const value = await api<{ status: string; account?: { name: string } }>(
          `${root}/${login.id}`,
          { method: "POST", signal: abort.signal },
        );
        if (!active) return;
        setStatus(value.status);
        setError("");
        if (value.status === "saved") {
          saved.current?.();
          return;
        }
        if (value.status === "expired") return;
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
      }
      timer = setTimeout(poll, 2800);
    };
    timer = setTimeout(poll, 2800);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
      void api(`${root}/${login.id}`, { method: "DELETE" }).catch(() => {});
    };
  }, [login, root]);
  const cancel = async () => {
    generation.current++;
    const current = login;
    setLogin(null);
    setImage("");
    setStatus("idle");
    setBusy(false);
    if (current)
      await api(`${root}/${current.id}`, { method: "DELETE" }).catch(() => {});
  };
  return (
    <div className="bili-qr-login">
      <div className="qr-copy">
        <strong>B站快捷扫码登录</strong>
        <p>
          使用哔哩哔哩手机端扫码并确认，账号核验后加密保存在本机。扫码不会开启自动回复，也不会发送消息
        </p>
        {!enabled && <small>请在 DSH 中打开此页后扫码</small>}
        {status === "saved" ? (
          <p className="qr-success" role="status">
            <Check size={16} /> 账号已核验，登录凭据已加密保存
          </p>
        ) : (
          <button
            className="primary"
            disabled={busy || !enabled}
            onClick={async () => {
              const currentGeneration = ++generation.current;
              setBusy(true);
              setError("");
              setLogin(null);
              setImage("");
              try {
                const result = await api<Login>(root, { method: "POST" });
                const code = await QRCode.toDataURL(result.url, {
                  width: 224,
                  margin: 3,
                  errorCorrectionLevel: "M",
                  color: { dark: "#111827", light: "#fffaf2" },
                });
                if (generation.current !== currentGeneration) {
                  void api(`${root}/${result.id}`, { method: "DELETE" }).catch(
                    () => {},
                  );
                  return;
                }
                setLogin(result);
                setImage(code);
                setStatus("waiting");
              } catch (e) {
                if (generation.current === currentGeneration)
                  setError((e as Error).message);
              } finally {
                if (generation.current === currentGeneration) setBusy(false);
              }
            }}
          >
            {login ? <RefreshCw size={15} /> : <QrCode size={15} />}{" "}
            {busy ? "正在生成…" : login ? "重新生成二维码" : "生成登录二维码"}
          </button>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
      </div>
      {image && status !== "saved" && (
        <div className={`qr-card ${status === "expired" ? "expired" : ""}`}>
          <img
            src={image}
            alt="使用哔哩哔哩手机端扫描的登录二维码"
            width={192}
            height={192}
          />
          <p role="status">
            {status === "confirming"
              ? "已扫码，请在手机上确认"
              : status === "expired"
                ? "二维码已过期，请重新生成"
                : "等待扫码 · 三分钟内有效"}
          </p>
          <button className="text-link" onClick={cancel}>
            <X size={12} /> 取消扫码
          </button>
        </div>
      )}
    </div>
  );
}
