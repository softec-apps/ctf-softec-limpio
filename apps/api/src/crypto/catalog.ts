import { pointsFor } from "../scoring/policy";
import { flagValue } from "../security";
import { cryptoNarrative } from "./stories";
import { enigmaFiles } from "./enigma";

const ROOT = "/home/analista";
const manual = [
  {
    id: "crypto-cesar",
    title: "Cuando la oficina duerme",
    answer: "TURNO",
    points: pointsFor("crypto-cesar"),
    puzzle:
      "Mensaje: WXUQR\n\nMargen del sobre: ABC / DEF\nEl inventario de letras termina en Z; no aparece la Ñ.",
  },
  {
    id: "crypto-atbash",
    title: "La visita que nadie esperaba",
    answer: "ESPEJO",
    points: pointsFor("crypto-atbash"),
    puzzle:
      "Mensaje: VHKVQL\n\nRenglones de la tarjeta:\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nZYXWVUTSRQPONMLKJIHGFEDCBA",
  },
  {
    id: "crypto-polibio",
    title: "La llamada del muelle",
    answer: "FARO",
    points: pointsFor("crypto-polibio"),
    puzzle:
      "Mensaje: 21 11 42 34\n\nTabla del bolsillo:\n    1 2 3 4 5\n1   A B C D E\n2   F G H I K\n3   L M N O P\n4   Q R S T U\n5   V W X Y Z\n\nEn la casilla de la I también hay una J escrita a lápiz.",
  },
  {
    id: "crypto-rejilla",
    title: "El cajón sin dueño",
    answer: "CLAVERACK",
    points: pointsFor("crypto-rejilla"),
    puzzle:
      "Mensaje: CVALECARK\n\nTarjeta del cajón:\n[ ] [ ] [ ]\n[ ] [ ] [ ]\n[ ] [ ] [ ]\n\nAl dorso: «No falta ninguna». No hay casillas tachadas.",
  },
];
const assisted = [
  {
    id: "crypto-base64",
    title: "El legado de Julia",
    points: pointsFor("crypto-base64"),
    note: "Recibo de la unidad de respaldo / doce guardias / entrega sin incidencias.",
  },
  {
    id: "crypto-hex",
    title: "La madrugada pendiente",
    points: pointsFor("crypto-hex"),
    note: "Margen del colector: 0123456789ABCDEF. El alimentador no perdió ninguna pareja.",
  },
  {
    id: "crypto-binario",
    title: "La estación del silencio",
    points: pointsFor("crypto-binario"),
    note: "Registro de la antena: luz apagada / luz encendida. En el margen hay ocho ventanas por campanada.",
  },
  {
    id: "crypto-xor",
    title: "Lo que quedó de septiembre",
    points: pointsFor("crypto-xor"),
    note: "Etiqueta de mantenimiento: rack-27. En la libreta hay una rueda sin principio ni final.",
  },
  {
    id: "crypto-vigenere",
    title: "Las cartas de Leonor",
    points: pointsFor("crypto-vigenere"),
    note: "Saludo de Leonor:\nOlvidé cerrar la ventana.\nFui a buscar las cartas.\nIrene ya se había marchado.\nCerré la puerta despacio.\nIntenté llamarla otra vez.\nNadie respondió al teléfono.\nApenas quedaba luz en la sala.",
  },
  {
    id: "crypto-capas",
    title: "Enigma",
    points: pointsFor("crypto-capas"),
    note: "Una Enigma I, una transmisión fragmentada y dos conexiones borradas.",
  },
];

export function cryptoFolder(id: string) {
  const index = [...manual, ...assisted].findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error("Expediente de criptografía desconocido.");
  return `caso-${String(index + 1).padStart(2, "0")}`;
}

export const CRYPTO_CHALLENGES = [
  ...manual.map((entry) => ({
    id: entry.id,
    title: entry.title,
    category: "Criptografía · A mano",
    points: entry.points,
    device: "computer",
    description: `Lee «${entry.title}» en el libro Relatos en clave de la repisa junto al rack. Resuélvelo con lápiz y papel. Entrega la palabra en formato de flag, en mayúsculas y sin espacios.`,
  })),
  ...assisted.map((entry) => ({
    id: entry.id,
    title: entry.title,
    category: "Criptografía · Con herramientas",
    points: entry.points,
    device: "computer",
    description:
      entry.id === "crypto-capas"
        ? "Lee «Enigma» en Relatos en clave. Reconstruye los rotores, anillos, posición inicial y dos conexiones perdidas de una Enigma I. Usa la aplicación Enigma y las evidencias de /home/analista/criptografia/caso-10/evidencia. Recupera la contraseña final y entrégala en el formato habitual de flag."
        : `Lee «${entry.title}» en el libro Relatos en clave de la repisa junto al rack. Analiza su anexo con el Transformador y el Visor de evidencias. Archivos en /home/analista/criptografia/${cryptoFolder(entry.id)}/evidencia. Recupera únicamente la flag del acta solicitada en enunciado.txt.`,
  })),
];
export function getCryptoChallenge(id: string) {
  return CRYPTO_CHALLENGES.find((entry) => entry.id === id);
}
export function cryptoFlag(id: string) {
  if (id === "crypto-capas") return "CTF{SEVENTECHGDA}";
  const entry = manual.find((entry) => entry.id === id);
  return entry ? `CTF{${entry.answer}}` : flagValue(id);
}
function vigenere(text: string, key: string) {
  let index = 0;
  return text.replace(/[a-z]/gi, (letter) => {
    const base = letter === letter.toUpperCase() ? 65 : 97;
    const shift = key.charCodeAt(index++ % key.length) - 65;
    return String.fromCharCode(
      base + ((letter.charCodeAt(0) - base + shift) % 26),
    );
  });
}
export function cryptoFiles(id: string): Record<string, string> | undefined {
  if (id === "crypto-capas") return enigmaFiles(cryptoNarrative(id));
  const hand = manual.find((entry) => entry.id === id);
  if (hand)
    return {
      [`${ROOT}/evidencia/enunciado.txt`]: `${cryptoNarrative(id)}\n\nEntre las hojas\n\n${hand.puzzle}\n\nEntrega CTF{PALABRA}, en mayúsculas y sin espacios.`,
    };
  const entry = assisted.find((entry) => entry.id === id);
  if (!entry) return;
  const target = 4;
  const text = Array.from(
    { length: 12 },
    (_, i) =>
      `ACTA-${String(i + 1).padStart(3, "0")}: ${i + 1 === target ? cryptoFlag(id) : flagValue(`${id}:senuelo:${i}`)}`,
  ).join("\n");
  const bytes = Buffer.from(text, "utf8");
  let encoded: string;
  switch (id) {
    case "crypto-base64":
      encoded = bytes.toString("base64");
      break;
    case "crypto-hex":
      encoded = bytes.toString("hex");
      break;
    case "crypto-binario":
      encoded = [...bytes]
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join(" ");
      break;
    case "crypto-xor": {
      const key = Buffer.from("rack-27");
      encoded = Buffer.from(
        bytes.map((byte, i) => byte ^ key[i % key.length]),
      ).toString("hex");
      break;
    }
    case "crypto-vigenere":
      encoded = vigenere(text, "OFICINA");
      break;
    default:
      throw new Error("Expediente de criptografía desconocido.");
  }
  return {
    [`${ROOT}/evidencia/enunciado.txt`]: `${cryptoNarrative(id)}\n\nEntre las hojas\n\n${entry.note}\n\nAnexo de la historia: /home/analista/criptografia/${cryptoFolder(id)}/evidencia/lote.txt.\n\nSolicitud de recuperación: ACTA-004. Los otros once sellos pertenecen a expedientes distintos.`,
    [`${ROOT}/evidencia/lote.txt`]: encoded,
  };
}
