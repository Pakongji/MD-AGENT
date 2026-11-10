import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export interface PageTab { key: string; label: string; badge?: string; content: ReactNode }

/** Keep the existing tabs/design, with router-aware query/history updates. */
export function PageTabs({ tabs, initial }: { tabs: PageTab[]; initial?: string }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") || initial;
  const active = tabs.find((tab) => tab.key === requested)?.key || tabs[0].key;
  const [visited, setVisited] = useState<Set<string>>(() => new Set([active]));
  function select(key: string) {
    setVisited((current) => new Set(current).add(key));
    const next = new URLSearchParams(params);
    if (key === tabs[0].key) next.delete("tab"); else next.set("tab", key);
    setParams(next, { replace: true });
  }
  return <div className="rd-page-tabs">
    <nav className="rd-tab-bar" aria-label="화면 안 탭">
      {tabs.map((tab) => <button key={tab.key} type="button" aria-pressed={active === tab.key} onClick={() => select(tab.key)}>
        {tab.label}{tab.badge && <span className="rd-tab-badge">{tab.badge}</span>}
      </button>)}
    </nav>
    {tabs.map((tab) => (visited.has(tab.key) || active === tab.key) && <div key={tab.key} hidden={active !== tab.key}>{tab.content}</div>)}
  </div>;
}
