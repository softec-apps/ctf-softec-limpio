export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw Error("El CSV contiene una celda sin cerrar.");
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}
