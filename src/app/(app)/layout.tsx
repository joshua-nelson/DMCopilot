import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CampaignSwitcher } from "@/app/(app)/dashboard/campaigns/_components/campaign-switcher";
import { RulesCommandBar } from "@/components/rules/rules-command-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
          <div className="flex h-14 items-center px-4">
            <Link href="/dashboard" className="font-heading text-sm">
              DM Copilot
            </Link>
          </div>
          <Separator />
          <nav className="flex flex-1 flex-col gap-1 p-2">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/dashboard/metrics">Metrics</Link>
            </Button>
          </nav>
          <div className="p-3 text-xs text-muted-foreground">Phase 0 — WP3</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-sm font-medium">
                DM Copilot
              </Link>
              <CampaignSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserMenu />
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      <RulesCommandBar />
    </div>
  );
}
