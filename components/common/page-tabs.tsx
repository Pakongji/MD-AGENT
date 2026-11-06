"use client";

import { useState, type ReactNode } from "react";

export interface PageTab {
  key: string;
  label: string;
  badge?: string;
  content: ReactNode;
}

/** 화면 안의 하위 탭. 선택한 탭은 주소(?tab=)에도 남겨서 새로고침·공유해도 같은 탭이 열립니다. */
export function PageTabs({ tabs, initial }: { tabs: PageTab[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((tab) => tab.key === initial) ? initial! : tabs[0].key);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([active]));

  function select(key: string) {
    setActive(key);
    setVisited((current) => new Set(current).add(key));
    const url = new URL(window.location.href);
    if (key === tabs[0].key) url.searchParams.delete("tab"); else url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  return <div className="rd-page-tabs">
    <nav className="rd-tab-bar" aria-label="화면 안 탭">
      {tabs.map((tab) => <button key={tab.key} type="button" aria-pressed={active === tab.key} onClick={() => select(tab.key)}>
        {tab.label}{tab.badge && <span className="rd-tab-badge">{tab.badge}</span>}
      </button>)}
    </nav>
    {tabs.map((tab) => visited.has(tab.key) && <div key={tab.key} hidden={active !== tab.key}>{tab.content}</div>)}
  </div>;
}

