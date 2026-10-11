import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/features/auth/components/profile-form";
import { loginHref, safeNextPath } from "@/features/auth/paths";
import { getMyProfile } from "@/features/auth/queries";

export const metadata: Metadata = { title: "프로필 설정", robots: { index: false } };

/** First-login setup (no username yet) and later profile edits share this page. */
export default async function ProfileSetupPage({ searchParams }: PageProps<"/me/setup">) {
  const query = await searchParams;
  const profile = await getMyProfile();
  if (!profile) redirect(loginHref("/me/setup"));

  const isFirstSetup = !profile.username;
  const next = typeof query.next === "string" ? safeNextPath(query.next, "/me") : isFirstSetup ? "/me" : null;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{isFirstSetup ? "반가워요! 프로필을 정해 주세요" : "프로필 수정"}</h1>
        {isFirstSetup && <p className="text-sm text-muted-foreground">다른 사람에게 보이는 이름이에요. 나중에 바꿀 수 있어요.</p>}
      </header>
      <ProfileForm
        defaultValues={{
          username: profile.username ?? "",
          displayName: profile.displayName ?? "",
          bio: profile.bio ?? "",
        }}
        next={next}
        submitLabel={isFirstSetup ? "시작하기" : "저장"}
      />
    </section>
  );
}
