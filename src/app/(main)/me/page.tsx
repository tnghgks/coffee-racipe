import { BookOpen, ChevronRight, LogOut, NotebookPen, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { requireProfile } from "@/features/auth/queries";

export const metadata: Metadata = { title: "내 정보", robots: { index: false } };

const links = [
  { href: "/me/recipes", label: "내 레시피", icon: BookOpen, soon: null },
  { href: "/me/logs", label: "브루 로그", icon: NotebookPen, soon: null },
];

export default async function MePage() {
  const profile = await requireProfile("/me");
  const name = profile.displayName ?? profile.username;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={name} size={64} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground" data-testid="my-username">
            @{profile.username}
          </p>
        </div>
        <Link
          href="/me/setup"
          aria-label="프로필 수정"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <Pencil className="size-5" aria-hidden />
        </Link>
      </header>
      {profile.bio && <p className="text-sm whitespace-pre-line text-muted-foreground">{profile.bio}</p>}

      <ul className="flex flex-col overflow-hidden rounded-xl border bg-card">
        {links.map(({ href, label, icon: Icon, soon }) => (
          <li key={href} className="border-b last:border-b-0">
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-accent/40">
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="flex-1 font-medium">{label}</span>
              {soon && <span className="text-xs text-muted-foreground">{soon}</span>}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <form action={signOut}>
        <Button type="submit" variant="ghost" className="h-11 w-full text-muted-foreground">
          <LogOut aria-hidden />
          로그아웃
        </Button>
      </form>
    </section>
  );
}
