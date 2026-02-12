"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface ActiveChild {
  id: string;
  name: string;
  age: number;
  tier: 1 | 2 | 3;
  avatarEmoji: string;
}

interface ActiveChildContextType {
  activeChild: ActiveChild | null;
  setActiveChild: (child: ActiveChild | null) => void;
  clearActiveChild: () => void;
}

const ActiveChildContext = createContext<ActiveChildContextType | null>(null);

const STORAGE_KEY = "writewise-active-child";

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const [activeChild, setActiveChildState] = useState<ActiveChild | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveChildState(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors from corrupted localStorage
    }
  }, []);

  function setActiveChild(child: ActiveChild | null) {
    setActiveChildState(child);
    if (child) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(child));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearActiveChild() {
    setActiveChildState(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <ActiveChildContext.Provider
      value={{ activeChild, setActiveChild, clearActiveChild }}
    >
      {children}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild(): ActiveChildContextType {
  const context = useContext(ActiveChildContext);
  if (!context) {
    throw new Error("useActiveChild must be used within an ActiveChildProvider");
  }
  return context;
}
