"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-semibold">문제가 생겼어요</h1>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      <Button variant="outline" onClick={() => retry()}>
        다시 시도
      </Button>
    </section>
  );
}
