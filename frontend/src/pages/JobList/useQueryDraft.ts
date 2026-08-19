import { useEffect, useState } from "react";

const WRITE_DELAY_MS = 300;

/**
 * Holds what is in the search box while the URL catches up.
 *
 * The rest of the filters live in the URL and nowhere else, which is the right
 * shape for anything set by a single click. Free text is different, and a real
 * browser is what proved it: a controlled input whose value comes from state
 * that updates asynchronously loses characters when someone types faster than
 * the round trip. React re-renders with the previous value still in hand and
 * resets the DOM to it, so typing "frontend" quickly left `?q=d` in the URL and
 * one letter in the box. Under a test runner every keystroke is awaited, so
 * the suite saw nothing wrong.
 *
 * So the box keeps its own value, which is always instant, and the URL is
 * written once the typing stops. The URL stays the thing that is fetched from,
 * shared and restored — it is just no longer rewritten eight times while
 * someone types a word.
 *
 * Syncing the other way is for changes the box did not make: the back button,
 * or clearing the filters. Comparing against the last value written keeps it
 * from fighting the person typing.
 */
export const useQueryDraft = (
  query: string,
  onCommit: (query: string) => void,
) => {
  const [draft, setDraft] = useState(query);

  // The last value of `query` this hook has seen — not the last value it sent.
  // The difference is the whole bug this comparison used to have: writing the
  // URL and the URL arriving back as a prop are two different renders, so a
  // hook that compared against what it had just sent found a `query` that had
  // not caught up yet, decided the URL had changed underneath it, and reset
  // the box to empty. For about five milliseconds the field cleared and the
  // placeholder showed through, on every pause in typing.
  //
  // Comparing against what arrived means a value we sent can never look like a
  // value someone else set.
  const [seenQuery, setSeenQuery] = useState(query);

  if (query !== seenQuery) {
    // The URL really did change on its own — the back button, or a cleared
    // filter — so the box follows it.
    //
    // This is React's own pattern for adjusting state when an input changes,
    // and it is deliberately not an effect: React throws away the render in
    // progress and re-runs this component before touching the DOM, so the
    // stale text is never painted and no child re-renders for it. An effect
    // would run after the commit, showing the old value for a frame and
    // costing a second pass over the tree.
    setSeenQuery(query);
    setDraft(query);
  }

  useEffect(() => {
    if (draft === query) return;

    const timeout = setTimeout(() => onCommit(draft), WRITE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [draft, query, onCommit]);

  return [draft, setDraft] as const;
};
