"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

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

const input =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";

export function ProfileForm({ defaultValues, next, submitLabel }: ProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
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
      <Field label="사용자 이름" htmlFor="username" error={errors.username?.message} hint="프로필 주소에 쓰여요. 영문 소문자·숫자·밑줄 3~20자">
        <div className="flex items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground">@</span>
          <input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.username}
            className={cn(input, "border-0 pl-1 focus-visible:ring-0")}
            {...register("username")}
          />
        </div>
      </Field>

      <Field label="표시 이름" htmlFor="displayName" error={errors.displayName?.message}>
        <input id="displayName" autoComplete="nickname" aria-invalid={!!errors.displayName} className={input} {...register("displayName")} />
      </Field>

      <Field label="소개" htmlFor="bio" error={errors.bio?.message} hint="선택 · 300자 이내">
        <textarea
          id="bio"
          rows={3}
          aria-invalid={!!errors.bio}
          className={cn(input, "h-auto py-2")}
          {...register("bio")}
        />
      </Field>

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

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
