import { useEffect } from "react";

// 共享一份 GPU 程序；只为当前交互的控件绘制，不为每个按钮建立 WebGL 上下文。
const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
uniform vec2 resolution;uniform vec2 pointer;uniform float time;uniform float press;uniform float hover;uniform float rounded;uniform float strength;
float shape(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float wave(vec2 p,float t){return sin(p.x*1.7+t*.42)*.34+sin(p.x*3.2-t*.27)*.12;}
float ribbon(float v,float d){float a=fract(v+d);return smoothstep(.32,.43,a)*(1.-smoothstep(.57,.69,a));}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;vec2 p=(gl_FragCoord.xy-resolution*.5)/resolution.y;
 vec2 halfSize=resolution*.5;float radius=min(halfSize.y,rounded);float sd=shape(gl_FragCoord.xy-halfSize,halfSize-1.2,radius);
 if(sd>1.)discard;
 vec2 ptr=(pointer-.5)*vec2(resolution.x/resolution.y,1.);vec2 diff=p-ptr;
 float well=exp(-dot(diff,diff)*3.)*hover;p+=diff*well*.34;
 float crease=sin(length(diff)*20.-press*19.)*exp(-length(diff)*3.)*press;
 float v=(p.y-wave(p,time))*(1.65+.7*sin(p.x*.7+time*.18))+crease*.2;
 vec3 bands=vec3(ribbon(v,.032),ribbon(v,0.),ribbon(v,-.037));
 vec3 base=vec3(.055,.07,.10);vec3 metal=mix(vec3(.26,.31,.42),vec3(.98,.92,.81),uv.y);
 float fill=(.07+hover*.68)*smoothstep(-.5,.45,p.y+wave(vec2(p.x+.9,p.y),time)*.8);
 vec3 face=base+bands*metal*fill;
 float angle=atan(p.y,p.x);float hot=pow(.5+.5*cos(angle-time*.65),14.)+pow(.5+.5*cos(angle+time*.39+2.),22.)*.65;
 float edge=1.-smoothstep(.55,1.9,abs(sd+1.));
 vec3 rim=mix(vec3(.25,.37,.58),vec3(.94,.77,.52),.5+.5*sin(angle+time*.24));
 face+=rim*edge*(.6+hot*1.5+press*.5);
 float alpha=(1.-smoothstep(-.5,.5,sd))*(.9+edge*.1);
 gl_FragColor=vec4(face,alpha*strength);
}`;

export function useLiquidMetal(mode: string) {
  useEffect(() => {
    const reduced =
      mode === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const selector =
      "button:not(.toggle):not(.world-brand):not([role=switch]),a.button";
    const plain =
      ".memory-row,.chat-session,.disclosure-trigger,.select-trigger,.select-options>button,.chapter-navigation>button,.relation-row,.expression-preview,.hero-scroll,.function-result,.function-groups button,.related-routes button,.prelude-continue";
    const markButton = (button: HTMLElement) => {
      if (button.closest(".sr-only") || button.matches(plain))
        button.removeAttribute("data-liquid");
      else button.dataset.liquid = "";
    };
    const mark = (root: ParentNode) =>
      root.querySelectorAll<HTMLElement>(selector).forEach((button) => {
        markButton(button);
      });
    mark(document);
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (
            node instanceof HTMLElement &&
            !node.matches("canvas[data-liquid-fx]")
          ) {
            if (node.matches(selector)) markButton(node);
            mark(node);
          }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const source = document.createElement("canvas");
    const gl = reduced
      ? null
      : source.getContext("webgl", {
          alpha: true,
          antialias: false,
          premultipliedAlpha: false,
          powerPreference: "low-power",
        });
    let target: HTMLElement | null = null,
      surface: HTMLCanvasElement | null = null;
    let frame = 0,
      last = 0,
      start = 0,
      metalStrength = 0.3,
      pressed = -10,
      x = 0.5,
      y = 0.5,
      px = 0.5,
      py = 0.5;
    let visible = !document.hidden;
    const program = gl?.createProgram();
    const shaders: WebGLShader[] = [];
    const shader = (type: number, text: string) => {
      const value = gl!.createShader(type)!;
      shaders.push(value);
      gl!.shaderSource(value, text);
      gl!.compileShader(value);
      return value;
    };
    let buffer: WebGLBuffer | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    if (gl && program) {
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        uniforms = Object.fromEntries(
          [
            "resolution",
            "pointer",
            "time",
            "press",
            "hover",
            "rounded",
            "strength",
          ].map((key) => [key, gl.getUniformLocation(program, key)]),
        );
      }
    }
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (surface) {
        const retiring = surface;
        const opacity = getComputedStyle(retiring).opacity;
        retiring.removeAttribute("data-liquid-fx");
        retiring.dataset.liquidRetiring = "";
        retiring.getAnimations().forEach((animation) => animation.cancel());
        if (reduced || !retiring.isConnected) retiring.remove();
        else
          retiring
            .animate([{ opacity }, { opacity: 0 }], {
              duration: 180,
              easing: "ease-out",
              fill: "forwards",
            })
            .finished.then(() => retiring.remove())
            .catch(() => retiring.remove());
      }
      surface = null;
      target?.removeAttribute("data-liquid-active");
      target = null;
    }
    function draw(now: number) {
      frame = 0;
      if (
        !target?.isConnected ||
        target.matches(":disabled") ||
        !surface ||
        !visible
      ) {
        clear();
        return;
      }
      if (
        gl &&
        program &&
        Object.keys(uniforms).length &&
        now - last >= (mode === "light" ? 45 : 30)
      ) {
        last = now;
        const bounds = target.getBoundingClientRect(),
          ratio = Math.min(devicePixelRatio, 1.35);
        const width = Math.max(
            1,
            Math.min(900, Math.round(bounds.width * ratio)),
          ),
          height = Math.max(
            1,
            Math.min(300, Math.round(bounds.height * ratio)),
          );
        if (source.width !== width || source.height !== height) {
          source.width = width;
          source.height = height;
          gl.viewport(0, 0, width, height);
        }
        if (surface.width !== width || surface.height !== height) {
          surface.width = width;
          surface.height = height;
        }
        px += (x - px) * 0.22;
        py += (y - py) * 0.22;
        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform2f(uniforms.pointer, px, 1 - py);
        gl.uniform1f(uniforms.time, reduced ? 0 : (now - start) / 1000);
        gl.uniform1f(uniforms.hover, 1);
        gl.uniform1f(uniforms.strength, metalStrength);
        gl.uniform1f(
          uniforms.press,
          reduced ? 0 : Math.max(0, 1 - (now - pressed) / 850),
        );
        const radius = parseFloat(getComputedStyle(target).borderTopLeftRadius);
        gl.uniform1f(
          uniforms.rounded,
          Math.min(
            height / 2,
            Number.isFinite(radius) ? Math.max(0, radius * ratio) : height / 2,
          ),
        );
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const paint = surface.getContext("2d");
        paint?.clearRect(0, 0, width, height);
        paint?.drawImage(source, 0, 0);
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    }
    function activate(element: HTMLElement | null) {
      if (element === target) return;
      clear();
      if (
        !element ||
        element.matches(":disabled") ||
        element.getAttribute("aria-disabled") === "true"
      )
        return;
      target = element;
      metalStrength =
        parseFloat(
          getComputedStyle(element).getPropertyValue("--metal-strength"),
        ) || 0.3;
      target.dataset.liquidActive = "";
      if (!reduced && gl && program) {
        surface = document.createElement("canvas");
        surface.dataset.liquidFx = "";
        surface.ariaHidden = "true";
        target.prepend(surface);
        surface.animate([{ opacity: 0 }, { opacity: 0.95 }], {
          duration: 320,
          easing: "cubic-bezier(.22,.61,.36,1)",
          fill: "both",
        });
        start = performance.now();
        last = 0;
        frame = requestAnimationFrame(draw);
      }
    }
    const identify = (event: Event) =>
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-liquid]")
        : null;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const button = identify(event);
      activate(button);
      if (!target) return;
      const box = target.getBoundingClientRect();
      x = (event.clientX - box.left) / box.width;
      y = (event.clientY - box.top) / box.height;
      target.style.setProperty("--metal-x", `${x * 100}%`);
      target.style.setProperty("--metal-y", `${y * 100}%`);
    };
    const press = (event: PointerEvent) => {
      activate(identify(event));
      pressed = performance.now();
    };
    const focus = (event: FocusEvent) => {
      if (identify(event)?.matches(":focus-visible")) {
        x = y = 0.5;
        activate(identify(event));
      }
    };
    const blur = (event: FocusEvent) => {
      if (event.target === target) clear();
    };
    const visibility = () => {
      visible = !document.hidden;
      if (!visible) clear();
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", press, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("visibilitychange", visibility);
    addEventListener("blur", clear);
    return () => {
      observer.disconnect();
      clear();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("visibilitychange", visibility);
      removeEventListener("blur", clear);
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach((s) => gl.deleteShader(s));
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }, [mode]);
}
