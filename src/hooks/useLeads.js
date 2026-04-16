import { useState, useEffect, useCallback } from "react";
import { fetchLeads, resetStaleCalling } from "../lib/supabase";

const REFRESH_INTERVAL = 30000;

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [staleReset, setStaleReset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allLeads = await fetchLeads();
      const resetCount = await resetStaleCalling(allLeads);
      if (resetCount > 0) setStaleReset(prev => prev + resetCount);
      setLeads(allLeads);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || "Fetch failed");
      setLeads([]);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const i = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(i);
  }, [load]);

  const dismissStaleReset = useCallback(() => setStaleReset(0), []);

  return { leads, loading, error, lastRefresh, staleReset, dismissStaleReset, refresh: load };
}
