"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";

import { HydrationFieldset } from "@/components/common/hydration-guard";
import { FormField, inputClass } from "@/components/common/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { saveBrewLog } from "../actions";
import { logFormSchema, ROAST_LABELS, ROAST_LEVELS, type LogFormInput, type LogFormValues } from "../schema";

import { ScaleInput, StarRatingInput } from "./rating-inputs";

type LogFormProps = {
  defaultValues: LogFormInput;
  logId: string | null;
  recipe: { id: string; title: string } | null;
  cancelHref: string;
};

export function LogForm({ defaultValues, logId, recipe, cancelHref }: LogFormProps) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<LogFormInput, unknown, LogFormValues>({ resolver: zodResolver(logFormSchema), defaultValues });
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Unique per instance: Next keeps visited pages mounted (hidden), so fixed ids would collide.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const onSubmit = handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveBrewLog(getValues(), logId);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<LogFormInput>, { message });
      }
      if (result.error) setServerError(result.error);
    });
  });

  const number = (name: "doseG" | "waterG" | "waterTempC", label: string, hint?: string) => (
    <FormField label={label} htmlFor={fid(name)} error={errors[name]?.message} hint={hint}>
      <input
        id={fid(name)}
        type="number"
        inputMode="decimal"
        aria-invalid={!!errors[name]}
        className={cn(inputClass, "tabular-nums")}
        {...register(name, { valueAsNumber: true })}
      />
    </FormField>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <HydrationFieldset>
      {recipe && (
        <p className="text-sm text-muted-foreground">
          레시피{" "}
          <Link href={`/recipes/${recipe.id}`} className="font-medium text-foreground underline underline-offset-2">
            {recipe.title}
          </Link>
        </p>
      )}

      {/* rating first: the only required field, so finish → rate → save is three taps */}
      <section className="flex flex-col gap-2" aria-labelledby="rating-heading">
        <h2 id="rating-heading" className="text-lg font-semibold">
          오늘 한 잔은 어땠나요?
        </h2>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRatingInput label="평점" value={field.value} onChange={field.onChange} invalid={!!errors.rating} />
          )}
        />
        {errors.rating && (
          <p role="alert" className="text-sm text-destructive">
            {errors.rating.message}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="taste-heading">
        <h2 id="taste-heading" className="text-lg font-semibold">
          맛 <span className="text-sm font-normal text-muted-foreground">· 선택</span>
        </h2>
        {(
          [
            ["acidity", "산미", "약함", "강함"],
            ["sweetness", "단맛", "약함", "강함"],
            ["body", "바디", "가벼움", "묵직함"],
          ] as const
        ).map(([name, label, low, high]) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <ScaleInput label={label} lowLabel={low} highLabel={high} value={field.value} onChange={field.onChange} />
            )}
          />
        ))}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="bean-heading">
        <h2 id="bean-heading" className="text-lg font-semibold">
          원두 <span className="text-sm font-normal text-muted-foreground">· 선택</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="원두 이름" htmlFor={fid("beanName")} error={errors.beanName?.message}>
            <input
              id={fid("beanName")}
              placeholder="예: 에티오피아 예가체프"
              className={inputClass}
              {...register("beanName")}
            />
          </FormField>
          <FormField label="로스터리" htmlFor={fid("roaster")} error={errors.roaster?.message}>
            <input id={fid("roaster")} className={inputClass} {...register("roaster")} />
          </FormField>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">로스팅 정도</legend>
          <div className="flex flex-wrap gap-2">
            {ROAST_LEVELS.map((level) => (
              <label
                key={level}
                className="inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm text-muted-foreground has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input type="radio" value={level} className="sr-only" {...register("roastLevel")} />
                {ROAST_LABELS[level]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="brew-heading">
        <h2 id="brew-heading" className="text-lg font-semibold">
          추출 정보
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {number("doseG", "원두량 (g)")}
          {number("waterG", "물 (g)", "얼음 포함 전체")}
          <FormField label="추출 시간 (m:ss)" htmlFor={fid("totalTime")} error={errors.totalTime?.message}>
            <input
              id={fid("totalTime")}
              inputMode="numeric"
              placeholder="2:45"
              aria-invalid={!!errors.totalTime}
              className={cn(inputClass, "tabular-nums")}
              {...register("totalTime")}
            />
          </FormField>
          {number("waterTempC", "물 온도 (°C)")}
          <FormField label="분쇄도" htmlFor={fid("grindText")} error={errors.grindText?.message} className="col-span-2">
            <input id={fid("grindText")} className={inputClass} {...register("grindText")} />
          </FormField>
        </div>
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register("iced")} />
          아이스로 내렸어요
        </label>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-lg font-semibold">
          메모
        </h2>
        <FormField label="맛·느낌" htmlFor={fid("notes")} error={errors.notes?.message}>
          <textarea id={fid("notes")} rows={3} className={cn(inputClass, "h-auto py-2")} {...register("notes")} />
        </FormField>
        <FormField
          label="다음엔 이렇게"
          htmlFor={fid("nextAdjustment")}
          error={errors.nextAdjustment?.message}
          hint="레시피 화면에서 다음 추출 전에 보여 드려요"
        >
          <textarea
            id={fid("nextAdjustment")}
            rows={2}
            placeholder="예: 분쇄도 한 칸 굵게, 물 온도 2°C 낮추기"
            className={cn(inputClass, "h-auto py-2")}
            {...register("nextAdjustment")}
          />
        </FormField>
      </section>

      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      {/* Sticky so "save" is reachable without scrolling (above the mobile bottom nav). */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 flex-1")}>
          취소
        </Link>
        <Button type="submit" size="lg" className="h-12 flex-[2]" disabled={pending}>
          {pending ? "저장 중…" : "기록 저장"}
        </Button>
      </div>
      </HydrationFieldset>
    </form>
  );
}
