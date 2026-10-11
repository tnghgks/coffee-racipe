import Image from "next/image";

import { cn } from "@/lib/utils";

/** Profile picture, or the first letter of the name on a tinted circle. */
export function Avatar({ src, name, size = 32, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    return <Image src={src} alt="" width={size} height={size} style={style} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.42 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
