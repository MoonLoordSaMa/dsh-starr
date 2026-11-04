import { Suspense, lazy, useEffect, useRef } from "react";
import type { State } from "./types";

const WorldBackground = lazy(() => import("./WorldBackground"));
export function Background({
  motion,
  density,
  scene = "overview",
  state,
  quality,
}: {
  motion: string;
  density: number;
  scene?: string;
  state?: State;
  quality?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="world-scene world-scene-fallback" aria-hidden="true" />
      }
    >
      <WorldBackground
        motion={motion}
        density={density}
        scene={scene}
        state={state}
        quality={quality}
      />
    </Suspense>
  );
}
export { Spectrum } from "./EmotionSpectrum";
