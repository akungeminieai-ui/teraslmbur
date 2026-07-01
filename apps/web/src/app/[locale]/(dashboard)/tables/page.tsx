import type { Metadata } from 'next';
import { Armchair, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Tables' };

const dummyTables = [
  { number: 1, name: 'Window 1', capacity: 2, status: 'AVAILABLE', section: 'Indoor' },
  { number: 2, name: 'Window 2', capacity: 4, status: 'OCCUPIED', section: 'Indoor' },
  { number: 3, name: 'Corner', capacity: 6, status: 'RESERVED', section: 'Indoor' },
  { number: 4, name: 'Center 1', capacity: 4, status: 'AVAILABLE', section: 'Indoor' },
  { number: 5, name: 'Center 2', capacity: 4, status: 'OCCUPIED', section: 'Indoor' },
  { number: 6, name: 'Patio A', capacity: 2, status: 'AVAILABLE', section: 'Outdoor' },
  { number: 7, name: 'Patio B', capacity: 4, status: 'MAINTENANCE', section: 'Outdoor' },
  { number: 8, name: 'Patio C', capacity: 6, status: 'AVAILABLE', section: 'Outdoor' },
];

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-success-500/20 border-success-500/30 text-success-500',
  OCCUPIED: 'bg-brand-500/20 border-brand-500/30 text-brand-500',
  RESERVED: 'bg-warning-500/20 border-warning-500/30 text-warning-500',
  MAINTENANCE: 'bg-danger-500/20 border-danger-500/30 text-danger-500',
};

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description="Manage your restaurant floor plan and table assignments."
        icon={Armchair}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add Table
          </button>
        }
      />

      {/* Table Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {dummyTables.map((table) => (
          <div
            key={table.number}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all hover:scale-[1.02] ${statusColors[table.status]}`}
          >
            <Armchair className="mb-2 h-8 w-8" />
            <span className="text-lg font-bold">{table.number}</span>
            <span className="text-xs opacity-80">{table.name}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
              {table.status.replace('_', ' ')}
            </span>
            <div className="mt-2 flex items-center gap-1 text-[10px] opacity-60">
              <span>{table.capacity} seats</span>
              <span>·</span>
              <span>{table.section}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
