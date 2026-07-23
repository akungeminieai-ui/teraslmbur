'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/shared/page-header';
import { AppButton } from '@teras-lmbur/ui';
import { cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Shield,
  Search,
  Edit,
  Trash2,
  Key,
  Power,
  AlertTriangle,
  X,
  Lock,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Info,
  ChevronDown,
  CheckCircle2,
  ChefHat,
  DollarSign,
  Coffee,
  Store,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  roleId: string;
  role: Role;
  outletId?: string;
  createdAt: string;
  updatedAt: string;
}

const defaultFallbackRoles: Role[] = [
  { id: 'OWNER', name: 'OWNER', description: 'Pemilik Outlet: Akses penuh ke seluruh sistem, finansial, dan manajemen tim' },
  { id: 'MANAGER', name: 'MANAGER', description: 'Manajer Outlet: Mengawasi operasional, manajemen produk, stok, dan laporan' },
  { id: 'CASHIER', name: 'CASHIER', description: 'Kasir POS: Transaksi kasir, penerimaan pembayaran, dan cetak struk' },
  { id: 'KITCHEN', name: 'KITCHEN', description: 'Staf Dapur/Bar: Manajemen tiket pesanan di Kitchen Display System (KDS)' },
  { id: 'WAITER', name: 'WAITER', description: 'Pramusaji: Pemesanan meja (Dine In), bawa pulang, dan status meja' },
];

const roleBadgeColors: Record<string, string> = {
  OWNER: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
  MANAGER: 'bg-info-500/10 text-info-500 border-info-500/20',
  CASHIER: 'bg-success-500/10 text-success-500 border-success-500/20',
  KITCHEN: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
  WAITER: 'bg-[var(--accent)] text-[var(--foreground)] border-[var(--border)]',
};

const roleIcons: Record<string, any> = {
  OWNER: Store,
  MANAGER: Shield,
  CASHIER: DollarSign,
  KITCHEN: ChefHat,
  WAITER: Coffee,
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role?.name === 'OWNER';

  const [search, setSearch] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');

  // Modal States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserItem | null>(null);

  const [isResetOpen, setIsResetOpen] = React.useState(false);
  const [resetTargetUser, setResetTargetUser] = React.useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = React.useState('');

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = React.useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    isActive: true,
  });

  const [formError, setFormError] = React.useState('');

  // Fetch Roles with fallback
  const { data: fetchedRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiClient.get('/users/roles'),
  });

  const availableRoles = fetchedRoles.length > 0 ? fetchedRoles : defaultFallbackRoles;

  // Fetch Users
  const { data: users = [], isLoading, error, refetch } = useQuery<UserItem[]>({
    queryKey: ['users', search, selectedRole, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRole !== 'ALL') params.append('roleId', selectedRole);
      if (selectedStatus !== 'ALL') params.append('isActive', selectedStatus);
      return apiClient.get(`/users?${params.toString()}`);
    },
    refetchInterval: 5000,
  });

  // Create/Update Mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        return apiClient.patch(`/users/${editingUser.id}`, data);
      }
      return apiClient.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeFormModal();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menyimpan data anggota tim.');
    },
  });

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/toggle-status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      setIsResetOpen(false);
      setResetTargetUser(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Gagal menginstal ulang kata sandi.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteOpen(false);
      setDeleteTargetUser(null);
    },
  });

  const openFormModal = (user?: UserItem) => {
    setFormError('');
    if (user) {
      setEditingUser(user);
      // Determine initial roleId matched by id or name
      const matchedRole = availableRoles.find(
        (r) => r.id === user.roleId || r.name === user.role?.name
      );
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        roleId: matchedRole?.id || availableRoles[0]?.id || 'OWNER',
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        roleId: availableRoles[0]?.id || 'OWNER',
        isActive: true,
      });
    }
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setFormError('');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.roleId) {
      setFormError('Nama, email, dan peran wajib diisi.');
      return;
    }

    if (!editingUser && !formData.password) {
      setFormError('Kata sandi wajib diisi untuk pengguna baru.');
      return;
    }

    saveMutation.mutate(formData);
  };

  // Currently selected role object in form
  const activeSelectedRoleObj = availableRoles.find(
    (r) => r.id === formData.roleId || r.name === formData.roleId
  ) || availableRoles[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anggota Tim & Hak Akses"
        description="Kelola pengguna sistem, penugasan peran (Role), dan hak akses penuh staf outlet."
        icon={Users}
        actions={
          isOwner ? (
            <AppButton leftIcon={<Plus className="h-4 w-4" />} onClick={() => openFormModal()}>
              Tambah Tim
            </AppButton>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-500">
              <Lock className="h-3 w-3" /> Managed by Owner
            </span>
          )
        }
      />

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Cari nama atau email staf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-4 py-2 text-xs font-medium text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Peran</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-[var(--accent)] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-8 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="h-10 w-10 text-danger-500" />
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Gagal Memuat Data Pengguna</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{(error as any)?.message || 'Terjadi kesalahan koneksi.'}</p>
          </div>
          <AppButton size="sm" onClick={() => refetch()}>
            Coba Lagi
          </AppButton>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-[var(--muted-foreground)] opacity-50" />
          <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">Tidak ada pengguna ditemukan</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Coba ubah kata kunci pencarian atau filter peran Anda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--accent)]/30 text-left">
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Anggota Tim</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Peran & Tanggung Jawab</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Kontak</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                {isOwner && (
                  <th className="px-5 py-3.5 text-right font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Tindakan</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => {
                const isCurrentUser = currentUser?.id === u.id;
                const isTargetOwner = u.role.name === 'OWNER';
                const RoleIcon = roleIcons[u.role.name] || Shield;

                return (
                  <tr key={u.id} className="transition-colors hover:bg-[var(--accent)]/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10 font-bold text-xs text-brand-500 shrink-0">
                          {u.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[var(--foreground)]">{u.name}</p>
                            {isCurrentUser && (
                              <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-500">
                                Anda
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold",
                          roleBadgeColors[u.role.name] || 'bg-[var(--accent)] text-[var(--foreground)] border-[var(--border)]'
                        )}>
                          <RoleIcon className="h-3.5 w-3.5" />
                          {u.role.name}
                        </span>
                        {u.role.description && (
                          <p className="text-[11px] text-[var(--muted-foreground)] max-w-xs line-clamp-1">
                            {u.role.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--muted-foreground)]">
                      {u.phone ? (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3 w-3" /> {u.phone}
                        </span>
                      ) : (
                        <span className="italic opacity-60">Tidak ada telepon</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                          u.isActive
                            ? "bg-success-500/10 text-success-500 border-success-500/20"
                            : "bg-danger-500/10 text-danger-500 border-danger-500/20"
                        )}
                      >
                        {u.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User */}
                          <button
                            onClick={() => openFormModal(u)}
                            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-brand-500 transition-colors cursor-pointer"
                            title="Edit Peran & Informasi Staf"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => toggleMutation.mutate(u.id)}
                            disabled={isCurrentUser || (isTargetOwner && u.isActive)}
                            className={cn(
                              "rounded-lg p-1.5 transition-colors cursor-pointer",
                              u.isActive
                                ? "text-success-500 hover:bg-danger-500/10 hover:text-danger-500"
                                : "text-[var(--muted-foreground)] hover:bg-success-500/10 hover:text-success-500",
                              (isCurrentUser || (isTargetOwner && u.isActive)) && "opacity-40 cursor-not-allowed"
                            )}
                            title={u.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                          >
                            <Power className="h-4 w-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPassword('');
                              setIsResetOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-warning-500 transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <Key className="h-4 w-4" />
                          </button>

                          {/* Delete Member */}
                          <button
                            onClick={() => {
                              setDeleteTargetUser(u);
                              setIsDeleteOpen(true);
                            }}
                            disabled={isCurrentUser || isTargetOwner}
                            className={cn(
                              "rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-danger-500/10 hover:text-danger-500 transition-colors cursor-pointer",
                              (isCurrentUser || isTargetOwner) && "opacity-40 cursor-not-allowed"
                            )}
                            title="Hapus Anggota Tim"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Flow Explanation Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
          <Info className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">Panduan Alur Peran & Hirarki Hak Akses Sistem</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {defaultFallbackRoles.map((role) => {
            const Icon = roleIcons[role.name] || Shield;
            return (
              <div key={role.name} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    roleBadgeColors[role.name]
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                    {role.name}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {role.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {editingUser ? 'Edit Anggota Tim & Peran' : 'Tambah Anggota Tim Baru'}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {editingUser ? 'Perbarui profil dan ubah penugasan peran staf.' : 'Buat kredensial login baru untuk staf outlet.'}
                </p>
              </div>
              <button onClick={closeFormModal} className="rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-danger-500/20 bg-danger-500/10 p-3 text-xs font-semibold text-danger-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Email Log In *</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: budi@teraslmbur.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  {editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Pilihan Peran (Role) *</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full rounded-lg border border-brand-500/40 bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Interactive Role Description Card inside Modal */}
              {activeSelectedRoleObj && (
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3.5 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-brand-500 flex items-center gap-1.5">
                      Peran Terpilih: {activeSelectedRoleObj.name}
                    </h4>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                      {activeSelectedRoleObj.description || 'Memiliki hak akses fungsional sesuai standar sistem.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-[var(--foreground)] cursor-pointer">
                  Akun Langsung Aktif saat Dibuat
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <AppButton type="button" variant="outline" onClick={closeFormModal}>
                  Batal
                </AppButton>
                <AppButton type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-warning-500" />
                <h3 className="text-base font-bold text-[var(--foreground)]">Reset Kata Sandi</h3>
              </div>
              <button onClick={() => setIsResetOpen(false)} className="rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              Masukkan kata sandi baru untuk akun <strong className="text-[var(--foreground)]">{resetTargetUser.name}</strong> ({resetTargetUser.email}).
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Kata Sandi Baru *</label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <AppButton variant="outline" onClick={() => setIsResetOpen(false)}>
                Batal
              </AppButton>
              <AppButton
                disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
                onClick={() =>
                  resetPasswordMutation.mutate({
                    id: resetTargetUser.id,
                    newPassword,
                  })
                }
              >
                {resetPasswordMutation.isPending ? 'Memproses...' : 'Reset Sandi'}
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-danger-500/30 bg-[var(--card)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-danger-500">
              <div className="p-2 rounded-xl bg-danger-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Konfirmasi Hapus Pengguna</h3>
            </div>

            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong className="text-[var(--foreground)]">{deleteTargetUser.name}</strong> ({deleteTargetUser.email}) secara permanen? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <AppButton variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Batal
              </AppButton>
              <AppButton
                className="bg-danger-500 hover:bg-danger-600 text-white"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTargetUser.id)}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

