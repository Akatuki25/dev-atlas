// 手書き(dev-atlas固有): アプリシェル。左サイドバー(セクション別ナビ)+ 全幅メイン。
// KB自身の構造(抽象→具体)を web でも見せる = wiki への入口を明確に置く。
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "./shell.css";

const WORKSPACE = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/work_logs", label: "Work Logs" },
];
const KNOWLEDGE = [{ href: "/wiki", label: "Wiki" }];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={"nav-link" + (active ? " active" : "")}>
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">dev-atlas</Link>
        <div className="sidebar-group">Workspace</div>
        {WORKSPACE.map((l) => <NavLink key={l.href} {...l} pathname={pathname} />)}
        <div className="sidebar-group">Knowledge</div>
        {KNOWLEDGE.map((l) => <NavLink key={l.href} {...l} pathname={pathname} />)}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
