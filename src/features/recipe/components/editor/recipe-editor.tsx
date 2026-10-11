"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Wand2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";

import { FormField, inputClass } from "@/components/common/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { roundGrams } from "@/lib/brew";
import { cn } from "@/lib/utils";

import { saveRecipe } from "../../actions";
import { recipeFormSchema, type RecipeFormInput, type RecipeFormValues } from "../../editor-schema";
import type { Dripper } from "../../types";
import { DripperIcon } from "../dripper-icon";

import { EditorPreview } from "./editor-preview";
import { StepListEditor } from "./step-list-editor";

type RecipeEditorProps = {
  drippers: Dripper[];
  defaultValues: RecipeFormInput;
  /** null creates a new recipe (or a fork when defaultValues.forkedFrom is set). */
  recipeId: string | null;
  cancelHref: string;
};

const visibilityOptions = [
  { value: "private", label: "나만 보기", enabled: true },
  { value: "unlisted", label: "링크 공개", enabled: false },
  { value: "public", label: "전체 공개", enabled: false },
] as const;

export function RecipeEditor({ drippers, defaultValues, recipeId, cancelHref }: RecipeEditorProps) {
  const form = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = form;
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Unique per instance: Next keeps visited pages mounted (hidden), so fixed ids would collide.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const [doseG, ratio, dripperSlug] = useWatch({ control, name: ["doseG", "ratio", "dripperSlug"] });
  const totalWaterG = Number.isFinite(doseG) && Number.isFinite(ratio) ? roundGrams(doseG * ratio) : null;

  const fitLastStep = () => {
    const last = getValues("steps").length - 1;
    if (last >= 0 && totalWaterG !== null) {
      setValue(`steps.${last}.cumulativeG`, totalWaterG, { shouldValidate: true, shouldDirty: true });
    }
  };

  // Submit with the raw input: the server action re-parses with the same schema.
  const onSubmit = handleSubmit(() => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveRecipe(getValues(), recipeId);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<RecipeFormInput>, { message });
      }
      if (result.error) setServerError(result.error);
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {/* basics */}
          <section className="flex flex-col gap-4" aria-labelledby="basics-heading">
            <h2 id="basics-heading" className="text-lg font-semibold">
              기본 정보
            </h2>
            <FormField label="제목" htmlFor={fid("title")} error={errors.title?.message}>
              <input id={fid("title")} aria-invalid={!!errors.title} className={inputClass} {...register("title")} />
            </FormField>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">드리퍼</legend>
              <div className="flex flex-wrap gap-2">
                {drippers.map((d) => (
                  <label
                    key={d.slug}
                    className={cn(
                      "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border pr-3 pl-2.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      dripperSlug === d.slug
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <input type="radio" value={d.slug} className="sr-only" {...register("dripperSlug")} />
                    <DripperIcon slug={d.slug} strokeWidth={4.5} className="size-[18px]" />
                    {d.name}
                  </label>
                ))}
              </div>
              {errors.dripperSlug && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.dripperSlug.message}
                </p>
              )}
            </fieldset>

            <FormField label="설명" htmlFor={fid("description")} error={errors.description?.message} hint="선택">
              <textarea
                id={fid("description")}
                rows={3}
                className={cn(inputClass, "h-auto py-2")}
                {...register("description")}
              />
            </FormField>
          </section>

          {/* brew conditions */}
          <section className="flex flex-col gap-4" aria-labelledby="conditions-heading">
            <h2 id="conditions-heading" className="text-lg font-semibold">
              추출 조건
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField label="원두량 (g)" htmlFor={fid("doseG")} error={errors.doseG?.message}>
                <input
                  id={fid("doseG")}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  aria-invalid={!!errors.doseG}
                  className={cn(inputClass, "tabular-nums")}
                  {...register("doseG", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="비율 (1:x)"
                htmlFor={fid("ratio")}
                error={errors.ratio?.message}
                hint={totalWaterG !== null ? `총 물량 ${totalWaterG}g` : undefined}
              >
                <input
                  id={fid("ratio")}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  aria-invalid={!!errors.ratio}
                  className={cn(inputClass, "tabular-nums")}
                  {...register("ratio", { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="총 시간 (m:ss)" htmlFor={fid("totalTime")} error={errors.totalTime?.message}>
                <input
                  id={fid("totalTime")}
                  inputMode="numeric"
                  placeholder="2:45"
                  aria-invalid={!!errors.totalTime}
                  className={cn(inputClass, "tabular-nums")}
                  {...register("totalTime")}
                />
              </FormField>
              <FormField label="물 온도 (°C)" htmlFor={fid("waterTempC")} error={errors.waterTempC?.message} hint="선택">
                <input
                  id={fid("waterTempC")}
                  type="number"
                  inputMode="numeric"
                  aria-invalid={!!errors.waterTempC}
                  className={cn(inputClass, "tabular-nums")}
                  {...register("waterTempC", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="분쇄도"
                htmlFor={fid("grindText")}
                error={errors.grindText?.message}
                hint="선택 · 예: 중간 가늘게"
                className="col-span-2"
              >
                <input id={fid("grindText")} className={inputClass} {...register("grindText")} />
              </FormField>
            </div>
          </section>

          {/* steps */}
          <section className="flex flex-col gap-3" aria-labelledby="steps-editor-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="steps-editor-heading" className="text-lg font-semibold">
                  단계
                </h2>
                <p className="text-xs text-muted-foreground">이름 · 시작 시각 · 그 단계까지 누적 물량(저울 숫자)</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={fitLastStep} disabled={totalWaterG === null}>
                <Wand2 aria-hidden />
                마지막 단계를 {totalWaterG ?? "–"}g에 맞추기
              </Button>
            </div>
            {errors.steps?.root?.message || errors.steps?.message ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.steps?.root?.message ?? errors.steps?.message}
              </p>
            ) : null}
            <StepListEditor />
          </section>

          {/* visibility */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-lg font-semibold">공개 범위</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {visibilityOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm",
                    option.enabled ? "cursor-pointer has-checked:border-primary" : "cursor-not-allowed opacity-50",
                  )}
                >
                  <input type="radio" value={option.value} disabled={!option.enabled} {...register("visibility")} />
                  {option.label}
                  {!option.enabled && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="size-3" aria-hidden />곧 열려요
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>

          {serverError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex gap-2">
            <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 flex-1")}>
              취소
            </Link>
            <Button type="submit" size="lg" className="h-12 flex-[2]" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20">
          <EditorPreview />
        </aside>
      </form>
    </FormProvider>
  );
}
