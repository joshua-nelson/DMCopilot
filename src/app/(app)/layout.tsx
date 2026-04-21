import Link from "next/link";
import {
  Activity,
  CheckSquare,
  Globe,
  LayoutGrid,
  LineChart,
  NotebookPen,
  ScrollText,
  Search,
  Swords,
  Users,
} from "lucide-react";

import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { CampaignSwitcher } from "@/app/(app)/dashboard/campaigns/_components/campaign-switcher";
import { RulesCommandBar } from "@/components/rules/rules-command-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative z-[1] grid h-screen w-screen grid-cols-[220px_minmax(0,1fr)] grid-rows-[48px_minmax(0,1fr)] overflow-hidden bg-background">
      {/* ============= TOPBAR ============= */}
      <header className="col-span-2 grid grid-cols-[220px_minmax(0,1fr)_auto] items-center border-b border-line-soft bg-bg-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3.5 font-semibold tracking-tight text-ink-0"
        >
          <span
            className="h-5 w-5 rounded-[5px] shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.08)]"
            style={{
              background:
                "conic-gradient(from 210deg, var(--accent) 0deg, oklch(0.55 0.14 30) 140deg, oklch(0.35 0.06 280) 260deg, var(--accent) 360deg)",
            }}
          />
          <span className="text-[13px]">Dungeon Copilot</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2.5 px-3">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius)] border border-line-soft bg-bg-1 px-2.5 text-ink-2 transition-colors hover:border-line hover:bg-bg-2">
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 truncate text-ink-3">
              Ask anything — rules, prior sessions, NPCs, locations…
            </span>
            <span className="rounded border border-line bg-bg-0 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
              ⌘K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-line-soft px-2 text-[11px] text-ink-2">
            <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-bad shadow-[0_0_0_3px_oklch(0.66_0.15_20_/_0.18)]" />
            Live session
          </span>
          <ModeToggle />
          <UserMenu />
        </div>
      </header>

      {/* ============= NAV RAIL ============= */}
      <nav className="flex min-w-0 flex-col gap-3.5 overflow-hidden border-r border-line-soft bg-bg-0 p-2.5">
        <div className="flex items-center gap-2.5 rounded-[var(--radius)] border border-line-soft bg-bg-1 p-2.5">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border border-line font-heading text-[18px]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, oklch(0.55 0.10 30) 0%, transparent 55%), linear-gradient(135deg, oklch(0.26 0.03 270), oklch(0.18 0.02 270))",
              color: "oklch(0.85 0.05 30)",
            }}
          >
            C
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <CampaignSwitcher />
          </div>
        </div>

        <div>
          <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-4">
            Workspace
          </div>
          <div className="flex flex-col gap-px">
            <NavItem
              href="/dashboard"
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="Dashboard"
            />
            <NavItem
              href="/dashboard/metrics"
              icon={<LineChart className="h-3.5 w-3.5" />}
              label="Metrics"
            />
          </div>
        </div>

        <div>
          <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-4">
            Session
          </div>
          <div className="flex flex-col gap-px">
            <NavItem
              href="#"
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Live"
              badge="●"
              active
            />
            <NavItem
              href="#"
              icon={<NotebookPen className="h-3.5 w-3.5" />}
              label="Notes"
            />
            <NavItem
              href="#"
              icon={<CheckSquare className="h-3.5 w-3.5" />}
              label="Events"
            />
            <NavItem
              href="#"
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="Handouts"
            />
          </div>
        </div>

        <div>
          <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-4">
            Campaign
          </div>
          <div className="flex flex-col gap-px">
            <NavItem
              href="#"
              icon={<Users className="h-3.5 w-3.5" />}
              label="NPCs"
            />
            <NavItem
              href="#"
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Locations"
            />
            <NavItem
              href="#"
              icon={<Swords className="h-3.5 w-3.5" />}
              label="Factions"
            />
            <NavItem
              href="#"
              icon={<ScrollText className="h-3.5 w-3.5" />}
              label="Rules (SRD)"
            />
          </div>
        </div>

        <div className="mt-auto rounded-[var(--radius)] border border-line-soft bg-bg-1 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.06em] text-ink-2">
              Proactivity
            </span>
            <span className="font-mono text-[11px] font-semibold text-ember">
              2 · Active
            </span>
          </div>
          <div className="relative mx-1 my-2.5 h-1 rounded-full bg-bg-3">
            <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-ember" />
            <div className="absolute -top-[3px] left-0 right-0 flex justify-between">
              {[true, true, true, false].map((on, i) => (
                <span
                  key={i}
                  className={
                    on
                      ? "h-2.5 w-2.5 rounded-full bg-ember shadow-[0_0_0_3px_oklch(0.74_0.13_52_/_0.18)]"
                      : "h-2.5 w-2.5 rounded-full border border-line bg-bg-3"
                  }
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between px-0.5 font-mono text-[10px] text-ink-4">
            <span>silent</span>
            <span>subtle</span>
            <span>active</span>
            <span>assert</span>
          </div>
        </div>
      </nav>

      {/* ============= MAIN ============= */}
      <main className="scrollbar-thin relative flex min-h-0 min-w-0 flex-col overflow-y-auto bg-bg-0">
        {children}
      </main>

      <RulesCommandBar />
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  badge,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  const base =
    "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12.5px]";
  const stateClasses = active
    ? "bg-bg-2 text-ink-0 [&_svg]:text-ember"
    : "text-ink-2 hover:bg-bg-2 hover:text-ink-1 [&_svg]:text-ink-3";
  return (
    <Link href={href} className={`${base} ${stateClasses}`}>
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="ml-auto font-mono text-[10.5px] text-ink-3">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

