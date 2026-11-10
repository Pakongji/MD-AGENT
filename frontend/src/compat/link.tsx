import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link as RouterLink } from "react-router-dom";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; prefetch?: boolean };
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _prefetch, ...props }, ref) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href) || props.download) {
    return <a ref={ref} href={href} {...props} />;
  }
  return <RouterLink ref={ref} to={href} {...props} />;
});
export default Link;
