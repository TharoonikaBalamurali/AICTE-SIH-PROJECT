/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Search, Filter, Lock, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { UserProfile, AuditLogEntry } from '../../types/auth.ts';

interface AuditGovernanceDashboardProps {
  user: UserProfile;
}

export const AuditGovernanceDashboard: React.FC<AuditGovernanceDashboardProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((entry) => {
    if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.loginId.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aicte_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>Statutory Audit & Cryptographic Verification</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Immutable Regulatory Audit Log & Governance Workspace
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Continuous APH deterministic rule tracking and tamper-evident event integrity
          </p>
        </div>

        <button
          onClick={exportLogsAsJson}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, login ID, details..."
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'AUTH', 'RBAC_SECURITY', 'WORKFLOW', 'ADMIN', 'GOVERNANCE'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Cryptographic Event Stream
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Showing {filteredLogs.length} of {logs.length} events
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Querying immutable audit ledger...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No audit events match current criteria.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredLogs.map((entry) => (
              <div key={entry.id} className="p-4 space-y-1.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{entry.action}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{entry.loginId}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{entry.role}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      entry.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      entry.status === 'DENIED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      entry.status === 'FAILED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {entry.status}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString()} ({new Date(entry.timestamp).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed font-sans">{entry.details}</p>

                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span>Category: {entry.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>IP: {entry.ipAddress}</span>
                  <span aria-hidden="true">·</span>
                  <span>Audit Event ID: {entry.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
