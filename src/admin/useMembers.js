import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";

// All member accounts (the server never sends password hashes)
export function useMembers() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.get("/api/admin/users").then(setMembers).catch((e) => setError(e.message)); }, []);

  // Put a changed (or newly created) member into the list without reloading it
  const update = useCallback((user) => {
    setMembers((list) => {
      if (!list) return list;
      return list.some((u) => u.id === user.id) ? list.map((u) => (u.id === user.id ? user : u)) : [user, ...list];
    });
  }, []);

  return { members, error, update };
}
