"use client";

/**
 * Discover (#/app/discover) — search + category chips → GET /api/businesses?category=&q=
 */

import { useEffect, useMemo, useState } from "react";
import {
  BusinessCard,
  CATEGORY_LABELS,
  CATEGORIES,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Reveal,
  useApiData,
  type BusinessListItem,
} from "@/components/customer/shared";
import { navigate } from "@/lib/hash-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function DiscoverTab() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(""); // "" = All
  const q = useDebounced(query.trim(), 300);

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/api/businesses${s ? `?${s}` : ""}`;
  }, [category, q]);

  const { data, error, loading, reload } = useApiData<{ businesses: BusinessListItem[] }>(path);
  const results = data?.businesses ?? [];
  const filtersActive = Boolean(category || q);

  return (
    <div className="space-y-5 px-4 pb-8 pt-5">
      <Reveal>
        <div className="space-y-1.5">
          <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink">Discover</h1>
          <p className="text-sm text-muted-foreground">
            Local businesses running loyalty programs on Reward Jar.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city or description"
            aria-label="Search businesses"
            className="h-12 rounded-full bg-card pl-10 pr-4"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scroll-slim" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategory("")}
            aria-pressed={category === ""}
            className={cn(
              "press h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              category === ""
                ? "border-forest bg-forest text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? "" : c)}
              aria-pressed={category === c}
              className={cn(
                "press h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                category === c
                  ? "border-forest bg-forest text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Reveal>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={filtersActive ? "Nothing matches that" : "No businesses yet"}
          line={
            filtersActive
              ? "Try a different search or clear the filters — new shops join Reward Jar regularly."
              : "Shops join Reward Jar one by one. Check back soon, or tell your favourite local shop about us."
          }
          action={
            filtersActive ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                }}
                className="press h-10 rounded-full"
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {results.map((b, i) => (
            <li key={b.id}>
              <Reveal delay={Math.min(i * 0.06, 0.3)}>
                <BusinessCard business={b} onClick={() => navigate(`#/app/business/${b.id}`)} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
