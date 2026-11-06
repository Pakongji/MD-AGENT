"use client";

import { useState, type ReactNode } from "react";

export function FeatureTabs({ primary, secondary, primaryLabel, secondaryLabel, showSecondary = false }: {
  primary: ReactNode; secondary: ReactNode; primaryLabel: string; secondaryLabel: string; showSecondary?: boolean;
}) {
  const [active, setActive] = useState(showSecondary ? 1 : 0);
  return <>
    <nav className="md-feature-tabs" aria-label="화면 전환">
      {[primaryLabel, secondaryLabel].map((label, i) => <button key={label} type="button" aria-pressed={active === i} onClick={() => setActive(i)}>{label}</button>)}
    </nav>
    <div hidden={active !== 0}>{primary}</div>
    {active === 1 && secondary}
  </>;
}
