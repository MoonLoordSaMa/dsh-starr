/**
 * 悬浮散星交互参考 MuhammadHasann：
 * https://uiverse.io/MuhammadHasann/silent-lizard-44
 * 使用独立装饰层与 transform 动画，避免改变按钮尺寸或被按钮内部裁切。
 */
export function scatterButtonStars(button: HTMLElement) {
  const bounds = button.getBoundingClientRect();
  const layer = document.createElement("span");
  layer.className = "button-star-field";
  layer.ariaHidden = "true";
  Object.assign(layer.style, {
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
  });
  const flights = [
    { x: 0.17, y: 0.34, dx: -31, dy: -28, size: 18, turn: -18 },
    { x: 0.35, y: 0.25, dx: -8, dy: -28, size: 10, turn: 23 },
    { x: 0.27, y: 0.72, dx: -21, dy: 21, size: 7, turn: -28 },
    { x: 0.76, y: 0.24, dx: 20, dy: -21, size: 12, turn: 18 },
    { x: 0.86, y: 0.58, dx: 37, dy: 9, size: 15, turn: -17 },
    { x: 0.58, y: 0.68, dx: 10, dy: 28, size: 6, turn: 33 },
  ];
  const animations: Animation[] = [];
  flights.forEach((flight, index) => {
    const star = document.createElement("span");
    star.className = "button-star";
    star.style.left = `${flight.x * 100}%`;
    star.style.top = `${flight.y * 100}%`;
    star.style.width = star.style.height = `${flight.size}px`;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute(
      "d",
      "M12 0 15.2 8.8 24 12 15.2 15.2 12 24 8.8 15.2 0 12 8.8 8.8Z",
    );
    svg.append(path);
    star.append(svg);
    layer.append(star);
    // 窗口边缘保留余量，星星也不会制造横向滚动条。
    const startX = bounds.left + bounds.width * flight.x;
    const startY = bounds.top + bounds.height * flight.y;
    const dx = Math.max(
      12 - startX,
      Math.min(innerWidth - 12 - startX, flight.dx),
    );
    const dy = Math.max(
      12 - startY,
      Math.min(innerHeight - 12 - startY, flight.dy),
    );
    animations.push(
      star.animate(
        [
          {
            transform: "translate(-50%,-50%) scale(.08) rotate(0deg)",
            opacity: 0,
          },
          { opacity: 0.85, offset: 0.35 },
          {
            transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1) rotate(${flight.turn}deg)`,
            opacity: index === 0 ? 0.98 : 0.8,
          },
        ],
        {
          duration: 620 + index * 48,
          delay: index * 18,
          easing: "cubic-bezier(.16,.8,.25,1)",
          fill: "both",
        },
      ),
    );
  });
  document.body.append(layer);
  return () => {
    if (!layer.isConnected) return;
    layer.getAnimations().forEach((animation) => animation.cancel());
    layer
      .animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        easing: "ease-out",
        fill: "forwards",
      })
      .finished.finally(() => {
        animations.forEach((animation) => animation.cancel());
        layer.remove();
      })
      .catch(() => {});
  };
}
