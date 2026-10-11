import Link from "next/link";

import { Avatar } from "@/components/common/avatar";
import type { RecipeAuthor } from "@/features/recipe/types";
import { cn } from "@/lib/utils";

/** Avatar + name linking to the author's public profile. */
export function AuthorLink({
  author,
  size = "sm",
  className,
}: {
  author: RecipeAuthor;
  size?: "sm" | "md";
  className?: string;
}) {
  const name = author.displayName ?? author.username;
  return (
    <Link
      href={`/u/${author.username}`}
      className={cn("inline-flex min-w-0 items-center gap-1.5 hover:underline", className)}
      data-testid="author-link"
    >
      <Avatar src={author.avatarUrl} name={name} size={size === "sm" ? 20 : 28} />
      <span className={cn("truncate", size === "md" && "font-medium text-foreground")}>{name}</span>
      {size === "md" && <span className="shrink-0 text-muted-foreground">@{author.username}</span>}
    </Link>
  );
}

/** Same as AuthorLink but without a link, for use inside another link (e.g. a recipe card). */
export function AuthorLabel({ author }: { author: RecipeAuthor }) {
  const name = author.displayName ?? author.username;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" data-testid="author-label">
      <Avatar src={author.avatarUrl} name={name} size={20} />
      <span className="truncate">{name}</span>
    </span>
  );
}
