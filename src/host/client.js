// DSH 原生浏览器模块：复用宿主 React 与槽位，不改动宿主安装文件。
window.__ModuleLoader__.load({
  id: "dsh-starr",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;
    const inject = ["slots", "layout"];

    function StarrIcon() {
      return h(
        "svg",
        {
          width: 18,
          height: 18,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", {
          d: "m12 3 2.8 5.7 6.3.9-4.55 4.44 1.07 6.26L12 17.35l-5.62 2.95 1.07-6.26L2.9 9.6l6.3-.9L12 3Z",
        }),
      );
    }

    function StarrPanel() {
      const [attempt, setAttempt] = React.useState(0);
      const [status, setStatus] = React.useState("loading");
      const frame = React.useRef(null);
      React.useEffect(() => {
        let active = true;
        const controller = new AbortController();
        setStatus("loading");
        const timer = setTimeout(() => {
          controller.abort();
          if (active) setStatus("error");
        }, 12000);
        fetch("/starr/api/bootstrap", { signal: controller.signal })
          .then(async (response) => {
            if (!response.ok) throw new Error("控制台接口未就绪");
            const data = await response.json();
            if (!data.version || !Array.isArray(data.characters))
              throw new Error("控制台响应异常");
            if (active) setStatus("connected");
          })
          .catch(() => {
            if (active) setStatus("error");
          })
          .finally(() => clearTimeout(timer));
        return () => {
          active = false;
          clearTimeout(timer);
          controller.abort();
        };
      }, [attempt]);
      return h(
        "section",
        {
          "aria-label": "starr 控制台",
          style: {
            width: "100%",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          },
        },
        status === "connected" || status === "ready"
          ? h("iframe", {
              key: attempt,
              ref: frame,
              src: "/starr/",
              title: "starr · 角色的宇宙",
              style: { flex: 1, width: "100%", minHeight: 0, border: 0 },
              onLoad: () => {
                if (frame.current?.contentDocument?.getElementById("root"))
                  setStatus("ready");
                else setStatus("error");
              },
              onError: () => setStatus("error"),
            })
          : null,
        status === "loading" || status === "error"
          ? h(
              "div",
              {
                role: "status",
                style: {
                  margin: "auto",
                  padding: 32,
                  textAlign: "center",
                  maxWidth: 480,
                },
              },
              h(StarrIcon),
              h("h2", null, "starr"),
              h(
                "p",
                null,
                status === "loading"
                  ? "正在连接这片星空……"
                  : "控制台暂时无法打开。请确认 starr 插件已启用，更新后请重启 DSH。",
              ),
              status === "error"
                ? h(
                    "button",
                    {
                      type: "button",
                      onClick: () => setAttempt((n) => n + 1),
                      style: {
                        marginTop: 16,
                        padding: "8px 16px",
                        cursor: "pointer",
                      },
                    },
                    "重新连接",
                  )
                : null,
            )
          : null,
      );
    }

    function apply(ctx) {
      ctx.slots.inject("main", () =>
        ctx.slots.register({ name: "main", key: "starr" }, StarrPanel),
      );
      ctx.slots.inject("sidebar.panellist", () =>
        ctx.slots.register(
          {
            name: "sidebar.panellist",
            id: "starr",
            order: 20,
            label: () => "starr",
          },
          StarrIcon,
        ),
      );
      function Welcome() {
        const [visible, setVisible] = React.useState(false);
        React.useEffect(() => {
          if (sessionStorage.getItem("starr-guide-dismissed")) return;
          const controller = new AbortController();
          fetch("/starr/api/onboarding", { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
              if (!controller.signal.aborted && data && !data.completedAt)
                setVisible(true);
            })
            .catch(() => {});
          return () => controller.abort();
        }, []);
        if (!visible) return null;
        const dismiss = () => {
          setVisible(false);
          sessionStorage.setItem("starr-guide-dismissed", "1");
        };
        return h(
          "aside",
          {
            role: "status",
            "aria-label": "starr 新手调试提醒",
            style: {
              position: "absolute",
              top: 64,
              right: 24,
              width: "min(350px, calc(100vw - 32px))",
              padding: 20,
              border: "1px solid var(--dsw-alias-border-l3, #ddd)",
              borderRadius: 16,
              boxShadow: "0 8px 36px #0002",
              background: "var(--dsw-alias-bg-base, #fff)",
              color: "var(--dsw-alias-label-primary, #222)",
              fontSize: 13,
            },
          },
          h(
            "strong",
            { style: { display: "block", marginBottom: 8 } },
            "starr 已加载，先安顿这片星空",
          ),
          h(
            "p",
            { style: { margin: "0 0 16px", lineHeight: 1.7 } },
            "打开新手调试，逐步检查 QQ、角色、提示词与记忆目录。未完成的步骤可以稍后继续。",
          ),
          h(
            "div",
            { style: { display: "flex", justifyContent: "flex-end", gap: 16 } },
            h("button", { type: "button", onClick: dismiss }, "稍后再说"),
            h(
              "button",
              {
                type: "button",
                onClick: () => {
                  ctx.layout.selectPanel("starr");
                  dismiss();
                },
              },
              "打开 starr 新手调试",
            ),
          ),
        );
      }
      ctx.slots.inject("shell.overlay", () =>
        ctx.slots.register(
          { name: "shell.overlay", id: "starr-welcome" },
          Welcome,
        ),
      );
    }
    return { inject, apply };
  },
});
