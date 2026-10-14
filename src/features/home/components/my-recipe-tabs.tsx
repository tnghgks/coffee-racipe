"use client";

import { Bookmark, Heart } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SegmentedControl } from "@/components/common/segmented-control";

type Tab = "saved" | "liked";

const activeClassName = "bg-primary text-primary-foreground shadow-sm";
const options = [
  { value: "saved", label: "저장한 레시피", icon: Bookmark, activeClassName },
  { value: "liked", label: "좋아요한 레시피", icon: Heart, activeClassName },
] as const;

/** Saved / liked switch. Both lists are rendered on the server; switching only toggles which one shows. */
export function MyRecipeTabs({ saved, liked }: { saved: ReactNode; liked: ReactNode }) {
  const [tab, setTab] = useState<Tab>("saved");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label="내 레시피 모음 보기"
        options={options}
        value={tab}
        onChange={setTab}
        className="w-full [&>button]:flex-1"
      />
      <div hidden={tab !== "saved"}>{saved}</div>
      <div hidden={tab !== "liked"}>{liked}</div>
    </div>
  );
}
