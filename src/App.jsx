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
  pending: "Pending", calling: "Calling", no_answer: "No Answer", voicemail: "Voicemail",
  appointment_set: "Appointment Set", not_interested: "Not Interested", not_qualified: "Not Qualified",
  dnc: "Do Not Call", exhausted: "Cadence Exhausted", no_answer_30d: "No Answer 30d",
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
  if (entries.length === 0) return <div style={{ color: "#4b5563", fontSize: 13 }}>No data yet</div>;
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

function CallLogsTable({ leads }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const today = getToday();
  const weekStart = getWeekStart();

  const calledLeads = leads
    .filter(l => l.last_called_at && l.call_count > 0)
    .sort((a, b) => new Date(b.last_called_at) - new Date(a.last_called_at));

  const filtered = calledLeads.filter(l => {
    const ms = !search || (l.phone || "").includes(search) || (l.first_name || "").toLowerCase().includes(search.toLowerCase()) || (l.name || "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || l.status === filter;
    let md = true;
    if (dateFilter === "today") md = l.last_called_at.startsWith(today);
    else if (dateFilter === "week") md = l.last_called_at >= weekStart;
    return ms && mf && md;
  });

  const statusBreakdown = {};
  filtered.forEach(l => { const s = l.status || "unknown"; statusBreakdown[s] = (statusBreakdown[s] || 0) + 1; });

  const display = filtered.slice(0, 100);
  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Called" value={calledLeads.length} color="#3b82f6" />
        <KpiCard label="Called Today" value={calledLeads.filter(l => l.last_called_at.startsWith(today)).length} color="#10b981" />
        <KpiCard label="Called This Week" value={calledLeads.filter(l => l.last_called_at >= weekStart).length} color="#8b5cf6" />
        <KpiCard label="Voicemails" value={calledLeads.filter(l => l.status === "voicemail").length} color="#8b5cf6" />
        <KpiCard label="Appointments" value={calledLeads.filter(l => l.status === "appointment_set").length} color="#10b981" />
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 400px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#d1d5db" }}>Call Outcome Breakdown</h2>
          <StatusBar statusMap={statusBreakdown} total={filtered.length} />
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#d1d5db" }}>Call Log Details</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: "1 1 240px", padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14, outline: "none" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14 }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            style={{ padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14 }}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>
        </div>
        {display.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>No call logs match the current filters.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Name", "Phone", "Status", "Calls", "Last Called", "Cadence", "Call ID"].map(h =>
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
                    <td style={{ padding: "10px 12px", color: "#d1d5db", textAlign: "center" }}>{l.call_count || 0}</td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>
                      {new Date(l.last_called_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{l.cadence_type === "new_lead" ? "New" : "Follow-up"}</td>
                    <td style={{ padding: "10px 12px", color: "#4b5563", fontFamily: "monospace", fontSize: 10 }}>{l.retell_call_id ? l.retell_call_id.substring(0, 16) + "..." : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && <div style={{ padding: 12, color: "#6b7280", fontSize: 13, textAlign: "center" }}>Showing 100 of {filtered.length}</div>}
          </div>
        )}
      </div>
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
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14, outline: "none" }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: "10px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e5e7eb", fontSize: 14 }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {display.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>
          {leads.length === 0 ? "No leads in the table yet. Workflows will populate the data." : "No leads match the current filter."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Phone", "Status", "Cadence", "Week", "Calls", "Today", "Next Call"].map(h =>
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
                  <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{l.cadence_type === "new_lead" ? "New" : "Follow-up"}</td>
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
          {filtered.length > 50 && <div style={{ padding: 12, color: "#6b7280", fontSize: 13, textAlign: "center" }}>Showing 50 of {filtered.length}</div>}
        </div>
      )}
    </div>
  );
}

const STALE_CALLING_MINUTES = 10;

async function resetStaleCalling(allLeads) {
  const cutoff = new Date(Date.now() - STALE_CALLING_MINUTES * 60 * 1000).toISOString();
  const stale = allLeads.filter(l => l.status === "calling" && l.last_called_at && l.last_called_at < cutoff);
  if (stale.length === 0) return 0;
  const ids = stale.map(l => l.id);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cs_leads?id=in.(${ids.join(",")})`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status: "no_answer" }),
    }
  );
  if (res.ok) {
    stale.forEach(l => { l.status = "no_answer"; });
  }
  return stale.length;
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staleReset, setStaleReset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 20;
      let allLeads = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const res = await fetch(`${SUPABASE_URL}/rest/v1/cs_leads?select=*&order=created_at.desc`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Range: `${from}-${to}`,
          },
        });
        if (!res.ok && res.status !== 206) {
          const txt = await res.text();
          setError(`Error ${res.status}: ${txt.substring(0, 200)}`);
          setLeads([]);
          setLastRefresh(new Date());
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allLeads = allLeads.concat(data);
        if (data.length < PAGE_SIZE) break;
      }
      const resetCount = await resetStaleCalling(allLeads);
      if (resetCount > 0) setStaleReset(prev => prev + resetCount);
      setLeads(allLeads);
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
          {loading && <span style={{ fontSize: 12, color: "#f59e0b" }}>loading...</span>}
          {lastRefresh && <span style={{ fontSize: 12, color: "#4b5563" }}>{lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading}
            style={{ padding: "8px 20px", background: loading ? "rgba(255,255,255,0.03)" : "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10, color: "#93c5fd", fontSize: 13, fontWeight: 500, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
        {[{ key: "dashboard", label: "Dashboard" }, { key: "call-logs", label: "Call Logs" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
              background: activeTab === tab.key ? "rgba(59,130,246,0.15)" : "transparent",
              color: activeTab === tab.key ? "#93c5fd" : "#6b7280",
              transition: "all 0.2s ease",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {staleReset > 0 && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fcd34d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Auto-reset {staleReset} stale "calling" lead{staleReset > 1 ? "s" : ""} to "no_answer" (stuck &gt;{STALE_CALLING_MINUTES}min)</span>
          <button onClick={() => setStaleReset(0)} style={{ background: "none", border: "none", color: "#fcd34d", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>&times;</button>
        </div>
      )}

      {activeTab === "dashboard" && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <KpiCard label="Total leads" value={stats.totalLeads} />
            <KpiCard label="Total Calls" value={stats.totalCalls} color="#3b82f6" />
            <KpiCard label="Called Today" value={stats.calledToday} color="#10b981" />
            <KpiCard label="This Week" value={stats.calledThisWeek} color="#8b5cf6" />
            <KpiCard label="Pending" value={stats.pending} color="#f59e0b" sub={stats.overdue > 0 ? `${stats.overdue} overdue` : null} />
          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 400px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#d1d5db" }}>Call Results</h2>
              <StatusBar statusMap={stats.statusMap} total={stats.totalLeads} />
            </div>
            <div style={{ flex: "1 1 240px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#d1d5db" }}>Cadence</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: 16, background: "rgba(59,130,246,0.08)", borderRadius: 12, borderLeft: "3px solid #3b82f6" }}>
                  <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 4 }}>New Leads</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#dbeafe" }}>{stats.cadenceMap.new_lead}</div>
                </div>
                <div style={{ padding: 16, background: "rgba(139,92,246,0.08)", borderRadius: 12, borderLeft: "3px solid #8b5cf6" }}>
                  <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 4 }}>Existing Follow-up</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#ede9fe" }}>{stats.cadenceMap.existing_follow_up}</div>
                </div>
              </div>
              {Object.keys(stats.weeklyBreakdown).length > 0 && (
                <>
                  <h3 style={{ fontSize: 12, color: "#6b7280", margin: "20px 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>By Week</h3>
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
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#d1d5db" }}>Lead Details</h2>
            <LeadTable leads={leads} />
          </div>
        </>
      )}

      {activeTab === "call-logs" && <CallLogsTable leads={leads} />}
    </div>
  );
}
