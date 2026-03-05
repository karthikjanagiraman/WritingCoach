"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

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

const STORAGE_KEY_PREFIX = "writewise-active-child";

function getStorageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.userId;

  const [activeChild, setActiveChildState] = useState<ActiveChild | null>(null);

  // Load from localStorage once we know the userId
  useEffect(() => {
    if (status === "loading") return;

    if (!userId) {
      // Not logged in — clear state
      setActiveChildState(null);
      return;
    }

    try {
      const stored = localStorage.getItem(getStorageKey(userId));
      setActiveChildState(stored ? JSON.parse(stored) : null);
    } catch {
      setActiveChildState(null);
    }
  }, [userId, status]);

  function setActiveChild(child: ActiveChild | null) {
    setActiveChildState(child);
    const key = getStorageKey(userId);
    if (child) {
      localStorage.setItem(key, JSON.stringify(child));
    } else {
      localStorage.removeItem(key);
    }
  }

  function clearActiveChild() {
    setActiveChildState(null);
    localStorage.removeItem(getStorageKey(userId));
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
