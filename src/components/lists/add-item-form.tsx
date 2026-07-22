"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, ShoppingBasket } from "lucide-react";

import { addItemAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/auth/form-message";

type Suggestion = { name: string; slug: string; unitSize: string | null };

export function AddItemForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(addItemAction, undefined);
  const [text, setText] = useState("");
  const [productId, setProductId] = useState("");
  const [suggestions, setSuggestions] = useState<(Suggestion & { id?: string })[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (text.trim().length < 2 || productId) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/v1/search/suggest?q=${encodeURIComponent(text)}&ids=1`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.products ?? []);
        }
      } catch {
        // offline — plain free-text add still works
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [text, productId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <form
        ref={formRef}
        action={(fd) => {
          formAction(fd);
          setText("");
          setProductId("");
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="listId" value={listId} />
        <input type="hidden" name="productId" value={productId} />
        <div className="relative flex-1 sm:max-w-md">
          <Input
            name="freeText"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setProductId("");
              setOpen(true);
            }}
            placeholder="Pridať položku — napr. mlieko, chlieb…"
            maxLength={100}
            autoComplete="off"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-lg border border-border/60 bg-popover py-1 shadow-md">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setText(s.name);
                      setProductId((s as { id?: string }).id ?? "");
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <ShoppingBasket className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.name}</span>
                    {s.unitSize && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {s.unitSize}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Input
          name="quantity"
          type="number"
          min={1}
          max={999}
          defaultValue={1}
          className="w-20 tabular-nums"
          aria-label="Množstvo"
        />
        <Button type="submit" disabled={pending} size="icon" aria-label="Pridať">
          <Plus className="size-4" />
        </Button>
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
