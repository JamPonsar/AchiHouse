// The logged-in member (or null), shared by the header and the profile pages.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const UserContext = createContext({ user: null, loading: true });
export const useUser = () => useContext(UserContext);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    () => api.get("/api/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false)),
    []
  );
  useEffect(() => { refresh(); }, [refresh]);

  const logOut = async () => {
    try { await api.post("/api/auth/logout"); } catch { /* still clear locally */ }
    setUser(null);
  };

  return <UserContext.Provider value={{ user, setUser, loading, refresh, logOut }}>{children}</UserContext.Provider>;
}
