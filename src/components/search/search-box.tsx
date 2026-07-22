"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBasket, Store, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Suggestions } from "@/server/services/search";
import { Input } from "@/components/ui/input";

const EMPTY: Suggestions = { products: [], brands: [], categories: [], chains: [] };

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasResults =
    suggestions.products.length > 0 ||
    suggestions.brands.length > 0 ||
    suggestions.categories.length > 0 ||
    suggestions.chains.length > 0;

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setSuggestions(EMPTY);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (res.ok) setSuggestions(await res.json());
    } catch {
      // aborted or offline — keep previous suggestions
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 200);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit() {
    if (query.trim().length < 2) return;
    setOpen(false);
    router.push(`/vyhladavanie?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("search")}
          className="pl-9"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && hasResults}
          aria-label={t("search")}
        />
      </div>

      {open && hasResults && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
          {suggestions.products.length > 0 && (
            <ul className="py-1">
              {suggestions.products.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/produkty/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <ShoppingBasket className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                    {p.unitSize && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {p.unitSize}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {(suggestions.brands.length > 0 || suggestions.categories.length > 0 || suggestions.chains.length > 0) && (
            <ul className="border-t border-border/60 py-1">
              {suggestions.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/kategorie/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className="w-4 text-center">{c.icon ?? "🏷️"}</span>
                    <span>{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">kategória</span>
                  </Link>
                </li>
              ))}
              {suggestions.brands.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/vyhladavanie?q=${encodeURIComponent(b.name)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Tag className="size-4 text-muted-foreground" />
                    <span>{b.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">značka</span>
                  </Link>
                </li>
              ))}
              {suggestions.chains.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/obchody/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Store className="size-4 text-muted-foreground" />
                    <span>{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">obchod</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={submit}
            className="w-full border-t border-border/60 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
          >
            Hľadať „{query}“ →
          </button>
        </div>
      )}
    </div>
  );
}
