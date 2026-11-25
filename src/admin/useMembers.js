import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

// All member accounts (read-only; the server never sends password hashes)
export function useMembers() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.get("/api/admin/users").then(setMembers).catch((e) => setError(e.message)); }, []);
  return { members, error };
}
