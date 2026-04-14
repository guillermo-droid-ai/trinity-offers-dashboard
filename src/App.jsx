import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://snmhfybbeicyhnplrnmw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubWhmeWJiZWljeWhucGxybm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0Nzc3NCwiZXhwIjoyMDg4MzIzNzc0fQ.FRBqAoASMpt4wv_AE1vjs6L42V3Q8IcaIA9GhIfa2oo";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setUTCDate(diff)).toISOString().split("T")[0];
}

function computeStats(leads) {
  const today = getToday();
  const weekStart = getWeekStart();
  const totalLeads = leads.length;
  const totalCalls = leads.reduce((s, l) => s + (l.call_count || 0), 0);
  const calledToday = leads.filter(l => l.last_called_at && l.last_called_at.startsWith(today)).length;
  const calledThisWeek = leads.filter(l => l.last_called_at && l.last_called_at >= weekStart).length;
  const pending = leads.filter(l => l.next_call_at && ["pending", "no_answer", "voicemail"].includes(l.status)).length;
  const overdue = leads.filter(l => l.next_call_at && new Date(l.next_call_at) <= new Date() && ["pending", "no_answer", "voicemail"].includes(l.status)).length;
  const statusMap = {};
  leads.forEach(l => { const s = l.status || "unknown"; statusMap[s] = (statusMap[s] || 0) + 1; });
  const cadenceMap = { new_lead: 0, existing_follow_up: 0 };
  leads.forEach(l => { if (l.cadence_type && cadenceMap[l.cadence_type] !== undefined) cadenceMap[l.cadence_type]++; });
  const weeklyBreakdown = {};
  leads.forEach(l => { if (l.current_week) { const w = `Wk ${l.current_week}`; weeklyBreakdown[w] = (weeklyBreakdown[w] || 0) + 1; } });
  return { totalLeads, totalCalls, calledToday, calledThisWeek, pending, overdue, statusMap, cadenceMap, weeklyBreakdown };
}

const STATUS_COLORS = {
  pending: "#3b82f6", calling: "#f59e0b", no_answer: "#6b7280", voicemail: "#8b5cf6",
  appointment_set: "#10b981", not_interested: "#ef4444", not_qualified: "#f97316",
  dnc: "#dc2626", exhausted: "#374151", no_answer_30d: "#4b5563",
};

const STATUS_LABELS = {
  pending: "Pendiente", calling: "Llamando", no_answer: "No contest\u00f3", voicemail: "Buz\u00f3n de voz",
  appointment_set: "Cita agendada", not_interested: "No interesado", not_qualified: "No califica",
  dnc: "Do Not Call", exhausted: "Cadencia agotada", no_answer_30d: "Sin respuesta 30d",
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 28px", flex: "1 1 180px", minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || "#f0f0f0", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StatusBar({ statusMap, total }) {
  const entries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ color: "#4b5563", fontSize: 13 }}>Sin datos a\u00fan</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([status, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={status}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#d1d5db" }}>{STATUS_LABELS[status] || status}</span>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>{count} ({pct.toFixed(1)}%)</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLORS[status] || "#6b7280", borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadTable({ leads }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = leads.filter(l => {
    const ms = !search || (l.phone || "").includes(search) || (l.first_name || "").toLowerCase().includes(search.toLowerCase()) || (l.name || "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || l.status === filter;
    return ms && mf;
  });
  const display = filtered.slice(0, 50);
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input type="text" placeholder="Buscar por nombre o tel\u00e9fono..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14, outline: "none" }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14 }}>
          <option value="all">Todos los status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {display.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>
          {leads.length === 0 ? "No hay leads en la tabla a\u00fan. Los workflows poblar\u00e1n los datos." : "No hay leads que coincidan con el filtro."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Nombre", "Tel\u00e9fono", "Status", "Cadencia", "Sem", "Calls", "Hoy", "Pr\u00f3xima llamada"].map(h =>
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {display.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 12px", color: "#e5e7eb" }}>{l.first_name || l.name || "\u2014"}</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db", fontFamily: "monospace", fontSize: 12 }}>{l.phone}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[l.status] || "#6b7280") + "22", color: STATUS_COLORS[l.status] || "#6b7280" }}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{l.cadence_type === "new_lead" ? "Nueva" : "Follow-up"}</td>
                  <td style={{ padding: "10px 12px", color: "#9ca3af", textAlign: "center" }}>{l.current_week || "\u2014"}</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db", textAlign: "center" }}>{l.call_count || 0}</td>
                  <td style={{ padding: "10px 12px", color: "#d1d5db", textAlign: "center" }}>{l.calls_today || 0}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>
                    {l.next_call_at ? new Date(l.next_call_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && <div style={{ padding: 12, color: "#6b7280", fontSize: 13, textAlign: "center" }}>Mostrando 50 de {filtered.length}</div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/cs_leads?select=*&order=created_at.desc&limit=20000`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Error ${res.status}: ${txt.substring(0, 200)}`);
        setLeads([]);
      } else {
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      }
      setLastRefresh(new Date());
    } catch (e) {
      setError(`Fetch failed: ${e.message}`);
      setLeads([]);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const stats = computeStats(leads);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#e5e7eb", background: "#0a0a0b", minHeight: "100vh", padding: "32px 24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#f9fafb" }}>Trinity Offers</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Lead Follow-Up Dashboard — Olivia & Amy</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {loading && <span style={{ fontSize: 12, color: "#f59e0b" }}>cargando...</span>}
          {lastRefresh && <span style={{ fontSize: 12, color: "#4b5563" }}>{lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading}
            style={{ padding: "8px 20px", background: loading ? "rgba(255,255,255,0.03)" : "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10, color: "#93c5fd", fontSize: 13, fontWeight: 500, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <KpiCard label="Total leads" value={stats.totalLeads} />
        <KpiCard label="Llamadas hechas" value={stats.totalCalls} color="#3b82f6" />
        <KpiCard label="Llamadas hoy" value={stats.calledToday} color="#10b981" />
        <KpiCard label="Esta semana" value={stats.calledThisWeek} color="#8b5cf6" />
        <KpiCard label="Pendientes" value={stats.pending} color="#f59e0b" sub={stats.overdue > 0 ? `${stats.overdue} vencidas` : null} />
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 400px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#d1d5db" }}>Resultados de llamadas</h2>
          <StatusBar statusMap={stats.statusMap} total={stats.totalLeads} />
        </div>
        <div style={{ flex: "1 1 240px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#d1d5db" }}>Cadencia</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: 16, background: "rgba(59,130,246,0.08)", borderRadius: 12, borderLeft: "3px solid #3b82f6" }}>
              <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 4 }}>Nuevas leads</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#dbeafe" }}>{stats.cadenceMap.new_lead}</div>
            </div>
            <div style={{ padding: 16, background: "rgba(139,92,246,0.08)", borderRadius: 12, borderLeft: "3px solid #8b5cf6" }}>
              <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 4 }}>Follow-up existente</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#ede9fe" }}>{stats.cadenceMap.existing_follow_up}</div>
            </div>
          </div>
          {Object.keys(stats.weeklyBreakdown).length > 0 && (
            <>
              <h3 style={{ fontSize: 12, color: "#6b7280", margin: "20px 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Por semana</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(stats.weeklyBreakdown).sort((a, b) => parseInt(a[0].replace("Wk ", "")) - parseInt(b[0].replace("Wk ", ""))).slice(0, 10).map(([wk, count]) =>
                  <div key={wk} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 12, color: "#9ca3af" }}>
                    <span style={{ color: "#e5e7eb", fontWeight: 600 }}>{count}</span> {wk}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#d1d5db" }}>Detalle de leads</h2>
        <LeadTable leads={leads} />
      </div>
    </div>
  );
}
