import { BadRequestException } from "@nestjs/common";
import { db } from "../db";
import { operatePrinter } from "./engine";

export async function printerCommand(command: string) {
  const enabled = await db.challenge.findMany({
    where: { enabled: true, id: { startsWith: "iot-" } },
    select: { id: true },
  });
  try {
    return operatePrinter(
      command,
      enabled.map((c) => c.id),
    );
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error && error.name !== "ZodError"
        ? error.message
        : "Estructura de la petición no válida. Revisa los campos del protocolo.",
    );
  }
}
