function parseJson(source: string): unknown {
  if (source.length > 50000)
    throw new Error("El editor admite hasta 50.000 caracteres.");
  return JSON.parse(source);
}
export function validateJson(source: string) {
  parseJson(source);
}
export function formatJson(source: string, mode: "pretty" | "compact") {
  return JSON.stringify(
    parseJson(source),
    (_name, value: unknown) => {
      if (
        typeof value === "number" &&
        (!Number.isFinite(value) ||
          (Number.isInteger(value) && !Number.isSafeInteger(value)))
      )
        throw new Error(
          "El formato no se aplicó: hay un número fuera del rango seguro del editor.",
        );
      return value;
    },
    mode === "pretty" ? 2 : undefined,
  );
}
