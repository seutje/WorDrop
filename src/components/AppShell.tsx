import type { ReactNode } from "react";

export type AppSection = "closet" | "outfits";

type AppShellProps = {
  activeSection: AppSection;
  children: ReactNode;
  onNavigate: (section: AppSection) => void;
};

const sections: ReadonlyArray<{ id: AppSection; label: string; icon: string }> =
  [
    { id: "closet", label: "Closet", icon: "▦" },
    { id: "outfits", label: "Outfits", icon: "♧" },
  ];

export function AppShell({
  activeSection,
  children,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="WorDrop home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WorDrop</span>
        </div>
        <nav className="navigation" aria-label="Main navigation">
          {sections.map((section) => (
            <button
              className="nav-item"
              data-active={activeSection === section.id}
              key={section.id}
              onClick={() => onNavigate(section.id)}
              type="button"
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-note">Your wardrobe, thoughtfully organized.</p>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
