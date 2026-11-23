import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export default function entranceHtml(): Plugin {
  function middleware(
    preview: boolean,
    transform?: (url: string, html: string) => Promise<string>,
  ) {
    return async (
      req: IncomingMessage,
      res: ServerResponse,
      next: () => void,
    ) => {
      const path = req.url?.split("?")[0];
      if (req.method !== "GET" || (path !== "/" && path !== "/index.html")) {
        next();
        return;
      }
      try {
        const response = await fetch(
          "http://127.0.0.1:3001/api/v1/entrance/challenge",
          {
            headers: { cookie: req.headers.cookie ?? "" },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!response.ok) throw new Error("No se pudo preparar la entrada.");
        const pin: unknown = await response.json();
        if (
          typeof pin !== "object" ||
          pin === null ||
          !("code" in pin) ||
          typeof pin.code !== "string" ||
          !/^[0-9]{4}$/.test(pin.code)
        )
          throw new Error("Respuesta de entrada no válida.");
        let html = await readFile(
          new URL(
            preview ? "./dist/index.html" : "./index.html",
            import.meta.url,
          ),
          "utf8",
        );
        if (!html.includes("__ENTRANCE_PIN__"))
          throw new Error("Falta la pista de entrada.");
        html = html.replace("__ENTRANCE_PIN__", pin.code);
        if (transform) html = await transform(req.url ?? "/", html);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Set-Cookie", response.headers.getSetCookie());
        res.end(html);
      } catch {
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(
          "No se pudo preparar el acceso al laboratorio. Vuelve a cargar la página.",
        );
      }
    };
  }
  return {
    name: "entrance-pin-per-load",
    configureServer(server) {
      server.middlewares.use(
        middleware(false, (url, html) => server.transformIndexHtml(url, html)),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(true));
    },
  };
}
