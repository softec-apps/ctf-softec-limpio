import { api } from "../api";
export async function prepareRegistration(signal: AbortSignal) {
  const challenge = await api<{ nonce: string; difficulty: number }>(
    "/auth/registration-challenge",
    { method: "POST", body: "{}", signal },
  );
  if (signal.aborted)
    throw new DOMException("Operación cancelada", "AbortError");
  return new Promise<{ nonce: string; solution: string }>((resolve, reject) => {
    const worker = new Worker(new URL("./proof.worker.ts", import.meta.url), {
      type: "module",
    });
    const cancel = () => {
      finish();
      reject(new DOMException("Operación cancelada", "AbortError"));
    };
    const timeout = setTimeout(() => {
      finish();
      reject(
        new Error("La verificación tardó demasiado. Vuelve a intentarlo."),
      );
    }, 65000);
    function finish() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      worker.terminate();
    }
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ solution?: string; error?: string }>,
    ) => {
      finish();
      if (event.data.solution !== undefined)
        resolve({ nonce: challenge.nonce, solution: event.data.solution });
      else
        reject(
          new Error(event.data.error ?? "No se pudo verificar el navegador."),
        );
    };
    worker.onerror = () => {
      finish();
      reject(
        new Error(
          "No se pudo preparar el registro en este navegador. Vuelve a intentarlo.",
        ),
      );
    };
    worker.postMessage(challenge);
  });
}
