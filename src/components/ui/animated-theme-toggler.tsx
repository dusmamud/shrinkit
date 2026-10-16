import { useEffect, useRef, useState, useCallback } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

type AnimatedThemeTogglerProps = {
  className?: string;
};

export const AnimatedThemeToggler = ({ className = "" }: AnimatedThemeTogglerProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("shrinkit-theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.dataset.theme === "dark";
      setDarkMode(isDark);
    };

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const onToggle = useCallback(async () => {
    if (!buttonRef.current) return;

    const nextMode = !darkMode;
    const nextTheme = nextMode ? "dark" : "light";

    const updateDOM = () => {
      setDarkMode(nextMode);
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      localStorage.setItem("shrinkit-theme", nextTheme);
      document.querySelectorAll('meta[name="theme-color"][data-theme-color]').forEach((m) => {
        m.setAttribute("content", nextMode ? "#121214" : "#007bff");
      });
      document.querySelectorAll<HTMLSelectElement>('[data-testid="theme-select"]').forEach((s) => {
        s.value = nextTheme;
      });
    };

    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      updateDOM();
      return;
    }

    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const maxDistance = Math.hypot(
      Math.max(centerX, window.innerWidth - centerX),
      Math.max(centerY, window.innerHeight - centerY)
    );

    const transition = document.startViewTransition(() => {
      updateDOM();
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${centerX}px ${centerY}px)`,
          `circle(${maxDistance}px at ${centerX}px ${centerY}px)`,
        ],
      },
      {
        duration: 650,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, [darkMode]);

  return (
    <button
      ref={buttonRef}
      onClick={onToggle}
      aria-label="Switch theme"
      type="button"
      className={`relative inline-flex items-center justify-center p-2 rounded-full outline-none focus:outline-none cursor-pointer transition-transform duration-200 active:scale-90 ${className}`}
    >
      <span
        className={`transition-all duration-300 ease-in-out ${
          darkMode ? "rotate-0 scale-100 text-white" : "rotate-90 scale-0 opacity-0 absolute"
        }`}
      >
        <Sun size={20} weight="bold" />
      </span>
      <span
        className={`transition-all duration-300 ease-in-out ${
          !darkMode ? "rotate-0 scale-100 text-tink" : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      >
        <Moon size={20} weight="bold" />
      </span>
    </button>
  );
};
