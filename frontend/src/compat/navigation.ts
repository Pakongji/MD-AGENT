import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function usePathname() { return useLocation().pathname; }
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => ({
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
  }), [navigate]);
}
