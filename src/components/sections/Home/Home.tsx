import { useTranslations } from "next-intl";
import { Hero } from "@/components/sections/Hero/Hero";
import { HomeScene } from "./HomeScene";
import { Features } from "./Features";

/**
 * Home — composes the hero + features content (server, for translations) and
 * hands them to the client HomeScene, which owns the shared globe + scroll
 * choreography. Stat values mirror the live site; labels + title are localized.
 */
export function Home() {
  const t = useTranslations("stats");

  // Left = one big card (300+ with the app mockup); right = two stat cards.
  const big = { value: "300+", label: t("instruments") };
  const cards = [
    { value: "20+", label: t("payments") },
    { value: "12 Y+", label: t("experience") },
  ];

  return (
    <HomeScene
      hero={<Hero />}
      features={
        <Features title={t("introTitle")} accent={t("introAccent")} big={big} cards={cards} />
      }
    />
  );
}
