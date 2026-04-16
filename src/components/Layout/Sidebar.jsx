import { LayoutDashboard, Phone, UserPlus, RefreshCw, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "new-leads", label: "New Leads", icon: UserPlus },
  { key: "follow-ups", label: "Follow-Ups", icon: RefreshCw },
];

export default function Sidebar({ activeTab, onTabChange }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-56 z-40 flex flex-col
        bg-surface border-r border-border
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="px-6 pt-7 pb-6">
          <h1 className="text-lg font-bold text-text-primary">Trinity Offers</h1>
          <p className="text-[11px] text-text-dim mt-0.5">Lead Follow-Up Dashboard</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onTabChange(item.key);
                  setMobileOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium
                  transition-all cursor-pointer border border-transparent
                  ${active
                    ? 'bg-blue/12 text-blue border-blue/20'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-raised'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-[10px] text-text-dim">Olivia & Amy</p>
        </div>
      </aside>
    </>
  );
}
