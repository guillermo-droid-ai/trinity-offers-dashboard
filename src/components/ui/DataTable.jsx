import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { STATUS_LABELS } from "../shared/constants";

const PAGE_SIZES = [25, 50, 100];

export default function DataTable({ data, columns, searchFields = [], defaultSort = null, onDelete }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState(defaultSort?.key || null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir || "desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // null | { ids: [], label: string }

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        searchFields.some(field => {
          const val = row[field];
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(row => row.status === statusFilter);
    }
    return result;
  }, [data, search, statusFilter, searchFields]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      aVal = String(aVal);
      bVal = String(bVal);
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  // Selection handlers
  const pageIds = paginated.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(confirmDelete.ids);
      setSelected(prev => {
        const next = new Set(prev);
        confirmDelete.ids.forEach(id => next.delete(id));
        return next;
      });
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
    setDeleting(false);
    setConfirmDelete(null);
  };

  const askDeleteSingle = (row) => {
    const name = row.first_name || row.name || row.phone || row.id;
    setConfirmDelete({ ids: [row.id], label: `"${name}"` });
  };

  const askDeleteBulk = () => {
    setConfirmDelete({ ids: [...selected], label: `${selected.size} lead${selected.size > 1 ? 's' : ''}` });
  };

  const canDelete = !!onDelete;

  return (
    <div>
      {/* Confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="glass p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text-primary mb-2">Add {confirmDelete.label} to DNC?</h3>
            <p className="text-sm text-text-muted mb-5">This will add {confirmDelete.ids.length === 1 ? 'this lead' : 'these leads'} to the Do Not Call list and remove {confirmDelete.ids.length === 1 ? 'it' : 'them'} from the dashboard.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary bg-surface-raised border border-border hover:bg-surface-hover cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red/80 hover:bg-red border border-red/40 cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleting ? "Adding to DNC..." : "Add to DNC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-raised border border-border-strong rounded-lg text-sm text-text-primary outline-none placeholder:text-text-dim focus:border-blue/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 bg-surface-raised border border-border-strong rounded-lg text-sm text-text-primary outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {canDelete && selected.size > 0 && (
          <button
            onClick={askDeleteBulk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red bg-red/10 border border-red/25 hover:bg-red/20 cursor-pointer transition-colors"
          >
            <Trash2 size={14} />
            DNC {selected.size} selected
          </button>
        )}
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="py-10 text-center text-text-dim text-sm">
          {data.length === 0 ? "No data available." : "No results match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border-strong">
                {canDelete && (
                  <th className="px-3 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      className="accent-blue cursor-pointer"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`px-3 py-2.5 text-left text-text-secondary font-medium whitespace-nowrap ${
                      col.sortable !== false ? 'cursor-pointer hover:text-text-primary select-none' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        sortDir === "asc"
                          ? <ChevronUp size={12} />
                          : <ChevronDown size={12} />
                      )}
                    </span>
                  </th>
                ))}
                {canDelete && (
                  <th className="px-3 py-2.5 w-10" />
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={row.id || i} className={`border-b border-border transition-colors ${selected.has(row.id) ? 'bg-blue/5' : 'glass-hover'}`}>
                  {canDelete && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="accent-blue cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5">
                      {col.render ? col.render(row) : (
                        col.key === "status" ? <StatusBadge status={row.status} /> : (
                          <span className="text-text-primary">{row[col.key] ?? "\u2014"}</span>
                        )
                      )}
                    </td>
                  ))}
                  {canDelete && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => askDeleteSingle(row)}
                        className="p-1.5 rounded-md text-text-dim hover:text-red hover:bg-red/10 cursor-pointer transition-colors"
                        title="Add to DNC"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between mt-4 gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span>{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
            {canDelete && selected.size > 0 && (
              <span className="text-blue">({selected.size} selected)</span>
            )}
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="px-2 py-1 bg-surface-raised border border-border rounded-md text-xs text-text-secondary outline-none cursor-pointer"
            >
              {PAGE_SIZES.map(s => (
                <option key={s} value={s}>{s} per page</option>
              ))}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
