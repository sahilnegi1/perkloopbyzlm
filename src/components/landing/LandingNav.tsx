"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo, onAnchorClick, PillCta } from "./primitives";

const NAV_LINKS = [
  { label: "How it works", id: "how-it-works" },
  { label: "For business", id: "for-business" },
  { label: "FAQ", id: "faq" },
];

const linkFocus =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-lime/60";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[#0B1A00]/55 py-2 pr-2 pl-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:h-16 sm:pl-5"
      >
        <a
          href="#/"
          aria-label="Reward Jar — home"
          className={`press flex items-center gap-2.5 rounded-full ${linkFocus}`}
        >
          <Logo className="h-7 w-7" />
          <span className="font-display text-[17px] font-bold tracking-tight text-[#FAF7F2]">
            Reward&nbsp;Jar
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={onAnchorClick(link.id)}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-[#FAF7F2]/75 transition-colors duration-150 hover:bg-white/10 hover:text-[#FAF7F2] ${linkFocus}`}
            >
              {link.label}
            </a>
          ))}
          <div aria-hidden className="mx-2 h-5 w-px bg-white/15" />
          <a
            href="#/auth"
            className={`press inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-[#FAF7F2] transition-colors duration-150 hover:bg-white/10 ${linkFocus}`}
          >
            Sign in
          </a>
          <PillCta
            href="#/auth?role=customer&mode=register"
            variant="lime"
            className="h-10 px-5"
          >
            Get started
          </PillCta>
        </div>

        {/* Mobile: hamburger */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                aria-label="Open menu"
                className="size-10 rounded-full border-white/20 bg-white/10 text-[#FAF7F2] hover:bg-white/20 hover:text-[#FAF7F2]"
              >
                <Menu className="size-5" aria-hidden strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[19rem] gap-0 overscroll-contain border-border bg-background p-0"
            >
              <SheetHeader className="border-b border-border p-5 text-left">
                <div className="flex items-center gap-2.5">
                  <Logo />
                  <SheetTitle className="font-display text-lg font-bold text-ink">
                    Reward Jar
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-muted-foreground">
                  Your Loyalty Deserves More.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-1 p-5">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.id}>
                    <a
                      href={`#${link.id}`}
                      onClick={onAnchorClick(link.id)}
                      className={`flex h-12 items-center rounded-xl px-4 text-base font-medium text-foreground transition-colors duration-150 hover:bg-accent ${linkFocus}`}
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-border p-5">
                <SheetClose asChild>
                  <PillCta href="#/auth?role=customer&mode=register" className="w-full">
                    Get started
                  </PillCta>
                </SheetClose>
                <SheetClose asChild>
                  <PillCta href="#/auth" variant="outline" className="w-full">
                    Sign in
                  </PillCta>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
