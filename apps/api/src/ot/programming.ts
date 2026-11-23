export function evaluateOtProgram(
  source: string,
  inputs: Record<string, boolean>,
) {
  const output: Record<string, boolean> = {};
  let accumulator = false,
    loaded = false;
  const rows = source.trim().split(/\r?\n/);
  if (rows.length > 24) throw new Error("Programa demasiado largo.");
  for (const row of rows) {
    const instruction = row
      .trim()
      .match(/^(LD|AND|OR|ST) (?:(NOT) )?([A-Z_]+)$/);
    if (!instruction) throw new Error("Instrucción IL no admitida.");
    const [, op, invert, tag] = instruction;
    if (op === "ST") {
      if (
        !loaded ||
        invert ||
        !["FAN_RUN", "BEACON", "LIGHT_RUN"].includes(tag)
      )
        throw new Error("Salida IL no válida.");
      output[tag] = accumulator;
      continue;
    }
    if (!["ENABLE", "MAINTENANCE", "ALARM", "TRUE", "FALSE"].includes(tag))
      throw new Error("Entrada IL desconocida.");
    const value = tag === "TRUE" ? true : tag === "FALSE" ? false : inputs[tag],
      operand = invert ? !value : value;
    if (op === "LD") {
      accumulator = operand;
      loaded = true;
    } else {
      if (!loaded) throw new Error("Falta una instrucción LD.");
      accumulator =
        op === "AND" ? accumulator && operand : accumulator || operand;
    }
  }
  if (output.FAN_RUN === undefined)
    throw new Error("El programa no define FAN_RUN.");
  return output;
}
