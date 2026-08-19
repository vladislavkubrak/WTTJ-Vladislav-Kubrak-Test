import { useEffect } from "react";

const SUFFIX = "Welcome to the Jungle";

/**
 * Names the page.
 *
 * A single page application keeps whatever title index.html shipped with,
 * which here was the folder the project was generated in. WCAG 2.4.2 asks for
 * a title that describes the page, and it is also what a browser tab, a
 * bookmark and a history entry show — three places a job seeker with six tabs
 * open has to tell them apart.
 */
export const useDocumentTitle = (title: string | null) => {
  useEffect(() => {
    if (title === null) return;

    const previous = document.title;
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX;

    return () => {
      document.title = previous;
    };
  }, [title]);
};
