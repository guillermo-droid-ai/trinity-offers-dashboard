export const SUPABASE_URL = "https://snmhfybbeicyhnplrnmw.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubWhmeWJiZWljeWhucGxybm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0Nzc3NCwiZXhwIjoyMDg4MzIzNzc0fQ.FRBqAoASMpt4wv_AE1vjs6L42V3Q8IcaIA9GhIfa2oo";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function fetchLeads() {
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
      throw new Error(`Error ${res.status}: ${txt.substring(0, 200)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allLeads = allLeads.concat(data);
    if (data.length < PAGE_SIZE) break;
  }
  return allLeads;
}

export async function deleteLeads(ids) {
  if (!ids.length) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cs_leads?id=in.(${ids.join(",")})`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Delete failed (${res.status}): ${txt.substring(0, 200)}`);
  }
  return ids.length;
}

const STALE_CALLING_MINUTES = 10;

export async function resetStaleCalling(allLeads) {
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
