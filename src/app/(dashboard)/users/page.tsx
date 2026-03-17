"use client";

import { useState, useEffect } from "react";
import { User } from "@/types/user";
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<Partial<User>>({
    id: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    role_name: "",
    late_long: "",
    image_url: "",
    dob: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingUser ? "PUT" : "POST";
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({
          id: "",
          username: "",
          email: "",
          password: "",
          phone: "",
          role_name: "",
          late_long: "",
          image_url: "",
          dob: "",
        });
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const filteredUsers = users.filter((u) =>
    Object.values(u).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Users</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider">System Access Control</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              id: Date.now().toString(),
              username: "",
              email: "",
              password: "",
              phone: "",
              role_name: "",
              late_long: "",
              image_url: "",
              dob: "",
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-[#003875] dark:bg-[#FFD500] hover:bg-[#002855] dark:hover:bg-[#FFC000] text-white dark:text-black px-4 py-2.5 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
        >
          <PlusIcon className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search & Stats */}
      <div 
        style={{ backgroundColor: 'var(--panel-bg)' }}
        className="p-3 rounded-2xl border border-orange-100/50 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-4 transition-colors duration-500"
      >
        <div className="relative flex-1 w-full">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-navy-950 border border-gray-100 dark:border-navy-700/50 rounded-xl focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <div 
            style={{ backgroundColor: 'var(--panel-card)' }}
            className="px-4 py-2 rounded-xl border border-gray-100 dark:border-white/10 transition-colors duration-500"
          >
            <p className="text-[8px] text-gray-400 dark:text-slate-400 font-black uppercase tracking-widest">Count</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Pagination & Filter Row */}
      <div className="flex items-center justify-between bg-[#FFFBF0]/60 dark:bg-navy-800/40 px-4 py-2 rounded-xl border border-orange-100/30 dark:border-white/5">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page 1 of 1</p>
          <div className="flex gap-1">
            <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-orange-50 dark:hover:bg-white/5 rounded-md transition-all">
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-orange-50 dark:hover:bg-white/5 rounded-md transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
            <select className="bg-white dark:bg-navy-900 border border-orange-100 dark:border-navy-700 rounded-lg px-2 py-0.5 text-[10px] font-bold outline-none dark:text-white">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div 
        style={{ backgroundColor: 'var(--panel-card)' }}
        className="overflow-x-auto rounded-2xl border border-orange-100/30 dark:border-zinc-800/50 shadow-sm transition-colors duration-500"
      >
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-[#FFFBF0]/50 dark:bg-navy-800/30 text-gray-400 dark:text-slate-400">
              <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border-b border-orange-100/20 dark:border-zinc-800/50">ID</th>
              <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border-b border-orange-100/20 dark:border-zinc-800/50">Details</th>
              <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border-b border-orange-100/20 dark:border-zinc-800/50">Contact</th>
              <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border-b border-orange-100/20 dark:border-zinc-800/50">Role</th>
              <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border-b border-orange-100/20 dark:border-zinc-800/50 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50/30">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Syncing...</p>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No entries found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-orange-50/10 transition-colors group">
                  <td className="px-4 py-2">
                    <span className="font-mono text-[10px] text-gray-400 font-bold">{user.id}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-zinc-800 overflow-hidden border border-gray-100 dark:border-zinc-700 flex-shrink-0">
                        {user.image_url ? (
                          <img src={user.image_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-gray-200 dark:text-zinc-600 text-sm">
                            {user.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-xs text-gray-900 dark:text-white leading-tight">{user.username}</p>
                        <p className="text-[9px] text-gray-400 dark:text-slate-400 font-bold lowercase truncate max-w-[120px]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[11px] font-bold text-gray-600 dark:text-slate-300">{user.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 bg-orange-50 dark:bg-[#FFD500]/10 text-[#CE2029] dark:text-[#FFD500] text-[8px] font-black uppercase tracking-widest rounded-md border border-orange-100 dark:border-[#FFD500]/20">
                      {user.role_name || "MEMBER"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-gray-400 hover:text-[#003875] hover:bg-orange-50 rounded-lg transition-all"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-gray-400 hover:text-[#CE2029] hover:bg-orange-50 rounded-lg transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-xl rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  {editingUser ? "Edit User" : "Add New User"}
                </h2>
                <p className="text-gray-400 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Profile Configuration</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto bg-white dark:bg-navy-800/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em]">Basic Information</p>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Password</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em]">Extended Details</p>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Role Name</label>
                    <select
                      value={formData.role_name}
                      onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                    >
                      <option value="">Select Role</option>
                      <option value="ADMIN">Admin</option>
                      <option value="USER">User</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Full Width Fields */}
                <div className="md:col-span-2 space-y-4">
                  <p className="text-[10px] font-black text-[#FFD500] uppercase tracking-[0.2em]">System Parameters</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Coordinates (Late/Long)</label>
                      <input
                        type="text"
                        value={formData.late_long}
                        onChange={(e) => setFormData({ ...formData, late_long: e.target.value })}
                        className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Image URL</label>
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-orange-100/50 dark:border-zinc-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#CE2029] hover:bg-[#8E161D] text-white px-4 py-2 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  {editingUser ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
