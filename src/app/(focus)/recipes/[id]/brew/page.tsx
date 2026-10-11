import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrewScreen } from "@/features/brew/components/brew-screen";
import { parseBrewSettings } from "@/features/brew/settings";
import { getRecipeForViewer } from "@/features/recipe/my-queries";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]/brew">): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipeForViewer(id);
  return { title: recipe ? `추출 · ${recipe.title}` : "레시피를 찾을 수 없어요", robots: { index: false } };
}

export default async function BrewPage({ params, searchParams }: PageProps<"/recipes/[id]/brew">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const recipe = await getRecipeForViewer(id);
  if (!recipe) notFound();

  return <BrewScreen recipe={recipe} settings={parseBrewSettings(query, recipe)} />;
}
