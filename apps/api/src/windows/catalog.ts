import { pointsFor } from "../scoring/policy";
export type WindowsEvent = {
  recordId: number;
  time: string;
  eventId: number;
  provider: string;
  channel: string;
  description: string;
  data: Record<string, string>;
};
export type WindowsArtifact = {
  name: string;
  content: string;
  format: "text" | "events";
  attributes: string[];
  created: string;
  modified: string;
};
export type WindowsCase = {
  id: string;
  title: string;
  description: string;
  points: number;
  answer: string;
  files: WindowsArtifact[];
};
const text = (
  name: string,
  content: string,
  attributes = ["Archive"],
  modified = "2025-11-01T08:00:00Z",
): WindowsArtifact => ({
  name,
  content,
  format: "text",
  attributes,
  created: "2025-11-01T08:00:00Z",
  modified,
});
const events = (name: string, rows: WindowsEvent[]): WindowsArtifact => ({
  ...text(name, JSON.stringify(rows, null, 2)),
  format: "events",
});
function event(
  recordId: number,
  time: string,
  eventId: number,
  description: string,
  data: Record<string, string>,
): WindowsEvent {
  return {
    recordId,
    time,
    eventId,
    description,
    data,
    channel: "Security",
    provider:
      eventId === 1102
        ? "Microsoft-Windows-Eventlog"
        : "Microsoft-Windows-Security-Auditing",
  };
}
export const WINDOWS_ROOT = "C:\\Users\\Analista\\Documents\\Expedientes";
export const WINDOWS_CASES: WindowsCase[] = [
  {
    id: "windows-01",
    title: "Después del último saludo",
    points: pointsFor("windows-01"),
    description:
      "La responsable cerró el portátil a las 18:00 UTC. Identifica la cuenta del primer inicio remoto interactivo exitoso posterior al cierre. Entrega el nombre de cuenta en formato de flag, en minúsculas.",
    answer: "mvalle",
    files: [
      text(
        "entrega.txt",
        "Entrega de turno: 2025-11-01, 18:00 UTC. La cuenta de la responsable es iramos. Los intentos fallidos no constituyen una sesión iniciada.",
      ),
      text(
        "cuentas.csv",
        "sid,cuenta\nS-1-5-21-700-1101,iramos\nS-1-5-21-700-1102,mvalle\nS-1-5-21-700-1103,cpardo",
      ),
      events("Security.evtx.json", [
        event(301, "2025-11-01T18:01:00Z", 4625, "No se pudo iniciar sesión", {
          TargetUserName: "cpardo",
          LogonType: "10",
        }),
        event(302, "2025-11-01T18:02:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1103",
          LogonType: "3",
          TargetLogonId: "0x210",
        }),
        event(303, "2025-11-01T18:05:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1102",
          LogonType: "10",
          TargetLogonId: "0x240",
          IpAddress: "192.0.2.27",
        }),
        event(304, "2025-11-01T18:12:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1101",
          LogonType: "10",
          TargetLogonId: "0x250",
        }),
      ]),
    ],
  },
  {
    id: "windows-02",
    title: "La hoja que faltaba",
    points: pointsFor("windows-02"),
    description:
      "El borrador acta_cierre.txt desapareció de Documentos. Recupera su referencia de entrega entre los elementos conservados de la papelera. Entrega la referencia en minúsculas, cambiando guiones por guiones bajos, dentro del formato de flag.",
    answer: "al_73",
    files: [
      text(
        "papelera.csv",
        "registro,ruta_original,eliminado_utc,contenido\n$I8K2,C:\\Users\\Analista\\Documents\\acta_cierre.txt,2025-11-01T17:50:00Z,$R8K2.txt\n$I9M1,C:\\Users\\Analista\\Downloads\\acta_cierre.txt,2025-11-01T17:45:00Z,$R9M1.txt\n$I3J8,C:\\Users\\Analista\\Documents\\borrador.txt,2025-10-31T13:00:00Z,$R3J8.txt",
      ),
      text(
        "$R8K2.txt",
        "Acta de cierre / original del área de archivo. Referencia de entrega: AL-73. Dos cajas recibidas, sin incidencias.",
      ),
      text(
        "$R9M1.txt",
        "Copia descargada de una plantilla. Referencia ilustrativa: AC-18. No corresponde a una entrega real.",
      ),
      text("$R3J8.txt", "Borrador de la semana anterior. Referencia: BR-04."),
    ],
  },
  {
    id: "windows-03",
    title: "Una puerta con otro nombre",
    points: pointsFor("windows-03"),
    description:
      "El acceso directo del informe semanal conserva un icono de documento, pero su destino cambió. Identifica el nombre del ejecutable al que apunta la versión vigente. Entrega su nombre con la extensión, en minúsculas y cambiando el punto por guion bajo, dentro de una flag.",
    answer: "inventario_exe",
    files: [
      text(
        "escritorio.csv",
        "nombre,identificador,revision\nInforme semanal.lnk,L-204,3\nInforme semanal - copia.lnk,L-118,1",
      ),
      text(
        "L-204.lnk.txt",
        "Exportación de propiedades de acceso directo.\nRevisión: 3\nNombre mostrado: Informe semanal\nDestino: C:\\ProgramData\\North\\inventario.exe\nDirectorio de trabajo: C:\\ProgramData\\North\nIcono: C:\\Program Files\\Office\\document.ico\nÚltima modificación: 2025-11-01T19:12:00Z\nEste archivo es una ficha de texto, no un acceso ejecutable.",
      ),
      text(
        "L-118.lnk.txt",
        "Exportación histórica / revisión 1.\nDestino: C:\\Program Files\\Office\\lector.exe\nDocumento: C:\\Users\\Analista\\Documents\\Informe semanal.docx",
      ),
    ],
  },
  {
    id: "windows-04",
    title: "Lo que no aparecía en la lista",
    points: pointsFor("windows-04"),
    description:
      "Tras el cierre de las 18:00 UTC apareció un elemento oculto que no figuraba en el inventario aprobado. Encuentra su folio interno. Entrega el folio en minúsculas y con guiones bajos, en formato de flag.",
    answer: "lx_204",
    files: [
      text(
        "inventario.csv",
        "archivo,estado\nTemporal\\sesion.cache,Aprobado\nArchivo\\lecturas.txt,Aprobado",
      ),
      text(
        "Temporal\\sesion.cache",
        "Caché de sesión del lector. Folio de mantenimiento: TC-18.",
        ["Hidden", "Temporary"],
        "2025-11-01T17:00:00Z",
      ),
      text(
        "Archivo\\lecturas.txt",
        "Lecturas de recepción. Archivo incluido en inventario.",
      ),
      text(
        "Archivo\\adjunto.dat.txt",
        "Folio interno: LX-204. Remesa pendiente de justificar.",
        ["Hidden", "System"],
        "2025-11-01T18:32:00Z",
      ),
    ],
  },
  {
    id: "windows-05",
    title: "Una ventana encendida",
    points: pointsFor("windows-05"),
    description:
      "Durante la ventana de mantenimiento, de 20:00 a 20:15 UTC, se inició un programa desde Descargas. Determina su nombre. Entrega el nombre con extensión en minúsculas y sustituye el punto por guion bajo dentro de una flag.",
    answer: "resumen_exe",
    files: [
      text(
        "mantenimiento.txt",
        "Ventana autorizada: 2025-11-01, 20:00–20:15 UTC. Se preservaron eventos de creación de procesos y una ficha de rastros anteriores. No todos los rastros pertenecen a esa ventana.",
      ),
      text(
        "rastros.csv",
        "imagen,ultima_ejecucion_registrada_utc\nlector.exe,2025-11-01T19:50:00Z\nresumen.exe,2025-11-01T20:06:00Z\ninstalador.exe,2025-10-30T09:00:00Z",
      ),
      events("Security.evtx.json", [
        event(501, "2025-11-01T19:50:00Z", 4688, "Se creó un proceso", {
          NewProcessName: "C:\\Users\\Analista\\Downloads\\lector.exe",
          NewProcessId: "0x860",
          SubjectLogonId: "0x390",
        }),
        event(502, "2025-11-01T20:03:00Z", 4688, "Se creó un proceso", {
          NewProcessName: "C:\\Windows\\System32\\notepad.exe",
          NewProcessId: "0x864",
          SubjectLogonId: "0x390",
        }),
        event(503, "2025-11-01T20:06:00Z", 4688, "Se creó un proceso", {
          NewProcessName: "C:\\Users\\Analista\\Downloads\\resumen.exe",
          NewProcessId: "0x870",
          SubjectLogonId: "0x390",
        }),
        event(504, "2025-11-01T20:19:00Z", 4688, "Se creó un proceso", {
          NewProcessName: "C:\\Users\\Analista\\Downloads\\instalador.exe",
          NewProcessId: "0x880",
          SubjectLogonId: "0x390",
        }),
      ]),
    ],
  },
  {
    id: "windows-06",
    title: "Cada mañana, sin llamar",
    points: pointsFor("windows-06"),
    description:
      "Después de la revisión aparece una entrada de inicio automático ausente de la línea base. Determina el nombre de ese valor, no el programa. Entrégalo en minúsculas y con guiones bajos, dentro de una flag.",
    answer: "canal_diario",
    files: [
      text(
        "linea_base.csv",
        "valor,autorizado\nOneDrive,Si\nPanel de audio,Si",
      ),
      text(
        "usuario_run.reg.txt",
        "Exportación de lectura del registro. No se aplica al sistema.\nHKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\nOneDrive = C:\\Program Files\\OneDrive\\OneDrive.exe\nPanel de audio = C:\\Program Files\\Audio\\panel.exe\nCanal diario = C:\\Users\\Analista\\AppData\\Local\\Canal\\sync-panel.exe",
      ),
      text(
        "revision.txt",
        "La línea base se aprobó el 31 de octubre. La captura de la rama del usuario se tomó el 1 de noviembre, después de recibir el portátil. No se instalaron nuevas herramientas autorizadas en ese intervalo.",
      ),
    ],
  },
  {
    id: "windows-07",
    title: "La cita que nadie anotó",
    points: pointsFor("windows-07"),
    description:
      "Identifica la tarea creada fuera del cambio aprobado que activa su acción al iniciar sesión el usuario. Entrega solo el nombre final de la tarea, en minúsculas y con guiones bajos, en formato de flag.",
    answer: "revision_de_archivo",
    files: [
      text(
        "cambio_aprobado.txt",
        "Cambio CH-18: 2025-11-01, de 10:00 a 10:20 UTC. Única tarea aprobada: \\Mantenimiento\\CopiaDiaria, con disparador de calendario. Después de las 10:20 no se aprobaron cambios de tareas.",
      ),
      text(
        "CopiaDiaria.task.xml.txt",
        "<Task><RegistrationInfo><URI>\\Mantenimiento\\CopiaDiaria</URI></RegistrationInfo><Triggers><CalendarTrigger /></Triggers><Actions><Exec><Command>C:\\Program Files\\Archivo\\backup.exe</Command></Exec></Actions></Task>",
      ),
      text(
        "Revision.task.xml.txt",
        "<Task><RegistrationInfo><URI>\\Oficina\\Revision de archivo</URI></RegistrationInfo><Triggers><LogonTrigger /></Triggers><Actions><Exec><Command>C:\\ProgramData\\Archivo\\visor.exe</Command></Exec></Actions></Task>",
      ),
      events("Security.evtx.json", [
        event(
          701,
          "2025-11-01T10:05:00Z",
          4698,
          "Se creó una tarea programada",
          { TaskName: "\\Mantenimiento\\CopiaDiaria", SubjectLogonId: "0x410" },
        ),
        event(
          702,
          "2025-11-01T10:42:00Z",
          4698,
          "Se creó una tarea programada",
          {
            TaskName: "\\Oficina\\Revision de archivo",
            SubjectLogonId: "0x430",
          },
        ),
      ]),
    ],
  },
  {
    id: "windows-08",
    title: "Una visita de bolsillo",
    points: pointsFor("windows-08"),
    description:
      "Dos memorias usaban el mismo nombre visible. Determina el número de serie del dispositivo asociado a la entrega de inventario_final.csv a las 16:22 UTC. Entrega su serie en minúsculas, dentro de una flag.",
    answer: "u7c91",
    files: [
      text(
        "dispositivos.csv",
        "serie,nombre,volumen\nU7C91,OFICINA,VOL-B7\nU7C19,OFICINA,VOL-C9\nK9900,RESPALDO,VOL-D3",
      ),
      text(
        "montajes.csv",
        "hora_utc,unidad,volumen\n2025-11-01T15:00:00Z,E:,VOL-C9\n2025-11-01T16:10:00Z,F:,VOL-B7\n2025-11-01T17:10:00Z,F:,VOL-D3",
      ),
      text(
        "transferencias.csv",
        "Diario ficticio del servicio de entregas, no un evento nativo de Windows.\nhora_utc,archivo,destino,resultado\n2025-11-01T16:22:00Z,inventario_final.csv,F:\\Entregas\\inventario_final.csv,Completado\n2025-11-01T16:23:00Z,plantilla.csv,E:\\Entregas\\plantilla.csv,Completado",
      ),
    ],
  },
  {
    id: "windows-09",
    title: "El archivo llegó antes",
    points: pointsFor("windows-09"),
    description:
      "Relaciona la copia final de boletin.pdf con su descarga completada. Identifica el dominio de procedencia del contenido conservado. Entrega el dominio en minúsculas y cambia los puntos por guiones bajos, dentro de una flag.",
    answer: "boletin_riomar_example",
    files: [
      text(
        "copia_final.txt",
        "Nombre: boletin.pdf\nIdentificador de contenido de la colección: DOC-842\nLa ficha conserva el contenido final; el nombre se ha usado para descargas diferentes.",
      ),
      text(
        "descargas.csv",
        "inicio_utc,url,nombre,contenido,estado\n2025-11-01T12:00:00Z,https://boletin.riomar.example/edicion.pdf,boletin.pdf,DOC-842,COMPLETE\n2025-11-01T12:05:00Z,https://boletin.ribera.example/edicion.pdf,boletin.pdf,DOC-843,INTERRUPTED\n2025-11-01T13:00:00Z,https://archivo.riomar.example/plantilla.pdf,boletin.pdf,DOC-700,COMPLETE",
      ),
      text(
        "historial.csv",
        "visita_utc,url\n2025-11-01T11:59:00Z,https://boletin.riomar.example/\n2025-11-01T12:04:00Z,https://boletin.ribera.example/\n2025-11-01T12:59:00Z,https://archivo.riomar.example/\nTodos los sitios son ficticios. Una visita no garantiza una descarga completada.",
      ),
    ],
  },
  {
    id: "windows-10",
    title: "Los minutos que quedaron",
    points: pointsFor("windows-10"),
    description:
      "Identifica la cuenta cuya sesión remota originó la tarea no autorizada y después vació el registro de seguridad. La cuenta del último evento no basta: debe corresponder a la misma sesión que creó la tarea. Entrega el nombre de cuenta en minúsculas, dentro de una flag.",
    answer: "lrojas",
    files: [
      text(
        "cuentas.csv",
        "sid,cuenta\nS-1-5-21-700-1201,lrojas\nS-1-5-21-700-1202,amena\nS-1-5-21-700-1203,soporte",
      ),
      text(
        "aprobaciones.txt",
        "No se aprobó la tarea \\Oficina\\EntregaNocturna. La reconstrucción conserva una exportación previa y el aviso de vaciado recibido por el colector. Ambas fuentes usan UTC.",
      ),
      events("Security-preservado.evtx.json", [
        event(1001, "2025-11-01T21:00:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1202",
          TargetLogonId: "0x510",
          LogonType: "3",
        }),
        event(1002, "2025-11-01T21:04:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1201",
          TargetLogonId: "0x580",
          LogonType: "10",
        }),
        event(1003, "2025-11-01T21:05:00Z", 4624, "Inicio de sesión correcto", {
          TargetUserSid: "S-1-5-21-700-1203",
          TargetLogonId: "0x590",
          LogonType: "10",
        }),
        event(
          1004,
          "2025-11-01T21:06:00Z",
          4698,
          "Se creó una tarea programada",
          {
            SubjectUserSid: "S-1-5-21-700-1201",
            SubjectLogonId: "0x580",
            TaskName: "\\Oficina\\EntregaNocturna",
          },
        ),
      ]),
      events("Colector.evtx.json", [
        event(
          1010,
          "2025-11-01T21:09:00Z",
          1102,
          "Se vació el registro de seguridad",
          { SubjectUserSid: "S-1-5-21-700-1201", SubjectLogonId: "0x580" },
        ),
        event(
          1011,
          "2025-11-01T21:15:00Z",
          1102,
          "Se vació el registro de seguridad",
          { SubjectUserSid: "S-1-5-21-700-1202", SubjectLogonId: "0x510" },
        ),
      ]),
    ],
  },
];
export function windowsFolder(id: string) {
  const index = WINDOWS_CASES.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error("Expediente Windows desconocido.");
  return `${WINDOWS_ROOT}\\caso-${String(index + 1).padStart(2, "0")}`;
}
export const WINDOWS_CHALLENGES = WINDOWS_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: `${entry.description} Material preservado en el portátil Windows.`,
  category: "Windows · Análisis forense",
  device: "laptop",
  points: entry.points,
}));
export function windowsFlag(id: string) {
  const entry = WINDOWS_CASES.find((entry) => entry.id === id);
  if (!entry) throw new Error("Expediente Windows desconocido.");
  return `CTF{${entry.answer}}`;
}
