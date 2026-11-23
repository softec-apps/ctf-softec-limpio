import { useEffect, useState } from "react";
import { api } from "../api";
import type { LinuxNetworkView } from "../../../../packages/linux-contracts";
export const CORPORATE_NETWORK_EVENT = "ctf-corporate-network-changed";
export function publishCorporateNetwork(view: LinuxNetworkView) {
  window.dispatchEvent(
    new CustomEvent(CORPORATE_NETWORK_EVENT, { detail: view }),
  );
}
export function useCorporateNetwork() {
  const [view, setView] = useState<LinuxNetworkView | null>(null);
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  useEffect(() => {
    let active = true,
      updates = 0;
    const changed = (event: Event) => {
      updates++;
      setView((event as CustomEvent<LinuxNetworkView>).detail);
      setError("");
    };
    window.addEventListener(CORPORATE_NETWORK_EVENT, changed);
    void api<LinuxNetworkView>("/linux-network")
      .then((result) => {
        if (active && updates === 0) {
          setView(result);
          setError("");
        }
      })
      .catch((error) => {
        if (active && updates === 0)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar la red.",
          );
      });
    return () => {
      active = false;
      window.removeEventListener(CORPORATE_NETWORK_EVENT, changed);
    };
  }, [revision]);
  return { view, error, refresh: () => refresh((n) => n + 1) };
}
