export type ComparisonDocument = { label: string; text: string };
export type ComparisonSide = "left" | "right";
export type ComparisonDraft = Record<ComparisonSide, ComparisonDocument>;
export type ComparisonRow = {
  kind: "equal" | "added" | "removed" | "changed";
  left: string | null;
  right: string | null;
  leftNumber: number | null;
  rightNumber: number | null;
};
const MAX_TEXT_LENGTH = 20000;
const MAX_LINES = 400;
function lines(text: string) {
  if (text.length > MAX_TEXT_LENGTH)
    throw new Error("Cada texto admite hasta 20.000 caracteres.");
  const values = text === "" ? [] : text.replace(/\r\n?/g, "\n").split("\n");
  if (values.length > MAX_LINES)
    throw new Error("Cada texto admite hasta 400 líneas.");
  return values;
}
export function compareLines(left: string, right: string): ComparisonRow[] {
  const before = lines(left),
    after = lines(right);
  // LCS keeps an inserted line from marking every subsequent line as changed.
  const lengths = Array.from(
    { length: before.length + 1 },
    () => new Uint16Array(after.length + 1),
  );
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--)
      lengths[i][j] =
        before[i] === after[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const rows: ComparisonRow[] = [];
  let i = 0,
    j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      rows.push({
        kind: "equal",
        left: before[i],
        right: after[j],
        leftNumber: ++i,
        rightNumber: ++j,
      });
      continue;
    }
    const removed: { text: string; number: number }[] = [],
      added: { text: string; number: number }[] = [];
    while (
      (i < before.length || j < after.length) &&
      !(i < before.length && j < after.length && before[i] === after[j])
    ) {
      if (
        i < before.length &&
        (j === after.length || lengths[i + 1][j] >= lengths[i][j + 1])
      )
        removed.push({ text: before[i], number: ++i });
      else added.push({ text: after[j], number: ++j });
    }
    for (
      let index = 0;
      index < Math.max(removed.length, added.length);
      index++
    ) {
      const oldLine = removed[index],
        newLine = added[index];
      rows.push({
        kind: oldLine && newLine ? "changed" : oldLine ? "removed" : "added",
        left: oldLine?.text ?? null,
        right: newLine?.text ?? null,
        leftNumber: oldLine?.number ?? null,
        rightNumber: newLine?.number ?? null,
      });
    }
  }
  return rows;
}
export function comparisonText(rows: ComparisonRow[]) {
  return rows
    .flatMap((row) =>
      row.kind === "equal"
        ? ["  " + row.left]
        : [
            ...(row.left !== null ? ["- " + row.left] : []),
            ...(row.right !== null ? ["+ " + row.right] : []),
          ],
    )
    .join("\n");
}
