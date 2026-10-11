import { BookOpen, Calculator, NotebookPen, Timer } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

const tools = [
  {
    icon: Calculator,
    title: "비율 계산기",
    description: "원두량만 바꾸면 모든 단계 물량이 1g 단위로 환산됩니다.",
  },
  {
    icon: Timer,
    title: "추출 타이머",
    description: "단계마다 목표 누적 물량을 큰 화면으로 안내합니다.",
  },
  {
    icon: NotebookPen,
    title: "브루 로그",
    description: "맛과 다음 조정 메모를 남겨 다음 한 잔에 반영합니다.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 pt-4">
        <p className="text-sm font-medium text-primary">{siteConfig.name}</p>
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
          오늘의 한 잔을, 레시피대로 정확하게.
        </h1>
        <p className="max-w-prose text-muted-foreground">{siteConfig.description}</p>
        <div>
          <Link href="/recipes" className={buttonVariants({ size: "lg" })}>
            <BookOpen aria-hidden />
            레시피 둘러보기
          </Link>
        </div>
      </section>

      <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
        <h2 id="tools-heading" className="text-lg font-semibold">
          추출할 때 켜두는 도구
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {tools.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
