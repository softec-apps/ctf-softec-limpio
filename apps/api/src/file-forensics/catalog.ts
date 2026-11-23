import { createHash } from "node:crypto";
import { pointsFor } from "../scoring/policy";

export const FILE_ROOT = "/home/analista/archivos";
const sha = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
type FileCase = {
  id: string;
  title: string;
  question: string;
  answer: string;
  files: Record<string, string>;
};
const restored = Buffer.from("SEVENTECH:ACTA-926:RECUPERADA", "utf8");
const sparse = Buffer.concat([
  Buffer.from("ACTA"),
  Buffer.alloc(8),
  Buffer.from("-73!"),
]);
const candidates = ["acta-norte", "acta-sur", "acta-este", "acta-oeste"];
const leaves = candidates.map(sha);
const pair = (a: string, b: string) => sha(Buffer.from(a + b, "hex"));
const root = pair(pair(leaves[0], leaves[1]), pair(leaves[2], leaves[3]));
const cases: Omit<FileCase, "id">[] = [
  {
    title: "Una extensión prestada",
    question:
      "El nombre del archivo contradice su cabecera. Identifica el formato por sus bytes iniciales y entrega CTF{formato}, en minúsculas.",
    answer: "png",
    files: {
      "captura-factura.pdf.hex":
        "89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52\n",
      "adquisicion.txt":
        "Volcado hexadecimal del inicio del archivo recibido. La extensión fue asignada por el remitente; no se ha validado.\n",
    },
  },
  {
    title: "El original entre las copias",
    question:
      "Calcula el SHA256 de las copias y encuentra la que coincide con el acta de adquisición. Entrega CTF{nombre_con_extension}.",
    answer: "acta-b.txt",
    files: {
      "acta-a.txt": "recepcion=426;precinto=abierto\n",
      "acta-b.txt": "recepcion=426;precinto=intacto\n",
      "acta-c.txt": "recepcion=462;precinto=intacto\n",
      "adquisicion.sha256":
        sha("recepcion=426;precinto=intacto\n") + "  original\n",
      "lectura.txt":
        "Los archivos incluyen un salto LF final. El resumen se calcula sobre los bytes completos, sin normalizar contenido.\n",
    },
  },
  {
    title: "Lo que oculta la vista",
    question:
      "El listado visible está incompleto. Explora también las entradas ocultas y recupera el identificador de custodia. Entrega CTF{identificador}.",
    answer: "CUST-48-Q",
    files: {
      "indice.txt":
        "El explorador omitió los nombres que empiezan con punto. La imagen conserva sus entradas originales.\n",
      ".custodia":
        "adquisicion=IMG-48\nidentificador=CUST-48-Q\nprecinto=intacto\n",
      "informe.txt":
        "No se encontró información de custodia en el informe visible.\n",
    },
  },
  {
    title: "Un nombre que sigue registrado",
    question:
      "El catálogo conserva una entrada eliminada. Relaciona su inode con el registro de custodia y entrega CTF{precinto}. No uses el archivo activo que reutiliza su nombre.",
    answer: "SELLO-9R",
    files: {
      "directorio.csv":
        "nombre,inode,estado\ninforme.txt,92,eliminado\ninforme.txt,117,activo\nnota.txt,93,activo\n",
      "custodia.csv":
        "inode,precinto\n117,SELLO-3A\n93,SELLO-7B\n92,SELLO-9R\n",
      "alcance.txt":
        "Exportación didáctica de metadatos; no es una imagen de disco nativa. Los registros eliminados permanecían preservados en la adquisición.\n",
    },
  },
  {
    title: "El flujo que no era el documento",
    question:
      "La exportación separa los flujos NTFS. Localiza el flujo de datos de auditoría, excluye el flujo predeterminado y Zone.Identifier, decodifica su contenido Base64 UTF-8 y entrega CTF{referencia}.",
    answer: "AUD-72-M",
    files: {
      "flujos.csv":
        "archivo,flujo,tipo,volcado\nacta.txt,,$DATA,principal.txt\nacta.txt,Zone.Identifier,$DATA,zona.txt\nacta.txt,auditoria,$DATA,auditoria.b64\n",
      "principal.txt": "Acta cerrada. No contiene referencia de auditoría.\n",
      "zona.txt": "[ZoneTransfer]\nZoneId=3\n",
      "auditoria.b64": Buffer.from("AUD-72-M").toString("base64"),
      "exportacion.txt":
        "Los ficheros de texto representan los flujos enumerados del original NTFS; no son flujos reales del sistema anfitrión.\n",
    },
  },
  {
    title: "Dos revisiones, una sola vista",
    question:
      "La exportación conserva revisiones de un documento. Encuentra el objeto alcanzable desde el catálogo de la revisión firmada, aunque otra revisión lo sustituya. Entrega CTF{referencia}. Los objetos huérfanos no cuentan.",
    answer: "ACTA-63-L",
    files: {
      "revisiones.csv": "revision,firmada,catalogo\nR1,true,10\nR2,false,20\n",
      "objetos.json": JSON.stringify(
        {
          10: { pages: 11 },
          11: { content: 12 },
          12: { text: "ACTA-63-L" },
          13: { text: "BORRADOR-63-X" },
          20: { pages: 21 },
          21: { content: 22 },
          22: { text: "ACTA-63-CORREGIDA" },
        },
        null,
        2,
      ),
      "formato.txt":
        "Exportación didáctica del grafo de objetos de un documento con actualizaciones incrementales. No es un PDF nativo. pages y content son referencias por identificador.\n",
    },
  },
  {
    title: "El enlace y su verdadero objeto",
    question:
      "Resuelve los enlaces relativos desde /archivo/exportacion sin salir de /archivo. Obtén el inode del destino final, usa su atributo user.custodia y entrega CTF{referencia}. No uses el archivo con el mismo basename en otra carpeta.",
    answer: "CAD-84-V",
    files: {
      "enlaces.json": JSON.stringify(
        {
          "/archivo/exportacion/actual": "../indices/ultimo",
          "/archivo/indices/ultimo": "../preservado/acta.dat",
        },
        null,
        2,
      ),
      "inventario.csv":
        "ruta,inode\n/archivo/exportacion/acta.dat,33\n/archivo/preservado/acta.dat,84\n",
      "atributos.csv":
        "inode,nombre,valor\n33,user.custodia,CAD-33-X\n84,user.custodia,CAD-84-V\n84,user.comentario,copia\n",
    },
  },
  {
    title: "Fragmentos fuera de orden",
    question:
      "Reconstruye los bytes de la entrada eliminada acta.txt: sigue su cadena FAT desde el primer clúster hasta EOF, excluye clústeres libres y recorta al tamaño lógico. Entrega CTF{sha256_del_contenido}.",
    answer: sha(restored),
    files: {
      "entrada.csv": `nombre,inicio,tamano\nacta.txt,7,${restored.length}\n`,
      "fat.csv": "cluster,siguiente\n2,EOF\n7,3\n3,9\n9,EOF\n5,LIBRE\n",
      "clusters.json": JSON.stringify(
        {
          2: Buffer.from("CEBO-NO-USAR").toString("hex"),
          7: restored.subarray(0, 10).toString("hex"),
          3: restored.subarray(10, 20).toString("hex"),
          9: Buffer.concat([
            restored.subarray(20),
            Buffer.from("RESIDUO"),
          ]).toString("hex"),
          5: "deadbeef",
        },
        null,
        2,
      ),
      "formato.txt":
        "Exportación didáctica FAT y clústeres hexadecimales. Cada valor contiene los bytes del clúster; el slack posterior al tamaño lógico no forma parte del archivo.\n",
    },
  },
  {
    title: "Los huecos también son bytes",
    question:
      "Reconstruye la imagen lógica del archivo disperso de 16 bytes. Aplica solo los extents comprometidos de la generación vigente; los huecos se leen como ceros. Entrega CTF{sha256_de_los_16_bytes}.",
    answer: sha(sparse),
    files: {
      "metadatos.json": JSON.stringify({
        size: 16,
        generation: 8,
        holeByte: 0,
      }),
      "extents.csv":
        "generacion,estado,offset,hex\n7,committed,4,66616c736f\n8,pending,4,4552524f52\n8,committed,12,2d373321\n8,committed,0,41435441\n",
      "formato.txt":
        "Exportación didáctica de extents. Los offsets son de bytes y están en decimal; los contenidos están en hexadecimal. No conviertas los ceros a los caracteres 0 o a espacios.\n",
    },
  },
  {
    title: "La prueba del manifiesto",
    question:
      "Solo una prueba de inclusión coincide con la raíz preservada. Calcula la hoja como SHA256 de los bytes UTF-8 del candidato (sin salto final); aplica los hermanos en orden desde la hoja, respetando izquierda/derecha. Cada padre es SHA256 de los dos hashes binarios concatenados, no de su texto hexadecimal. Entrega CTF{nombre_del_candidato}.",
    answer: "acta-este",
    files: {
      "raiz.sha256": root,
      "candidatos.txt": candidates.join("\n"),
      "pruebas.json": JSON.stringify(
        candidates.map((name, i) => ({
          name,
          proof: [
            {
              side: i % 2 === 0 ? "right" : "left",
              hash: leaves[i === 2 ? 3 : i],
            },
            {
              side: i < 2 ? "right" : "left",
              hash:
                i < 2 ? pair(leaves[2], leaves[3]) : pair(leaves[0], leaves[1]),
            },
          ],
        })),
        null,
        2,
      ),
      "adquisicion.txt":
        "La raíz se preservó fuera del lote de candidatos. Una prueba incorrecta puede indicar metadatos alterados; la hoja por sí sola no acredita pertenencia al manifiesto.\n",
    },
  },
];
export const FILE_CASES: FileCase[] = cases.map((entry, index) => ({
  ...entry,
  id: `files-${String(index + 1).padStart(2, "0")}`,
}));
export const FILE_CHALLENGES = FILE_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: `${entry.question.replace(/CTF\{([^}]+)\}/g, "una flag con $1")} Expediente en el archivador; evidencias: ${FILE_ROOT}/caso-${entry.id.slice(-2)}. Independiente de los demás.`,
  category: "Archivos · Análisis forense",
  device: "computer",
  points: pointsFor(entry.id),
}));
export const getFileCase = (id: string) =>
  FILE_CASES.find((entry) => entry.id === id);
export function fileFlag(id: string) {
  const entry = getFileCase(id);
  if (!entry) throw new Error("Expediente de archivos desconocido.");
  return `CTF{${entry.answer}}`;
}
export function fileEvidence(id: string) {
  const entry = getFileCase(id);
  if (!entry) return undefined;
  return {
    "/home/analista/LEEME.txt": entry.question,
    ...Object.fromEntries(
      Object.entries(entry.files).map(([name, content]) => [
        "/home/analista/evidencia/" + name,
        content,
      ]),
    ),
  };
}
