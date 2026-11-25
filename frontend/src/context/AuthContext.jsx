
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const login = async (username, password) => {
    const response = await api.post("/auth/login/", {
      username,
      password,
    });

    const { access, refresh, user: userData } = response.data;

    sessionStorage.setItem("access_token", access);
    sessionStorage.setItem("refresh_token", refresh);

    setUser(userData);

    return userData;
  };

  const logout = async () => {
    const refresh = sessionStorage.getItem("refresh_token");

    try {
      if (refresh) {
        await api.post("/auth/logout/", { refresh });
      }
    } finally {
      clearSession();
    }
  };

  const loadUser = useCallback(async () => {
    const access = sessionStorage.getItem("access_token");

    if (!access) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me/");
      setUser(response.data);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
