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
      <header className="col-span-2 grid grid-cols-[220px_minmax(0,1fr)_auto] items-center border-b-4 border-line bg-bg-1">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3.5 font-pixel text-[9px] leading-tight tracking-tight text-ink-0 cursor-pointer transition-colors hover:text-ember"
        >
          {/* 16×16 pixel sword icon via box-shadow mosaic */}
          <span
            className="relative inline-block h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: "pixelated" }}>
              <rect x="7" y="0" width="2" height="2" fill="currentColor"/>
              <rect x="6" y="2" width="4" height="2" fill="currentColor"/>
              <rect x="7" y="4" width="2" height="6" fill="currentColor"/>
              <rect x="4" y="8" width="8" height="2" fill="currentColor"/>
              <rect x="7" y="10" width="2" height="4" fill="currentColor"/>
              <rect x="6" y="14" width="4" height="2" fill="currentColor"/>
            </svg>
          </span>
          <span>DM<br/>Copilot</span>
        </Link>

        {/* Search bar */}
        <div className="flex min-w-0 items-center gap-2.5 px-3">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 border-2 border-line bg-bg-0 px-2.5 text-ink-2 cursor-pointer transition-colors hover:border-ember hover:bg-bg-1 pixel-inset">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate font-pixel-body text-ink-3 text-[15px]">
              Ask anything — rules, NPCs, locations…
            </span>
            <span className="border-2 border-line bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 px-3">
          <span className="inline-flex h-6 items-center gap-1.5 border-2 border-bad/50 bg-bad/10 px-2 font-pixel text-[8px] text-bad">
            <span className="h-[6px] w-[6px] animate-pulse bg-bad" />
            LIVE
          </span>
          <ModeToggle />
          <UserMenu />
        </div>
      </header>

      {/* ============= NAV RAIL ============= */}
      <nav className="flex min-w-0 flex-col gap-3 overflow-hidden border-r-4 border-line bg-bg-1 p-2">
        {/* Campaign switcher */}
        <div className="flex items-center gap-2 border-2 border-line bg-bg-0 p-2 pixel-inset">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center border-2 border-ember font-pixel text-[14px]"
            style={{
              background: "linear-gradient(135deg, #2a1800, #1a0a00)",
              color: "var(--accent)",
            }}
          >
            ⚔
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <CampaignSwitcher />
          </div>
        </div>

        <NavSection label="WORKSPACE">
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
        </NavSection>

        <NavSection label="SESSION">
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
        </NavSection>

        <NavSection label="CAMPAIGN">
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
        </NavSection>

        {/* Proactivity slider */}
        <div className="mt-auto border-2 border-line bg-bg-0 p-2.5 pixel-inset">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-pixel text-[7px] uppercase tracking-widest text-ink-2">
              Proactivity
            </span>
            <span className="font-pixel text-[7px] text-ember pixel-glow">
              2·ACT
            </span>
          </div>
          {/* Pixel progress bar */}
          <div className="relative mx-1 my-2.5 h-2 bg-bg-3">
            <div className="absolute inset-y-0 left-0 w-2/3 bg-ember" />
            <div className="absolute -top-[3px] left-0 right-0 flex justify-between">
              {[true, true, true, false].map((on, i) => (
                <span
                  key={i}
                  className={
                    on
                      ? "h-3 w-3 bg-ember shadow-[0_0_0_2px_var(--accent-line)]"
                      : "h-3 w-3 border-2 border-line bg-bg-3"
                  }
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between px-0.5 font-pixel text-[6px] text-ink-4">
            <span>OFF</span>
            <span>LOW</span>
            <span>MED</span>
            <span>HIGH</span>
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

function NavSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-2 pb-1 pt-1.5 font-pixel text-[7px] uppercase tracking-[0.12em] text-ink-4">
        {label}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
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
    "flex items-center gap-2.5 px-2 py-1.5 font-pixel-body text-[15px] cursor-pointer transition-colors";
  const stateClasses = active
    ? "bg-bg-2 text-ink-0 border-l-4 border-ember [&_svg]:text-ember"
    : "text-ink-2 hover:bg-bg-2 hover:text-ink-1 border-l-4 border-transparent [&_svg]:text-ink-3";
  return (
    <Link href={href} className={`${base} ${stateClasses}`}>
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="ml-auto font-mono text-[10.5px] text-bad animate-pulse">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
