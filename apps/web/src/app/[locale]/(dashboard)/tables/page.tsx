'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Armchair, Loader2, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { FormDrawer } from '@/components/shared/drawer';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AppButton } from '@teras-lmbur/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TableData {
  id: string;
  number: number;
  name?: string | null;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED' | 'MAINTENANCE';
  section?: string | null;
}

const statusConfig: Record<string, { label: string; colors: string; dotColor: string }> = {
  AVAILABLE: {
    label: 'Available',
    colors: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer',
    dotColor: 'bg-emerald-500',
  },
  OCCUPIED: {
    label: 'Occupied',
    colors: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer',
    dotColor: 'bg-orange-500',
  },
  CLEANING: {
    label: 'Cleaning',
    colors: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer',
    dotColor: 'bg-amber-500 animate-pulse',
  },
  RESERVED: {
    label: 'Reserved',
    colors: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer',
    dotColor: 'bg-blue-500',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    colors: 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer',
    dotColor: 'bg-rose-500',
  },
};

const tableSchema = z.object({
  number: z.preprocess((val) => Number(val), z.number().min(1, 'Table number must be at least 1')),
  name: z.string().optional().nullable(),
  capacity: z.preprocess((val) => Number(val), z.number().min(1, 'Capacity must be at least 1')),
  section: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
});

type TableFormValues = z.infer<typeof tableSchema>;

export default function TablesPage() {
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const tCommon = useTranslations('common');

  // Drawer & Form states
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTable, setEditingTable] = React.useState<TableData | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      number: 1,
      name: '',
      capacity: 4,
      section: '',
      status: 'AVAILABLE',
    },
  });

  const { data: tables = [], isLoading } = useQuery<TableData[]>({
    queryKey: ['tables'],
    queryFn: () => apiClient.get('/tables'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: TableFormValues) => apiClient.post('/tables', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.rawSuccess('Table created successfully');
      handleCloseDrawer();
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to create table');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TableFormValues }) =>
      apiClient.put(`/tables/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.rawSuccess('Table updated successfully');
      handleCloseDrawer();
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to update table');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tableId: string) => apiClient.delete(`/tables/${tableId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.rawSuccess('Table deleted successfully');
      setIsConfirmDeleteOpen(false);
      handleCloseDrawer();
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to delete table');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (tableId: string) =>
      apiClient.patch(`/tables/${tableId}`, { status: 'AVAILABLE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.rawSuccess('Table released and marked as Available');
      handleCloseDrawer();
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to release table');
    },
  });

  const handleOpenAddDrawer = () => {
    setEditingTable(null);
    reset({
      number: tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1,
      name: '',
      capacity: 4,
      section: '',
      status: 'AVAILABLE',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (table: TableData) => {
    setEditingTable(table);
    reset({
      number: table.number,
      name: table.name || '',
      capacity: table.capacity,
      section: table.section || '',
      status: table.status,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingTable(null);
  };

  const onSubmit = (values: TableFormValues) => {
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDeleteConfirm = () => {
    if (editingTable) {
      deleteMutation.mutate(editingTable.id);
    }
  };

  // Counters
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const cleaningCount = tables.filter((t) => t.status === 'CLEANING').length;

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">Loading floor plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border border-[var(--border)] bg-[var(--card)] p-5 rounded-[20px] shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight leading-none">
              Table Management
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 font-medium">
              Monitor and manage restaurant floor plan.
            </p>
          </div>
        </div>

        {/* Status Counters & Add Action */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            Available: {availableCount}
          </span>
          <span className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">
            Occupied: {occupiedCount}
          </span>
          <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
            Cleaning: {cleaningCount}
          </span>
          <AppButton
            size="sm"
            onClick={handleOpenAddDrawer}
            className="cursor-pointer flex items-center gap-1.5"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Table
          </AppButton>
        </div>
      </div>

      {/* Hint for cleaning release */}
      {cleaningCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs font-medium text-amber-600">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
          Tables with &quot;Cleaning&quot; status can be marked as Available by tapping on them.
        </div>
      )}

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            No tables found. Create tables to configure floor layouts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-fade-in">
          {tables.map((table) => {
            const config = statusConfig[table.status] || statusConfig['AVAILABLE'];

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => handleOpenEditDrawer(table)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all text-center group',
                  config.colors,
                  'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                )}
              >
                {/* Status Dot */}
                <div className={cn('absolute top-3 right-3 h-2.5 w-2.5 rounded-full', config.dotColor)} />

                <Armchair className="mb-2 h-8 w-8 text-[var(--foreground)]/60 group-hover:scale-105 transition-transform" />

                <span className="text-lg font-bold text-[var(--foreground)]">
                  {table.number}
                </span>

                {table.name && (
                  <span className="text-[10px] text-[var(--muted-foreground)] font-medium mt-0.5 max-w-full truncate px-1">
                    {table.name}
                  </span>
                )}

                <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {config.label}
                </span>

                <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]/60 font-medium">
                  <span>{table.capacity} seats</span>
                  {table.section && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[50px]">{table.section}</span>
                    </>
                  )}
                </div>

                {/* Release action hint overlay for cleaning */}
                {table.status === 'CLEANING' && (
                  <span className="mt-2.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg uppercase tracking-wider animate-pulse">
                    Tap to Clean
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Slide Form Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingTable ? `Edit Table ${editingTable.number}` : 'Add Table'}
        isDirty={isDirty}
        footer={
          <div className="flex items-center justify-between w-full">
            {editingTable ? (
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="border-danger-500/20 text-danger-500 hover:bg-danger-500/10 cursor-pointer"
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete Table
              </AppButton>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <AppButton variant="outline" size="sm" onClick={handleCloseDrawer} className="cursor-pointer">
                {tCommon('buttons.cancel') || 'Cancel'}
              </AppButton>
              <AppButton
                size="sm"
                onClick={handleSubmit(onSubmit)}
                isLoading={createMutation.isPending || updateMutation.isPending}
                className="cursor-pointer"
              >
                {tCommon('buttons.save') || 'Save'}
              </AppButton>
            </div>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Table Number */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="number">
              Table Number *
            </label>
            <input
              id="number"
              type="number"
              min="1"
              placeholder="e.g. 12"
              {...register('number')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.number && (
              <p className="mt-1 text-[10px] text-danger-500 font-semibold">{errors.number.message}</p>
            )}
          </div>

          {/* Table Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="name">
              Table Name / Label (Optional)
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Window Side, VVIP Room"
              {...register('name')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="capacity">
              Table Capacity (Seats) *
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              placeholder="e.g. 4"
              {...register('capacity')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.capacity && (
              <p className="mt-1 text-[10px] text-danger-500 font-semibold">{errors.capacity.message}</p>
            )}
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="section">
              Section (Optional)
            </label>
            <input
              id="section"
              type="text"
              placeholder="e.g. Indoor, Outdoor, 2nd Floor"
              {...register('section')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Status (Only visible when editing) */}
          {editingTable && (
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="status">
                Table Status *
              </label>
              <select
                id="status"
                {...register('status')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="CLEANING">Cleaning</option>
                <option value="RESERVED">Reserved</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              {editingTable.status === 'CLEANING' && (
                <div className="mt-3">
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-500/20 text-amber-600 hover:bg-amber-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    onClick={() => releaseMutation.mutate(editingTable.id)}
                    isLoading={releaseMutation.isPending}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Mark as Clean & Available
                  </AppButton>
                </div>
              )}
            </div>
          )}
        </form>
      </FormDrawer>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Table"
        description={`Are you sure you want to delete Table ${editingTable?.number}? This action cannot be undone.`}
        type="delete"
      />
    </div>
  );
}
