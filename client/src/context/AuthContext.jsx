import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("bs_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  const persist = (user, token) => {
    if (token) localStorage.setItem("bs_token", token);
    localStorage.setItem("bs_user", JSON.stringify(user));
    setUser(user);
  };

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem("bs_token")) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      persist(data.user);
    } catch {
      localStorage.removeItem("bs_token");
      localStorage.removeItem("bs_user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data.user, data.token);
    return data.user;
  };

  // Returns the full response: { user, token, verification: { emailSent, … } }.
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    persist(data.user, data.token);
    return data;
  };

  const verifyEmail = async (code) => {
    const { data } = await api.post("/auth/verify-email", { code });
    persist(data.user);
    return data.user;
  };

  const resendVerificationCode = async () => {
    const { data } = await api.post("/auth/resend-code");
    return data;
  };

  const googleLogin = async (credential, location) => {
    const { data } = await api.post("/auth/google", { credential, location });
    persist(data.user, data.token);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    setUser(null);
  };

  // Applies a new credit balance returned by a purchase or scan.
  const setCredits = useCallback((balance) => {
    setUser((prev) => {
      if (!prev || typeof balance !== "number") return prev;
      const next = { ...prev, credits: balance };
      localStorage.setItem("bs_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateProfile = async (payload) => {
    const { data } = await api.patch("/auth/me", payload);
    persist(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, googleLogin, logout, updateProfile, refreshMe, setCredits, verifyEmail, resendVerificationCode }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
