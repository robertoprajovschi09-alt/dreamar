import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window and any scrollable <main> elements to the top
 * whenever the route pathname changes.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
    // Layouts (e.g. AgencyLayout) use a scrollable <main> instead of window scroll.
    document.querySelectorAll("main").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
