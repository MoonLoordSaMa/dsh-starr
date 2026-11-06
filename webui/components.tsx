import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X, ArrowUpRight, Sparkles } from "lucide-react";
import { gsap, motionDuration } from "./motion";

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-star ${className}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        d="m32 3 6.8 21.2L61 32l-22.2 7L32 61l-7-22L3 32l22-7.8Z"
        fill="currentColor"
      />
      <path
        d="m32 16 3.6 12.4L48 32l-12.4 3.6L32 48l-3.6-12.4L16 32l12.4-3.6Z"
        fill="#fff"
      />
    </svg>
  );
}
export function Badge({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2 title={typeof title === "string" ? title : undefined}>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Sparkles size={24} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Select({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [present, setPresent] = useState(false),
    ref = useRef<HTMLDivElement>(null),
    id = useId();
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => setPresent(false), 140);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const listener = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", listener);
    return () => document.removeEventListener("pointerdown", listener);
  }, [open]);
  return (
    <div
      className="select"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          (ref.current?.querySelector("button") as HTMLElement)?.focus();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!open) {
            setOpen(true);
            requestAnimationFrame(() =>
              ref.current?.querySelector<HTMLElement>("[role=option]")?.focus(),
            );
          } else {
            const items = Array.from(
                ref.current?.querySelectorAll<HTMLElement>("[role=option]") ??
                  [],
              ),
              index = items.indexOf(document.activeElement as HTMLElement);
            items[
              (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                items.length
            ]?.focus();
          }
        }
      }}
    >
      <button
        type="button"
        className="select-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {options.find((o) => o.value === value)?.label ?? "择一星途"}
        <ChevronDown size={14} className={open ? "rotated" : ""} />
      </button>
      {(open || present) && (
        <div
          id={id}
          className={`select-options ${open ? "" : "is-closing"}`}
          role="listbox"
          aria-label={label}
          aria-hidden={!open}
          inert={!open}
        >
          {options.map((o) => (
            <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={o.value === value ? "chosen" : ""}
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                ref.current?.querySelector("button")?.focus();
              }}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Tabs({
  value,
  onChange,
  items,
  label = "页面视图",
}: {
  value: string;
  onChange: (s: string) => void;
  items: { id: string; name: string }[];
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null),
    mark = useRef<HTMLSpanElement>(null),
    initialized = useRef(false);
  useLayoutEffect(() => {
    const el = root.current!,
      indicator = mark.current!;
    const update = (animate = true) => {
      const button = el.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!button) return;
      gsap.to(indicator, {
        x: button.offsetLeft,
        y: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
        opacity: 1,
        duration: initialized.current && animate ? motionDuration(0.26) : 0,
        ease: "power3.out",
        overwrite: true,
      });
      initialized.current = true;
    };
    update();
    let width = el.clientWidth,
      height = el.clientHeight;
    const resize = new ResizeObserver(() => {
      if (width === el.clientWidth && height === el.clientHeight) return;
      width = el.clientWidth;
      height = el.clientHeight;
      update(false);
    });
    resize.observe(el);
    return () => {
      resize.disconnect();
      gsap.killTweensOf(indicator);
    };
  }, [value]);
  return (
    <div className="tabs" role="tablist" aria-label={label} ref={root}>
      <span className="tabs-active-mark" aria-hidden="true" ref={mark} />
      {items.map((item, index) => (
        <button
          role="tab"
          type="button"
          key={item.id}
          aria-selected={value === item.id}
          tabIndex={value === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const next =
                items[
                  (index + (e.key === "ArrowRight" ? 1 : -1) + items.length) %
                    items.length
                ];
              onChange(next.id);
              (
                e.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[
                  items.indexOf(next)
                ] as HTMLElement
              )?.focus();
            }
          }}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
export function Disclosure({
  title,
  description,
  children,
  initialOpen = false,
}: {
  initialOpen?: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen),
    id = useId();
  return (
    <div className={`disclosure ${open ? "is-open" : ""}`}>
      <button
        className="disclosure-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong title={title}>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        <ChevronDown size={17} />
      </button>
      <div className="disclosure-grid" id={id} inert={!open}>
        <div>
          <div className="disclosure-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  dismissible = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    opener = useRef(document.activeElement as HTMLElement | null),
    titleId = useId(),
    callback = useRef(onClose),
    canClose = useRef(dismissible),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    [closing, setClosing] = useState(false);
  callback.current = onClose;
  canClose.current = dismissible;
  const close = useCallback(() => {
    if (timer.current || !canClose.current) return;
    if (
      document.documentElement.dataset.motion === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      callback.current();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => callback.current(), 170);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    const before = opener.current,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      ref.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]),textarea",
      ) ?? ref.current?.querySelector<HTMLElement>("button")
    )?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const list = Array.from(
            ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,textarea,[tabindex="0"]',
            ) ?? [],
          ).filter((el) => el.offsetParent !== null),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [close]);
  return createPortal(
    <div
      className={`modal-shade ${closing ? "is-closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭弹窗"
            disabled={!dismissible}
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "确认删除",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose} dismissible={!busy}>
      <p className="section-intro">{description}</p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "正在处理…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
