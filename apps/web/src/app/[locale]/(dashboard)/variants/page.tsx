/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tags, Plus, Edit2, Trash2, Copy, AlertTriangle, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { FormDrawer } from '@/components/shared/drawer';
import { AppButton } from '@teras-lmbur/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { useTranslations, useLocale } from 'next-intl';
import { useAppToast } from '@/hooks/use-app-toast';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { promisePool } from '@/lib/promise-pool';
import { AuditTimeline } from '@/components/shared/audit-timeline';
import { cn } from '@/lib/utils';

interface VariantOption {
  id: string;
  groupId: string;
  displayOrder: number;
  translations: { locale: string; name: string }[];
}

interface VariantGroup {
  id: string;
  displayOrder: number;
  isActive: boolean;
  translations: { locale: string; name: string }[];
  options: VariantOption[];
}

type LocalOption = {
  id?: string;
  displayOrder: number;
  name: string;
};

type VariantFormValues = {
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export default function VariantsPage() {
  const t = useTranslations('variants');
  const tCommon = useTranslations('common');
  const tVal = useTranslations('validation');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const toastApp = useAppToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditable = hasPermission('variants.update') || hasPermission('variants.create');

  // URL state synchronization parameters
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const sortBy = searchParams.get('sortBy') || 'displayOrder';
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
  const variantFormSchema = React.useMemo(() => {
    return z.object({
      name: z.string().min(1, tVal('required')),
      displayOrder: z.coerce.number().int().default(0),
      isActive: z.boolean().default(true),
    });
  }, [tVal]);

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<VariantGroup | null>(null);
  const [localOptions, setLocalOptions] = React.useState<LocalOption[]>([]);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);

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

  // Fetch list of variant groups
  const { data, isLoading, error } = useQuery({
    queryKey: ['variants', { search, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      apiClient.get<{ items: VariantGroup[]; total: number }>(
        `/variants?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      ),
  });

  const variantGroups = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty: isFormFieldsDirty },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: '',
      displayOrder: 0,
      isActive: true,
    },
  });

  // Determine if options have also been modified to check unsaved changes protection
  const isOptionsDirty = React.useMemo(() => {
    if (!editingGroup) {
      return localOptions.length > 1 || localOptions[0]?.name !== '';
    }
    if (localOptions.length !== editingGroup.options.length) return true;
    for (let i = 0; i < localOptions.length; i++) {
      const loc = localOptions[i];
      const orig = editingGroup.options[i];
      if (!orig) return true;
      const origName = orig.translations.find((t) => t.locale === locale)?.name || orig.translations[0]?.name || '';
      if (loc.id !== orig.id || loc.name !== origName || loc.displayOrder !== orig.displayOrder) {
        return true;
      }
    }
    return false;
  }, [localOptions, editingGroup, locale]);

  const isDrawerDirty = isFormFieldsDirty || isOptionsDirty;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newGroup: any) => apiClient.post<VariantGroup>('/variants', newGroup),
    onSuccess: (data) => {
      const name = data.translations.find((t) => t.locale === locale)?.name || 'Variant Group';
      toastApp.success('create', `Variant Group "${name}"`);
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.put<VariantGroup>(`/variants/${id}`, updates),
    onSuccess: (data) => {
      const name = data.translations.find((t) => t.locale === locale)?.name || 'Variant Group';
      toastApp.success('update', `Variant Group "${name}"`);
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
    },
    onError: () => {
      toastApp.error('save', t('entityName'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => apiClient.delete(`/variants/${id}`),
    onSuccess: (data, variables) => {
      toastApp.success('delete', `Variant Group "${variables.name}"`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['variants'] });
    },
    onError: (err: any, variables) => {
      toastApp.error('delete', variables.name);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<VariantGroup>(`/variants/${id}/duplicate`, {}),
    onSuccess: (data) => {
      const name = data.translations.find((t) => t.locale === locale)?.name || 'Variant Group';
      toastApp.success('duplicate', `Variant Group "${name}"`);
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      setHighlightedId(data.id);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName'));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return promisePool(ids, (id) => apiClient.delete(`/variants/${id}`), 3);
    },
    onSuccess: (results) => {
      if (results.failed > 0) {
        toastApp.warning(`Deleted ${results.success} variant groups. ${results.failed} deletions failed.`);
      } else {
        toastApp.success('delete', `${results.success} variant groups`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['variants'] });
    },
    onError: () => {
      toastApp.error('delete');
    },
  });

  const handleOpenCreateDrawer = () => {
    setEditingGroup(null);
    setActiveTab('details');
    reset({
      name: '',
      displayOrder: 0,
      isActive: true,
    });
    setLocalOptions([{ displayOrder: 0, name: '' }]);
    setOptionsError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (group: VariantGroup) => {
    setEditingGroup(group);
    setActiveTab('details');
    reset({
      name: group.translations.find((t) => t.locale === locale)?.name || group.translations[0]?.name || '',
      displayOrder: group.displayOrder,
      isActive: group.isActive,
    });

    const optionsList: LocalOption[] = group.options.map((opt) => ({
      id: opt.id,
      displayOrder: opt.displayOrder,
      name: opt.translations.find((t) => t.locale === locale)?.name || opt.translations[0]?.name || '',
    }));

    setLocalOptions(optionsList);
    setOptionsError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingGroup(null);
  };

  // Options CRUD handlers
  const handleAddOption = () => {
    setLocalOptions((prev) => [
      ...prev,
      { displayOrder: prev.length, name: '' },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setLocalOptions((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((opt, i) => ({ ...opt, displayOrder: i }));
    });
  };

  const handleOptionChange = (index: number, field: 'name', value: string) => {
    setLocalOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  // Reorder options
  const moveOption = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localOptions.length) return;

    const updated = [...localOptions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setLocalOptions(updated.map((opt, i) => ({ ...opt, displayOrder: i })));
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const reordered = [...localOptions];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    setLocalOptions(reordered.map((opt, i) => ({ ...opt, displayOrder: i })));
  };

  const onSubmit = (values: VariantFormValues) => {
    if (localOptions.length === 0) {
      setOptionsError(t('validation.optionsCount') || 'At least one variant option is required.');
      return;
    }

    const hasEmptyOption = localOptions.some((opt) => !opt.name.trim());
    if (hasEmptyOption) {
      setOptionsError(t('validation.optionName') || 'Option name cannot be empty.');
      return;
    }

    setOptionsError(null);

    const payload = {
      displayOrder: values.displayOrder,
      isActive: values.isActive,
      translations: [
        { locale: 'en', name: values.name },
        { locale: 'id', name: values.name },
      ],
      options: localOptions.map((opt) => ({
        id: opt.id,
        displayOrder: opt.displayOrder,
        translations: [
          { locale: 'en', name: opt.name },
          { locale: 'id', name: opt.name },
        ],
      })),
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Variant Group',
      description: `Are you sure you want to permanently delete the variant group "${name}"? This action cannot be undone.`,
      type: 'delete',
      onConfirm: () => deleteMutation.mutate({ id, name }),
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

  // Columns definition
  const columns: ColumnDef<VariantGroup>[] = [
    {
      header: t('fields.name'),
      accessorKey: 'name',
      sortable: false,
      render: (item: VariantGroup) => {
        const tr = item.translations.find((t) => t.locale === locale) || item.translations[0];
        return <span className="font-semibold text-[var(--foreground)]">{tr?.name || 'Unnamed'}</span>;
      },
    },
    {
      header: t('fields.optionsSummary'),
      accessorKey: 'options',
      render: (item: VariantGroup) => {
        const summary = item.options
          .map((opt) => opt.translations.find((t) => t.locale === locale)?.name || opt.translations[0]?.name)
          .join(', ');
        return <span className="text-xs text-[var(--muted-foreground)] truncate max-w-md block">{summary || '-'}</span>;
      },
      csvValue: (item: VariantGroup) => {
        return item.options
          .map((opt) => opt.translations.find((t) => t.locale === locale)?.name || opt.translations[0]?.name)
          .join(', ');
      },
    },
    {
      header: t('fields.displayOrder'),
      accessorKey: 'displayOrder',
      sortable: true,
      render: (item: VariantGroup) => <span className="font-mono text-xs">{item.displayOrder}</span>,
    },
    {
      header: t('fields.isActive'),
      accessorKey: 'isActive',
      sortable: true,
      render: (item: VariantGroup) => (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-all ${item.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}
        >
          {item.isActive ? tCommon('active') : tCommon('inactive')}
        </span>
      ),
      csvValue: (item: VariantGroup) => item.isActive ? 'Active' : 'Inactive',
    },
    ...(isEditable
      ? [
        {
          header: tCommon('actions') || 'Actions',
          render: (item: VariantGroup) => {
            const tr = item.translations.find((t) => t.locale === locale) || item.translations[0];
            const name = tr?.name || 'Variant Group';
            return (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleOpenEditDrawer(item)}
                  disabled={deleteMutation.isPending || duplicateMutation.isPending}
                >
                  <Edit2 className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => duplicateMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending || duplicateMutation.isPending}
                >
                  <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-danger-500 hover:text-danger-400"
                  onClick={() => handleDelete(item.id, name)}
                  disabled={deleteMutation.isPending || duplicateMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </AppButton>
              </div>
            );
          },
          className: 'w-28 text-right',
        },
      ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} icon={Tags} />

      {error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-danger-500" />
          <p className="text-sm text-danger-500">
            {error.message || 'Error loading variant templates. Check API connection.'}
          </p>
        </div>
      ) : (
        <DataTable<VariantGroup>
          data={variantGroups}
          columns={columns}
          isLoading={isLoading}
          storageKey="variants"
          exportFilename="variants"
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
              label: tCommon('buttons.deleteSelected'),
              variant: 'danger',
              icon: Trash2,
              disabled: deleteMutation.isPending || bulkDeleteMutation.isPending,
              onClick: (ids) => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Delete Variant Groups',
                  description: `Are you sure you want to permanently delete ${ids.length} selected variant groups? This action cannot be undone.`,
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
            icon: Tags,
            action: isEditable && (
              <AppButton size="sm" onClick={handleOpenCreateDrawer} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {t('add')}
              </AppButton>
            ),
          }}
          onRowClick={handleOpenEditDrawer}
        />
      )}

      {/* Form Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingGroup ? t('edit') : t('add')}
        isDirty={isDrawerDirty}
        footer={
          activeTab === 'details' && (
            <div className="flex items-center gap-2">
              <AppButton variant="outline" size="sm" onClick={handleCloseDrawer}>
                {tCommon('buttons.cancel')}
              </AppButton>
              <AppButton
                size="sm"
                onClick={handleSubmit(onSubmit)}
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {tCommon('buttons.save')}
              </AppButton>
            </div>
          )
        }
      >
        {/* Drawer Tabs Header */}
        {editingGroup && (
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
              {t('details') || 'Details'}
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
              {t('history') || 'History'}
            </button>
          </div>
        )}

        {activeTab === 'details' ? (
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Group Name */}
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
              {errors.name && <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
            </div>

            {/* displayOrder and isActive */}
            <div className="grid grid-cols-2 gap-4 items-center border-t border-[var(--border)]/40 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="displayOrder">
                  {t('fields.displayOrder')}
                </label>
                <input
                  id="displayOrder"
                  type="number"
                  placeholder={t('placeholders.displayOrder')}
                  {...register('displayOrder')}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--foreground)] mb-2">{t('fields.isActive')}</span>
                <label className="inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" {...register('isActive')} />
                  <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                </label>
              </div>
            </div>

            {/* Options Manager */}
            <div className="border-t border-[var(--border)]/40 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)]">{t('fields.options')} *</span>
                <AppButton size="sm" variant="outline" type="button" onClick={handleAddOption} leftIcon={<Plus className="h-3 w-3" />}>
                  {tCommon('buttons.add')}
                </AppButton>
              </div>

              {optionsError && <p className="text-xs text-danger-500">{optionsError}</p>}

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {localOptions.map((opt, index) => (
                  <div
                    key={index}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[var(--accent)]/10 border border-[var(--border)] group/opt drag-transition"
                  >
                    {/* Grip handler */}
                    <div className="cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] hover:text-white shrink-0">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Localized inputs */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder={t('placeholders.optionName')}
                        value={opt.name}
                        onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-0"
                      />
                    </div>

                    {/* Sorting Buttons & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveOption(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOption(index, 'down')}
                        disabled={index === localOptions.length - 1}
                        className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="p-1 rounded text-danger-500 hover:bg-danger-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        ) : (
          editingGroup && <AuditTimeline resource="VariantGroup" resourceId={editingGroup.id} />
        )}
      </FormDrawer>

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
