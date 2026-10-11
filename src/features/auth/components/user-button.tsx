import Link from "next/link";

import { Avatar } from "@/components/common/avatar";

import { getCurrentUser, getMyProfile } from "../queries";

export function LoginLink() {
  return (
    <Link
      href="/login"
      className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
    >
      로그인
    </Link>
  );
}

/** Header slot: avatar linking to /me when signed in, otherwise a login link. Render inside <Suspense>. */
export async function UserButton() {
  if (!(await getCurrentUser())) return <LoginLink />;
  const profile = await getMyProfile();
  const name = profile?.displayName ?? profile?.username ?? "나";

  return (
    <Link href="/me" aria-label="내 정보" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Avatar src={profile?.avatarUrl ?? null} name={name} size={32} />
    </Link>
  );
}
