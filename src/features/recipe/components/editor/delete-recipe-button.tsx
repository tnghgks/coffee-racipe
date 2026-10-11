"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteRecipe } from "../../actions";

export function DeleteRecipeButton({ recipeId, title }: { recipeId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`「${title}」을 삭제할까요? 되돌릴 수 없어요.`)) return;
        startTransition(() => deleteRecipe(recipeId));
      }}
    >
      <Trash2 aria-hidden />
      {pending ? "삭제 중…" : "레시피 삭제"}
    </Button>
  );
}
