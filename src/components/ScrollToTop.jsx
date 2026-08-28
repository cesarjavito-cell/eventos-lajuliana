import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef({});
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Save scroll position for the previous page before it changes
    if (prevPathname.current !== pathname) {
      scrollPositions.current[prevPathname.current] = window.scrollY;
      prevPathname.current = pathname;
    }

    if (navigationType === "POP") {
      // Back/forward navigation: restore saved position if available
      const saved = scrollPositions.current[pathname];
      if (saved !== undefined) {
        const timer = window.setTimeout(() => window.scrollTo(0, saved), 250);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    // For tab switches (PUSH): restore saved position or scroll to top
    const saved = scrollPositions.current[pathname];
    const timer = window.setTimeout(() => {
      if (saved !== undefined) {
        window.scrollTo(0, saved);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, navigationType]);

  return null;
}
