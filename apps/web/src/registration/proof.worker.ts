self.onmessage = async (
  event: MessageEvent<{ nonce: string; difficulty: number }>,
) => {
  try {
    const { nonce, difficulty } = event.data;
    if (!/^[a-f0-9]{48}$/.test(nonce) || difficulty !== 17)
      throw new Error("Verificación no válida.");
    const encoder = new TextEncoder(),
      started = Date.now();
    for (let counter = 0; counter < 2 ** 22; counter++) {
      if (counter % 1024 === 0 && Date.now() - started > 60000) break;
      const digest = new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(`${nonce}:${counter}`),
        ),
      );
      if (digest[0] === 0 && digest[1] === 0 && digest[2] < 128) {
        self.postMessage({ solution: String(counter) });
        return;
      }
    }
    throw new Error("La verificación tardó demasiado. Vuelve a intentarlo.");
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "No se pudo verificar el navegador.",
    });
  }
};
