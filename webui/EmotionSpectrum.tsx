import { useEffect, useRef } from "react";
import type { State } from "./types";
import { deriveOrganism } from "../src/starrcore/organism";

// 按情绪分层的流场：每束拥有自己的速度、扰动、间距与颜色，不作音频或历史曲线宣称。
export function Spectrum({
  state,
  motion = "default",
  limit = 8,
}: {
  state: State;
  motion?: string;
  limit?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    current = useRef(state),
    limitRef = useRef(limit),
    repaint = useRef<() => void>(() => {});
  useEffect(() => {
    current.current = state;
    repaint.current();
  }, [state]);
  useEffect(() => {
    limitRef.current = limit;
    repaint.current();
  }, [limit]);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduced =
      motion === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = motion === "light",
      vivid = motion === "vivid";
    let w = 1,
      h = 1,
      frame = 0,
      last = 0,
      time = 0,
      shown = true;
    let layers = current.current.organism ?? deriveOrganism(current.current);
    const phases = new Map<string, number>();
    const positions = new Map<string, number>();
    const color = (hex: string, opacity: number) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${opacity})`;
    };
    function paint(dt: number) {
      const c = ctx!;
      time += dt;
      const source =
        current.current.organism ?? deriveOrganism(current.current);
      // 数据不在每帧重新推导；滑杆预览及新经历通过相同派生快照更新。
      layers = source;
      const all = layers.emotions.filter((e) => e.intensity > 0);
      const active = all.slice(0, limitRef.current || all.length);
      const urgency = layers.rhythm.urgency / 100,
        turbulence = layers.rhythm.turbulence / 100;
      c.clearRect(0, 0, w, h);
      for (let k = active.length - 1; k >= 0; k--) {
        const e = active[k],
          strength = e.intensity / 100;
        const speed = (0.1 + urgency ** 1.7 * 2.8) * e.tempo;
        const phase = (phases.get(e.id) ?? k * 1.8) + dt * speed;
        phases.set(e.id, phase);
        const density =
          active.length > 8
            ? light
              ? 2
              : vivid
                ? 4
                : 3
            : light
              ? 3
              : vivid
                ? 7
                : 5;
        const targetY =
          h * (0.22 + (k / Math.max(1, active.length - 1)) * 0.52);
        const previousY = positions.get(e.id) ?? targetY;
        const baseY =
          previousY +
          (targetY - previousY) *
            (reduced ? 1 : 1 - Math.exp(-Math.max(dt, 0.016) * 3));
        positions.set(e.id, baseY);
        const spread =
          (active.length > 8 ? 0.55 : 1) *
          (1.7 + layers.rhythm.coherence * 0.045);
        const amplitude = h * (0.055 + strength * 0.095) * (k ? 0.77 : 1);
        const point = (v: number, j: number) => {
          const edge = Math.sin(Math.PI * Math.max(0, Math.min(1, v))) ** 0.65;
          const twist = v * (8 + e.complexity * 4) - phase * 2.4;
          const breathing = 0.86 + Math.sin(time * 0.3 + k) * 0.14;
          const depth = Math.sin(v * 5 - phase * 0.55 + k * 1.8);
          const y =
            baseY +
            (j - density / 2) * spread * (0.65 + depth * 0.2) +
            Math.sin(twist + j * 0.055 + k * 0.76) *
              amplitude *
              edge *
              breathing +
            Math.sin(twist * 2.7 + j * 0.17 + k * 2.3) *
              amplitude *
              (e.complexity * 0.16 + turbulence * 0.15) *
              edge +
            Math.sin(v * 24 - phase * 4 + j) *
              amplitude *
              e.complexity *
              turbulence *
              0.08 *
              edge;
          return { x: v * w, y, depth };
        };
        for (let j = 0; j < density; j++) {
          const path = new Path2D(),
            step = light ? 7 : 4;
          for (let x = 0; x <= w + step; x += step) {
            const p = point(Math.min(1, x / w), j);
            if (!x) path.moveTo(p.x, p.y);
            else path.lineTo(p.x, p.y);
          }
          const gradient = c.createLinearGradient(0, 0, w, 0);
          gradient.addColorStop(0, color(e.color, 0.05));
          gradient.addColorStop(0.22, color(e.color, 0.3 + strength * 0.28));
          gradient.addColorStop(0.62, color(e.color, 0.45 + strength * 0.48));
          gradient.addColorStop(1, color(e.color, 0.12));
          c.strokeStyle = gradient;
          if (!light && j % 2 === 0) {
            c.globalAlpha = 0.1;
            c.lineWidth = 7;
            c.stroke(path);
          }
          c.globalAlpha = 1;
          c.lineWidth = j === Math.floor(density / 2) ? 1.65 : 0.75;
          c.stroke(path);
          if (j % 3 === 0)
            for (let i = 0; i < (light ? 1 : 3); i++) {
              const v =
                (((phase * 0.055 + i / 3 + j * 0.061 + k * 0.19) % 1) + 1) % 1;
              const p = point(v, j),
                alpha = Math.sin(v * Math.PI) * (0.5 + strength * 0.5);
              c.beginPath();
              c.moveTo(p.x - (3 + speed * 4), p.y);
              c.lineTo(p.x, p.y);
              c.strokeStyle = color(e.color, alpha * 0.6);
              c.lineWidth = 1;
              c.stroke();
              c.beginPath();
              c.arc(p.x, p.y, 1.2 + strength, 0, Math.PI * 2);
              c.fillStyle = color(e.color, alpha);
              c.fill();
            }
        }
      }
      c.globalAlpha = 1;
    }
    const tick = (t: number) => {
      frame = 0;
      if (document.hidden || !shown || reduced) return;
      if (t - last >= (light ? 66 : 33)) {
        paint(last ? Math.min(0.1, (t - last) / 1000) : 0.016);
        last = t;
      }
      frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (!document.hidden && shown) {
        paint(0);
        if (!reduced) frame = requestAnimationFrame(tick);
      }
    };
    const resize = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const d = Math.min(devicePixelRatio, light ? 1 : 1.5);
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      paint(0);
    });
    const intersection = new IntersectionObserver((entries) => {
      shown = entries[0].isIntersecting;
      restart();
    });
    repaint.current = restart;
    resize.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", restart);
    restart();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      repaint.current = () => {};
      document.removeEventListener("visibilitychange", restart);
    };
  }, [motion]);
  return (
    <canvas
      ref={ref}
      className="spectrum emotion-current"
      data-emotion-count={Math.min(
        limit || 18,
        state.organism?.emotions.filter((e) => e.intensity > 0).length ?? 0,
      )}
      role="img"
      aria-label={`情绪流场：${state.organism?.label ?? state.emotion}；各束按情绪强度、急切与松弛程度流动，并非音频数据`}
    />
  );
}
