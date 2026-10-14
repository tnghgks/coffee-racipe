import { Suspense } from "react";

import { getMyProfile } from "@/features/auth/queries";
import { GuestHero, GuestHeroSkeleton } from "@/features/home/components/guest-hero";
import { HomeSectionSkeleton } from "@/features/home/components/home-section";
import { NewRecipes, PopularRecipes } from "@/features/home/components/public-feeds";
import { SignedInTop } from "@/features/home/components/signed-in-top";

// The top depends on the session (hero for visitors, "brew it again" and saved/liked for members);
// the feeds below are public and cached. Each streams in its own <Suspense>.
export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <Suspense fallback={<GuestHeroSkeleton />}>
        <HomeTop />
      </Suspense>
      <Suspense fallback={<HomeSectionSkeleton variant="carousel" />}>
        <PopularRecipes />
      </Suspense>
      <Suspense fallback={<HomeSectionSkeleton variant="rows" />}>
        <NewRecipes />
      </Suspense>
    </div>
  );
}

async function HomeTop() {
  const profile = await getMyProfile();
  return profile ? <SignedInTop profile={profile} /> : <GuestHero />;
}
