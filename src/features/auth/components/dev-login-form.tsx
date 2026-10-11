"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { devLogin, type DevLoginState } from "../actions";

const field =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Shown only when NEXT_PUBLIC_DEV_LOGIN=1 (local/CI). Signs up automatically on first use. */
export function DevLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<DevLoginState, FormData>(devLogin, {});

  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
      <p className="text-xs font-medium text-muted-foreground">개발용 로그인 (로컬·CI 전용)</p>
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" required autoComplete="email" placeholder="이메일" aria-label="이메일" className={field} />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        autoComplete="current-password"
        placeholder="비밀번호 (6자 이상)"
        aria-label="비밀번호"
        className={field}
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "로그인 중…" : "이메일로 로그인"}
      </Button>
    </form>
  );
}
