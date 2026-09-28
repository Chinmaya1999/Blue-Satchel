import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Starts every newly visited page at the top. React Router keeps the previous
 * page's scroll position otherwise, so a menu click from low on the home page
 * landed partway down (or at the footer of) the next page. Jumps instantly —
 * the global `scroll-behavior: smooth` would animate it up from the bottom.
 * Back/forward (POP) keeps the browser's own restoration, and "#section"
 * links are left to scroll to their target.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (hash || navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollToTop;
