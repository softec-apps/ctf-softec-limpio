export const MEMORY_OPERATIONS = [
  "pslist",
  "psscan",
  "netscan",
  "malfind",
  "regions",
  "handles",
  "tokens",
  "journal",
];
export function parseMemorySnapshot(text) {
  if (typeof text !== "string" || text.length > 400000)
    throw Error("El snapshot admite hasta 400.000 caracteres.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error("El snapshot no es JSON válido.");
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    data.format !== "seventech-memory-v1"
  )
    throw Error(
      "Selecciona un snapshot seventech-memory-v1. Los volcados nativos requieren otras herramientas.",
    );
  for (const name of [
    "processes",
    "scan",
    "connections",
    "regions",
    "handles",
    "tokens",
    "patches",
  ]) {
    if (data[name] === undefined) data[name] = [];
    if (
      !Array.isArray(data[name]) ||
      data[name].length > 2048 ||
      data[name].some(
        (row) => !row || typeof row !== "object" || Array.isArray(row),
      )
    )
      throw Error("Colección de memoria inválida: " + name);
  }
  return data;
}
export function memoryRows(snapshot, operation) {
  if (!MEMORY_OPERATIONS.includes(operation))
    throw Error("Operación de memoria no disponible.");
  const fields = {
    pslist: "processes",
    psscan: "scan",
    netscan: "connections",
    regions: "regions",
    handles: "handles",
    tokens: "tokens",
    journal: "patches",
  };
  if (operation === "malfind")
    return snapshot.regions.filter(
      (region) =>
        region.type === "private" &&
        typeof region.protection === "string" &&
        region.protection.includes("X") &&
        typeof region.bytes === "string" &&
        region.bytes.toLowerCase().startsWith("4d5a"),
    );
  return snapshot[fields[operation]];
}
