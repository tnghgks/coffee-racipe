import { Construction } from "lucide-react";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <Construction className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{phase}에서 열립니다.</p>
    </section>
  );
}
