import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Repeat,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Table2,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { inventoryQuery, purchasesQuery, salesQuery, tradesQuery } from "@/lib/queries";
import { ref, shortDate, usd } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type NavLink = { label: string; to: string; search?: Record<string, string>; icon: typeof Boxes };

const groups: { title?: string; items: NavLink[] }[] = [
  {
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Inventory",
    items: [
      { label: "All Pets", to: "/inventory", search: { status: "all" }, icon: Boxes },
      { label: "Available", to: "/inventory", search: { status: "available" }, icon: Package },
      { label: "Sold", to: "/inventory", search: { status: "sold" }, icon: Tags },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Purchases", to: "/purchases", icon: ShoppingCart },
      { label: "Trades", to: "/trades", icon: Repeat },
      { label: "Sales", to: "/sales", icon: Receipt },
    ],
  },
  {
    items: [
      { label: "Accounts", to: "/accounts", icon: Users },
      { label: "Compact Table", to: "/compact", icon: Table2 },
      { label: "Reports", to: "/reports", icon: Table2 },
      { label: "Settings", to: "/settings", icon: SettingsIcon },
    ],
  },
];

function NavItems({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const location = useRouterState({ select: (s) => s.location });

  return (
    <nav className="flex flex-col gap-5 px-3">
      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.title && !collapsed ? (
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {group.title}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active =
              location.pathname === item.to &&
              (!item.search ||
                (location.search as Record<string, string>)["status"] === item.search["status"] ||
                (item.search["status"] === "all" &&
                  !(location.search as Record<string, string>)["status"]));
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.search as never}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
                title={item.label}
              >
                <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex h-16 items-center gap-2.5 px-5">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Boxes className="size-4" />
      </div>
      {!collapsed && (
        <span className="font-display text-sm font-semibold tracking-tight">Adopt Me Manager</span>
      )}
    </div>
  );
}

function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const inventory = useQuery({ ...inventoryQuery(), enabled: open });
  const purchases = useQuery({ ...purchasesQuery(), enabled: open });
  const trades = useQuery({ ...tradesQuery(), enabled: open });
  const sales = useQuery({ ...salesQuery(), enabled: open });

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pets, accounts, purchases, trades, sales..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {inventory.data?.length ? (
          <CommandGroup heading="Inventory">
            {inventory.data.slice(0, 30).map((i) => (
              <CommandItem
                key={i.id}
                value={`${i.pet_name} ${i.username} ${i.notes ?? ""}`}
                onSelect={() => go("/inventory")}
              >
                {i.pet_name} · {i.username} · {i.quantity} in stock
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {purchases.data?.length ? (
          <CommandGroup heading="Purchases">
            {purchases.data.slice(0, 20).map((p) => (
              <CommandItem
                key={p.id}
                value={`${ref("BUY", p.seq)} ${p.buy_item} ${p.game} ${p.notes ?? ""}`}
                onSelect={() => go("/purchases")}
              >
                {ref("BUY", p.seq)} · {p.buy_item} · {shortDate(p.purchase_date)}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {trades.data?.length ? (
          <CommandGroup heading="Trades">
            {trades.data.slice(0, 20).map((t) => (
              <CommandItem
                key={t.id}
                value={`${ref("TRADE", t.seq)} ${t.traded_item} ${t.notes ?? ""}`}
                onSelect={() => go("/trades")}
              >
                {ref("TRADE", t.seq)} · {t.traded_item} · {shortDate(t.trade_date)}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {sales.data?.length ? (
          <CommandGroup heading="Sales">
            {sales.data.slice(0, 20).map((s) => (
              <CommandItem
                key={s.id}
                value={`${ref("SALE", s.seq)} ${s.pet_name} ${s.username} ${s.notes ?? ""}`}
                onSelect={() => go("/sales")}
              >
                {ref("SALE", s.seq)} · {s.pet_name} · {usd(s.sell_price_usd)}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto pb-4">
          <NavItems collapsed={collapsed} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-muted-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <div className="overflow-y-auto pb-6">
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
          >
            <Search className="size-4" />
            <span className="truncate">Search everything...</span>
          </button>
          <div className="flex-1" />
          {email ? (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{email}</span>
          ) : null}
          <Button variant="ghost" size="icon" title="Sign out" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">{children}</div>
          <footer className="mx-auto mt-10 w-full max-w-[1400px] border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Developed by <span className="font-semibold text-primary">Yukafii</span>
          </footer>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
