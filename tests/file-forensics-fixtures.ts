import { createHash } from "node:crypto";
import path from "node:path";
const sha = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
export async function solveFileCase(
  index: number,
  read: (name: string) => Promise<string>,
) {
  const csv = (text: string) =>
    text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => line.split(","));
  if (index === 1) {
    const header = (await read("captura-factura.pdf.hex")).replace(/\s/g, "");
    if (header.startsWith("89504e470d0a1a0a")) return "png";
    throw Error("Formato desconocido");
  }
  if (index === 2) {
    const expected = (await read("adquisicion.sha256")).split(" ")[0];
    for (const name of ["acta-a.txt", "acta-b.txt", "acta-c.txt"])
      if (sha(await read(name)) === expected) return name;
    throw Error("Sin original");
  }
  if (index === 3)
    return (await read(".custodia")).match(/^identificador=(.+)$/m)![1];
  if (index === 4) {
    const inode = csv(await read("directorio.csv")).find(
      (row) => row[0] === "informe.txt" && row[2] === "eliminado",
    )![1];
    return csv(await read("custodia.csv")).find((row) => row[0] === inode)![1];
  }
  if (index === 5) {
    const stream = csv(await read("flujos.csv")).find(
      (row) => row[1] === "auditoria",
    )![3];
    return Buffer.from(await read(stream), "base64").toString("utf8");
  }
  if (index === 6) {
    const revision = csv(await read("revisiones.csv")).find(
      (row) => row[1] === "true",
    )!;
    const objects = JSON.parse(await read("objetos.json"));
    return objects[objects[objects[revision[2]].pages].content].text;
  }
  if (index === 7) {
    const links = JSON.parse(await read("enlaces.json"));
    let file = "/archivo/exportacion/actual";
    const seen = new Set<string>();
    while (links[file]) {
      if (seen.has(file)) throw Error("Ciclo");
      seen.add(file);
      file = path.posix.resolve(path.posix.dirname(file), links[file]);
      if (!file.startsWith("/archivo/")) throw Error("Fuera de ámbito");
    }
    const inode = csv(await read("inventario.csv")).find(
      (row) => row[0] === file,
    )![1];
    return csv(await read("atributos.csv")).find(
      (row) => row[0] === inode && row[1] === "user.custodia",
    )![2];
  }
  if (index === 8) {
    const entry = csv(await read("entrada.csv"))[0],
      fat = Object.fromEntries(csv(await read("fat.csv"))),
      clusters = JSON.parse(await read("clusters.json"));
    let next = entry[1];
    const blocks: Buffer[] = [];
    while (next !== "EOF") {
      blocks.push(Buffer.from(clusters[next], "hex"));
      next = fat[next];
      if (blocks.length > 50) throw Error("Ciclo");
    }
    return sha(Buffer.concat(blocks).subarray(0, Number(entry[2])));
  }
  if (index === 9) {
    const metadata = JSON.parse(await read("metadatos.json")),
      bytes = Buffer.alloc(metadata.size);
    for (const row of csv(await read("extents.csv")))
      if (Number(row[0]) === metadata.generation && row[1] === "committed")
        Buffer.from(row[3], "hex").copy(bytes, Number(row[2]));
    return sha(bytes);
  }
  if (index === 10) {
    const root = await read("raiz.sha256"),
      proofs = JSON.parse(await read("pruebas.json")),
      matches: string[] = [];
    for (const item of proofs) {
      let hash = sha(item.name);
      for (const step of item.proof)
        hash = sha(
          Buffer.from(
            step.side === "left" ? step.hash + hash : hash + step.hash,
            "hex",
          ),
        );
      if (hash === root) matches.push(item.name);
    }
    if (matches.length !== 1)
      throw Error("La prueba no identifica un único candidato");
    return matches[0];
  }
  throw Error("Expediente desconocido");
}
