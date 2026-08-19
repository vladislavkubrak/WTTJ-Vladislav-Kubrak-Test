/*
 * The icons the app is allowed to render, kept beside the symbols themselves.
 *
 * Its own module rather than a second export from `index.tsx`: a file that
 * exports both a component and a value cannot be hot-reloaded as a component,
 * so Vite reloads the whole page on every edit to it.
 *
 * `index.test.tsx` walks the rendered screens and checks every `<use href>`
 * against this list, so an icon added without its symbol fails the suite
 * instead of silently drawing nothing.
 */
export const ICON_NAMES = [
  "angle-double-left",
  "angle-double-right",
  "angle-down",
  "angle-left",
  "angle-right",
  "asterisk",
  "check",
  "check-circle",
  "desktop",
  "exclamation-octagon",
  "exclamation-triangle",
  "eye",
  "eye-slash",
  "file-alt",
  "info-circle",
  "lightbulb-alt",
  "map-marker-alt",
  "search",
  "times",
] as const;
