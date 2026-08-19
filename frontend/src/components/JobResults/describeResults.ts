/**
 * The sentence the live region announces when the results change.
 *
 * Separate because it is the one piece of this component that is pure text
 * and worth reading on its own: the verb agrees with the count, not with the
 * noun, "no jobs yet" and "no jobs match your search" are different
 * statements about the world, and a capped count has to read as a floor
 * rather than as a total.
 */
export const describeResults = (
  total: number,
  isFiltered: boolean,
  isCapped = false,
): string => {
  if (total === 0) return isFiltered ? "No jobs match your search" : "No jobs yet";

  const count = isCapped ? `${total}+` : String(total);
  const noun = total === 1 && !isCapped ? "job" : "jobs";

  if (!isFiltered) return `${count} ${noun}`;

  return total === 1 && !isCapped
    ? "1 job matches your search"
    : `${count} ${noun} match your search`;
};
