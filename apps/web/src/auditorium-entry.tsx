import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Auditorium from "./auditorium/Auditorium";
import "./auditorium/auditorium.css";

document.title = "En vivo · Seventech CTF";
document
  .querySelector('meta[name="description"]')
  ?.setAttribute(
    "content",
    "Clasificación y resultados en directo de la competencia Seventech CTF.",
  );
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auditorium />
  </StrictMode>,
);
