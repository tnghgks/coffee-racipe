import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Signed-out home: what the service is. Mobile: photo on top fading into the page, text below.
 * Desktop: text left, photo right fading in from the text side.
 */
export function GuestHero() {
  return (
    <section className="flex flex-col gap-5 md:flex-row-reverse md:items-center md:gap-8">
      <div className="relative -mx-4 -mt-6 aspect-16/10 mask-b-from-55% md:m-0 md:aspect-4/3 md:w-1/2 md:mask-b-from-100% md:mask-l-from-60%">
        <Image
          src="/images/recipes/00000000-0000-4000-8000-000000000001.webp"
          alt=""
          fill
          preload
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover md:rounded-2xl"
        />
      </div>
      <div className="-mt-12 flex flex-col gap-4 md:mt-0 md:flex-1">
        <p className="text-sm font-medium text-primary">{siteConfig.name}</p>
        <h1 className="text-3xl leading-tight font-bold tracking-tight md:text-4xl">
          오늘의 한 잔을,
          <br />
          레시피대로 정확하게.
        </h1>
        <p className="max-w-prose text-muted-foreground">{siteConfig.description}</p>
        <div>
          <Link href="/recipes" className={cn(buttonVariants({ size: "lg" }), "h-11")}>
            레시피 둘러보기
            <ChevronRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function GuestHeroSkeleton() {
  return <div className="h-96 animate-pulse rounded-2xl bg-muted" aria-hidden />;
}
