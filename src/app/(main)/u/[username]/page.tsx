import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/common/avatar";
import { getPublicProfile, listPublicRecipesByAuthor } from "@/features/community/queries";
import { RecipeCard } from "@/features/recipe/components/recipe-card";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "사용자를 찾을 수 없어요" };
  const name = profile.displayName ?? profile.username;
  return { title: `${name} (@${profile.username})`, description: profile.bio ?? `${name}의 핸드드립 레시피` };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const recipes = await listPublicRecipesByAuthor(profile.id);
  const name = profile.displayName ?? profile.username;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={name} size={72} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-1 text-sm whitespace-pre-line">{profile.bio}</p>}
        </div>
      </header>

      <section aria-labelledby="public-recipes-heading" className="flex flex-col gap-3">
        <h2 id="public-recipes-heading" className="text-lg font-semibold">
          공개 레시피 <span className="text-muted-foreground">{recipes.length}</span>
        </h2>
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-center">
            <BookOpen className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">아직 공개한 레시피가 없어요.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="profile-recipe-list">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
