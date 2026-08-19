# welcome-ui — what building on it turned up

`welcome-ui@10.0.5`, `react@19.2.1`, `downshift@7.6.2`, Chrome 141.

Building the job search meant leaning on this library hard, and doing that
surfaced sixteen defects. **Fifteen of them are worked around in this repo**
— the search page and the application form behave correctly in spite of them —
and each entry below says how, so the workaround can be checked or thrown away
once the underlying thing is fixed.

The sixteenth is number 3, and it is written up precisely because I could
not work around it.

None of this is offered as an excuse for anything in my code. It is here
because every one of these is reproducible in a fresh app, most look like a
few lines at the source, and one of them is a Level A accessibility failure
that ships by default — which seemed worth telling you plainly rather than
quietly routing around and saying nothing.

Each entry is what I saw, how to see it again, and what I did in the meantime.

---

## 1. Icons render nothing unless `Sprite` is mounted, and fail silently

**Severity: high — silent, and the starter ships with it.**

`Icon` emits `<svg><use href="#name"/></svg>`. The `<symbol>` definitions live
in a separate `Sprite` export. If it is not mounted, every icon in the
application resolves to nothing and paints at `0×0`.

Nothing warns. No console message, no missing-asset request, no layout change
— the space reserved for the icon simply stays empty. On the starter as
shipped, that is the search glyph, all three select carets, both pagination
arrows and every clear cross.

```js
// on any page rendering an Icon, before mounting Sprite
document.querySelectorAll("symbol").length            // 0
document.querySelector("svg use").getAttribute("href") // "#search"
document.querySelector("svg").getBBox()                // { width: 0, height: 0 }
```

**Worked around by** extracting the nineteen symbols this app can reach into a
local sprite, and a test that fails if any `<use>` points at a symbol that is
not defined.

**Worth fixing because** the failure mode is invisible. A `console.warn` in
development when `Icon` mounts and no matching `symbol` is in the document
would have turned an afternoon into a minute. `Sprite` also cannot be
tree-shaken — it is one component holding all 209 icons, so drawing nine of
them costs 36kB gzipped.

---

## 2. `Select` cannot be opened from the keyboard

**Severity: critical — WCAG 2.1.1, Level A. Unusable without a pointer.**

With focus on the select, nothing opens it. Not Enter, not Space, not
ArrowDown, not Alt+ArrowDown — the combination the ARIA authoring practices
name for exactly this.

```
tab to the select
press Enter      → document.querySelectorAll('[role="option"]').length === 0
press ArrowDown  → 0
press Space      → 0
```

Everything after that point is correct: open it with a pointer and arrows move
the highlight, `aria-activedescendant` follows, Enter selects, Escape closes.
Only the first step is missing, and it is the one that makes the rest
reachable. On the job board that is three filters and a sort control; on the
create-job form, every field that is not free text.

**Worked around by** turning the keys the ARIA pattern expects into the
gesture the component already understands: a `keydown` handler that calls
`click()` when the list is closed, and stays out of the way when it is open so
Enter keeps meaning "choose this". In `components/Select`, so no call site can
forget it.

---

## 3. The focusable element is not the one carrying the role

**Severity: high — semantics and focus are on different nodes.**

```js
document.querySelectorAll('[aria-label="Contract type"]')
// [0] div._wrapper  role=combobox  aria-expanded=false  aria-haspopup=listbox  no tabindex
// [1] div._root     no role        no state                                    tabindex=0
```

The outer element carries the role and the expanded state and cannot receive
focus. The inner one receives focus and carries no role at all. A screen
reader user therefore tabs onto something that announces a name and nothing
else — no role, no "collapsed", no "has popup" — while the node that would
have said those things is never focused. Neither carries `aria-controls`, so
nothing connects the combobox to its listbox.

The consequence that matters most is in the open list. Arrowing through the
options does update `aria-activedescendant` — but it updates it on the
focused, roleless `div`, where the attribute has no effect, while the element
with `role="combobox"` never receives it:

```js
// list open, ArrowDown pressed once
document.querySelector('[role="combobox"][aria-label="Status"]')
  .getAttribute('aria-activedescendant')            // → null

document.querySelector('[aria-activedescendant]')
// div, role=null, tabindex=0, focused, aria-activedescendant="downshift-1-item-0"
```

The highlight moves on screen — the option gets a `_highlighted` class — and
nothing is announced, because `aria-activedescendant` is only honoured on an
element with a role that supports it. A sighted keyboard user can see where
they are in the list; a screen reader user cannot. That is WCAG 4.1.2.

**This is the one thing here I could not work around.** Adding the role to the
focusable child nests a combobox inside a combobox, and the expanded state and
the active-descendant id both live inside downshift. Worth knowing when reading
the tests in this repo: `getByRole("combobox")` and `document.activeElement`
are two different elements in this library.

---

## 4. `Select` has no accessible name inside a `Field`

**Severity: high — WCAG 4.1.2, and axe flags it.**

The control carries `aria-labelledby="downshift-N-label"`, and no element with
that id is ever rendered. `aria-labelledby` is consulted before anything else,
so the `Field` label never gets a look in and the accessible name resolves to
empty. Every filter announces as an unnamed combobox.

```jsx
<Field label="Office"><Select name="office" options={…} /></Field>
```
```js
const combo = document.querySelector('[role="combobox"]');
combo.getAttribute("aria-labelledby");                       // "downshift-0-label"
document.getElementById("downshift-0-label");                // null
```

This is easy to miss in tests: `getByLabelText(/office/i)` passes, because it
falls back to the `<label for>` association, which is present and correct. Only
`getByRole("combobox", { name: "Office" })`, which runs the real accessible
name computation, fails.

**Worked around by** passing `aria-label` on every `Select`. A labelledby that
resolves to nothing falls through, so the name comes back.

---

## 5. `aria-autocomplete` sits on an element with no role

**Severity: medium — invalid ARIA, axe `aria-allowed-attr`.**

`role="combobox"` is on the wrapper. `aria-autocomplete="list"` is on an inner
div that has no role at all, where the attribute is both invalid and inert.

```js
const auto = document.querySelector("[aria-autocomplete]");
auto.getAttribute("role");     // null
auto.parentElement.getAttribute("role");  // "combobox"
```

**Worked around by** passing `aria-autocomplete={undefined}`, which works only
because consumer props are spread last. Removing it took Lighthouse
accessibility from 95 to 100.

---

## 6. `Search` inside a `Field` is unreachable by its label

**Severity: high — the label points at nothing.**

```jsx
<Field label="Search jobs"><Search … /></Field>
```
```js
document.querySelector("label").getAttribute("for");  // "_r_2_"
document.querySelector("input").id;                   // ""  ← empty
```

The label references an id the input never receives, so they are not
associated. The control also reports `combobox` rather than `searchbox`.

**Worked around by** not using `Search`. `InputText` with `icon={<Icon
name="search" />}` and `type="search"` looks the same, reports `searchbox`, and
its label works.

---

## 7. A multi-select contradicts itself on screen

**Severity: medium — the control states the opposite of its own state.**

With values selected, the trigger keeps showing its placeholder while the
chosen values render as chips underneath it. The screen reads "Any contract"
directly above a chip that says "Part-Time".

The chips also land under whichever select produced them, so with two filters
applied they sit at two different horizontal positions with a gap between.

**Worked around by** `renderMultiple={() => <></>}` to suppress them, and
rendering every applied filter once in a single row below the whole block.

---

## 8. A multi-select renders no `input`, and its placeholder is a pseudo-element

**Severity: low — but it defeats the obvious styling and testing approaches.**

```js
select.querySelectorAll("input").length;                        // 0
getComputedStyle(root, "::after").content;                      // "\"2 selected\""
```

Any attempt to restyle the placeholder through `input::placeholder` hits
nothing, and any test that reaches for the input finds none.

**Worked around by** targeting `::after` in CSS, so an applied filter is not
painted in the same grey as an empty one.

---

## 9. A multi-select's tag container claims `role="list"`

**Severity: low — collides with real lists on the page.**

The selected-value container exposes `role="list"`, so on a page with a genuine
results list, `getByRole("list")` is ambiguous and a screen reader user hears
two lists where there is one.

**Worked around by** naming the results list.

---

## 10. `Pagination` renders no page numbers without `getHref`

**Severity: medium — the component silently degrades to two arrows.**

```jsx
<Pagination page={2} pageCount={5} onChange={…} />
```
renders only the previous and next buttons. The page numbers appear only once
`getHref` is supplied. Since `getHref` is typed optional, the natural first
call produces a pager with no pages in it.

**Worked around by** always passing `getHref`, which is the better answer
anyway — real anchors are middle-clickable and crawlable, and the component
prevents the default so client-side routing still works.

---

## 11. Edges and focus are both below the contrast floor

**Severity: high — WCAG 1.4.11 on boundaries, 2.4.11 on the focus indicator.**

| | Value | On white |
|---|---|---|
| `--card-color-border-default` | `#f6f3ef` | 1.11:1 |
| `--input-color-border-default` | `#f3f3f3` | 1.07:1 |
| focus on a button | `#ffe166` outline | **1.30:1** |
| focus on an input | outline removed, 1px border swap | 1px, below the 2px perimeter |

Cards and controls have edges that are not really there. Worse is the focus
state, and it is wrong in two different ways at once: buttons get a 4px yellow
outline that is 1.30:1 where the requirement is 3:1, and inputs and selects
get `outline: none` and signal focus by changing a 1px border — on the job
board that 1px was the entire focus indicator on the search box and all four
selects.

Two different tokens carry the focus colour, so fixing one leaves the rest
untouched: `InputText` reads `--input-color-border-focused` and `Select` reads
`--input-color-border-active`.

**Worked around by** redefining the border tokens to `#dedede` — the border
colour measured on welcometothejungle.com itself — and one `:focus-visible`
rule for the whole app at 2px solid black with a 2px offset, which is 21:1.

---

## 12. `Alert.Title` is not a heading and carries no role

**Severity: low — but it looks like one, so it gets used like one.**

```js
render(<Alert variant="success"><Alert.Title>Done</Alert.Title>…</Alert>);
element.tagName;              // "DIV"
element.getAttribute("role"); // null
```

Named `Title`, styled like a title, and invisible to anything navigating by
headings. The application success screen had no heading at all until this
turned up, because the title of the screen was an `Alert.Title`.

**Worked around by** putting a real `h1` above the alert. `as` on `Alert.Title`
would be enough to fix it at the source.

## 13. A multi-select's list never marks what is selected

**Severity: high — the list gives no way to know what is already applied.**

Every option renders `aria-selected="false"`, the chosen ones included, and
nothing distinguishes them visually either. Open the list with a filter
applied and neither a screen reader user nor a sighted one can tell which of
the seven contract types is on.

```js
document.querySelectorAll('[role="option"]')
  .forEach(o => console.log(o.textContent, o.getAttribute("aria-selected")));
// Full-Time false   ← this one is selected
// Part-Time false
```

**Worked around by** `renderItem`, which does receive the selection state even
though the attribute does not reflect it: a tick for sighted users and a
visually hidden "(selected)" so the option's accessible name carries the fact.
The attribute itself cannot be corrected from outside.

---

## 14. A chosen value cannot be unchosen from the list by default

**Severity: medium — and it reads as disabled, not as chosen.**

Without `allowUnselectFromList`, a selected option renders greyed and inert.
Greyed means disabled to most people, so it looks like the control is broken
rather than like the value is already on — and the only way to remove it is
whatever the consumer built elsewhere.

**Worked around by** setting `allowUnselectFromList`. Worth being the default:
a multi-select where a click cannot toggle is a surprising multi-select.

---

## 15. The menu height is hardcoded, at three and a half rows

**Severity: low.**

```css
._menu_be1tr_211 { max-height: 9.6875rem; }
```

Not a token, so a consumer cannot change it without overriding the rule. At
44px a row that is 3.6 options: with seven contract types, half the list is
behind a scroll and the row cut across the bottom edge reads as a rendering
fault rather than as an affordance.

**Worked around by** `[role="listbox"] { max-height: 22rem }`.

---

## 16. Placeholder text is below the contrast floor

**Severity: medium — WCAG 1.4.3.**

`--input-color-text-placeholder: #989898` is **2.88:1** on white, where text
needs 4.5:1. It is text, and on a field whose label is visually hidden it is
the only thing on screen that says what the field is for.

**Worked around by** pointing the token at `#585858` — 7.11:1, and still
clearly a prompt rather than a value.

---

## Two smaller things

**The theme replaces Tailwind's rather than extending it.** `@theme static`
with `--*: initial` clears the default scales, which removes the whole
`animate-*` family among others. `animate-pulse` compiles to nothing and a
skeleton is silently static. `font-semibold` and `leading-7` are gone too;
`font-semi-bold` (with the hyphen) is the one that exists. Worth a line in the
docs — it is discovered by the class quietly doing nothing.

**The clear button on `InputText` is labelled "Close".** Inside a search field
that announces as "Close, button", where "Clear search" is what it does. There
is no prop to change it.

---

## What I did not have to work around

`Field` associates its label correctly with `InputText`, and its `error`
replaces the `hint` in the same slot rather than adding a second line — which
is what makes a form with inline validation hold still instead of shoving
itself down the page as messages appear. That behaviour is doing real work
here and is worth keeping.

`Tag`, `Badge`, `Card`, `Alert` and `Button` behaved exactly as documented.
