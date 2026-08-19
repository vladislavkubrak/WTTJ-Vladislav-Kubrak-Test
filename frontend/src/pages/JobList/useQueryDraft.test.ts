import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useQueryDraft } from "./useQueryDraft";

/*
 * The search box holds its own text while the URL catches up, and the two are
 * updated in different renders. That gap is where this hook can go wrong, and
 * once did: writing the URL and the URL arriving back as a prop are separate
 * passes, so a version that compared against what it had just sent saw a
 * `query` that had not caught up, read it as "the URL changed underneath me",
 * and reset the field to empty. Measured in a browser: the box cleared for
 * about five milliseconds on every pause in typing, showing the placeholder
 * through the text.
 *
 * These tests hold `query` still on purpose — a parent that has not re-rendered
 * yet is exactly the state that broke it.
 */

const WRITE_DELAY_MS = 300;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("keeps the typed text while the URL has not caught up", () => {
  const onCommit = vi.fn();

  const { result, rerender } = renderHook(
    ({ query }: { query: string }) => useQueryDraft(query, onCommit),
    { initialProps: { query: "" } },
  );

  act(() => result.current[1]("engineer"));
  expect(result.current[0]).toBe("engineer");

  act(() => vi.advanceTimersByTime(WRITE_DELAY_MS));
  expect(onCommit).toHaveBeenCalledWith("engineer");

  // The commit has fired and the parent has not re-rendered with the new URL
  // yet. The box must not blink back to empty in the meantime.
  rerender({ query: "" });
  expect(result.current[0]).toBe("engineer");

  // And it stays put once the URL does arrive.
  rerender({ query: "engineer" });
  expect(result.current[0]).toBe("engineer");
});

it("writes the URL once for a burst of typing", () => {
  const onCommit = vi.fn();

  const { result } = renderHook(
    ({ query }: { query: string }) => useQueryDraft(query, onCommit),
    { initialProps: { query: "" } },
  );

  for (const text of ["e", "en", "eng", "engi"]) {
    act(() => result.current[1](text));
    act(() => vi.advanceTimersByTime(60));
  }

  expect(onCommit).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(WRITE_DELAY_MS));

  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith("engi");
});

it("follows the URL when it changes on its own", () => {
  const onCommit = vi.fn();

  const { result, rerender } = renderHook(
    ({ query }: { query: string }) => useQueryDraft(query, onCommit),
    { initialProps: { query: "engineer" } },
  );

  // The back button, or a cleared filter: nobody typed this.
  rerender({ query: "designer" });

  expect(result.current[0]).toBe("designer");

  // Following the URL is not a reason to write it back again.
  act(() => vi.advanceTimersByTime(WRITE_DELAY_MS));
  expect(onCommit).not.toHaveBeenCalled();
});

it("does not write the URL when the text is already what the URL says", () => {
  const onCommit = vi.fn();

  const { result } = renderHook(
    ({ query }: { query: string }) => useQueryDraft(query, onCommit),
    { initialProps: { query: "engineer" } },
  );

  act(() => result.current[1]("engineer"));
  act(() => vi.advanceTimersByTime(WRITE_DELAY_MS));

  expect(onCommit).not.toHaveBeenCalled();
});
