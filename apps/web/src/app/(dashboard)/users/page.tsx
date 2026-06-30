import type { Metadata } from 'next';
import { Users, Plus, Shield } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Users' };

const dummyUsers = [
  { name: 'Owner Account', email: 'owner@teraslmbur.com', role: 'OWNER', status: 'Active', lastLogin: '2 min ago' },
  { name: 'Ahmad Cashier', email: 'ahmad@teraslmbur.com', role: 'CASHIER', status: 'Active', lastLogin: '15 min ago' },
  { name: 'Budi Kitchen', email: 'budi@teraslmbur.com', role: 'KITCHEN', status: 'Active', lastLogin: '1 hour ago' },
  { name: 'Sarah Manager', email: 'sarah@teraslmbur.com', role: 'MANAGER', status: 'Inactive', lastLogin: '3 days ago' },
];

const roleBadgeColors: Record<string, string> = {
  OWNER: 'bg-brand-500/10 text-brand-500',
  MANAGER: 'bg-info-500/10 text-info-500',
  CASHIER: 'bg-success-500/10 text-success-500',
  KITCHEN: 'bg-warning-500/10 text-warning-500',
  WAITER: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage team members and their access permissions."
        icon={Users}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add User
          </button>
        }
      />
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">User</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Role</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {dummyUsers.map((user) => (
              <tr key={user.email} className="transition-colors hover:bg-[var(--accent)]/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500">
                      {user.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleBadgeColors[user.role]}`}>
                    <Shield className="h-3 w-3" />
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${user.status === 'Active' ? 'bg-success-500/10 text-success-500' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-[var(--muted-foreground)]">{user.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
