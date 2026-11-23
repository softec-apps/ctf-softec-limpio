export function words(command: string): string[] {
  const tokens: string[] = [];
  let value = "",
    quote = "",
    started = false;
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "\\" && quote !== "'") {
      if (++i >= command.length) throw new Error("Escape incompleto.");
      value += command[i];
      started = true;
    } else if (quote) {
      if (char === quote) quote = "";
      else value += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) tokens.push(value);
      value = "";
      started = false;
    } else if ("|>".includes(char)) {
      if (started) tokens.push(value);
      value = "";
      started = false;
      if (char === ">" && command[i + 1] === ">") {
        tokens.push(">>");
        i++;
      } else tokens.push(char);
    } else {
      value += char;
      started = true;
    }
  }
  if (quote) throw new Error("Comillas sin cerrar.");
  if (started) tokens.push(value);
  return tokens;
}
