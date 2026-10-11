"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField, inputClass } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { saveProfile } from "../actions";
import { profileSchema, type ProfileInput, type ProfileValues } from "../schema";

type ProfileFormProps = {
  defaultValues: ProfileInput;
  /** Where to go after saving; null stays on the page (editing). */
  next: string | null;
  submitLabel: string;
};

export function ProfileForm({ defaultValues, next, submitLabel }: ProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  // Unique per instance: Next keeps visited pages mounted (hidden), so fixed ids would collide.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileInput, unknown, ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues });

  const onSubmit = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProfile(values, next);
      for (const [field, error] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof ProfileInput, { message: error });
      }
      if (result.error) setMessage(result.error);
      if (result.ok) setMessage("저장했어요.");
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField
        label="사용자 이름"
        htmlFor={fid("username")}
        error={errors.username?.message}
        hint="프로필 주소에 쓰여요. 영문 소문자·숫자·밑줄 3~20자"
      >
        <div className="flex items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground">@</span>
          <input
            id={fid("username")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.username}
            className={cn(inputClass, "border-0 pl-1 focus-visible:ring-0")}
            {...register("username")}
          />
        </div>
      </FormField>

      <FormField label="표시 이름" htmlFor={fid("displayName")} error={errors.displayName?.message}>
        <input
          id={fid("displayName")}
          autoComplete="nickname"
          aria-invalid={!!errors.displayName}
          className={inputClass}
          {...register("displayName")}
        />
      </FormField>

      <FormField label="소개" htmlFor={fid("bio")} error={errors.bio?.message} hint="선택 · 300자 이내">
        <textarea
          id={fid("bio")}
          rows={3}
          aria-invalid={!!errors.bio}
          className={cn(inputClass, "h-auto py-2")}
          {...register("bio")}
        />
      </FormField>

      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {pending ? "저장 중…" : submitLabel}
      </Button>
    </form>
  );
}
