"use client";

import { useEffect } from "react";
import { useHashRoute } from "@/lib/hash-router";
import { useSession } from "@/lib/store";
import { Loader2 } from "lucide-react";
import { LandingView } from "@/components/views/LandingView";
import { AuthView } from "@/components/views/AuthView";
import { CustomerApp } from "@/components/views/CustomerApp";
import { MerchantApp } from "@/components/views/MerchantApp";
import { OutletEntry } from "@/components/views/OutletEntry";
import { TxnConfirm } from "@/components/views/TxnConfirm";
import { StaticPage } from "@/components/views/StaticPage";

export default function Home() {
  const route = useHashRoute();
  const { user, loading, fetched, fetchMe } = useSession();

  useEffect(() => {
    if (!fetched) void fetchMe();
  }, [fetched, fetchMe]);

  const [head, ...rest] = route.segments;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <img src="/logo.svg" alt="Reward Jar" className="h-14 w-14" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Reward Jar…
        </div>
      </div>
    );
  }

  switch (head) {
    case undefined:
      return <LandingView />;
    case "auth":
      return (
        <AuthView
          initialRole={route.query.get("role") === "merchant" ? "merchant" : "customer"}
          initialMode={route.query.get("mode") === "register" ? "register" : "login"}
        />
      );
    case "app":
      return <CustomerApp subRoute={rest} />;
    case "merchant":
      return <MerchantApp subRoute={rest} />;
    case "o":
      return <OutletEntry code={rest[0] ?? ""} />;
    case "t":
      return <TxnConfirm token={rest[0] ?? ""} />;
    case "privacy":
    case "terms":
      return <StaticPage page={head} />;
    default:
      return <LandingView />;
  }
}
