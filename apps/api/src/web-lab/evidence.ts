export const WEB_WORDLIST_PATH = "/home/analista/herramientas/archivo-ids.txt";
export const WEB_TOOL_GUIDE_PATH = "/home/analista/herramientas/ffuf.txt";
export const WEB_EVIDENCE: Record<string, string> = {
  "/home/analista/LEEME.txt":
    "SEVENTECH / Estación de revisión web\r\n\r\nPortal: http://archivo.seventech.local/\r\nCuenta: op.archivo / Operaciones\r\n\r\nLa estación dispone de curl y ffuf. Documentación y diccionario del lote en herramientas. Los registros del cierre están en evidencia.",
  "/home/analista/evidencia/archivo-access.log":
    "23:39:04 op.archivo GET /expedientes/4101 200\r\n23:41:12 op.archivo GET /expedientes/4104 200\r\n23:47:09 op.archivo archivo_legacy lote=41xx resultado=200 expediente=[omitido por rotación]\r\n23:48:31 dir.custodia firma_original vigente=true lote=41xx\r\n23:49:16 op.archivo GET /expedientes/4107 200",
  "/home/analista/evidencia/servicio.txt":
    "Archivo institucional / revisión de cierre\r\n\r\nLa portada filtra documentos por área. El detalle usa identificadores de cuatro cifras. La importación legacy corresponde al lote 4100–4199; no todos los números están asignados.\r\nSe conservan circulares, borradores y copias anuladas. Solo el original firmado y vigente acredita la custodia del acta de Dirección.",
  [WEB_WORDLIST_PATH]: Array.from({ length: 100 }, (_, index) =>
    String(4100 + index),
  ).join("\r\n"),
  [WEB_TOOL_GUIDE_PATH]:
    "ffuf / edición del laboratorio\r\n\r\nEnumeración por diccionario: la palabra FUZZ en una URL se sustituye por cada entrada del archivo indicado con -w.\r\n\r\nSintaxis: ffuf -u <URL-con-FUZZ> -w <archivo> [-mc 200|404|all] [-fs bytes]\r\nAyuda: ffuf -h\r\n\r\nEl listado muestra códigos y tamaños; las respuestas se investigan con curl o Intranet. Solo se consulta el portal de archivo simulado. Diccionario del lote: herramientas/archivo-ids.txt.",
};
