"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearOfflinePages } from "@/features/pwa/client";

import { signOut } from "../actions";

/** Signs out and drops pages cached for offline use (they can hold this user's saved list and recipes). */
export function SignOutForm() {
  return (
    <form action={signOut} onSubmit={() => void clearOfflinePages()}>
      <Button type="submit" variant="ghost" className="h-11 w-full text-muted-foreground">
        <LogOut aria-hidden />
        로그아웃
      </Button>
    </form>
  );
}
