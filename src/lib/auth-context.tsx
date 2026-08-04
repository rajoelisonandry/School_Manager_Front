"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginAction, logoutAction, getCurrentUser } from "@/lib/auth/session";

interface User {
  id: string;
  username: string;
  role: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // La source de vérité est le JWT (cookie httpOnly), revérifié auprès du
    // backend à chaque chargement — jamais un état client qu'on se contenterait
    // de croire sur parole.
    getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const loggedInUser = await loginAction(username, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    logoutAction();
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
