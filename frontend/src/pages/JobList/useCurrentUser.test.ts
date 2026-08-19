import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import Cookies from "js-cookie";

import { useCurrentUser } from "./useCurrentUser";

/*
 * The header reads `hasToken` and `user` and shows one of three things: the
 * signed-out buttons, the signed-in email, or a spinner in between. The
 * spinner is the state with no way out of it, so these are the tests that it
 * always ends.
 *
 * It did not, once. The runtime guard added here checked `id` against the
 * starter's annotation, `string`, while the API sends a number — so every
 * signed-in visitor got a spinner where the buttons belong, permanently, and
 * the only way back was clearing cookies by hand. It never showed up in
 * incognito, which is where a page like this usually gets looked at.
 */

const respond = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  Cookies.set("user-token", "a-token");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  Cookies.remove("user-token");
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it("reports the token on the very first render, before any request", () => {
  fetchMock.mockReturnValue(new Promise(() => {}));

  const { result } = renderHook(() => useCurrentUser());

  // No waiting: a cookie is synchronous, and a header that flips a frame later
  // is a flash of the wrong navigation.
  expect(result.current.hasToken).toBe(true);
  expect(result.current.user).toBeNull();
});

it("resolves to the signed in user", async () => {
  fetchMock.mockResolvedValue(
    respond(200, { data: { id: 1, email: "someone@example.com" } }),
  );

  const { result } = renderHook(() => useCurrentUser());

  await waitFor(() => expect(result.current.user).not.toBeNull());
  expect(result.current.user?.email).toBe("someone@example.com");
  expect(result.current.hasToken).toBe(true);
});

it("stops claiming a session when the server rejects the token", async () => {
  fetchMock.mockResolvedValue(respond(401, null));

  const { result } = renderHook(() => useCurrentUser());

  await waitFor(() => expect(result.current.hasToken).toBe(false));
  expect(result.current.user).toBeNull();
  // The server has seen this token and refused it, so keeping it only repeats
  // the rejection on every future load.
  expect(Cookies.get("user-token")).toBeUndefined();
});

it("stops claiming a session when the response cannot be read", async () => {
  fetchMock.mockResolvedValue(respond(200, { data: { nonsense: true } }));

  const { result } = renderHook(() => useCurrentUser());

  await waitFor(() => expect(result.current.hasToken).toBe(false));
  expect(result.current.user).toBeNull();
});

it("resolves, but keeps the token, when the request never arrives", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));

  const { result } = renderHook(() => useCurrentUser());

  await waitFor(() => expect(result.current.hasToken).toBe(false));
  // Nothing has judged the token — the network did. It stays for the next load.
  expect(Cookies.get("user-token")).toBe("a-token");
});
