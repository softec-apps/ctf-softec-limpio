import { createHash } from "node:crypto";
import {
  runEnigma,
  type EnigmaSettings,
} from "../../../../packages/enigma-machine";

// Challenge construction stays on the server; the shared machine contains no solution.
const settings: EnigmaSettings = {
  rotors: ["III", "I", "V"],
  rings: [4, 11, 19],
  positions: "NOX",
  reflector: "B",
  plugboard: "AV BS CG DL FU HZ IN KM EO RT",
};
const plaintext =
  "PARALACOORDINADORAEXPEDIENTECUATROCONFIRMADOLAGUARDIAHATERMINADOPEROLASLUCESDELARCHIVOSIGUENENCENDIDASHEMOSRECUPERADOLOSDOCUMENTOSQUEFALTABANYCONSERVADOUNACOPIAENLACAJADELAESTACIONNADIEDEBEABRIRLAHASTAVERIFICARLAHUELLADEESTEMENSAJESIEXISTEALGUNADUDACONSERVELATRANSMISIONCOMPLETAYESPEREALRELEVOELINFORMEORIGINALQUEDABAJORESGUARDODELACOORDINADORALACONTRASENAFINALESSEVENTECHGDAFINDELTRANSMITIDO";
const groups = (text: string) => text.match(/.{1,5}/g)?.join(" ") ?? "";
export function enigmaFiles(narrative: string): Record<string, string> {
  const cipher = runEnigma(plaintext, settings).text;
  const fragmentLength = Math.ceil(cipher.length / 3);
  const pieces = [
    cipher.slice(0, fragmentLength),
    cipher.slice(fragmentLength, fragmentLength * 2),
    cipher.slice(fragmentLength * 2),
  ];
  return {
    "/home/analista/evidencia/enunciado.txt": `${narrative}\n\nEntre las hojas\n\nIncidente ENIGMA / Expediente 004. Reconstruye la transmisión y la configuración de una Enigma I. La aplicación Enigma está en Aplicaciones → Herramientas del computador. Reúne los anexos de /home/analista/criptografia/caso-10/evidencia.\n\nRecupera la contraseña final del mensaje y entrégala en mayúsculas como CTF{CONTRASENA}. No se necesitan soluciones de otros retos.`,
    "/home/analista/evidencia/lote.txt": `Fragmento recibido 02:18:09\n${groups(pieces[2])}\n\nFragmento recibido 02:18:01\n${groups(pieces[0])}\n\nFragmento recibido 02:18:05\n${groups(pieces[1])}\n\nEl colector conserva el orden interno de cada fragmento. Las horas son de recepción; no hubo retransmisiones.`,
    "/home/analista/evidencia/mantenimiento.txt":
      "Inventario de la estación: I, III, V. Los rotores II y IV quedaron en el almacén.\nMontaje, visto por el operador: el rotor con el número mayor está a la derecha. El de la izquierda tiene un número mayor que el del centro.\nReflector de servicio: B.\n\nCalibración de anillos (base hexadecimal), por número de serie:\nRotor V: 13\nRotor I: 0B\nRotor III: 04\n\nSon números de anillo, no desplazamientos: 01 equivale a A, 26 a Z. Conviértelos a decimal antes de usar el simulador.",
    "/home/analista/evidencia/guardia.txt":
      "Posición antes de la primera pulsación. Lee el comienzo de cada renglón, de izquierda a derecha:\nNadie volvió al pasillo.\nOtra lámpara quedó encendida.\nXilófonos lejanos rompían el silencio.\n\nEl operador escribió las posiciones antes de enviar: no adelantes los rotores a mano. Cada transmisión comienza desde la misma posición inicial.",
    "/home/analista/evidencia/conexiones.txt":
      "Panel al terminar el turno:\nAV BS CG DL FU HZ IN KM\n\nHabía exactamente diez cables. La humedad borró dos parejas. Ninguna letra figura en dos cables. Las otras seis letras libres quedaron sin conectar.\n\nRecupera los dos cables usando el encabezamiento probable de protocolo.txt. Una pareja AB equivale a BA y el orden de las parejas no altera el panel.",
    "/home/analista/evidencia/protocolo.txt": `El destinatario habitual era la coordinadora. Todas las transmisiones comenzaban con PARA LA COORDINADORA, sin espacios ni signos. Después se identificaba el expediente con letras.\n\nEnigma I: alfabeto A–Z, reflector B o C, entrada ETW alfabética, avance antes de cifrar y doble paso del rotor central. Los espacios de los grupos de cinco no se cifran. Configuración siempre de izquierda a derecha.\n\nUna letra nunca se convierte en sí misma. Usa el encabezamiento para descartar conexiones; comprueba el mensaje entero con su huella. No aceptes solo palabras sueltas.\n\nSHA-256 del texto claro completo (A–Z, sin espacios ni salto final):\n${createHash("sha256").update(plaintext).digest("hex")}\n\nPrueba pública del simulador: rotores I II III, anillos 01 01 01, posición AAA, reflector B y panel vacío: AAAAA produce BDZGO. Cifrar y descifrar usan la misma operación, reiniciando antes la posición.`,
  };
}
