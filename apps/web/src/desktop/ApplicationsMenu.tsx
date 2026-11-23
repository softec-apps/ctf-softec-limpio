import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronRight,
  Monitor,
  Power,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { applicationGroups, applications, type AppId } from "./applications";

const categoryIcons = {
  Retos: ShieldCheck,
  Herramientas: Wrench,
  Sistema: Monitor,
};

export default function ApplicationsMenu({
  alias,
  visibleApplication,
  onOpen,
  onDismiss,
  onExit,
}: {
  alias: string;
  visibleApplication: (id: AppId) => boolean;
  onOpen: (id: AppId) => void;
  onDismiss: () => void;
  onExit: () => void;
}) {
  const [expanded, setExpanded] = useState<string>();
  const root = useRef<HTMLElement>(null);
  const groups = applicationGroups.filter((group) =>
    group.ids.some(visibleApplication),
  );

  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>(".application-category")
      ?.focus();
    function dismiss(event: PointerEvent) {
      const target = event.target as Element;
      if (
        !root.current?.contains(target) &&
        !target.closest(".applications-button")
      )
        onDismiss();
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [onDismiss]);

  function navigate(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const menu = target.closest('[role="menu"]');
    if (!menu) return;
    const items = Array.from(
      menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ).filter((item) => item.closest('[role="menu"]') === menu);
    const index = items.indexOf(target as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    } else if (
      event.key === "ArrowRight" &&
      target.classList.contains("application-category")
    ) {
      event.preventDefault();
      setExpanded(target.dataset.category);
      requestAnimationFrame(() =>
        target.parentElement
          ?.querySelector<HTMLButtonElement>(
            '.applications-submenu [role="menuitem"]',
          )
          ?.focus(),
      );
    } else if (
      event.key === "ArrowLeft" &&
      menu.classList.contains("applications-submenu")
    ) {
      event.preventDefault();
      menu.parentElement
        ?.querySelector<HTMLButtonElement>(".application-category")
        ?.focus();
      setExpanded(undefined);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
      document
        .querySelector<HTMLButtonElement>(".applications-button")
        ?.focus();
    }
  }

  return (
    <section
      ref={root}
      className="applications-menu"
      id="applications-menu"
      aria-label="Aplicaciones del escritorio"
      onKeyDown={navigate}
    >
      <header>
        <span className="seven-mark">7</span>
        <div>
          <strong>Seventech</strong>
          <span>Aplicaciones</span>
        </div>
      </header>
      <div
        role="menu"
        aria-label="Categorías de aplicaciones"
        className="applications-categories"
      >
        {groups.map((group) => {
          const Icon = categoryIcons[group.title as keyof typeof categoryIcons];
          const active = expanded === group.title;
          return (
            <div
              className="application-group"
              key={group.title}
              onMouseEnter={() => setExpanded(group.title)}
            >
              <button
                className="application-category"
                role="menuitem"
                data-category={group.title}
                aria-haspopup="menu"
                aria-expanded={active}
                aria-controls={`submenu-${group.title}`}
                onClick={() => setExpanded(group.title)}
              >
                <Icon size={19} />
                <span>{group.title}</span>
                <ChevronRight size={14} />
              </button>
              {active && (
                <div
                  className="applications-submenu"
                  id={`submenu-${group.title}`}
                  role="menu"
                  aria-label={group.title}
                >
                  {group.ids.filter(visibleApplication).map((id) => {
                    const AppIcon = applications[id].icon;
                    return (
                      <button
                        role="menuitem"
                        key={id}
                        onClick={() => onOpen(id)}
                        title={applications[id].subtitle}
                      >
                        <AppIcon size={19} />
                        <span>{applications[id].title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <footer>
        <span>
          <span className="status-dot" />
          {alias}
        </span>
        <button onClick={onExit} aria-label="Salir del equipo">
          <Power size={17} />
        </button>
      </footer>
    </section>
  );
}
