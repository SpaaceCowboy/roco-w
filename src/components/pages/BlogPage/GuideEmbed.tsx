"use client";

import { ExternalMediaPlaceholder } from "@/components/ui/CookieConsent/ExternalMediaPlaceholder";
import { useConsentChoice } from "@/lib/consent";

export function GuideEmbed({ src, title }: { src: string; title: string }) {
  const { ready, choice } = useConsentChoice();
  const isExternal = /^https?:\/\//.test(src);
  const allowed = ready && choice?.externalMedia === true;

  if (isExternal && !ready) return <div aria-hidden="true" />;
  if (isExternal && !allowed) return (
    <ExternalMediaPlaceholder
      title="راهنمای تعاملی غیرفعال است"
      body="برای نمایش این راهنمای Canva، نمایش محتوای خارجی را در تنظیمات کوکی فعال کنید."
    />
  );

  return (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      allow="fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
