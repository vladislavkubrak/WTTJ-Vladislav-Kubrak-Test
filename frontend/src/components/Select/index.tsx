import { Icon } from "welcome-ui/Icon";
import { Select as WelcomeUISelect } from "welcome-ui/Select";
import type { ComponentProps } from "react";

type WelcomeUISelectProps = ComponentProps<typeof WelcomeUISelect>;

type SelectProps = Omit<WelcomeUISelectProps, "aria-label"> & {
  /**
   * Required, and not by accident.
   *
   * welcome-ui points the control's `aria-labelledby` at a downshift id it
   * never renders, so the accessible name resolves to empty and the control
   * announces as an unnamed combobox — however carefully its `Field` is
   * labelled. A labelledby that resolves to nothing falls through to
   * `aria-label`, which is the only thing that puts the name back, so the type
   * insists on one rather than leaving it to be remembered.
   */
  "aria-label": string;
};

const OPENING_KEYS = ["Enter", " ", "ArrowDown", "ArrowUp"];

type SelectKeyboardEvent = Parameters<
  NonNullable<WelcomeUISelectProps["onKeyDown"]>
>[0];

/**
 * welcome-ui's `Select`, with the things it needs to be usable.
 *
 * Every fix here is for a defect in the library, each of them reproducible in
 * a fresh app and written up in WELCOME-UI-FINDINGS.md. They live in one
 * wrapper rather than at each of the seven call sites, because a fix that has
 * to be remembered is a fix that will be forgotten — as it was on the
 * create-job form, which had three selects and none of the corrections.
 */
export const Select = ({ onKeyDown, renderItem, ...props }: SelectProps) => (
  <WelcomeUISelect
    {...props}
    /*
     * `aria-autocomplete="list"` is placed on an inner div with no role at
     * all — the `combobox` role is on the wrapper — where the attribute is
     * both invalid and inert. Consumer props are spread last, so passing it
     * as undefined removes it.
     */
    aria-autocomplete={undefined}
    onKeyDown={(event: SelectKeyboardEvent) => {
      openOnKeyboard(event);
      onKeyDown?.(event);
    }}
    renderItem={renderItem ?? renderOption}
  />
);

/**
 * Lets a keyboard open the list, which it otherwise cannot.
 *
 * Once open the component is operable: arrows move the highlight, Enter
 * selects, Escape closes. But nothing opens it — Enter, Space, ArrowDown and
 * Alt+ArrowDown all do nothing — so a select is unreachable without a pointer.
 * That is WCAG 2.1.1 at Level A.
 *
 * This restores operation, not announcement. `aria-activedescendant` does
 * track the highlight, but the library puts it on the focused element, which
 * carries no role, rather than on the element with `role="combobox"` — so it
 * is inert, and moving through the options says nothing. That one is finding
 * 3, and it cannot be fixed from out here.
 *
 * It does open on click, so this turns the keys the ARIA pattern expects into
 * the gesture the component already understands, and stays inert once the
 * list is open, where Enter has to keep meaning "choose this".
 */
const openOnKeyboard = (event: SelectKeyboardEvent) => {
  if (!OPENING_KEYS.includes(event.key)) return;

  const combobox = event.currentTarget.closest('[role="combobox"]');

  if (combobox?.getAttribute("aria-expanded") === "true") return;

  // Space would scroll the page and ArrowDown would move the caret.
  event.preventDefault();
  event.currentTarget.click();
};

/**
 * Marks a chosen option.
 *
 * Every option renders `aria-selected="false"`, the selected ones included,
 * and they are drawn identically, so an open list tells nobody what is
 * already applied. The attribute cannot be corrected from outside, but
 * `renderItem` does receive the selection state — so the fact goes into the
 * option's accessible name, and a tick puts it on screen.
 */
const renderOption = (item: { label: string }, isSelected?: boolean) => (
  <span className="flex items-center gap-xs">
    <Icon
      name="check"
      size="sm"
      aria-hidden="true"
      className={isSelected ? undefined : "invisible"}
    />
    {item.label}
    {isSelected && <span className="sr-only"> (selected)</span>}
  </span>
);
