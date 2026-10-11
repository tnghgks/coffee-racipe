import { Coffee } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";
import { DevLoginForm } from "@/features/auth/components/dev-login-form";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { safeNextPath } from "@/features/auth/paths";
import { afterLoginPath, getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="mx-auto flex w-full max-w-sm flex-col gap-8 pt-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
          <Coffee className="size-6 text-primary" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{siteConfig.name} 시작하기</h1>
        <p className="text-sm text-muted-foreground">로그인하면 내 레시피를 만들고 추출 기록을 남길 수 있어요.</p>
      </header>
      <Suspense>
        <LoginOptions searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function LoginOptions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const query = await searchParams;
  const next = safeNextPath(typeof query.next === "string" ? query.next : null);

  // Already signed in: skip the login screen.
  if (await getCurrentUser()) redirect(await afterLoginPath(next));

  return (
    <div className="flex flex-col gap-4">
      {query.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          로그인을 마치지 못했어요. 다시 시도해 주세요.
        </p>
      )}
      <OAuthButtons next={next} />
      {process.env.NEXT_PUBLIC_DEV_LOGIN === "1" && <DevLoginForm next={next} />}
    </div>
  );
}
