/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Scale, Plus, Edit2, Trash2, AlertTriangle, Info, Calculator, Copy, RefreshCw, PackageCheck } from 'lucide-react';
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

interface IngredientTranslation {
  locale: string;
  name: string;
  description: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
}

interface Ingredient {
  id: string;
  sku: string | null;
  minimumStock: string;
  reorderLevel: string;
  idealStock: string;
  conversionRatio: string;
  supplierReference: string | null;
  costPerUnit: string;
  isActive: boolean;
  notes: string | null;
  translations: IngredientTranslation[];
  inventoryUnitId: string;
  inventoryUnit: Unit;
  purchaseUnitId: string | null;
  purchaseUnit: Unit | null;
}

type IngredientFormValues = {
  sku?: string;
  supplierReference?: string;
  inventoryUnitId: string;
  purchaseUnitId?: string;
  minimumStock: number;
  reorderLevel: number;
  idealStock: number;
  conversionRatio: number;
  purchaseCost: number;
  isActive: boolean;
  name: string;
  description?: string;
};

export default function IngredientsPage() {
  const t = useTranslations('ingredients');
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

  const isEditable = hasPermission('inventory.manage');

  // URL state synchronization parameters
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const filterActive = searchParams.get('isActive') || 'all';

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

  // Page, PageSize, Sort, Active Filter handler pushes
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

  const setFilterActive = (active: string) => {
    const params = new URLSearchParams(window.location.search);
    if (active !== 'all') {
      params.set('isActive', active);
    } else {
      params.delete('isActive');
    }
    params.set('page', '1');
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
  const ingredientFormSchema = React.useMemo(() => {
    return z.object({
      sku: z.string().optional(),
      supplierReference: z.string().optional(),
      inventoryUnitId: z.string().min(1, tVal('required')),
      purchaseUnitId: z.string().optional(),
      minimumStock: z.coerce.number().nonnegative().default(0),
      reorderLevel: z.coerce.number().nonnegative().default(0),
      idealStock: z.coerce.number().nonnegative().default(0),
      conversionRatio: z.coerce.number().positive(tVal('numeric') || 'Must be a positive number').default(1),
      purchaseCost: z.coerce.number().nonnegative().default(0),
      isActive: z.boolean().default(true),
      name: z.string().min(1, tVal('required')),
      description: z.string().optional(),
    });
  }, [tVal]);

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<Ingredient | null>(null);

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
    onConfirm: () => {},
    type: 'warning',
  });

  // Query ingredients
  const { data, isLoading, error } = useQuery({
    queryKey: ['ingredients', { search, page, pageSize, sortBy, sortOrder, filterActive }],
    queryFn: () => {
      let url = `/ingredients?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (filterActive !== 'all') {
        url += `&isActive=${filterActive === 'active'}`;
      }
      return apiClient.get<{ items: Ingredient[]; total: number }>(url);
    },
  });

  // Query units list for binding select options
  const { data: unitsData } = useQuery({
    queryKey: ['units-list'],
    queryFn: () => apiClient.get<{ items: Unit[] }>('/units?pageSize=100'),
  });

  const ingredients = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const units = unitsData?.items || [];

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: {
      sku: '',
      supplierReference: '',
      inventoryUnitId: '',
      purchaseUnitId: '',
      minimumStock: 0,
      reorderLevel: 0,
      idealStock: 0,
      conversionRatio: 1.0,
      purchaseCost: 0,
      isActive: true,
      name: '',
      description: '',
    },
  });

  // Quick Unit creation modal state
  const [isQuickUnitOpen, setIsQuickUnitOpen] = React.useState(false);
  const [quickUnitTarget, setQuickUnitTarget] = React.useState<'inventory' | 'purchase'>('inventory');
  const [quickUnitName, setQuickUnitName] = React.useState('');
  const [quickUnitAbbr, setQuickUnitAbbr] = React.useState('');
  const [quickUnitType, setQuickUnitType] = React.useState<'WEIGHT' | 'VOLUME' | 'COUNT' | 'PACK'>('WEIGHT');

  const createQuickUnitMutation = useMutation({
    mutationFn: (newUnit: { name: string; abbreviation: string; type: 'WEIGHT' | 'VOLUME' | 'COUNT' | 'PACK' }) =>
      apiClient.post<Unit>('/units', newUnit),
    onSuccess: (data) => {
      toastApp.success('create', `Unit "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: ['units-list'] });
      if (quickUnitTarget === 'inventory') {
        setValue('inventoryUnitId', data.id);
      } else {
        setValue('purchaseUnitId', data.id);
      }
      setIsQuickUnitOpen(false);
      setQuickUnitName('');
      setQuickUnitAbbr('');
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Unit');
    },
  });

  // Refill Modal state
  const [isRefillOpen, setIsRefillOpen] = React.useState(false);
  const [refillIngredient, setRefillIngredient] = React.useState<Ingredient | null>(null);
  const [refillMode, setRefillMode] = React.useState<'PURCHASE' | 'INVENTORY'>('PURCHASE');
  const [refillQty, setRefillQty] = React.useState<number>(1);
  const [newPurchasePrice, setNewPurchasePrice] = React.useState<string>('');
  const [refillNotes, setRefillNotes] = React.useState<string>('');

  const refillMutation = useMutation({
    mutationFn: async () => {
      if (!refillIngredient) return;

      const ratio = parseFloat(refillIngredient.conversionRatio) || 1;
      const addedInventoryQty = refillMode === 'PURCHASE' ? refillQty * ratio : refillQty;

      // If new purchase price provided, update ingredient purchase cost & costPerUnit
      if (newPurchasePrice && parseFloat(newPurchasePrice) > 0) {
        const parsedNewPrice = parseFloat(newPurchasePrice);
        const newCostPerUnit = ratio > 0 ? parsedNewPrice / ratio : 0;
        await apiClient.put(`/ingredients/${refillIngredient.id}`, {
          costPerUnit: newCostPerUnit,
        });
      }

      // Record stock refill adjustment (IN)
      return apiClient.post(`/ingredients/${refillIngredient.id}/adjust`, {
        quantity: addedInventoryQty,
        type: 'IN',
        notes: refillNotes || `Refill stok (+${refillQty} ${refillMode === 'PURCHASE' && refillIngredient.purchaseUnit ? refillIngredient.purchaseUnit.abbreviation : refillIngredient.inventoryUnit.abbreviation})`,
      });
    },
    onSuccess: () => {
      if (refillIngredient) {
        const displayName = translateEntity(refillIngredient, locale).displayName;
        const ratio = parseFloat(refillIngredient.conversionRatio) || 1;
        const addedInventoryQty = refillMode === 'PURCHASE' ? refillQty * ratio : refillQty;
        toastApp.rawSuccess(t('refillSuccess', { name: displayName, added: addedInventoryQty, unit: refillIngredient.inventoryUnit.abbreviation }));
      }
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients-inventory'] });
      setIsRefillOpen(false);
      setRefillIngredient(null);
    },
    onError: () => {
      toastApp.error('save', t('refillTitle') || 'Refill Stock');
    },
  });

  const handleOpenRefillModal = (ing: Ingredient) => {
    setRefillIngredient(ing);
    setRefillMode(ing.purchaseUnit ? 'PURCHASE' : 'INVENTORY');
    setRefillQty(1);
    const currentPurchaseCost = parseFloat(ing.costPerUnit) * parseFloat(ing.conversionRatio);
    setNewPurchasePrice(currentPurchaseCost > 0 ? currentPurchaseCost.toFixed(2) : '');
    setRefillNotes('');
    setIsRefillOpen(true);
  };

  // Watch fields for live cost/conversion calculations preview
  const watchInventoryUnitId = watch('inventoryUnitId');
  const watchPurchaseUnitId = watch('purchaseUnitId');
  const watchConversionRatio = watch('conversionRatio') || 1;
  const watchPurchaseCost = watch('purchaseCost') || 0;

  // Resolve Unit Abbreviations for Preview
  const selectedInventoryUnit = units.find((u) => u.id === watchInventoryUnitId);
  const selectedPurchaseUnit = units.find((u) => u.id === watchPurchaseUnitId);

  // Compute live calculations
  const calculatedCostPerInventory = React.useMemo(() => {
    const cost = parseFloat(watchPurchaseCost.toString()) || 0;
    const ratio = parseFloat(watchConversionRatio.toString()) || 1;
    return ratio > 0 ? (cost / ratio).toFixed(4) : '0.0000';
  }, [watchPurchaseCost, watchConversionRatio]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post<Ingredient>('/ingredients', payload),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('create', `Ingredient "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Ingredient');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiClient.put<Ingredient>(`/ingredients/${id}`, payload),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('update', `Ingredient "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setHighlightedId(data.id);
      handleCloseDrawer();
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Ingredient');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => apiClient.delete(`/ingredients/${id}`),
    onSuccess: (data, variables) => {
      toastApp.success('delete', `Ingredient "${variables.name}"`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
    onError: (err: any, variables) => {
      toastApp.error('delete', variables.name);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<Ingredient>(`/ingredients/${id}/duplicate`, {}),
    onSuccess: (data) => {
      const displayName = translateEntity(data, locale).displayName;
      toastApp.success('duplicate', `Ingredient "${displayName}"`);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setHighlightedId(data.id);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Ingredient');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return promisePool(ids, (id) => apiClient.delete(`/ingredients/${id}`), 3);
    },
    onSuccess: (results) => {
      if (results.failed > 0) {
        toastApp.warning(`Deleted ${results.success} ingredients. ${results.failed} deletions failed.`);
      } else {
        toastApp.success('delete', `${results.success} ingredients`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
    onError: () => {
      toastApp.error('delete');
    },
  });

  const handleOpenCreateDrawer = () => {
    setEditingIngredient(null);
    setActiveTab('details');
    reset({
      sku: '',
      supplierReference: '',
      inventoryUnitId: units[0]?.id || '',
      purchaseUnitId: '',
      minimumStock: 0,
      reorderLevel: 0,
      idealStock: 0,
      conversionRatio: 1.0,
      purchaseCost: 0,
      isActive: true,
      name: '',
      description: '',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setActiveTab('details');
    const activeName = ing.translations.find((t) => t.locale === locale)?.name || ing.translations[0]?.name || '';
    const activeDesc = ing.translations.find((t) => t.locale === locale)?.description || ing.translations[0]?.description || '';

    const originalPurchaseCost = parseFloat(ing.costPerUnit) * parseFloat(ing.conversionRatio);

    reset({
      sku: ing.sku || '',
      supplierReference: ing.supplierReference || '',
      inventoryUnitId: ing.inventoryUnitId,
      purchaseUnitId: ing.purchaseUnitId || '',
      minimumStock: parseFloat(ing.minimumStock),
      reorderLevel: parseFloat(ing.reorderLevel),
      idealStock: parseFloat(ing.idealStock),
      conversionRatio: parseFloat(ing.conversionRatio),
      purchaseCost: parseFloat(originalPurchaseCost.toFixed(2)),
      isActive: ing.isActive,
      name: activeName,
      description: activeDesc,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingIngredient(null);
  };

  const onSubmit = (values: IngredientFormValues) => {
    const costPerUnit = values.conversionRatio > 0 ? (values.purchaseCost / values.conversionRatio) : 0;

    const payload = {
      sku: values.sku || undefined,
      supplierReference: values.supplierReference || null,
      inventoryUnitId: values.inventoryUnitId,
      purchaseUnitId: values.purchaseUnitId || null,
      minimumStock: values.minimumStock,
      reorderLevel: values.reorderLevel,
      idealStock: values.idealStock,
      conversionRatio: values.conversionRatio,
      costPerUnit,
      isActive: values.isActive,
      notes: locale === 'en' ? values.description : (editingIngredient?.translations.find(t => t.locale === 'en')?.description || values.description || null),
      translations: editingIngredient
        ? [
            {
              locale: 'en',
              name: locale === 'en' ? values.name : (editingIngredient.translations.find((t) => t.locale === 'en')?.name || values.name),
              description: locale === 'en' ? values.description : (editingIngredient.translations.find((t) => t.locale === 'en')?.description || null),
            },
            {
              locale: 'id',
              name: locale === 'id' ? values.name : (editingIngredient.translations.find((t) => t.locale === 'id')?.name || values.name),
              description: locale === 'id' ? values.description : (editingIngredient.translations.find((t) => t.locale === 'id')?.description || null),
            },
          ]
        : [
            { locale: 'en', name: values.name, description: values.description || null },
            { locale: 'id', name: values.name, description: values.description || null },
          ],
    };

    if (editingIngredient) {
      updateMutation.mutate({ id: editingIngredient.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Ingredient',
      description: `Are you sure you want to permanently delete the raw ingredient "${name}"? This action cannot be undone.`,
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
  const columns: ColumnDef<Ingredient>[] = [
    {
      header: t('fields.name'),
      render: (ing) => {
        const translated = translateEntity(ing, locale);
        return (
          <div>
            <p className="font-semibold text-[var(--foreground)]">{translated.displayName}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{ing.sku || 'No SKU'}</p>
          </div>
        );
      },
      sortable: true,
      accessorKey: 'sku',
      csvValue: (ing) => translateEntity(ing, locale).displayName,
    },

    {
      header: t('fields.inventoryUnit'),
      render: (ing) => ing.inventoryUnit.abbreviation,
      csvValue: (ing) => ing.inventoryUnit.abbreviation,
    },
    {
      header: t('fields.purchaseUnit'),
      render: (ing) => ing.purchaseUnit?.abbreviation || '—',
      csvValue: (ing) => ing.purchaseUnit?.abbreviation || '—',
    },
    {
      header: t('fields.conversionRatio'),
      render: (ing) => {
        if (!ing.purchaseUnit) return '—';
        return `1 ${ing.purchaseUnit.abbreviation} = ${parseFloat(ing.conversionRatio).toLocaleString()} ${ing.inventoryUnit.abbreviation}`;
      },
      csvValue: (ing) => {
        if (!ing.purchaseUnit) return '—';
        return `1 ${ing.purchaseUnit.abbreviation} = ${ing.conversionRatio} ${ing.inventoryUnit.abbreviation}`;
      },
    },
    {
      header: t('fields.costPerUnit'),
      render: (ing) => (
        <span className="font-mono text-xs text-[var(--foreground)] font-semibold">
          {parseFloat(ing.costPerUnit).toFixed(4)} EGP / {ing.inventoryUnit.abbreviation}
        </span>
      ),
      sortable: true,
      accessorKey: 'costPerUnit',
      csvValue: (ing) => `${parseFloat(ing.costPerUnit).toFixed(4)} EGP / ${ing.inventoryUnit.abbreviation}`,
    },
    {
      header: t('fields.minimumStock'),
      render: (ing) => `${parseFloat(ing.minimumStock).toLocaleString()} ${ing.inventoryUnit.abbreviation}`,
      csvValue: (ing) => `${parseFloat(ing.minimumStock)} ${ing.inventoryUnit.abbreviation}`,
    },
    {
      header: t('fields.isActive'),
      render: (ing) => (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
            ing.isActive ? 'bg-success-500/15 text-success-500' : 'bg-danger-500/15 text-danger-500'
          )}
        >
          {ing.isActive
            ? (tCommon('active') || 'Active')
            : (tCommon('inactive') || 'Inactive')}
        </span>
      ),
      csvValue: (ing) => ing.isActive ? 'Active' : 'Inactive',
    },
    ...(isEditable
      ? [
          {
            header: tCommon('actions') || 'Actions',
            render: (ing: Ingredient) => {
              const displayName = translateEntity(ing, locale).displayName;
              return (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-brand-500 hover:text-brand-400 hover:bg-brand-500/10"
                    title={t('refill') || 'Refill Stok'}
                    onClick={() => handleOpenRefillModal(ing)}
                    disabled={deleteMutation.isPending || duplicateMutation.isPending || refillMutation.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title={tCommon('actions.edit') || 'Ubah'}
                    onClick={() => handleOpenEditDrawer(ing)}
                    disabled={deleteMutation.isPending || duplicateMutation.isPending || refillMutation.isPending}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title={tCommon('actions.duplicate') || 'Duplikat'}
                    onClick={() => duplicateMutation.mutate(ing.id)}
                    disabled={deleteMutation.isPending || duplicateMutation.isPending || refillMutation.isPending}
                  >
                    <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-danger-500 hover:text-danger-400"
                    title={tCommon('actions.delete') || 'Hapus'}
                    onClick={() => handleDelete(ing.id, displayName)}
                    disabled={deleteMutation.isPending || duplicateMutation.isPending || refillMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AppButton>
                </div>
              );
            },
            className: 'w-36 text-right',
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
            {error.message || 'Error loading ingredients. Make sure the API server is online.'}
          </p>
        </div>
      ) : (
        <DataTable<Ingredient>
          data={ingredients}
          columns={columns}
          isLoading={isLoading}
          storageKey="ingredients"
          exportFilename="ingredients"
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
                  title: 'Delete Ingredients',
                  description: `Are you sure you want to permanently delete ${ids.length} selected ingredients? This action cannot be undone.`,
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
          filters={
            <div className="flex items-center gap-3">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="flex h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              >
                <option value="all">{t('fields.allStatuses') || 'All Statuses'}</option>
                <option value="active">{t('fields.activeOnly') || 'Active Only'}</option>
                <option value="inactive">{t('fields.inactiveOnly') || 'Inactive Only'}</option>
              </select>
            </div>
          }
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

      {/* drawer create / edit */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingIngredient ? t('edit') : t('add')}
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
        {editingIngredient && (
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
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Section: General */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] border-l-2 border-brand-500 pl-2">
                {t('sections.general')}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="name">
                  {t('fields.name')} *
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder={t('placeholders.name')}
                  {...register('name')}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="description">
                  {t('fields.notes') || 'Internal Notes'}
                </label>
                <textarea
                  id="description"
                  rows={2}
                  placeholder={t('placeholders.notes')}
                  {...register('description')}
                  className="mt-1 flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                />
                <div className="grid grid-cols-1">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="sku">
                      {t('fields.sku')}
                    </label>
                    <input
                      id="sku"
                      type="text"
                      placeholder={t('placeholders.sku')}
                      {...register('sku')}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Units & Conversions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] border-l-2 border-brand-500 pl-2">
                {t('sections.units')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="inventoryUnitId">
                      {t('fields.inventoryUnit')} *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickUnitTarget('inventory');
                        setIsQuickUnitOpen(true);
                      }}
                      className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> {t('addUnit') || 'Unit Baru'}
                    </button>
                  </div>
                  <select
                    id="inventoryUnitId"
                    {...register('inventoryUnitId')}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                  >
                    <option value="">{tCommon('table.selectUnit') || 'Select Unit'}</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                  {errors.inventoryUnitId && (
                    <p className="mt-1 text-xs text-danger-500">{errors.inventoryUnitId.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="purchaseUnitId">
                      {t('fields.purchaseUnit')} ({tCommon('optional') || 'Optional'})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickUnitTarget('purchase');
                        setIsQuickUnitOpen(true);
                      }}
                      className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> {t('addUnit') || 'Unit Baru'}
                    </button>
                  </div>
                  <select
                    id="purchaseUnitId"
                    {...register('purchaseUnitId')}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">{t('placeholders.sameUnit') || 'Same as Inventory Unit'}</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {watchPurchaseUnitId && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="conversionRatio">
                      {t('fields.conversionRatio')}
                    </label>
                    <input
                      id="conversionRatio"
                      type="number"
                      step="any"
                      placeholder={t('placeholders.conversionRatio')}
                      {...register('conversionRatio')}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                    />
                    {errors.conversionRatio && (
                      <p className="mt-1 text-xs text-danger-500">{errors.conversionRatio.message}</p>
                    )}
                  </div>

                  {/* Type Mismatch Warning Box */}
                  {selectedInventoryUnit && selectedPurchaseUnit && selectedInventoryUnit.type !== selectedPurchaseUnit.type && (
                    <div className="rounded-lg bg-warning-500/10 p-3 border border-warning-500/20 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-warning-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-warning-400 leading-relaxed">
                        Catatan: Tipe Satuan Stok (<strong>{selectedInventoryUnit.type}</strong>) berbeda dimensi dengan Satuan Pembelian (<strong>{selectedPurchaseUnit.type}</strong>). Pastikan rasio konversi mengacu pada densitas/bobot bahan baku.
                      </p>
                    </div>
                  )}

                  {/* Conversion Preview Box */}
                  {selectedInventoryUnit && selectedPurchaseUnit && (
                    <div className="rounded-lg bg-[var(--accent)] p-3 border border-[var(--border)] flex items-center gap-3">
                      <Info className="h-4 w-4 text-brand-500" />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t('fields.conversionPreview')}: <span className="font-bold text-[var(--foreground)]">1 {selectedPurchaseUnit.abbreviation}</span> ={' '}
                        <span className="font-bold text-[var(--foreground)]">
                          {parseFloat(watchConversionRatio.toString()).toLocaleString()} {selectedInventoryUnit.abbreviation}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section: Costs */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] border-l-2 border-brand-500 pl-2">
                {t('sections.cost')}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="purchaseCost">
                  {watchPurchaseUnitId && selectedPurchaseUnit
                    ? `${t('fields.purchaseCost')} (EGP / ${selectedPurchaseUnit.abbreviation})`
                    : `${t('fields.purchaseCost')} (EGP / Satuan Pembelian)`}
                </label>
                <input
                  id="purchaseCost"
                  type="number"
                  step="any"
                  placeholder={t('placeholders.purchaseCost')}
                  {...register('purchaseCost')}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                />
              </div>

              {/* Live calculated cost per inventory unit box */}
              {selectedInventoryUnit && (
                <div className="rounded-lg bg-brand-500/5 p-3 border border-brand-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-brand-500" />
                    <span className="text-xs text-[var(--muted-foreground)]">{t('fields.costPerUnit')}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                    {calculatedCostPerInventory} EGP / {selectedInventoryUnit.abbreviation}
                  </span>
                </div>
              )}
            </div>

            {/* Section: Inventory Alert Rules */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] border-l-2 border-brand-500 pl-2">
                {t('sections.inventory')}
              </h3>

              <div className="grid grid-cols-1">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="minimumStock">
                    {t('fields.minimumStock')}
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="minimumStock"
                      type="number"
                      placeholder={t('placeholders.minimumStock')}
                      {...register('minimumStock')}
                      onFocus={(e) => e.target.select()}
                      className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1"
                    />
                    {selectedInventoryUnit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded border border-[var(--border)]">
                        {selectedInventoryUnit.abbreviation}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                    {t('minimumStockHint', { unit: selectedInventoryUnit ? `${selectedInventoryUnit.name} (${selectedInventoryUnit.abbreviation})` : 'Unit' })}
                  </p>
                </div>
              </div>
            </div>
          </form>
        ) : (
          editingIngredient && <AuditTimeline resource="Ingredient" resourceId={editingIngredient.id} />
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

      {/* Quick Add Unit Modal */}
      {isQuickUnitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Scale className="h-4 w-4 text-brand-500" />
                Tambah Satuan Pengukuran Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickUnitOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">Nama Satuan *</label>
                <input
                  type="text"
                  placeholder="mis. Kilogram / Liter"
                  value={quickUnitName}
                  onChange={(e) => setQuickUnitName(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">Singkatan *</label>
                <input
                  type="text"
                  placeholder="mis. kg / ml"
                  value={quickUnitAbbr}
                  onChange={(e) => setQuickUnitAbbr(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">Tipe Satuan *</label>
                <select
                  value={quickUnitType}
                  onChange={(e) => setQuickUnitType(e.target.value as any)}
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                >
                  <option value="WEIGHT">Berat (Weight)</option>
                  <option value="VOLUME">Volume (Volume)</option>
                  <option value="COUNT">Jumlah / Pcs (Count)</option>
                  <option value="PACK">Kemasan / Box (Pack)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setIsQuickUnitOpen(false)}
              >
                {tCommon('buttons.cancel') || 'Batal'}
              </AppButton>
              <AppButton
                size="sm"
                isLoading={createQuickUnitMutation.isPending}
                disabled={!quickUnitName.trim() || !quickUnitAbbr.trim()}
                onClick={() => {
                  createQuickUnitMutation.mutate({
                    name: quickUnitName.trim(),
                    abbreviation: quickUnitAbbr.trim(),
                    type: quickUnitType,
                  });
                }}
              >
                Simpan & Pilih
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Refill Stock Modal */}
      {isRefillOpen && refillIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-brand-500" />
                {t('refillTitle') || 'Isi Ulang / Refill Stok Bahan Baku'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRefillOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-[var(--accent)]/30 p-3 border border-[var(--border)] text-xs space-y-1">
              <p className="font-bold text-[var(--foreground)] text-sm">
                {translateEntity(refillIngredient, locale).displayName}
              </p>
              <p className="text-[var(--muted-foreground)] font-mono">SKU: {refillIngredient.sku || '-'}</p>
              <p className="text-[var(--muted-foreground)]">
                Stok Fisik Saat Ini: <strong className="text-[var(--foreground)] font-bold">{refillIngredient.inventoryUnit ? `${refillIngredient.inventoryUnit.abbreviation}` : ''}</strong>
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {refillIngredient.purchaseUnit && (
                <div>
                  <label className="block font-semibold text-[var(--foreground)] mb-1">
                    {t('refillUnitMode') || 'Satuan Pengisian'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefillMode('PURCHASE')}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
                        refillMode === 'PURCHASE'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                      )}
                    >
                      Satuan Pembelian ({refillIngredient.purchaseUnit.abbreviation})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefillMode('INVENTORY')}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
                        refillMode === 'INVENTORY'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                      )}
                    >
                      Satuan Stok ({refillIngredient.inventoryUnit.abbreviation})
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">
                  {t('refillQuantity') || 'Jumlah Refill Diterima'} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={refillQty}
                    onChange={(e) => setRefillQty(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded border border-[var(--border)]">
                    {refillMode === 'PURCHASE' && refillIngredient.purchaseUnit
                      ? refillIngredient.purchaseUnit.abbreviation
                      : refillIngredient.inventoryUnit.abbreviation}
                  </span>
                </div>
                {refillMode === 'PURCHASE' && refillIngredient.purchaseUnit && (
                  <p className="mt-1 text-[11px] text-brand-500 font-medium">
                    Stok Fisik Bertambah: +{(refillQty * (parseFloat(refillIngredient.conversionRatio) || 1)).toLocaleString()} {refillIngredient.inventoryUnit.abbreviation} (1 {refillIngredient.purchaseUnit.abbreviation} = {refillIngredient.conversionRatio} {refillIngredient.inventoryUnit.abbreviation})
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">
                  {t('newPurchaseCost') || 'Harga Beli Baru per Satuan Pembelian (EGP)'}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Opsional - Kosongkan jika harga tidak berubah"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  {t('costUpdateHint')}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[var(--foreground)] mb-1">
                  Catatan Refill / No. Faktur (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="mis. Invoice #INV-8921 dari Supplier"
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setIsRefillOpen(false)}
              >
                {tCommon('buttons.cancel') || 'Batal'}
              </AppButton>
              <AppButton
                size="sm"
                isLoading={refillMutation.isPending}
                disabled={refillQty <= 0}
                onClick={() => refillMutation.mutate()}
                leftIcon={<PackageCheck className="h-4 w-4" />}
              >
                Konfirmasi Refill
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
