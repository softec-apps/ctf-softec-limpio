if (
  location.pathname === "/administracion" ||
  location.pathname.startsWith("/administracion/")
) {
  void import("./admin-entry");
} else if (
  location.pathname === "/auditorio" ||
  location.pathname.startsWith("/auditorio/")
) {
  void import("./auditorium-entry");
} else {
  void import("./scene-entry");
}
