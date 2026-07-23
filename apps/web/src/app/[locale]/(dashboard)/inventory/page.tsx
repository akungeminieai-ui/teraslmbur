/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Warehouse, AlertTriangle, ArrowDownUp, Search, X, Loader2, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { AppButton } from '@teras-lmbur/ui';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { FormDrawer } from '@/components/shared/drawer';
import { useAppToast } from '@/hooks/use-app-toast';
import { cn } from '@/lib/utils';

interface Ingredient {
  id: string;
  sku: string;
  isActive: boolean;
  minimumStock: string;
  costPerUnit: string;
  currentStock: number;
  todayUsage: number;
  inventoryUnit: {
    id: string;
    name: string;
    abbreviation: string;
  };
  translations: {
    locale: string;
    name: string;
  }[];
}

type AdjustFormValues = {
  quantity: number;
  type: 'IN' | 'OUT' | 'SET';
  notes: string;
};

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const tVal = useTranslations('validation');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toastApp = useAppToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParam = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = React.useState(searchParam);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [selectedIngredient, setSelectedIngredient] = React.useState<Ingredient | null>(null);

  // Zod Validation Schema
  const adjustFormSchema = React.useMemo(() => {
    return z.object({
      quantity: z.coerce.number().positive(tVal('conversionRatio') || 'Must be a positive number'),
      type: z.enum(['IN', 'OUT', 'SET']),
      notes: z.string().optional().default(''),
    });
  }, [tVal]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: {
      quantity: 1,
      type: 'IN',
      notes: '',
    },
  });

  // Sync search input state with URL search param
  React.useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Debounce search input and update URL query params
  React.useEffect(() => {
    if (searchInput === searchParam) return;
    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchInput) {
        params.set('search', searchInput);
      } else {
        params.delete('search');
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, searchParam, pathname, router]);

  // Query ingredients list
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ingredients-inventory', { search: searchParam }],
    queryFn: () =>
      apiClient.get<{ items: Ingredient[]; total: number }>(
        `/ingredients?search=${encodeURIComponent(searchParam)}&pageSize=100`
      ),
  });

  const ingredients = data?.items || [];

  // Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustFormValues }) =>
      apiClient.post(`/ingredients/${id}/adjust`, payload),
    onSuccess: () => {
      toastApp.success('update', selectedIngredient?.translations.find((t) => t.locale === locale)?.name || 'Ingredient');
      queryClient.invalidateQueries({ queryKey: ['ingredients-inventory'] });
      handleCloseDrawer();
    },
    onError: () => {
      toastApp.error('save', selectedIngredient?.translations.find((t) => t.locale === locale)?.name || 'Ingredient');
    },
  });

  const handleOpenDrawer = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    reset({
      quantity: 1,
      type: 'IN',
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedIngredient(null);
  };

  const onSubmit = (values: AdjustFormValues) => {
    if (!selectedIngredient) return;
    adjustMutation.mutate({ id: selectedIngredient.id, payload: values });
  };

  const getStatus = (item: Ingredient) => {
    const stock = item.currentStock;
    const min = parseFloat(item.minimumStock);
    if (stock === 0) return 'critical';
    if (stock <= min) return 'warning';
    return 'ok';
  };

  const statusLabel: Record<string, string> = {
    critical: t('status.critical') || 'Critical Stock',
    warning: t('status.warning') || 'Low Stock',
    ok: t('status.ok') || 'Stock Healthy',
  };

  const statusColor: Record<string, string> = {
    critical: 'bg-danger-500/10 text-danger-500 border-danger-500/20',
    warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const statusIndicator: Record<string, string> = {
    critical: 'bg-danger-500',
    warning: 'bg-warning-500',
    ok: 'bg-emerald-500',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title') || 'Inventory stock ledger'}
        description={t('description') || 'Track stock levels, manage ingredients, and monitor low-stock alerts.'}
        icon={Warehouse}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Interactive Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder={tCommon('searchPlaceholder') || 'Search stock...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full sm:w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        }
      />

      {error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger-500 shrink-0" />
            <p className="text-sm text-danger-500 font-medium">
              {error instanceof Error ? error.message : 'Error loading inventory levels.'}
            </p>
          </div>
          <AppButton
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="border-danger-500/30 text-danger-500 hover:bg-danger-500/10 self-start sm:self-auto shrink-0"
          >
            Retry Connection
          </AppButton>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-[var(--muted-foreground)]">{tCommon('loading') || 'Loading inventory...'}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">{tCommon('summary.totalItems') || 'Total Items'}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{ingredients.length}</p>
            </div>
            <div className="rounded-xl border border-danger-500/20 bg-[var(--card)] p-5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-danger-500" />
                <p className="text-xs font-medium text-danger-500">{t('status.critical') || 'Critical Stock'}</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-danger-500">
                {ingredients.filter((i) => getStatus(i) === 'critical').length}
              </p>
            </div>
            <div className="rounded-xl border border-warning-500/20 bg-[var(--card)] p-5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
                <p className="text-xs font-medium text-warning-500">{t('status.warning') || 'Low Stock'}</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-warning-500">
                {ingredients.filter((i) => getStatus(i) === 'warning').length}
              </p>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            {ingredients.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Warehouse className="h-10 w-10 text-[var(--muted-foreground)] mb-3 opacity-60" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{tCommon('noResults') || 'No items found'}</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Try refining your search keyword.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left bg-[var(--accent)]/5">
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">{t('fields.ingredient') || 'Ingredient'}</th>
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">{t('fields.sku') || 'SKU'}</th>
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">{t('stockLevel') || 'Current Stock'}</th>
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">{t('minStock') || 'Min Stock'}</th>
                      <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">{t('fields.todayUsage') || "Today's Usage"}</th>
                      <th className="px-5 py-3 text-right font-medium text-[var(--muted-foreground)]">{t('fields.cost') || 'Unit Cost'}</th>
                      <th className="px-5 py-3 text-right font-medium text-[var(--muted-foreground)]">{tCommon('actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ingredients.map((item) => {
                      const name = item.translations.find((tr) => tr.locale === locale)?.name || item.translations[0]?.name || '';
                      const status = getStatus(item);
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-[var(--accent)]/30">
                          <td className="px-5 py-3">
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                              statusColor[status]
                            )}>
                              <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', statusIndicator[status])} />
                              {statusLabel[status]}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-semibold text-[var(--foreground)]">{name}</td>
                          <td className="px-5 py-3 text-xs font-mono text-[var(--muted-foreground)]">{item.sku}</td>
                          <td className="px-5 py-3 text-[var(--foreground)] font-semibold">
                            {item.currentStock} <span className="text-xs text-[var(--muted-foreground)] font-normal">{item.inventoryUnit.abbreviation}</span>
                          </td>
                          <td className="px-5 py-3 text-[var(--muted-foreground)]">
                            {item.minimumStock} <span className="text-xs">{item.inventoryUnit.abbreviation}</span>
                          </td>
                          <td className="px-5 py-3 text-danger-500 font-mono">
                            {item.todayUsage > 0 ? `-${item.todayUsage}` : '0'} <span className="text-xs text-[var(--muted-foreground)] font-normal">{item.inventoryUnit.abbreviation}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-[var(--foreground)] font-mono">
                            {parseFloat(item.costPerUnit).toFixed(2)} EGP
                          </td>
                          <td className="px-5 py-3 text-right">
                            <AppButton
                              size="sm"
                              variant="outline"
                              leftIcon={<ArrowDownUp className="h-3.5 w-3.5" />}
                              onClick={() => handleOpenDrawer(item)}
                            >
                              {t('adjustStock') || 'Adjust Stock'}
                            </AppButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Manual Stock Adjustment Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={t('adjustTitle') || 'Manual Stock Adjustment'}
        isDirty={isDirty}
        footer={
          <div className="flex items-center gap-2">
            <AppButton variant="outline" size="sm" onClick={handleCloseDrawer}>
              {tCommon('buttons.cancel') || 'Cancel'}
            </AppButton>
            <AppButton
              size="sm"
              onClick={handleSubmit(onSubmit)}
              isLoading={adjustMutation.isPending}
            >
              {tCommon('buttons.save') || 'Save'}
            </AppButton>
          </div>
        }
      >
        {selectedIngredient && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg bg-[var(--accent)]/15 border border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
              <Info className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  {selectedIngredient.translations.find((t) => t.locale === locale)?.name || 'Ingredient'}
                </p>
                <p className="mt-1 font-mono">SKU: {selectedIngredient.sku}</p>
                <p className="mt-1">
                  {t('stockLevel') || 'Current Stock'}: <strong className="text-[var(--foreground)]">{selectedIngredient.currentStock} {selectedIngredient.inventoryUnit.abbreviation}</strong>
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="type">
                  {t('fields.type') || 'Adjustment Type'} *
                </label>
                <select
                  id="type"
                  {...register('type')}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="IN">{t('types.IN') || 'Add Stock (Refill)'}</option>
                  <option value="OUT">{t('types.OUT') || 'Reduce Stock (Waste/Loss)'}</option>
                  <option value="SET">{t('types.SET') || 'Set Manual Stock (Current Count)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="quantity">
                  {t('fields.quantity') || 'Quantity'} *
                </label>
                <div className="relative mt-1">
                  <input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder={t('placeholders.quantity') || 'e.g. 5.00'}
                    {...register('quantity')}
                    onFocus={(e) => e.target.select()}
                    className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded border border-[var(--border)]">
                    {selectedIngredient.inventoryUnit.abbreviation}
                  </span>
                </div>
                {errors.quantity && (
                  <p className="mt-1 text-xs text-danger-500">{errors.quantity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="notes">
                  {t('fields.notes') || 'Notes'}
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder={t('placeholders.notes') || 'Specify reason...'}
                  {...register('notes')}
                  className="mt-1 flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </form>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
