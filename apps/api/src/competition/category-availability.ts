import { ConflictException, NotFoundException } from "@nestjs/common";
import { db } from "../db";
import { SCORING_CATEGORIES } from "../scoring/policy";

export async function changeCategoryAvailability(
  adminId: string,
  category: string,
  enabled: boolean,
) {
  const group = SCORING_CATEGORIES.find((entry) => entry.category === category);
  if (!group) throw new NotFoundException("Categoría no encontrada.");
  const ids = [...group.easy, ...group.medium, ...group.hard];
  return db.$transaction(async (tx) => {
    const total = await tx.challenge.count({ where: { id: { in: ids } } });
    if (total !== ids.length)
      throw new ConflictException(
        "El catálogo de la categoría está incompleto. Actualiza el panel antes de continuar.",
      );
    const changed = await tx.challenge.updateMany({
      where: { id: { in: ids }, enabled: !enabled },
      data: { enabled },
    });
    if (changed.count)
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: enabled ? "category.enabled" : "category.disabled",
          target: category,
        },
      });
    return { category, enabled, total, changed: changed.count };
  });
}
