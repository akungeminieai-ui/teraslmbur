/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tags, Plus, Edit2, Trash2, AlertTriangle, Folder, Copy } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { FormDrawer } from '@/components/shared/drawer';
import { AppButton } from '@teras-lmbur/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { useTranslationService } from '@/services';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAppToast } from '@/hooks/use-app-toast';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { promisePool } from '@/lib/promise-pool';
import { AuditTimeline } from '@/components/shared/audit-timeline';

interface CategoryTranslation {
  locale: string;
  name: string;
}

interface Category {
  id: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  productCount?: number;
  translations: CategoryTranslation[];
}

type CategoryFormValues = {
  slug?: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  name: string;
};

export default function CategoriesPage() {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const tVal = useTranslations('validation');
  const locale = useLocale();
  const { translateEntity } = useTranslationService();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const toastApp = useAppToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isEditable = hasPermission('categories.create') || hasPermission('categories.update');
  const isDeletable = hasPermission('categories.delete');

  // URL state synchronization parameters
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const sortBy = searchParams.get('sortBy') || 'sortOrder';
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
  const categoryFormSchema = React.useMemo(() => {
    return z.object({
      slug: z.string().optional(),
      icon: z.string().nullable().optional(),
      sortOrder: z.coerce.number().int().default(0),
      isActive: z.boolean().default(true),
      parentId: z.string().nullable().optional(),
      name: z.string().min(1, tVal('required')),
    });
  }, [tVal]);

  // Form Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

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

  // Query categories
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories', { search, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      apiClient.get<{ items: Category[]; total: number }>(
        `/categories?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      ),
  });

  // Query root categories only (for parent selection dropdown list)
  const { data: rootCategoriesData } = useQuery({
    queryKey: ['root-categories'],
    queryFn: () => apiClient.get<{ items: Category[] }>('/categories?parentId=null&pageSize=100'),
  });

  const categories = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const rootCategories = rootCategoriesData?.items || [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      slug: '',
      icon: '',
      sortOrder: 0,
      isActive: true,
      parentId: null,
      name: '',
    },
  });

  // Dynamic Icon resolver
  const renderCategoryIcon = (iconName: string | null) => {
    if (!iconName) return <Folder className="h-4 w-4 text-brand-500" />;
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="h-4 w-4 text-brand-500" />;
    }
    return <Folder className="h-4 w-4 text-brand-500" />;
  };

  // Mutative requests
  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post<Category>('/categories', payload),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('create', `Category "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['root-categories'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiClient.put<Category>(`/categories/${id}`, payload),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('update', `Category "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['root-categories'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => apiClient.delete(`/categories/${id}`),
    onSuccess: (data, variables) => {
      toastApp.success('delete', `Category "${variables.name}"`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['root-categories'] });
    },
    onError: (err: any, variables) => {
      toastApp.error('delete', variables.name);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<Category>(`/categories/${id}/duplicate`, {}),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('duplicate', `Category "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['root-categories'] });
      setHighlightedId(data.id);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Category');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return promisePool(ids, (id) => apiClient.delete(`/categories/${id}`), 3);
    },
    onSuccess: (results) => {
      if (results.failed > 0) {
        toastApp.warning(`Deleted ${results.success} categories. ${results.failed} deletions failed.`);
      } else {
        toastApp.success('delete', `${results.success} categories`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['root-categories'] });
    },
    onError: () => {
      toastApp.error('delete');
    },
  });

  const handleOpenCreateDrawer = () => {
    setEditingCategory(null);
    setActiveTab('details');
    reset({
      slug: '',
      icon: '',
      sortOrder: 0,
      isActive: true,
      parentId: '',
      name: '',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (category: Category) => {
    setEditingCategory(category);
    setActiveTab('details');
    const activeName = category.translations.find((t) => t.locale === locale)?.name || category.translations[0]?.name || '';
    reset({
      slug: category.slug,
      icon: category.icon || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: category.parentId || '',
      name: activeName,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCategory(null);
  };

  const onSubmit = (values: CategoryFormValues) => {
    const payload = {
      slug: values.slug || undefined,
      icon: values.icon || null,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      parentId: values.parentId || null,
      translations: editingCategory
        ? [
          {
            locale: 'en',
            name: locale === 'en' ? values.name : (editingCategory.translations.find((t) => t.locale === 'en')?.name || values.name),
          },
          {
            locale: 'id',
            name: locale === 'id' ? values.name : (editingCategory.translations.find((t) => t.locale === 'id')?.name || values.name),
          },
        ]
        : [
          { locale: 'en', name: values.name },
          { locale: 'id', name: values.name },
        ],
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      description: `Are you sure you want to permanently delete the category "${name}"? This action cannot be undone.`,
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
  const columns: ColumnDef<Category>[] = [
    {
      header: 'Icon',
      render: (cat) => (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
          {renderCategoryIcon(cat.icon)}
        </div>
      ),
      className: 'w-16',
      csvValue: (cat) => cat.icon || 'Folder',
    },
    {
      header: t('fields.name'),
      render: (cat) => {
        const translated = translateEntity(cat, locale);
        return (
          <div>
            <p className="font-semibold text-[var(--foreground)]">{translated.displayName}</p>
            {cat.parentId && (
              <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--accent)] px-1.5 py-0.5 rounded border border-[var(--border)] font-bold">
                Sub-category
              </span>
            )}
          </div>
        );
      },
      sortable: true,
      accessorKey: 'sortOrder',
      csvValue: (cat) => translateEntity(cat, locale).displayName,
    },
    {
      header: t('fields.slug'),
      accessorKey: 'slug',
      sortable: true,
    },
    {
      header: t('fields.parentId'),
      render: (cat) => {
        if (!cat.parentId) return <span className="text-xs text-[var(--muted-foreground)]">—</span>;
        const parent = rootCategories.find((r) => r.id === cat.parentId);
        if (!parent) return <span className="text-xs text-[var(--muted-foreground)]">Root</span>;
        return <span className="text-xs text-[var(--muted-foreground)]">{translateEntity(parent, locale).displayName}</span>;
      },
      csvValue: (cat) => {
        if (!cat.parentId) return '—';
        const parent = rootCategories.find((r) => r.id === cat.parentId);
        return parent ? translateEntity(parent, locale).displayName : 'Root';
      },
    },
    {
      header: t('fields.sortOrder'),
      accessorKey: 'sortOrder',
      sortable: true,
    },
    {
      header: t('fields.isActive'),
      render: (cat) => (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
            cat.isActive ? 'bg-success-500/15 text-success-500' : 'bg-danger-500/15 text-danger-500'
          )}
        >
          {cat.isActive
            ? (tCommon('active') || 'Active')
            : (tCommon('inactive') || 'Inactive')}
        </span>
      ),
      sortable: true,
      accessorKey: 'isActive',
      csvValue: (cat) => cat.isActive ? 'Active' : 'Inactive',
    },
    ...(isEditable
      ? [
        {
          header: tCommon('actions') || 'Actions',
          render: (cat: Category) => {
            const displayName = translateEntity(cat, locale).displayName;
            return (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleOpenEditDrawer(cat)}
                  disabled={deleteMutation.isPending || duplicateMutation.isPending}
                >
                  <Edit2 className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => duplicateMutation.mutate(cat.id)}
                  disabled={deleteMutation.isPending || duplicateMutation.isPending}
                >
                  <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                </AppButton>
                {isDeletable && (
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-danger-500 hover:text-danger-400"
                    onClick={() => handleDelete(cat.id, displayName)}
                    disabled={deleteMutation.isPending || duplicateMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AppButton>
                )}
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
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Tags}
      />

      {error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-danger-500" />
          <p className="text-sm text-danger-500">
            {error.message || 'Error loading categories. Make sure API is running.'}
          </p>
        </div>
      ) : (
        <DataTable<Category>
          data={categories}
          columns={columns}
          isLoading={isLoading}
          storageKey="categories"
          exportFilename="categories"
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
                  title: 'Delete Categories',
                  description: `Are you sure you want to permanently delete ${ids.length} selected categories? This action cannot be undone.`,
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

      {/* drawer create / edit */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingCategory ? t('edit') : t('add')}
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
        {editingCategory && (
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
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="slug">
                {t('fields.slug')}
              </label>
              <input
                id="slug"
                type="text"
                placeholder={t('placeholders.slug')}
                {...register('slug')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="parentId">
                {t('fields.parentId')}
              </label>
              <select
                id="parentId"
                {...register('parentId')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{t('fields.rootCategory')}</option>
                {rootCategories
                  .filter((r) => r.id !== editingCategory?.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {translateEntity(r, locale).displayName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="icon">
                {t('fields.icon')}
              </label>
              <input
                id="icon"
                type="text"
                placeholder={t('placeholders.icon')}
                {...register('icon')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="sortOrder">
                {t('fields.sortOrder')}
              </label>
              <input
                id="sortOrder"
                type="number"
                placeholder={t('placeholders.sortOrder')}
                {...register('sortOrder')}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
              />
              <label className="text-xs font-semibold text-[var(--foreground)] cursor-pointer" htmlFor="isActive">
                {t('fields.isActive') === 'Status' ? 'Active Status' : t('fields.isActive')}
              </label>
            </div>
          </form>
        ) : (
          editingCategory && <AuditTimeline resource="Category" resourceId={editingCategory.id} />
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
