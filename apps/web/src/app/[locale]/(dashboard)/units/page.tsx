/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Scale, Plus, Edit2, Trash2, AlertTriangle, Copy } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { FormDrawer } from '@/components/shared/drawer';
import { AppButton } from '@teras-lmbur/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useAppToast } from '@/hooks/use-app-toast';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { promisePool } from '@/lib/promise-pool';
import { AuditTimeline } from '@/components/shared/audit-timeline';
import { cn } from '@/lib/utils';

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: 'WEIGHT' | 'VOLUME' | 'COUNT' | 'PACK';
  _count?: {
    ingredients?: number;
    purchaseIngredients?: number;
    recipeItems?: number;
  };
}

type UnitFormValues = {
  name: string;
  abbreviation: string;
  type: 'WEIGHT' | 'VOLUME' | 'COUNT' | 'PACK';
};

export default function UnitsPage() {
  const t = useTranslations('units');
  const tCommon = useTranslations('common');
  const tVal = useTranslations('validation');
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const toastApp = useAppToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditable = hasPermission('inventory.manage');

  // URL state synchronization parameters
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

  const [searchInput, setSearchInput] = React.useState(search);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Drawer Tabs: 'details' or 'history'
  const [activeTab, setActiveTab] = React.useState<'details' | 'history'>('details');

  // Sync search input with URL search param
  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce search input and update URL
  React.useEffect(() => {
    if (searchInput === search) return;
    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchInput) {
        params.set('search', searchInput);
      } else {
        params.delete('search');
      }
      params.set('page', '1'); // Reset to page 1
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, search, pathname, router]);

  // Page, PageSize, Sort handler pushes
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const setPageSize = (newSize: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('pageSize', newSize.toString());
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSort = (field: string) => {
    const params = new URLSearchParams(window.location.search);
    const order = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    params.set('sortBy', field);
    params.set('sortOrder', order);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Row Highlight Fade timer
  React.useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => {
        setHighlightedId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  // Dynamic Zod Validation Schema
  const unitFormSchema = React.useMemo(() => {
    return z.object({
      name: z.string().min(1, tVal('required')),
      abbreviation: z.string().min(1, tVal('required')),
      type: z.enum(['WEIGHT', 'VOLUME', 'COUNT', 'PACK']),
    });
  }, [tVal]);

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<Unit | null>(null);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type?: 'delete' | 'warning' | 'success';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => { },
    type: 'warning',
  });

  // Fetch list of units
  const { data, isLoading, error } = useQuery({
    queryKey: ['units', { search, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      apiClient.get<{ items: Unit[]; total: number }>(
        `/units?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      ),
  });

  const units = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      type: 'WEIGHT',
    },
  });

  // Mutative requests
  const createMutation = useMutation({
    mutationFn: (newUnit: UnitFormValues) => apiClient.post<Unit>('/units', newUnit),
    onSuccess: (data) => {
      toastApp.success('create', `Unit "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Unit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UnitFormValues }) =>
      apiClient.put<Unit>(`/units/${id}`, updates),
    onSuccess: (data) => {
      toastApp.success('update', `Unit "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Unit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => apiClient.delete(`/units/${id}`),
    onSuccess: (data, variables) => {
      toastApp.success('delete', `Unit "${variables.name}"`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (err: any, variables) => {
      toastApp.error('delete', variables.name);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<Unit>(`/units/${id}/duplicate`, {}),
    onSuccess: (data) => {
      toastApp.success('duplicate', `Unit "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setHighlightedId(data.id);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Unit');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return promisePool(ids, (id) => apiClient.delete(`/units/${id}`), 3);
    },
    onSuccess: (results) => {
      if (results.failed > 0) {
        toastApp.warning(`Deleted ${results.success} units. ${results.failed} deletions failed.`);
      } else {
        toastApp.success('delete', `${results.success} units`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: () => {
      toastApp.error('delete');
    },
  });

  const handleOpenCreateDrawer = () => {
    setEditingUnit(null);
    setActiveTab('details');
    reset({
      name: '',
      abbreviation: '',
      type: 'WEIGHT',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (unit: Unit) => {
    setEditingUnit(unit);
    setActiveTab('details');
    reset({
      name: unit.name,
      abbreviation: unit.abbreviation,
      type: unit.type,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUnit(null);
  };

  const onSubmit = (values: UnitFormValues) => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, updates: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (unit: Unit) => {
    const totalUsage =
      (unit._count?.ingredients || 0) +
      (unit._count?.purchaseIngredients || 0) +
      (unit._count?.recipeItems || 0);

    const description = totalUsage > 0
      ? `${t('fields.inUseWarning', { count: totalUsage })} ${t('deleteConfirm')}`
      : `Are you sure you want to permanently delete the measurement unit "${unit.name}"? This action cannot be undone.`;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Unit',
      description,
      type: totalUsage > 0 ? 'warning' : 'delete',
      onConfirm: () => deleteMutation.mutate({ id: unit.id, name: unit.name }),
    });
  };

  // Keyboard shortcut configuration
  useKeyboardShortcuts({
    onNew: isDrawerOpen ? undefined : handleOpenCreateDrawer,
    onClose: isDrawerOpen ? handleCloseDrawer : undefined,
    onSave: isDrawerOpen ? () => handleSubmit(onSubmit)() : undefined,
    onSearch: () => {
      const searchInput = document.querySelector('.data-table-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
  });

  // Define Columns
  const columns: ColumnDef<Unit>[] = [
    {
      header: t('fields.name'),
      accessorKey: 'name',
      sortable: true,
    },
    {
      header: t('fields.abbreviation'),
      accessorKey: 'abbreviation',
      sortable: true,
    },
    {
      header: t('fields.type'),
      accessorKey: 'type',
      sortable: true,
      render: (unit) => (
        <span className="inline-flex items-center rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] border border-[var(--border)]">
          {t(`types.${unit.type}`)}
        </span>
      ),
      csvValue: (unit) => t(`types.${unit.type}`),
    },
    {
      header: t('fields.usage') || 'Usage',
      render: (unit) => {
        const count =
          (unit._count?.ingredients || 0) +
          (unit._count?.purchaseIngredients || 0) +
          (unit._count?.recipeItems || 0);
        return (
          <span className={cn(
            'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border',
            count > 0
              ? 'bg-brand-500/10 text-brand-500 border-brand-500/20'
              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
          )}>
            {t('fields.usedInItems', { count })}
          </span>
        );
      },
    },
    ...(isEditable
      ? [
        {
          header: tCommon('actions') || 'Actions',
          render: (unit: Unit) => (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <AppButton
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleOpenEditDrawer(unit)}
                disabled={deleteMutation.isPending || duplicateMutation.isPending}
              >
                <Edit2 className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => duplicateMutation.mutate(unit.id)}
                disabled={deleteMutation.isPending || duplicateMutation.isPending}
              >
                <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-danger-500 hover:text-danger-400"
                onClick={() => handleDelete(unit)}
                disabled={deleteMutation.isPending || duplicateMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </AppButton>
            </div>
          ),
          className: 'w-28 text-right',
        },
      ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Scale}
      />

      {error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-danger-500" />
          <p className="text-sm text-danger-500">
            {error.message || 'Error loading units. Please verify connection to the API.'}
          </p>
        </div>
      ) : (
        <DataTable<Unit>
          data={units}
          columns={columns}
          isLoading={isLoading}
          storageKey="units"
          exportFilename="units"
          highlightedId={highlightedId || undefined}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          primaryAction={
            isEditable && (
              <AppButton onClick={handleOpenCreateDrawer} leftIcon={<Plus className="h-4 w-4" />}>
                {t('add')}
              </AppButton>
            )
          }
          bulkActions={[
            {
              label: tCommon('buttons.deleteSelected') || 'Delete Selected',
              variant: 'danger',
              icon: Trash2,
              disabled: deleteMutation.isPending || bulkDeleteMutation.isPending,
              onClick: (ids) => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Delete Units',
                  description: `Are you sure you want to permanently delete ${ids.length} selected units? This action cannot be undone.`,
                  type: 'delete',
                  onConfirm: () => bulkDeleteMutation.mutate(ids),
                });
              },
            },
          ]}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: tCommon('searchPlaceholder'),
          }}
          pagination={{
            page,
            pageSize,
            total,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          sorting={{
            sortBy,
            sortOrder,
            onSort: handleSort,
          }}
          emptyState={{
            icon: Scale,
            action: isEditable && (
              <AppButton size="sm" onClick={handleOpenCreateDrawer} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {t('add')}
              </AppButton>
            ),
          }}
          onRowClick={handleOpenEditDrawer}
        />
      )}

      {/* Slide Drawer Form */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingUnit ? t('edit') : t('add')}
        isDirty={isDirty}
        footer={
          activeTab === 'details' && (
            <div className="flex items-center gap-2">
              <AppButton variant="outline" size="sm" onClick={handleCloseDrawer}>
                {tCommon('buttons.cancel') || 'Cancel'}
              </AppButton>
              <AppButton
                size="sm"
                onClick={handleSubmit(onSubmit)}
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {tCommon('buttons.save') || 'Save'}
              </AppButton>
            </div>
          )
        }
      >
        {/* Drawer Tabs Header */}
        {editingUnit && (
          <div className="flex border-b border-[var(--border)]/40 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                'px-4 py-2 border-b-2 transition-colors cursor-pointer',
                activeTab === 'details'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-white'
              )}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 border-b-2 transition-colors cursor-pointer',
                activeTab === 'history'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-white'
              )}
            >
              History
            </button>
          </div>
        )}

        {activeTab === 'details' ? (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="name">
                {t('fields.name')} *
              </label>
              <input
                id="name"
                type="text"
                placeholder={t('placeholders.name')}
                {...register('name')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="abbreviation">
                {t('fields.abbreviation')} *
              </label>
              <input
                id="abbreviation"
                type="text"
                placeholder={t('placeholders.abbreviation')}
                {...register('abbreviation')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {errors.abbreviation && (
                <p className="mt-1 text-xs text-danger-500">{errors.abbreviation.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="type">
                {t('fields.type')} *
              </label>
              <select
                id="type"
                {...register('type')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {['WEIGHT', 'VOLUME', 'COUNT', 'PACK'].map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-danger-500">{errors.type.message}</p>
              )}
            </div>
          </form>
        ) : (
          editingUnit && <AuditTimeline resource="Unit" resourceId={editingUnit.id} />
        )}
      </FormDrawer>

      {/* Styled Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        type={confirmDialog.type}
      />
    </div>
  );
}
