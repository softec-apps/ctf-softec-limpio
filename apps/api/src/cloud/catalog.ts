import { createHmac } from "node:crypto";
import { consoleLabs, object, type ConsoleCase } from "../console-labs/build";
const signed = {
  bucket: "lab-assets",
  key: "public/logo.png",
  expires: 1793624400,
  signature: createHmac("sha256", "cloud-expiry-fixture")
    .update("lab-assets|1793624400")
    .digest("hex"),
};
const deny = {
  accepted: false,
  output: { status: "Operación sin acceso al recurso del expediente." },
};
const yes = (output: unknown) => ({ accepted: true, output });
const cases: ConsoleCase[] = [
  {
    title: "El respaldo en el bucket público",
    question:
      "La política pública del bucket abarca más que el prefijo de imágenes. Usa el inventario para demostrar la lectura del respaldo privado con identidad anonymous.",
    initial: {
      op: "get",
      bucket: "lab-assets",
      key: "public/logo.png",
      principal: "anonymous",
    },
    files: {
      "objects.json": '["public/logo.png","backup/team.json"]',
      "policy.json":
        '{"bucket":"lab-assets","principal":"*","action":"get","resource":"lab-assets/*"}',
    },
    run(i) {
      return i.op === "get" &&
        i.bucket === "lab-assets" &&
        i.key === "backup/team.json" &&
        i.principal === "anonymous"
        ? yes({
            resource: "backup/team.json",
            visibility: "confidential",
            read: true,
          })
        : deny;
    },
  },
  {
    title: "El comodín del operador",
    question:
      "La cuenta de soporte debería leer solo reports. Revisa su política y demuestra el acceso a un objeto de secrets mediante el comodín de recurso.",
    initial: { op: "read", principal: "support", resource: "reports/daily" },
    files: {
      "iam.json":
        '{"principal":"support","Allow":{"action":"storage:GetObject","resource":["reports/*","secrets/*"]}}',
      "inventory.txt": "reports/daily\nsecrets/prod-config",
    },
    run(i) {
      return i.op === "read" &&
        i.principal === "support" &&
        i.resource === "secrets/prod-config"
        ? yes({
            resource: i.resource,
            authorization: "wildcard allow",
            read: true,
          })
        : deny;
    },
  },
  {
    title: "La configuración de la función",
    question:
      "Una función de diagnóstico permite consultar variables de entorno a la identidad pública. Localiza la función y demuestra la lectura de su configuración privada.",
    initial: { op: "describe", function: "public-status", principal: "guest" },
    files: {
      "functions.csv":
        "name,visibility,environment\npublic-status,public,none\nbilling-debug,public,private\n",
      "schema.txt":
        "op=describe, function, principal. Configuración pública solo debería devolver nombre y estado.",
    },
    run(i) {
      return i.op === "describe" &&
        i.function === "billing-debug" &&
        i.principal === "guest"
        ? yes({
            environment: { LAB_DB_PASSWORD: "fictional-db-63" },
            scope: "private configuration exposed",
          })
        : deny;
    },
  },
  {
    title: "La clave no quedó firmada",
    question:
      "El enlace firmado liga bucket y expires, pero omite key. Conserva la firma capturada y demuestra la lectura de backup/ledger.json en lugar del objeto público. El reloj del caso es fijo.",
    initial: { op: "signedGet", ...signed },
    files: {
      "captured.json": JSON.stringify(signed),
      "clock.txt":
        "Reloj del expediente:1793620800. El enlace es válido hasta expires; no utiliza el reloj de tu navegador.",
      "signature.txt":
        "Formato firmado heredado: bucket|expires. La clave del objeto no se incluyó.",
    },
    run(i) {
      return i.op === "signedGet" &&
        i.bucket === signed.bucket &&
        i.expires === signed.expires &&
        i.signature === signed.signature &&
        i.key === "backup/ledger.json"
        ? yes({ object: i.key, read: true, signatureValid: true })
        : deny;
    },
  },
  {
    title: "La audiencia que faltó",
    question:
      "La confianza de archive-reader exige issuer y sub, pero olvidó la audiencia. Usa una credencial de public-docs del repositorio autorizado para obtener el rol destinado a sts.",
    initial: {
      op: "assume",
      role: "archive-reader",
      claims: {
        iss: "ci.seventech",
        aud: "sts",
        sub: "repo:other:branch:main",
      },
    },
    files: {
      "trust.json":
        '{"role":"archive-reader","issuer":"ci.seventech","subject":"repo:demo:branch:main","expectedAudience":"sts","checksAudience":false}',
      "captured.json":
        '{"iss":"ci.seventech","aud":"public-docs","sub":"repo:demo:branch:main"}',
    },
    run(i) {
      const c = object(i.claims);
      return i.op === "assume" &&
        i.role === "archive-reader" &&
        c.iss === "ci.seventech" &&
        c.sub === "repo:demo:branch:main" &&
        c.aud === "public-docs"
        ? yes({ assumed: "archive-reader", audienceBound: false })
        : deny;
    },
  },
  {
    title: "La identidad detrás de metadata",
    question:
      "La función preview dispone de una identidad de servicio. Su versión de metadata no exige token de sesión. Demuestra el acceso al recurso de identidad mediante la URL interna preservada.",
    initial: {
      op: "preview",
      method: "GET",
      url: "https://public.example/page",
    },
    files: {
      "metadata.txt":
        "Endpoint simulado: http://169.254.169.254/latest/meta-data/iam/security-credentials/worker\nVersión heredada sin requisito de token. El motor del juego responde de memoria; no consulta la red.",
    },
    run(i) {
      return i.op === "preview" &&
        i.method === "GET" &&
        i.url ===
          "http://169.254.169.254/latest/meta-data/iam/security-credentials/worker"
        ? yes({
            role: "worker",
            credential: "LAB_SESSION_ONLY",
            metadataVersion: "legacy",
          })
        : deny;
    },
  },
  {
    title: "El contexto de la clave",
    question:
      "El grant de reporting no liga tenant al uso de la clave. Usa el ciphertext del inventario para obtener el documento del tenant south bajo la identidad reporting.",
    initial: {
      op: "decrypt",
      principal: "reporting",
      key: "team-prod",
      ciphertext: "unknown",
      context: { tenant: "north" },
    },
    files: {
      "grant.json":
        '{"principal":"reporting","key":"team-prod","action":"Decrypt","expectedTenant":"north","checksContext":false}',
      "ciphertexts.json":
        '[{"id":"BLOB-71","tenant":"south","key":"team-prod"}]',
      "scope.txt":
        "Modelo didáctico de autorización de una clave, no implementación de AWS KMS ni de su cifrado.",
    },
    run(i) {
      return i.op === "decrypt" &&
        i.principal === "reporting" &&
        i.key === "team-prod" &&
        i.ciphertext === "BLOB-71" &&
        object(i.context).tenant === "south"
        ? yes({
            tenant: "south",
            document: "restricted-ledger",
            grantContextChecked: false,
          })
        : deny;
    },
  },
  {
    title: "De PassRole a la ejecución",
    question:
      "Relaciona el permiso PassRole del operador con el rol que confía en functions. Demuestra la cadena passRole → createFunction usando el mismo rol privilegiado y el código permitido.",
    initial: { steps: [] },
    files: {
      "permissions.json":
        '{"operator":["iam:PassRole","functions:Create"],"passRoleResource":"*","codeRef":"reporter"}',
      "roles.json":
        '[{"id":"admin-runner","trustedService":"functions","permissions":"admin"},{"id":"view-only","trustedService":"reports","permissions":"read"}]',
      "format.txt":
        'steps:[{op:"passRole",role},{op:"createFunction",role,codeRef}]. Estas acciones solo existen en el simulador.',
    },
    run(i) {
      const s = Array.isArray(i.steps) ? i.steps.map(object) : [];
      return s.length === 2 &&
        s[0].op === "passRole" &&
        s[0].role === "admin-runner" &&
        s[1].op === "createFunction" &&
        s[1].role === s[0].role &&
        s[1].codeRef === "reporter"
        ? yes({
            executionRole: "admin-runner",
            chain: ["passRole", "createFunction"],
          })
        : deny;
    },
  },
  {
    title: "El evento que eligió el bucket",
    question:
      "La cola uploads acepta un evento de otro account y el consumidor usa bucket/key del evento sin comprobar procedencia. Relaciona el inventario y demuestra la lectura del objeto del vault.",
    initial: {
      op: "consumeEvent",
      queue: "uploads",
      event: { account: "north", bucket: "uploads", key: "public.txt" },
    },
    files: {
      "consumer.json":
        '{"queue":"uploads","allowedAccount":"north","roleCanRead":["uploads/*","vault/*"],"validatesEventSource":false}',
      "objects.json":
        '[{"bucket":"vault","key":"audit/export.json","account":"south","classification":"restricted"}]',
    },
    run(i) {
      const e = object(i.event);
      return i.op === "consumeEvent" &&
        i.queue === "uploads" &&
        e.account === "south" &&
        e.bucket === "vault" &&
        e.key === "audit/export.json"
        ? yes({
            read: "vault/audit/export.json",
            eventAccount: "south",
            sourceBound: false,
          })
        : deny;
    },
  },
  {
    title: "La instantánea compartida",
    question:
      "Une shares, snapshots y el rol de exportación. Encuentra una instantánea de otro account compartida con *, sin cifrado, en la región permitida, y expórtala por la ruta configurada del rol. No uses la instantánea cifrada o privada.",
    initial: {
      op: "exportSnapshot",
      snapshot: "",
      account: "",
      region: "",
      role: "",
      path: "",
    },
    files: {
      "shares.csv":
        "snapshot,principal\nsnap-101,*\nsnap-102,*\nsnap-103,north\n",
      "snapshots.csv":
        "id,account,region,encrypted\nsnap-101,south,lab-west,false\nsnap-102,south,lab-west,true\nsnap-103,south,lab-east,false\n",
      "role.json":
        '{"id":"backup-export","region":"lab-west","path":"exports/recovery","checksOwner":false,"callerAccount":"north"}',
    },
    run(i) {
      return i.op === "exportSnapshot" &&
        i.snapshot === "snap-101" &&
        i.account === "south" &&
        i.region === "lab-west" &&
        i.role === "backup-export" &&
        i.path === "exports/recovery"
        ? yes({ exported: "snap-101", owner: "south", encrypted: false })
        : deny;
    },
  },
];
export const CLOUD_LABS = consoleLabs("cloud-", cases);
