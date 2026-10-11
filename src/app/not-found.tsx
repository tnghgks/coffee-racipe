import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-muted-foreground">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        홈으로
      </Link>
    </section>
  );
}
