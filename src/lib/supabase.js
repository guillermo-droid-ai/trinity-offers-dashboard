export const SUPABASE_URL = "https://snmhfybbeicyhnplrnmw.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubWhmeWJiZWljeWhucGxybm13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0Nzc3NCwiZXhwIjoyMDg4MzIzNzc0fQ.FRBqAoASMpt4wv_AE1vjs6L42V3Q8IcaIA9GhIfa2oo";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok && res.status !== 206) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt.substring(0, 200)}`);
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
    }
  }
}

export async function fetchLeads() {
  let allLeads = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const res = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/cs_leads?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${to}`,
      },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allLeads = allLeads.concat(data);
    if (data.length < PAGE_SIZE) break;
  }
  return allLeads;
}

export async function deleteLeads(ids) {
  if (!ids.length) return;

  // 1. Fetch full lead data before removing
  const fetchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/cs_leads?id=in.(${ids.join(",")})&select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!fetchRes.ok) {
    const txt = await fetchRes.text();
    throw new Error(`Failed to fetch leads for DNC (${fetchRes.status}): ${txt.substring(0, 200)}`);
  }
  const leadsData = await fetchRes.json();

  // 2. Insert into dnc table
  if (leadsData.length > 0) {
    const dncRows = leadsData.map(lead => ({
      phone: lead.phone || null,
      first_name: lead.first_name || lead.name || null,
      reason: "removed_from_dashboard",
      original_lead_id: String(lead.id),
      added_at: new Date().toISOString(),
    }));
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/dnc`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(dncRows),
      }
    );
    if (!insertRes.ok) {
      const txt = await insertRes.text();
      throw new Error(`Failed to add to DNC list (${insertRes.status}): ${txt.substring(0, 200)}`);
    }
  }

  // 3. Delete from cs_leads
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
const BATCH_SIZE = 50;

export async function resetStaleCalling(allLeads) {
  const cutoff = new Date(Date.now() - STALE_CALLING_MINUTES * 60 * 1000).toISOString();
  const stale = allLeads.filter(l => l.status === "calling" && l.last_called_at && l.last_called_at < cutoff);
  if (stale.length === 0) return 0;

  // Batch into chunks to avoid URL length limits
  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const batch = stale.slice(i, i + BATCH_SIZE);
    const ids = batch.map(l => l.id);
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
      batch.forEach(l => { l.status = "no_answer"; });
    }
  }
  return stale.length;
}
