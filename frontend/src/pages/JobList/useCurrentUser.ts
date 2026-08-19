import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";

import { logout } from "../../api/logout";

interface CurrentUser {
  /**
   * A number, as every other id in this API is. The starter's own annotation
   * said `string`, which cost nothing while the response was assigned without
   * being checked — see the guard at the bottom of this file.
   */
  id: number;
  email: string;
}

/**
 * The signed in user, if there is one.
 *
 * Lifted out of the page, which was two features stacked on top of each other
 * with nothing marking the seam. It is not part of the job search.
 *
 * The header has three states, not two, and the third is the one worth being
 * careful about: there is a token but no user yet. That is a real moment — the
 * cookie is readable instantly and the request that turns it into an identity
 * is not — but it has to end. A token that never resolves leaves a spinner
 * where the buttons should be, with nothing to click and no way back.
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Read once, during the first render, rather than in an effect afterwards.
  // A cookie is available synchronously, so setting this from an effect only
  // meant the first paint claimed nobody was signed in and the header flipped
  // a frame later — a flash of the wrong navigation on every load.
  const [hasToken, setHasToken] = useState(() =>
    Boolean(Cookies.get("user-token")),
  );

  useEffect(() => {
    const csrfToken = Cookies.get("technical-test-csrf-token");
    const bearerToken = Cookies.get("user-token");

    if (!bearerToken) return;

    const controller = new AbortController();

    /** The token bought us nothing, so stop presenting the user as signed in. */
    const giveUp = ({ discardToken }: { discardToken: boolean }) => {
      if (controller.signal.aborted) return;

      if (discardToken) Cookies.remove("user-token");

      setUser(null);
      setHasToken(false);
    };

    fetch("/api/me", {
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearerToken}`,
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          // The server has seen this token and does not accept it. Keeping it
          // only means repeating the same rejection on the next page load.
          giveUp({ discardToken: true });
          return;
        }

        const body: unknown = await response.json().catch(() => null);

        if (!isRecord(body) || !isCurrentUser(body.data)) {
          giveUp({ discardToken: true });
          return;
        }

        if (!controller.signal.aborted) setUser(body.data);
      })
      .catch(() => {
        // The request never got an answer — the token may well be fine, so it
        // stays for the next load. The header still has to resolve.
        giveUp({ discardToken: false });
      });

    return () => controller.abort();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Signing out locally matters more than the round trip succeeding.
    }

    setUser(null);
    setHasToken(false);
  }, []);

  return { user, hasToken, signOut };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCurrentUser = (value: unknown): value is CurrentUser =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.email === "string";
