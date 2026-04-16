import { Users, Phone, CalendarCheck, Clock, TrendingUp } from "lucide-react";
import KpiCard from "../ui/KpiCard";

export default function StatsGrid({ leads, filteredLeads }) {
  const totalLeads = filteredLeads.length;
  const totalCalls = filteredLeads.reduce((s, l) => s + (l.call_count || 0), 0);

  const today = new Date().toISOString().split("T")[0];
  const calledToday = filteredLeads.filter(l => l.last_called_at && l.last_called_at.startsWith(today)).length;

  const appointments = filteredLeads.filter(l => l.status === "appointment_set").length;

  const pending = filteredLeads.filter(l =>
    l.next_call_at && ["pending", "no_answer", "voicemail"].includes(l.status)
  ).length;

  const overdue = filteredLeads.filter(l =>
    l.next_call_at && new Date(l.next_call_at) <= new Date() &&
    ["pending", "no_answer", "voicemail"].includes(l.status)
  ).length;

  const conversionRate = totalCalls > 0
    ? ((appointments / totalCalls) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <KpiCard
        label="Total Leads"
        value={totalLeads}
        icon={Users}
        sub={`${calledToday} called today`}
      />
      <KpiCard
        label="Total Calls"
        value={totalCalls}
        color="#3b82f6"
        icon={Phone}
      />
      <KpiCard
        label="Appointments"
        value={appointments}
        color="#10b981"
        icon={CalendarCheck}
      />
      <KpiCard
        label="Pending"
        value={pending}
        color="#f59e0b"
        icon={Clock}
        sub={overdue > 0 ? `${overdue} overdue` : null}
      />
      <KpiCard
        label="Conversion"
        value={`${conversionRate}%`}
        color="#8b5cf6"
        icon={TrendingUp}
        sub="appts / calls"
      />
    </div>
  );
}
