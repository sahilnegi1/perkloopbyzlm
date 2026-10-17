"use client";

import { useEffect } from "react";
import { CategoriesRail } from "@/components/landing/CategoriesRail";
import { Faq } from "@/components/landing/Faq";
import { FeaturePreviews } from "@/components/landing/FeaturePreviews";
import { FinalCta } from "@/components/landing/FinalCta";
import { ForBusiness } from "@/components/landing/ForBusiness";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { TrustStrip } from "@/components/landing/TrustStrip";

const SECTION_IDS = ["how-it-works", "for-business", "faq"];

/**
 * Public landing page — single-page scroll narrative.
 * Root is `min-h-screen flex flex-col` with the footer on `mt-auto`
 * (sticky-bottom law from docs/DESIGN.md): the footer is pushed naturally
 * by content, never floating.
 */
export function LandingView() {
  // Deep links like /#faq can't scroll before hydration — do it once on mount.
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (SECTION_IDS.includes(id)) {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <CategoriesRail />
        <ForBusiness />
        <FeaturePreviews />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
