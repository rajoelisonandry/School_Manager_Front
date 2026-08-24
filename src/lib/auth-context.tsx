"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginAction, logoutAction, getCurrentUser } from "@/lib/auth/session";

interface User {
  id: string;
  username: string;
  role: string;
  name: string;
  gender: string;
  email: string;
  profilePhotoUrl: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
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

  // Après une modification du profil (nom, photo...), pour que la sidebar et le
  // reste de l'appli reflètent tout de suite les nouvelles infos.
  const refreshUser = async () => {
    const refreshed = await getCurrentUser();
    setUser(refreshed);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading, refreshUser }}
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
