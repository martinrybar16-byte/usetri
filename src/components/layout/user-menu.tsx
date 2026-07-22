"use client";

import Link from "next/link";
import { Heart, LayoutDashboard, ListChecks, LogOut, PiggyBank, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { signOutAction } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
};

export function UserMenu({ name, email, isAdmin }: Props) {
  const t = useTranslations("nav");
  const initials = (name || email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("profile")}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{name ?? email}</p>
          {name && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ucet"><User className="size-4" /> {t("profile")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/oblubene"><Heart className="size-4" /> {t("favorites")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/zoznamy"><ListChecks className="size-4" /> {t("shoppingLists")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/usetrene"><PiggyBank className="size-4" /> {t("savings")}</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin"><LayoutDashboard className="size-4" /> {t("admin")}</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOut className="size-4" /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
