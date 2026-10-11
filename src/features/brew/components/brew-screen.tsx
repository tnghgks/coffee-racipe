"use client";

import { Check, NotebookPen, RotateCcw, Snowflake, Square, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";

import { Button, buttonVariants } from "@/components/ui/button";
import type { RecipeDetail } from "@/features/recipe/types";
import {
  brewEndS,
  cueSnapshot,
  DEFAULT_ICE_SHARE,
  detectCues,
  elapsedMs,
  formatGrams,
  formatRatio,
  formatSeconds,
  getBrewProgress,
  scaleRecipe,
  type CueSnapshot,
} from "@/lib/brew";
import { cn } from "@/lib/utils";

import { createBeeper, vibrate } from "../feedback";
import { useAnimationFrame, useWakeLock, useWakeLockSupported } from "../hooks";
import { brewSettingsQuery, type BrewSettings } from "../settings";
import { createBrewStore } from "../store";

type BrewScreenProps = {
  recipe: Pick<RecipeDetail, "id" | "title" | "doseG" | "ratio" | "totalTimeS" | "steps">;
  settings: BrewSettings;
};

/** Re-render at ~10fps; cues and completion are still checked on every frame. */
const RENDER_INTERVAL_MS = 100;

const statusHint = {
  idle: "화면을 탭해서 시작",
  running: "탭하면 일시정지",
  paused: "일시정지됨 · 탭해서 계속",
  finished: "",
} as const;

export function BrewScreen({ recipe, settings }: BrewScreenProps) {
  const [store] = useState(() => createBrewStore());
  const [beeper] = useState(createBeeper);
  const session = useStore(store, (s) => s.session);
  // Bumped every frame while running; elapsed time itself always comes from the session + performance.now().
  const [frameNow, setFrameNow] = useState(0);
  const lastCue = useRef<CueSnapshot | null>(null);
  const lastRender = useRef(0);

  const scaled = useMemo(
    () =>
      scaleRecipe({ ratio: recipe.ratio, steps: recipe.steps }, settings.doseG, {
        ratio: settings.ratio,
        iceShare: settings.iced ? DEFAULT_ICE_SHARE : 0,
      }),
    [recipe.ratio, recipe.steps, settings],
  );
  const endMs = brewEndS(scaled.steps, recipe.totalTimeS) * 1000;

  const running = session.status === "running";
  useWakeLock(running || session.status === "paused");
  const wakeLockSupported = useWakeLockSupported();

  useAnimationFrame((now) => {
    store.getState().completeIfDue(endMs);
    const progressNow = getBrewProgress(
      scaled.steps,
      recipe.totalTimeS,
      elapsedMs(store.getState().session, now) / 1000,
    );
    const snapshot = cueSnapshot(progressNow);
    for (const cue of detectCues(lastCue.current, snapshot)) {
      beeper.play(cue);
      vibrate(cue);
    }
    lastCue.current = snapshot;
    if (now - lastRender.current >= RENDER_INTERVAL_MS) {
      lastRender.current = now;
      setFrameNow(now);
    }
  }, running);

  const elapsedS = elapsedMs(session, frameNow) / 1000;
  const progress = getBrewProgress(scaled.steps, recipe.totalTimeS, elapsedS);
  const step = progress.current ?? progress.next;
  const countdown = progress.secondsToNext !== null ? Math.ceil(progress.secondsToNext) : null;
  const recipeHref = `/recipes/${recipe.id}${brewSettingsQuery(settings, recipe)}`;

  const onStageTap = () => {
    if (session.status === "finished") return;
    beeper.unlock(); // must happen inside the gesture for iOS
    lastCue.current = null; // no cues for whatever was already true before the clock (re)starts
    store.getState().toggle();
  };

  const restart = () => {
    lastCue.current = null;
    setFrameNow(0);
    store.getState().reset();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* top bar */}
      <header className="flex items-center gap-2 px-2 pt-2">
        <Link
          href={recipeHref}
          aria-label="추출 그만두고 레시피로"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-12 shrink-0")}
        >
          <X className="size-6" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium">{recipe.title}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            원두 {formatGrams(scaled.doseG)} · {formatRatio(scaled.ratio)} · {settings.iced ? "아이스" : "핫"}
          </p>
        </div>
        {session.status === "paused" ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-12 shrink-0"
            aria-label="추출 끝내기"
            onClick={() => store.getState().finish()}
          >
            <Square className="size-5" aria-hidden />
          </Button>
        ) : (
          <span className="size-12 shrink-0" aria-hidden />
        )}
      </header>
      <div className="mx-4 mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress.overallProgress * 100}%` }}
        />
      </div>

      {session.status === "finished" ? (
        <FinishedView
          elapsedS={elapsedS}
          brewWaterG={scaled.brewWaterG}
          iceG={scaled.iceG}
          recipeHref={recipeHref}
          onRestart={restart}
        />
      ) : (
        <>
          {/* stage: the whole area is the start/pause control */}
          <button
            type="button"
            onClick={onStageTap}
            aria-label={session.status === "running" ? "일시정지" : session.status === "paused" ? "계속" : "시작"}
            className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center outline-none select-none focus-visible:bg-accent/40"
          >
            <span
              className={cn("text-sm font-medium", session.status === "paused" ? "text-primary" : "text-muted-foreground")}
            >
              {statusHint[session.status]}
            </span>

            <span className="text-7xl font-bold tracking-tight tabular-nums" data-testid="brew-elapsed">
              {formatSeconds(elapsedS)}
            </span>

            {step && (
              <span className="flex w-full max-w-sm flex-col items-center gap-3">
                <span className="text-2xl font-semibold" data-testid="brew-step">
                  {step.label}
                </span>
                <span className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-6xl font-bold text-primary" data-testid="brew-target">
                    {step.cumulativeWaterG}
                  </span>
                  <span className="text-xl text-muted-foreground">g까지</span>
                </span>
                {step.pourWaterG > 0 && (
                  <span className="text-base text-muted-foreground tabular-nums">이번에 +{step.pourWaterG}g 붓기</span>
                )}
                <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                    style={{ width: `${progress.stepProgress * 100}%` }}
                  />
                </span>
              </span>
            )}

            {settings.iced && session.status === "idle" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sm text-sky-900">
                <Snowflake className="size-4" aria-hidden />
                서버에 얼음 {scaled.iceG}g을 담고 영점을 맞추세요
              </span>
            )}
          </button>

          {/* next step preview */}
          <div className="mx-4 mb-4 flex min-h-16 items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
            {progress.next ? (
              <>
                <span className="flex flex-col">
                  <span className="text-xs text-muted-foreground">다음 · {formatSeconds(progress.next.startAtS)}</span>
                  <span className="font-medium" data-testid="brew-next">
                    {progress.next.label} → {progress.next.cumulativeWaterG}g
                  </span>
                </span>
                {countdown !== null && (
                  <span
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      countdown <= 3 && running ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-label={`${countdown}초 남음`}
                  >
                    {countdown}s
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                마지막 단계예요. 다 빠질 때까지 기다리세요 · 종료 {formatSeconds(progress.endS)}
              </span>
            )}
          </div>

          {wakeLockSupported === false && (
            <p className="mx-4 mb-4 text-center text-xs text-muted-foreground">
              이 브라우저는 화면 꺼짐 방지를 지원하지 않아요. 추출하는 동안 화면 자동 잠금을 꺼 두세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FinishedView({
  elapsedS,
  brewWaterG,
  iceG,
  recipeHref,
  onRestart,
}: {
  elapsedS: number;
  brewWaterG: number;
  iceG: number;
  recipeHref: string;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-8" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">추출 완료</h1>
        <p className="text-muted-foreground tabular-nums" data-testid="brew-summary">
          {formatSeconds(elapsedS)} · 물 {brewWaterG}g{iceG > 0 && ` + 얼음 ${iceG}g`}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {/* Connected to the brew log in Phase 4. */}
        <Button size="lg" className="h-12" disabled>
          <NotebookPen aria-hidden />
          기록 남기기 (준비 중)
        </Button>
        <Button size="lg" variant="outline" className="h-12" onClick={onRestart}>
          <RotateCcw aria-hidden />
          다시 내리기
        </Button>
        <Link href={recipeHref} className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-12")}>
          레시피로 돌아가기
        </Link>
      </div>
    </div>
  );
}
