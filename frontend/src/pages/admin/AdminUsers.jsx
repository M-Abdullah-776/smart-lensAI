import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import api from '../../services/api';
import { Users, Trash2, Power, Shield, CheckCircle, XCircle } from 'lucide-react';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      alert('Failed to load user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Activate account for ${user.email}?`
      : `Deactivate account for ${user.email}? The user will be blocked from logging in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/users/${user.id}/status?is_active=${nextStatus}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanently delete account ${user.email}? This will erase all user records.`)) return;

    try {
      await api.delete(`/admin/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">User Directory & RBAC</h1>
              <p className="text-xs text-slate-400">
                Inspect registered users, manage active status, and perform administrative overrides.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading user accounts...</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">User</th>
                    <th className="px-5 py-3.5 font-semibold">Role</th>
                    <th className="px-5 py-3.5 font-semibold">Verification</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Analyses Run</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-100">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono uppercase text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            u.role === 'admin'
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_verified ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono">{u.total_analyses} items</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            u.is_active
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
