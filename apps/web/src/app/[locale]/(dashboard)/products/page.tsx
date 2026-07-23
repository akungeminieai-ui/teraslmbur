/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { Package, Plus, Edit2, Copy, Trash2, ArrowUpRight, Barcode, LayoutGrid, List, PlusCircle, Play, Pause, RefreshCw, Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { FormDrawer } from '@/components/shared/drawer';
import { AppButton } from '@teras-lmbur/ui';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { promisePool } from '@/lib/promise-pool';
import { AuditTimeline } from '@/components/shared/audit-timeline';
import { cn } from '@/lib/utils';

interface ProductTranslation {
  id?: string;
  locale: string;
  name: string;
  description: string | null;
}

interface Product {
  id: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: string;
  status: 'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  preparationTime: number;
  isFeatured: boolean;
  currentHpp: string;
  categoryId: string;
  createdAt: string;
  translations: ProductTranslation[];
  category: {
    id: string;
    translations: { locale: string; name: string }[];
  };
  stationAssignments?: { kitchenStationId: string }[];
  salesChannels?: { channel: string }[];
  availabilitySchedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
  nutrition?: {
    calories: number | null;
    protein: string | null;
    fat: string | null;
    sugar: string | null;
    allergens: string[];
  } | null;
  tags?: { tag: { name: string } }[];
  attributes?: { name: string; value: string }[];
  media?: { mediaId: string; sortOrder: number; isPrimary: boolean; media: { fileUrl: string } }[];
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toastApp = useAppToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search & Filter state derived from searchParams URL
  const search = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('categoryId') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table');

  const [searchInput, setSearchInput] = React.useState(search);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Edit/Create states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [activeTab, setActiveTab] = React.useState('general');
  const [productMedia, setProductMedia] = React.useState<{ mediaId: string; sortOrder: number; isPrimary: boolean; media: { fileUrl: string } }[]>([]);
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  // Variant states
  const [productVariants, setProductVariants] = React.useState<{ optionId: string; priceAdjustment: number; sku: string; groupId: string; groupName: string; optionName: string }[]>([]);
  const [selectedVariantGroupId, setSelectedVariantGroupId] = React.useState('');
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = React.useState<string[]>([]);

  // Recipe states
  const [recipeItems, setRecipeItems] = React.useState<any[]>([]);
  const [recipeNotes, setRecipeNotes] = React.useState('');
  const [hasRecipe, setHasRecipe] = React.useState(false);
  const [recipeId, setRecipeId] = React.useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = React.useState('');

  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients-active'],
    queryFn: () => apiClient.get<{ items: any[] }>('/ingredients?isActive=true&pageSize=100'),
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient.get<{ items: any[] }>('/units?pageSize=100'),
  });

  const { data: variantGroupsData } = useQuery({
    queryKey: ['variant-groups'],
    queryFn: () => apiClient.get<{ items: any[] }>('/variants?pageSize=100&isActive=true'),
  });

  const { data: modifierGroupsData } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => apiClient.get<{ items: any[] }>('/modifiers?pageSize=100&isActive=true'),
  });

  const { data: activeRecipeData } = useQuery({
    queryKey: ['product-recipe', selectedProduct?.id],
    enabled: !!selectedProduct?.id && isFormOpen,
    queryFn: () => apiClient.get<any>(`/products/${selectedProduct?.id}/recipe`),
  });

  const saveRecipeMutation = useMutation({
    mutationFn: (data: any) => {
      if (recipeId) {
        return apiClient.put(`/recipes/${recipeId}`, data);
      } else {
        return apiClient.post(`/products/${selectedProduct!.id}/recipe`, data);
      }
    },
    onSuccess: () => {
      toastApp.success('update', t('recipe.title') || 'Recipe');
      queryClient.invalidateQueries({ queryKey: ['product-recipe', selectedProduct?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toastApp.error('save', t('recipe.title') || 'Recipe');
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: () => apiClient.delete(`/recipes/${recipeId}`),
    onSuccess: () => {
      toastApp.success('delete', t('recipe.title') || 'Recipe');
      queryClient.invalidateQueries({ queryKey: ['product-recipe', selectedProduct?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toastApp.error('delete', t('recipe.title') || 'Recipe');
    },
  });

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

  // Page, PageSize, Category, Status URL parameter modifiers
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

  const setCategoryFilter = (catId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (catId) {
      params.set('categoryId', catId);
    } else {
      params.delete('categoryId');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const setStatusFilter = (stat: string) => {
    const params = new URLSearchParams(window.location.search);
    if (stat) {
      params.set('status', stat);
    } else {
      params.delete('status');
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

  // Sync recipe local state with queried active recipe data
  React.useEffect(() => {
    if (activeRecipeData) {
      setHasRecipe(true);
      setRecipeId(activeRecipeData.id);
      setRecipeNotes(activeRecipeData.notes || '');
      setRecipeItems(
        activeRecipeData.items.map((item: any) => ({
          ingredientId: item.ingredientId,
          quantity: parseFloat(item.quantity) || 0,
          unitId: item.unitId || item.ingredient.inventoryUnitId,
          ingredientName: item.ingredient.translations.find((t: any) => t.locale === locale)?.name || item.ingredient.translations[0]?.name || '',
          costPerUnit: parseFloat(item.ingredient.costPerUnit) || 0,
          unitAbbreviation: item.unit?.abbreviation || item.ingredient.inventoryUnit.abbreviation,
          isActive: item.ingredient.isActive,
          ingredient: item.ingredient,
        }))
      );
    } else {
      setHasRecipe(false);
      setRecipeId(null);
      setRecipeNotes('');
      setRecipeItems([]);
    }
  }, [activeRecipeData, locale]);

  // Nested Price History timeline drawer state
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [historyProductId, setHistoryProductId] = React.useState<string | null>(null);
  const [historyPage, setHistoryPage] = React.useState(1);


  // Form Fields State (Single fields to avoid duplicate bilingual form layout clutter)
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [status, setStatus] = React.useState<'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'ARCHIVED'>('DRAFT');
  const [availabilityStatus, setAvailabilityStatus] = React.useState<'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'>('AVAILABLE');
  const [categoryId, setCategoryId] = React.useState('');
  const [sellingPrice, setSellingPrice] = React.useState('0');
  const [priceChangeReason, setPriceChangeReason] = React.useState('');
  const [prepTime, setPrepTime] = React.useState(15);
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [stations, setStations] = React.useState<string[]>([]);
  const [channels, setChannels] = React.useState<string[]>(['POS', 'QR_MENU']);
  const [nutrition, setNutrition] = React.useState({
    calories: '',
    protein: '',
    fat: '',
    sugar: '',
    allergens: [] as string[],
  });
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [attributes, setAttributes] = React.useState<{ name: string; value: string }[]>([]);
  const [newAttrName, setNewAttrName] = React.useState('');
  const [newAttrVal, setNewAttrVal] = React.useState('');

  const isRecipeDirty = React.useMemo(() => {
    if (activeTab !== 'recipe') return false;
    if (activeRecipeData) {
      const initialItems = activeRecipeData.items.map((item: any) => ({
        ingredientId: item.ingredientId,
        quantity: parseFloat(item.quantity) || 0,
        unitId: item.unitId || item.ingredient.inventoryUnitId,
      }));
      const currentItems = recipeItems.map((item: any) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitId: item.unitId,
      }));
      return (
        recipeNotes !== (activeRecipeData.notes || '') ||
        JSON.stringify(initialItems) !== JSON.stringify(currentItems)
      );
    } else {
      return recipeItems.length > 0 || recipeNotes !== '';
    }
  }, [activeTab, activeRecipeData, recipeItems, recipeNotes]);

  const isDirty = React.useMemo(() => {
    if (!isFormOpen) return false;
    if (activeTab === 'recipe') return isRecipeDirty;
    if (selectedProduct) {
      const activeName = selectedProduct.translations.find((t) => t.locale === locale)?.name || '';
      const activeDesc = selectedProduct.translations.find((t) => t.locale === locale)?.description || '';
      return (
        name !== activeName ||
        description !== activeDesc ||
        slug !== selectedProduct.slug ||
        sku !== (selectedProduct.sku || '') ||
        status !== selectedProduct.status ||
        availabilityStatus !== selectedProduct.availabilityStatus ||
        categoryId !== selectedProduct.categoryId ||
        parseFloat(sellingPrice) !== parseFloat(selectedProduct.sellingPrice) ||
        prepTime !== selectedProduct.preparationTime ||
        isFeatured !== selectedProduct.isFeatured
      );
    } else {
      return (
        name !== '' ||
        description !== '' ||
        slug !== '' ||
        sku !== '' ||
        status !== 'DRAFT' ||
        availabilityStatus !== 'AVAILABLE' ||
        categoryId !== '' ||
        sellingPrice !== '0' ||
        prepTime !== 15 ||
        isFeatured !== false
      );
    }
  }, [
    isFormOpen,
    selectedProduct,
    name,
    description,
    slug,
    sku,
    status,
    availabilityStatus,
    categoryId,
    sellingPrice,
    prepTime,
    isFeatured,
    locale,
    activeTab,
    isRecipeDirty,
  ]);

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

  // 1. Fetch Categories & Units & Kitchen Stations (Fallback gracefully)
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories?pageSize=100'),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, statusFilter, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);

      return apiClient.get<{ items: Product[]; total: number }>(`/products?${params.toString()}`);
    },
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['price-history', historyProductId, historyPage],
    enabled: !!historyProductId && isHistoryOpen,
    queryFn: () =>
      apiClient.get<{ items: any[]; total: number }>(
        `/products/${historyProductId}/price-history?page=${historyPage}&pageSize=5`
      ),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post<Product>('/products', data),
    onSuccess: async (data) => {
      if (recipeItems.length > 0) {
        const payload = {
          items: recipeItems.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitId: item.unitId,
            wastePercentage: 0,
            notes: '',
          })),
          notes: recipeNotes || null,
          isActive: true,
        };
        try {
          await apiClient.post(`/products/${data.id}/recipe`, payload);
          queryClient.invalidateQueries({ queryKey: ['product-recipe', data.id] });
        } catch (e) {
          console.error('Failed to save recipe for new product', e);
        }
      }
      const activeName = data.translations.find((t) => t.locale === locale)?.name || data.translations[0]?.name || '';
      toastApp.success('create', `Product "${activeName}"`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setHighlightedId(data.id);
      setIsFormOpen(false);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.put<Product>(`/products/${id}`, data),
    onSuccess: (data) => {
      const activeName = data.translations.find((t) => t.locale === locale)?.name || data.translations[0]?.name || '';
      toastApp.success('update', `Product "${activeName}"`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setHighlightedId(data.id);
      setIsFormOpen(false);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Product');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiClient.post<Product>(`/products/${id}/duplicate`),
    onSuccess: (data) => {
      const activeName = data.translations.find((t) => t.locale === locale)?.name || data.translations[0]?.name || '';
      toastApp.success('duplicate', `Product "${activeName}"`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setHighlightedId(data.id);
      setTimeout(() => {
        const el = document.getElementById(`row-${data.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    onError: () => {
      toastApp.error('save', t('entityName') || 'Product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => apiClient.delete(`/products/${id}`),
    onSuccess: (data, variables) => {
      toastApp.success('delete', `Product "${variables.name}"`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any, variables) => {
      toastApp.error('delete', variables.name);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return promisePool(ids, (id) => apiClient.delete(`/products/${id}`), 3);
    },
    onSuccess: (results) => {
      if (results.failed > 0) {
        toastApp.warning(`Deleted ${results.success} products. ${results.failed} deletions failed.`);
      } else {
        toastApp.success('delete', `${results.success} products`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toastApp.error('delete');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      apiClient.post('/products/bulk-status', { ids, status }),
    onSuccess: () => {
      toastApp.success('update', `${t('title') || 'Products'} Status`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toastApp.error('save');
    },
  });

  // Calculations
  const parsedPrice = parseFloat(sellingPrice) || 0;
  const parsedHpp = selectedProduct ? parseFloat(selectedProduct.currentHpp) || 0 : 0;
  const grossProfit = parsedPrice - parsedHpp;
  const grossMargin = parsedPrice > 0 ? (grossProfit / parsedPrice) * 100 : 0;

  const getUnitConversionFactor = (fromAbbr: string, toAbbr: string): number => {
    const from = (fromAbbr || '').toLowerCase().trim();
    const to = (toAbbr || '').toLowerCase().trim();
    if (from === to || !from || !to) return 1;

    // Weight conversions
    if (from === 'g' && to === 'kg') return 0.001;
    if (from === 'kg' && to === 'g') return 1000;
    if (from === 'mg' && to === 'g') return 0.001;
    if (from === 'g' && to === 'mg') return 1000;
    if (from === 'mg' && to === 'kg') return 0.000001;
    if (from === 'kg' && to === 'mg') return 1000000;

    // Volume conversions
    if (from === 'ml' && to === 'l') return 0.001;
    if (from === 'l' && to === 'ml') return 1000;
    if (from === 'cl' && to === 'l') return 0.01;
    if (from === 'l' && to === 'cl') return 100;

    return 1;
  };

  const getCompatibleUnits = (ingredient: any) => {
    if (!unitsData?.items) return [];
    const inventoryUnitType = ingredient?.inventoryUnit?.type;
    if (inventoryUnitType) {
      return unitsData.items.filter((u: any) => u.type === inventoryUnitType);
    }
    // Fallback: if type is missing, only return the default unit
    const defaultUnit = unitsData.items.find((u: any) => u.id === ingredient?.inventoryUnitId);
    return defaultUnit ? [defaultUnit] : [];
  };

  const liveHpp = recipeItems.reduce((sum, item) => {
    const factor = getUnitConversionFactor(item.unitAbbreviation, item.ingredient?.inventoryUnit?.abbreviation);
    return sum + (item.quantity * factor * item.costPerUnit);
  }, 0);
  const liveProfit = parsedPrice - liveHpp;
  const liveMargin = parsedPrice > 0 ? (liveProfit / parsedPrice) * 100 : 0;
  const liveFoodCost = parsedPrice > 0 ? (liveHpp / parsedPrice) * 100 : 0;

  // Open Form modal helpers
  const handleCreateOpen = () => {
    setSelectedProduct(null);
    setName('');
    setDescription('');
    setSlug('');
    setSku('');
    setStatus('DRAFT');
    setAvailabilityStatus('AVAILABLE');
    setCategoryId(categoriesData?.items?.[0]?.id || '');
    setSellingPrice('0');
    setPriceChangeReason('');
    setPrepTime(15);
    setIsFeatured(false);
    setStations([]);
    setChannels(['POS', 'QR_MENU']);
    setNutrition({ calories: '', protein: '', fat: '', sugar: '', allergens: [] });
    setTags([]);
    setAttributes([]);
    setProductMedia([]);
    setAiPrompt('');
    setProductVariants([]);
    setSelectedVariantGroupId('');
    setSelectedModifierGroupIds([]);
    setActiveTab('general');
    setIsFormOpen(true);
  };

  const handleEditOpen = (product: Product) => {
    setSelectedProduct(product);
    const activeTr = product.translations.find((tr) => tr.locale === locale) || product.translations[0];

    setName(activeTr?.name || '');
    setDescription(activeTr?.description || '');
    setSlug(product.slug);
    setSku(product.sku || '');
    setStatus(product.status);
    setAvailabilityStatus(product.availabilityStatus || 'AVAILABLE');
    setCategoryId(product.categoryId);
    setSellingPrice(product.sellingPrice);
    setPriceChangeReason('');
    setPrepTime(product.preparationTime);
    setIsFeatured(product.isFeatured);
    setStations(product.stationAssignments?.map((s) => s.kitchenStationId) || []);
    setChannels(product.salesChannels?.map((sc) => sc.channel) || []);
    setNutrition({
      calories: product.nutrition?.calories?.toString() || '',
      protein: product.nutrition?.protein || '',
      fat: product.nutrition?.fat || '',
      sugar: product.nutrition?.sugar || '',
      allergens: product.nutrition?.allergens || [],
    });
    setTags(product.tags?.map((t) => t.tag.name) || []);
    setAttributes(product.attributes || []);
    setProductMedia(product.media || []);
    setAiPrompt('');
    // Load existing variants
    const existingVariants = (product as any).variants?.map((pv: any) => {
      const optTr = pv.option?.translations?.find((ot: any) => ot.locale === locale) || pv.option?.translations?.[0];
      const grpTr = pv.option?.group?.translations?.find((gt: any) => gt.locale === locale) || pv.option?.group?.translations?.[0];
      return {
        optionId: pv.optionId,
        priceAdjustment: parseFloat(pv.priceAdjustment || '0'),
        sku: pv.sku || '',
        groupId: pv.option?.group?.id || '',
        groupName: grpTr?.name || '',
        optionName: optTr?.name || '',
      };
    }) || [];
    setProductVariants(existingVariants);
    setSelectedVariantGroupId('');
    setSelectedModifierGroupIds((product as any).modifiers?.map((m: any) => m.modifierGroupId) || []);
    setActiveTab('general');
    setIsFormOpen(true);
  };

  const handleAddIngredient = (ingredientId: string) => {
    if (!ingredientId) return;
    const activeIngredients = ingredientsData?.items || [];
    const ing = activeIngredients.find((i: any) => i.id === ingredientId);
    if (!ing) return;

    if (recipeItems.some((item) => item.ingredientId === ingredientId)) {
      toastApp.warning(t('recipe.duplicateIngredient') || 'Ingredient already in recipe');
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        ingredientId: ing.id,
        quantity: 1,
        unitId: ing.inventoryUnitId,
        ingredientName: ing.translations.find((t: any) => t.locale === locale)?.name || ing.translations[0]?.name || '',
        costPerUnit: parseFloat(ing.costPerUnit) || 0,
        unitAbbreviation: ing.inventoryUnit.abbreviation,
        isActive: ing.isActive,
        ingredient: ing,
      },
    ]);
    setSelectedIngredientId('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const newMedia = await apiClient.post<any>('/media/upload', formData);
      const updatedMediaList = [
        ...productMedia,
        {
          mediaId: newMedia.id,
          sortOrder: productMedia.length,
          isPrimary: productMedia.length === 0,
          media: { fileUrl: newMedia.fileUrl },
        },
      ];
      setProductMedia(updatedMediaList);
      toastApp.rawSuccess(t('mediaTab.title') || 'Photo uploaded');
    } catch (err) {
      toastApp.error('save', t('mediaTab.title') || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAiPhotoGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    try {
      const newMedia = await apiClient.post<any>('/media/generate-ai', { prompt: aiPrompt });
      const updatedMediaList = [
        ...productMedia,
        {
          mediaId: newMedia.id,
          sortOrder: productMedia.length,
          isPrimary: productMedia.length === 0,
          media: { fileUrl: newMedia.fileUrl },
        },
      ];
      setProductMedia(updatedMediaList);
      setAiPrompt('');
      toastApp.rawSuccess(t('mediaTab.title') || 'AI Photo generated');
    } catch (err) {
      toastApp.error('save', t('mediaTab.title') || 'Failed to generate AI photo');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSetPrimaryPhoto = (mediaId: string) => {
    setProductMedia(
      productMedia.map((m) => ({
        ...m,
        isPrimary: m.mediaId === mediaId,
      }))
    );
  };

  const handleDeletePhoto = (mediaId: string) => {
    const remaining = productMedia.filter((m) => m.mediaId !== mediaId);
    if (remaining.length > 0 && !remaining.some((m) => m.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    setProductMedia(remaining);
  };

  const handleSaveRecipe = () => {
    if (recipeItems.length === 0) {
      toastApp.warning(t('recipe.zeroQuantity') || 'At least one ingredient is required');
      return;
    }
    if (recipeItems.some((item) => item.quantity <= 0)) {
      toastApp.warning(t('recipe.zeroQuantity') || 'Quantity must be greater than zero');
      return;
    }

    const payload = {
      items: recipeItems.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitId: item.unitId,
        wastePercentage: 0,
        notes: '',
      })),
      notes: recipeNotes || null,
      isActive: true,
    };

    saveRecipeMutation.mutate(payload);
  };

  // Submit Logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastApp.warning(t('validation.name') || 'Product name is required');
      return;
    }

    const payload = {
      slug: slug || undefined,
      sku: sku || undefined,
      sellingPrice: parseFloat(sellingPrice),
      status,
      availabilityStatus,
      preparationTime: prepTime,
      isFeatured,
      categoryId,
      stationIds: stations,
      salesChannels: channels,
      nutrition: {
        calories: nutrition.calories ? parseInt(nutrition.calories, 10) : null,
        protein: nutrition.protein ? parseFloat(nutrition.protein) : null,
        fat: nutrition.fat ? parseFloat(nutrition.fat) : null,
        sugar: nutrition.sugar ? parseFloat(nutrition.sugar) : null,
        allergens: nutrition.allergens,
      },
      tags,
      attributes,
      // If new: write both EN & ID locales. If edit: update current locale and preserve the other unchanged.
      translations: selectedProduct
        ? [
          {
            locale: 'en',
            name: locale === 'en' ? name : (selectedProduct.translations.find((t) => t.locale === 'en')?.name || name),
            description: locale === 'en' ? description : (selectedProduct.translations.find((t) => t.locale === 'en')?.description || null),
          },
          {
            locale: 'id',
            name: locale === 'id' ? name : (selectedProduct.translations.find((t) => t.locale === 'id')?.name || name),
            description: locale === 'id' ? description : (selectedProduct.translations.find((t) => t.locale === 'id')?.description || null),
          },
        ]
        : [
          { locale: 'en', name, description: description || null },
          { locale: 'id', name, description: description || null },
        ],
      priceChangeReason: priceChangeReason || undefined,
      media: productMedia.map((pm) => ({
        mediaId: pm.mediaId,
        sortOrder: pm.sortOrder,
        isPrimary: pm.isPrimary,
      })),
      variants: productVariants.map((pv) => ({
        optionId: pv.optionId,
        priceAdjustment: pv.priceAdjustment,
        sku: pv.sku || undefined,
      })),
      modifierGroupIds: selectedModifierGroupIds,
    };

    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Keyboard shortcut configuration
  useKeyboardShortcuts({
    onNew: isFormOpen ? undefined : handleCreateOpen,
    onClose: isFormOpen ? () => setIsFormOpen(false) : undefined,
    onSave: isFormOpen ? () => handleSubmit(new Event('submit') as any) : undefined,
    onSearch: () => {
      const searchInput = document.querySelector('.data-table-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
  });

  // Tags input helpers
  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleTagRemove = (index: number) => {
    setTags(tags.filter((_, idx) => idx !== index));
  };

  // Attributes helpers
  const handleAttrAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newAttrName.trim() && newAttrVal.trim()) {
      setAttributes([...attributes, { name: newAttrName.trim(), value: newAttrVal.trim() }]);
      setNewAttrName('');
      setNewAttrVal('');
    }
  };

  const handleAttrRemove = (index: number) => {
    setAttributes(attributes.filter((_, idx) => idx !== index));
  };

  // Table columns definition
  const columns = [
    {
      header: t('fields.name'),
      accessorKey: 'name',
      render: (item: Product) => {
        const tr = item.translations.find((t) => t.locale === locale) || item.translations[0];
        const cover = item.media?.find((m) => m.isPrimary)?.media?.fileUrl;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[var(--accent)] border border-[var(--border)] overflow-hidden flex items-center justify-center">
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={cover} alt={tr?.name} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-[var(--muted-foreground)]" />
              )}
            </div>
            <div>
              <div className="font-medium text-[var(--foreground)]">{tr?.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{item.category?.translations?.[0]?.name}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: t('fields.sku'),
      accessorKey: 'sku',
      render: (item: Product) => (
        <span className="font-mono text-xs text-[var(--foreground)]">{item.sku || '-'}</span>
      ),
    },

    {
      header: t('fields.sellingPrice'),
      accessorKey: 'sellingPrice',
      render: (item: Product) => (
        <span className="font-semibold text-[var(--foreground)]">
          {parseFloat(item.sellingPrice).toLocaleString()} EGP
        </span>
      ),
    },
    {
      header: t('fields.currentHpp'),
      accessorKey: 'currentHpp',
      render: (item: Product) => (
        <span className="text-[var(--muted-foreground)]">
          {parseFloat(item.currentHpp).toLocaleString()} EGP
        </span>
      ),
    },
    {
      header: t('fields.status'),
      accessorKey: 'status',
      render: (item: Product) => {
        const statuses = {
          DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
          ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          HIDDEN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          ARCHIVED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statuses[item.status]}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      header: '',
      render: (item: Product) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <AppButton
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleEditOpen(item)}
            disabled={deleteMutation.isPending || bulkDeleteMutation.isPending || duplicateMutation.isPending}
          >
            <Edit2 className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
          </AppButton>
          <AppButton
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={deleteMutation.isPending || bulkDeleteMutation.isPending || duplicateMutation.isPending}
            onClick={() => duplicateMutation.mutate(item.id)}
          >
            <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)] hover:text-white" />
          </AppButton>
          <AppButton
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={deleteMutation.isPending || bulkDeleteMutation.isPending || duplicateMutation.isPending}
            onClick={() => {
              const tr = item.translations.find((t) => t.locale === locale) || item.translations.find((t) => t.locale === 'en') || item.translations[0];
              const name = tr?.name || 'Unnamed Product';
              setConfirmDialog({
                isOpen: true,
                title: t('delete') || 'Delete Product',
                description: t('deleteConfirm', { name }) || `Are you sure you want to permanently delete the product "${name}"? This action cannot be undone.`,
                type: 'delete',
                onConfirm: () => deleteMutation.mutate({ id: item.id, name }),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400/80 hover:text-rose-400" />
          </AppButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Package}
      />

      {/* Main Grid View */}
      {viewMode === 'table' ? (
        <DataTable
          data={productsData?.items || []}
          columns={columns}
          isLoading={isLoading}
          pagination={{
            page,
            pageSize,
            total: productsData?.total || 0,
            totalPages: Math.ceil((productsData?.total || 0) / pageSize),
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: tCommon('searchPlaceholder'),
          }}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none w-full sm:w-auto"
              >
                <option value="">{tCommon('allCategories') || 'All Categories'}</option>
                {categoriesData?.items?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.translations?.[0]?.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none w-full sm:w-auto"
              >
                <option value="">{tCommon('allStatuses') || 'All Statuses'}</option>
                {['DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED'].map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <div className="flex border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)] p-0.5 h-10 ml-auto sm:ml-0">
                <AppButton
                  size="sm"
                  variant="primary"
                  className="h-full px-2.5 rounded-md"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  className="h-full px-2.5 rounded-md"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </AppButton>
              </div>
            </div>
          }
          primaryAction={
            <AppButton
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleCreateOpen}
            >
              {t('add')}
            </AppButton>
          }
          bulkActions={[
            {
              label: t('bulkActions.makeActive') || 'Make Active',
              variant: 'outline',
              icon: Play,
              onClick: (ids) => bulkStatusMutation.mutate({ ids, status: 'ACTIVE' }),
            },
            {
              label: t('bulkActions.makeHidden') || 'Make Hidden',
              variant: 'outline',
              icon: Pause,
              onClick: (ids) => bulkStatusMutation.mutate({ ids, status: 'HIDDEN' }),
            },
            {
              label: tCommon('buttons.deleteSelected') || 'Delete Selected',
              variant: 'danger',
              icon: Trash2,
              disabled: deleteMutation.isPending || bulkDeleteMutation.isPending,
              onClick: (ids) => {
                setConfirmDialog({
                  isOpen: true,
                  title: t('delete') || 'Delete Products',
                  description: t('deleteConfirm', { name: `${ids.length} selected` }) || `Are you sure you want to permanently delete ${ids.length} selected products? This action cannot be undone.`,
                  type: 'delete',
                  onConfirm: () => bulkDeleteMutation.mutate(ids),
                });
              },
            },
          ]}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleEditOpen}
          emptyState={{
            icon: Package,
            action: (
              <AppButton size="sm" onClick={handleCreateOpen} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {t('add')}
              </AppButton>
            ),
          }}
        />
      ) : (
        /* Cards Layout with responsive loading skeletons */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder={tCommon('searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="data-table-search-input flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none w-full sm:w-auto"
            >
              <option value="">{tCommon('allCategories') || 'All Categories'}</option>
              {categoriesData?.items?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.translations?.[0]?.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none w-full sm:w-auto"
            >
              <option value="">{tCommon('allStatuses') || 'All Statuses'}</option>
              {['DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED'].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <div className="flex border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)] p-0.5 h-10 ml-auto sm:ml-0">
              <AppButton
                size="sm"
                variant="ghost"
                className="h-full px-2.5 rounded-md"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </AppButton>
              <AppButton
                size="sm"
                variant="primary"
                className="h-full px-2.5 rounded-md"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </AppButton>
            </div>
            <AppButton
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleCreateOpen}
              className="w-full sm:w-auto"
            >
              {t('add')}
            </AppButton>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <div className="aspect-video w-full bg-[var(--accent)]/30 border-b border-[var(--border)]" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-[var(--accent)] rounded w-2/3" />
                    <div className="h-3 bg-[var(--accent)] rounded w-1/3" />
                    <div className="pt-3 border-t border-[var(--border)]/40 flex justify-between">
                      <div className="h-4 bg-[var(--accent)] rounded w-1/4" />
                      <div className="h-3 bg-[var(--accent)] rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : productsData?.items?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-16 bg-[var(--card)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                <Package className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{t('noProducts') || 'No products found'}</h3>
              <p className="mt-1 max-w-sm text-center text-sm text-[var(--muted-foreground)]">
                {t('noProductsDesc') || 'Start building your menu by adding your first product.'}
              </p>
              <div className="mt-5">
                <AppButton size="sm" onClick={handleCreateOpen} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  {t('add')}
                </AppButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {productsData?.items?.map((product: Product) => {
                const tr = product.translations.find((t) => t.locale === locale) || product.translations[0];
                const cover = product.media?.find((m) => m.isPrimary)?.media?.fileUrl;
                return (
                  <div
                    key={product.id}
                    onClick={() => handleEditOpen(product)}
                    className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:border-brand-500/50 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="aspect-video w-full bg-[var(--accent)]/30 overflow-hidden relative flex items-center justify-center border-b border-[var(--border)]">
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt={tr?.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <Package className="h-8 w-8 text-[var(--muted-foreground)]" />
                      )}
                      <span className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        {product.status}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--foreground)] group-hover:text-brand-500 transition-colors">
                          {tr?.name}
                        </h4>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {product.category?.translations?.[0]?.name}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)]/40 pt-3">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {parseFloat(product.sellingPrice).toLocaleString()} EGP
                        </span>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          {product.sku || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Drawer Form */}
      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedProduct ? t('edit') : t('add')}
        isDirty={isDirty}
        footer={
          activeTab !== 'history' && (
            <div className="flex w-full justify-between items-center">
              {selectedProduct && activeTab !== 'recipe' && (
                <AppButton
                  size="sm"
                  variant="outline"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => duplicateMutation.mutate(selectedProduct.id)}
                  isLoading={duplicateMutation.isPending}
                  disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                >
                  {t('duplicate')}
                </AppButton>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <AppButton size="sm" variant="outline" onClick={() => setIsFormOpen(false)} disabled={createMutation.isPending || updateMutation.isPending || saveRecipeMutation.isPending}>
                  {tCommon('buttons.cancel') || 'Cancel'}
                </AppButton>
                <AppButton
                  size="sm"
                  onClick={selectedProduct && activeTab === 'recipe' ? handleSaveRecipe : handleSubmit}
                  isLoading={selectedProduct && activeTab === 'recipe' ? saveRecipeMutation.isPending : createMutation.isPending || updateMutation.isPending}
                >
                  {tCommon('buttons.save') || 'Save'}
                </AppButton>
              </div>
            </div>
          )
        }
      >
        {/* State-based custom responsive Tab Selector */}
        <div className="flex border-b border-[var(--border)] pb-2 overflow-x-auto gap-2">
          {['general', 'pricing', 'recipe', 'media', 'variants', 'modifiers', 'tags', ...(selectedProduct ? ['history'] : [])].map((tb) => (
            <button
              key={tb}
              onClick={() => setActiveTab(tb)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${activeTab === tb
                ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                : 'text-[var(--muted-foreground)] hover:text-white'
                }`}
            >
              {tb === 'general' ? (t('sections.general') || 'General') :
               tb === 'pricing' ? (t('sections.pricing') || 'Pricing') :
               tb === 'recipe' ? (t('recipe.tab') || 'Recipe') :
               tb === 'media' ? (t('sections.media') || 'Photos') :
               tb === 'variants' ? (t('sections.variants') || 'Variants') :
               tb === 'modifiers' ? (t('sections.modifiers') || 'Modifiers') :
               tb === 'tags' ? (t('sections.tags') || 'Tags') :
               tb === 'history' ? (t('sections.history') || 'History') : tb}
            </button>
          ))}
        </div>

        {activeTab === 'history' ? (
          selectedProduct && <div className="mt-4"><AuditTimeline resource="Product" resourceId={selectedProduct.id} /></div>
        ) : activeTab === 'media' ? (
          <div className="mt-4 space-y-5">
            {/* Upload Zone */}
            <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)]/30 p-6 text-center hover:bg-[var(--accent)]/5 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto || isGeneratingAi}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Package className="h-8 w-8 text-[var(--muted-foreground)] mb-2" />
              <div className="text-xs font-semibold text-white">
                {isUploadingPhoto ? t('saving') || 'Uploading...' : t('mediaTab.uploadZone') || 'Click to upload or drag photos here'}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {t('mediaTab.uploadFormats') || 'PNG, JPG, JPEG (max. 5MB)'}
              </div>
            </div>

            {/* AI Generator Panel */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                ✨ {t('mediaTab.aiGenerateTitle') || 'Generate Photo with AI'}
              </h4>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]" htmlFor="ai-prompt">
                  {t('mediaTab.aiPromptLabel') || 'AI Prompt'}
                </label>
                <input
                  id="ai-prompt"
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t('mediaTab.aiPromptPlaceholder') || 'e.g. A warm plate of seafood fried rice'}
                  disabled={isGeneratingAi || isUploadingPhoto}
                  className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <AppButton
                size="sm"
                variant="primary"
                onClick={handleAiPhotoGenerate}
                isLoading={isGeneratingAi}
                disabled={!aiPrompt.trim() || isUploadingPhoto}
                className="w-full h-8 text-xs font-medium"
              >
                {isGeneratingAi ? t('mediaTab.aiGenerating') || 'Generating...' : t('mediaTab.aiButton') || 'Generate Photo'}
              </AppButton>
            </div>

            {/* Photo Gallery Grid */}
            {productMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[var(--accent)]/5 border border-[var(--border)]/40 text-center">
                <Package className="h-6 w-6 text-[var(--muted-foreground)] mb-2" />
                <span className="text-xs text-[var(--muted-foreground)]">{t('mediaTab.noMedia') || 'No product photos yet'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {productMedia.map((m) => (
                  <div key={m.mediaId} className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--accent)]/5 shadow-md">
                    <img
                      src={m.media.fileUrl}
                      alt="Product item preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 gap-1.5">
                      <div className="flex items-center justify-between w-full">
                        {!m.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhoto(m.mediaId)}
                            className="bg-brand-500/90 hover:bg-brand-500 text-white rounded px-1.5 py-0.5 text-[9px] font-bold transition-all shadow-sm"
                          >
                            {t('mediaTab.setPrimary') || 'Set Cover'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(m.mediaId)}
                          className="bg-rose-500/95 hover:bg-rose-500 text-white rounded p-1 text-[9px] ml-auto transition-all shadow-sm flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Primary/Cover badge */}
                    {m.isPrimary && (
                      <span className="absolute top-2 left-2 inline-flex items-center rounded-md bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm border border-brand-400">
                        ⭐ {t('mediaTab.primaryLabel') || 'Cover'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'variants' ? (
          <div className="mt-4 space-y-5">
            {/* Variant Group Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                {t('variantTab.addGroup')}
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedVariantGroupId}
                  onChange={(e) => setSelectedVariantGroupId(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">{t('variantTab.selectGroupPlaceholder')}</option>
                  {(variantGroupsData?.items || []).filter((vg: any) => {
                    // Only show groups not already added
                    const addedGroupIds = [...new Set(productVariants.map((pv) => pv.groupId))];
                    return !addedGroupIds.includes(vg.id);
                  }).map((vg: any) => {
                    const vgTr = vg.translations?.find((tr: any) => tr.locale === locale) || vg.translations?.[0];
                    return (
                      <option key={vg.id} value={vg.id}>
                        {vgTr?.name || vg.id}
                      </option>
                    );
                  })}
                </select>
                <AppButton
                  size="sm"
                  variant="primary"
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                  disabled={!selectedVariantGroupId}
                  onClick={() => {
                    const vg = (variantGroupsData?.items || []).find((g: any) => g.id === selectedVariantGroupId);
                    if (!vg) return;
                    const vgTr = vg.translations?.find((tr: any) => tr.locale === locale) || vg.translations?.[0];
                    const newOptions = (vg.options || []).map((opt: any) => {
                      const optTr = opt.translations?.find((tr: any) => tr.locale === locale) || opt.translations?.[0];
                      return {
                        optionId: opt.id,
                        priceAdjustment: 0,
                        sku: '',
                        groupId: vg.id,
                        groupName: vgTr?.name || '',
                        optionName: optTr?.name || '',
                      };
                    });
                    setProductVariants([...productVariants, ...newOptions]);
                    setSelectedVariantGroupId('');
                  }}
                >
                  {t('variantTab.addGroup')}
                </AppButton>
              </div>
            </div>

            {/* Linked Variant Groups */}
            {(() => {
              const groupedVariants: Record<string, typeof productVariants> = {};
              productVariants.forEach((pv) => {
                if (!groupedVariants[pv.groupId]) groupedVariants[pv.groupId] = [];
                groupedVariants[pv.groupId].push(pv);
              });
              const groupEntries = Object.entries(groupedVariants);

              if (groupEntries.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2 opacity-30">🏷️</div>
                    <span className="text-xs text-[var(--muted-foreground)]">{t('variantTab.noVariants')}</span>
                    <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">{t('variantTab.noVariantsDesc')}</p>
                  </div>
                );
              }

              const parsedPrice = parseFloat(sellingPrice) || 0;

              return groupEntries.map(([groupId, options]) => (
                <div key={groupId} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  {/* Group Header */}
                  <div className="flex items-center justify-between bg-[var(--accent)]/20 px-4 py-2.5 border-b border-[var(--border)]">
                    <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">
                      {options[0]?.groupName || groupId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductVariants(productVariants.filter((pv) => pv.groupId !== groupId))}
                      className="text-[10px] text-rose-400 hover:text-rose-500 font-semibold transition-colors cursor-pointer"
                    >
                      {t('variantTab.removeGroup')}
                    </button>
                  </div>

                  {/* Options Table */}
                  <div className="divide-y divide-[var(--border)]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_120px_120px_100px] gap-2 px-4 py-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider bg-[var(--accent)]/10">
                      <span>{t('variantTab.optionName')}</span>
                      <span>Harga Jual Varian</span>
                      <span>{t('variantTab.variantSku')}</span>
                      <span className="text-right">Adjustment (Selisih)</span>
                    </div>

                    {options.map((opt) => (
                      <div key={opt.optionId} className="grid grid-cols-[1fr_120px_120px_100px] gap-2 px-4 py-2.5 items-center hover:bg-[var(--accent)]/5 transition-colors">
                        {/* Option Name */}
                        <span className="text-xs font-medium text-[var(--foreground)]">
                          {opt.optionName}
                        </span>

                        {/* Variant Price (Harga Jual) */}
                        <input
                          type="number"
                          step="0.01"
                          value={(parsedPrice + opt.priceAdjustment) || ''}
                          onChange={(e) => {
                            const newFinalPrice = parseFloat(e.target.value) || 0;
                            const delta = newFinalPrice - parsedPrice;
                            setProductVariants(productVariants.map((pv) =>
                              pv.optionId === opt.optionId
                                ? { ...pv, priceAdjustment: delta }
                                : pv
                            ));
                          }}
                          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />

                        {/* SKU */}
                        <input
                          type="text"
                          value={opt.sku}
                          onChange={(e) => {
                            setProductVariants(productVariants.map((pv) =>
                              pv.optionId === opt.optionId
                                ? { ...pv, sku: e.target.value }
                                : pv
                            ));
                          }}
                          placeholder={t('variantTab.skuPlaceholder')}
                          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />

                        {/* Difference (Selisih) */}
                        <div className="text-right">
                          <span className={`text-xs font-bold font-mono ${
                            opt.priceAdjustment > 0 ? 'text-emerald-500 dark:text-emerald-400' :
                            opt.priceAdjustment < 0 ? 'text-rose-500 dark:text-rose-400' :
                            'text-[var(--muted-foreground)]'
                          }`}>
                            {opt.priceAdjustment > 0 ? `+${opt.priceAdjustment.toFixed(2)}` :
                             opt.priceAdjustment < 0 ? opt.priceAdjustment.toFixed(2) :
                             'Normal'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : activeTab === 'recipe' ? (
          <div className="mt-4 space-y-4">
            {/* Warnings Alert */}
            {!hasRecipe && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
                ⚠️ {t('recipe.noRecipe')}
              </div>
            )}
            {hasRecipe && !activeRecipeData?.isActive && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
                ⚠️ {t('recipe.inactive')}
              </div>
            )}

            {/* HPP Live Card Widget */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--accent)]/10 p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                  {t('recipe.hppWidget.sellingPrice')}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {parsedPrice.toLocaleString()} EGP
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                  {t('recipe.hppWidget.currentHpp')}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {liveHpp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                  {t('recipe.hppWidget.grossProfit')}
                </div>
                <div className={`text-sm font-bold mt-1 ${liveProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {liveProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                  {t('recipe.hppWidget.grossMargin')}
                </div>
                <div className={`text-sm font-bold mt-1 ${liveMargin >= 30 ? 'text-emerald-400' : liveMargin >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {liveMargin.toFixed(2)} %
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                  {t('recipe.hppWidget.foodCost')}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {liveFoodCost.toFixed(2)} %
                </div>
              </div>
            </div>

            {/* Recipe Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="rec-notes">
                {t('recipe.notes') || 'Recipe Notes'}
              </label>
              <input
                id="rec-notes"
                type="text"
                value={recipeNotes}
                onChange={(e) => setRecipeNotes(e.target.value)}
                placeholder={t('recipe.notesPlaceholder') || 'e.g. Standard brewing instructions'}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Ingredient Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                {t('recipe.addIngredient')}
              </label>
              <select
                value={selectedIngredientId}
                onChange={(e) => handleAddIngredient(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none"
              >
                <option value="">{t('recipe.selectIngredient')}</option>
                {(ingredientsData?.items || [])
                  .filter((ing: any) => ing.isActive)
                  .filter((ing: any) => !recipeItems.some((item) => item.ingredientId === ing.id))
                  .map((ing: any) => {
                    const name = ing.translations.find((t: any) => t.locale === locale)?.name || ing.translations[0]?.name;
                    return (
                      <option key={ing.id} value={ing.id}>
                        {name} ({ing.sku})
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Recipe Table */}
            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--accent)]/30 text-[var(--muted-foreground)]">
                    <th className="p-3 font-semibold">{t('recipe.addIngredient')}</th>
                    <th className="p-3 font-semibold w-24">{t('recipe.quantity')}</th>
                    <th className="p-3 font-semibold w-16">{t('recipe.unit')}</th>
                    <th className="p-3 font-semibold text-right">{t('recipe.costPerUnit')}</th>
                    <th className="p-3 font-semibold text-right">{t('recipe.lineCost')}</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recipeItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[var(--muted-foreground)] italic">
                        {t('recipe.noRecipe')}
                      </td>
                    </tr>
                  ) : (
                    recipeItems.map((item, idx) => {
                      const factor = getUnitConversionFactor(item.unitAbbreviation, item.ingredient?.inventoryUnit?.abbreviation);
                      const lineCost = item.quantity * factor * item.costPerUnit;
                      return (
                        <tr key={item.ingredientId} className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--accent)]/5">
                          <td className="p-3">
                            <div className="font-medium text-white">{item.ingredientName}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {!item.isActive && (
                                <span className="inline-flex items-center rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-medium text-rose-400 border border-rose-500/20">
                                  {t('recipe.ingredientInactive')}
                                </span>
                              )}
                              {item.costPerUnit === 0 && (
                                <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400 border border-amber-500/20">
                                  {t('recipe.ingredientNoCost')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setRecipeItems(
                                  recipeItems.map((item, i) =>
                                    i === idx ? { ...item, quantity: val } : item
                                  )
                                );
                              }}
                              className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-white focus:border-brand-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.unitId || item.ingredient?.inventoryUnitId || ''}
                              onChange={(e) => {
                                const selectedUnitId = e.target.value;
                                const selectedUnitObj = unitsData?.items?.find((u: any) => u.id === selectedUnitId);
                                setRecipeItems(
                                  recipeItems.map((ri, i) =>
                                    i === idx
                                      ? {
                                          ...ri,
                                          unitId: selectedUnitId,
                                          unitAbbreviation: selectedUnitObj?.abbreviation || ri.unitAbbreviation,
                                        }
                                      : ri
                                  )
                                );
                              }}
                              className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                            >
                              {getCompatibleUnits(item.ingredient).map((u: any) => (
                                <option key={u.id} value={u.id}>
                                  {u.abbreviation}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-right text-[var(--muted-foreground)] font-mono">
                            {item.costPerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-white font-semibold font-mono">
                            {lineCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Recipe Delete Button */}
            {hasRecipe && (
              <div className="pt-2">
                <AppButton
                  size="sm"
                  variant="outline"
                  className="w-full justify-center text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  isLoading={deleteRecipeMutation.isPending}
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: t('recipe.deleteRecipe') || 'Delete Recipe',
                      description: t('recipe.deleteConfirm') || 'Are you sure you want to delete this recipe?',
                      type: 'delete',
                      onConfirm: () => deleteRecipeMutation.mutate(),
                    });
                  }}
                >
                  {t('recipe.deleteRecipe') || 'Delete Recipe'}
                </AppButton>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-name">
                    {t('fields.name')} *
                  </label>
                  <input
                    id="prod-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('placeholders.name')}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-desc">
                    {t('fields.description') || 'Description'}
                  </label>
                  <textarea
                    id="prod-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('placeholders.description') || 'Describe menu properties...'}
                    className="mt-1 flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 h-20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-category">
                      {t('fields.category')}
                    </label>
                    <select
                      id="prod-category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {categoriesData?.items?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.translations?.[0]?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-status">
                      {t('fields.status')}
                    </label>
                    <select
                      id="prod-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="HIDDEN">HIDDEN</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-sku">
                      {t('fields.sku')}
                    </label>
                    <input
                      id="prod-sku"
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder={t('placeholders.sku')}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-availability">
                      {t('fields.availability') || 'Availability Status'}
                    </label>
                    <select
                      id="prod-availability"
                      value={availabilityStatus}
                      onChange={(e) => setAvailabilityStatus(e.target.value as any)}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="AVAILABLE">{t('fields.available') || 'Available'}</option>
                      <option value="UNAVAILABLE">{t('fields.unavailable') || 'Unavailable'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border)]/40 pt-3">
                  <span className="text-xs text-[var(--muted-foreground)]">{t('fields.markFeatured') || 'Mark as Featured Menu'}</span>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-preptime">
                    {t('fields.prepTime')}
                  </label>
                  <input
                    id="prod-preptime"
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value, 10))}
                    placeholder={t('placeholders.prepTime')}
                    className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-price">
                      {t('fields.sellingPrice')} *
                    </label>
                    <input
                      id="prod-price"
                      type="number"
                      step="0.01"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder={t('placeholders.sellingPrice')}
                      className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--foreground)]">
                      {t('fields.currentHpp')}
                    </label>
                    <div className="mt-1 flex h-10 w-full items-center rounded-lg border border-[var(--border)] bg-[var(--accent)]/30 px-3 text-sm text-[var(--muted-foreground)] font-mono">
                      {parsedHpp.toLocaleString()} EGP
                    </div>
                  </div>
                </div>

                {/* Dynamic Selling Price margin calculations */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--accent)]/10 p-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t('fields.grossProfit')}</div>
                    <div className={`text-lg font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {grossProfit.toLocaleString()} EGP
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t('fields.margin')}</div>
                    <div className={`text-lg font-bold ${grossMargin >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {grossMargin.toFixed(2)} %
                    </div>
                  </div>
                </div>

                {/* Optional Price Change Reason input */}
                {selectedProduct && parseFloat(selectedProduct.sellingPrice) !== parsedPrice && (
                  <div className="space-y-1 animate-fade-in border-l-2 border-brand-500 pl-3">
                    <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-reason">
                      {t('reason')}
                    </label>
                    <input
                      id="prod-reason"
                      type="text"
                      value={priceChangeReason}
                      onChange={(e) => setPriceChangeReason(e.target.value)}
                      placeholder={t('placeholders.priceChangeReason')}
                      className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                )}

                {selectedProduct && (
                  <div className="pt-2">
                    <AppButton
                      size="sm"
                      variant="outline"
                      className="w-full justify-center"
                      leftIcon={<ArrowUpRight className="h-4 w-4" />}
                      onClick={(e) => {
                        e.preventDefault();
                        setHistoryProductId(selectedProduct.id);
                        setIsHistoryOpen(true);
                      }}
                    >
                      {t('viewHistory')}
                    </AppButton>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'modifiers' && (
              <div className="mt-4 space-y-5">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('sections.modifiers') || 'Kelompok Pilihan / Modifiers'}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Hubungkan kelompok modifikasi dengan produk ini.
                  </p>
                </div>
              </div>

              {modifierGroupsData?.items && modifierGroupsData.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {modifierGroupsData.items.map((g: any) => {
                    const isChecked = selectedModifierGroupIds.includes(g.id);
                    const name = g.translations.find((tr: any) => tr.locale === locale)?.name || g.translations[0]?.name || 'Unnamed Group';
                    const optionsSummary = g.options
                      ?.map((opt: any) => {
                        const optName = opt.translations.find((t: any) => t.locale === locale)?.name || opt.translations[0]?.name;
                        const price = parseFloat(opt.priceAdjustment);
                        return price > 0 ? `${optName} (+${price} EGP)` : optName;
                      })
                      .join(', ');

                    return (
                      <label
                        key={g.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                          isChecked
                            ? "bg-brand-500/10 border-brand-500/30 text-white"
                            : "bg-[var(--accent)]/5 border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] hover:text-white"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModifierGroupIds([...selectedModifierGroupIds, g.id]);
                            } else {
                              setSelectedModifierGroupIds(selectedModifierGroupIds.filter((id) => id !== g.id));
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block">
                            {name}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5 truncate">
                            {optionsSummary || '-'}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-zinc-500/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 mt-2 border border-zinc-500/20">
                            {g.isRequired ? (t('fields.isRequired') || 'Required') : (tCommon('optional') || 'Optional')}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[var(--muted-foreground)]">
                  Tidak ada kelompok pilihan aktif. Silakan buat di menu Manajemen Modifikasi.
                </div>
              )}
              </div>
            </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-4">
                {/* Tags Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="prod-tags">
                    {t('fields.tags')}
                  </label>
                  <input
                    id="prod-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagAdd}
                    placeholder={t('placeholders.tags')}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded bg-brand-500/10 px-2 py-0.5 text-xs text-brand-500"
                      >
                        {tag}
                        <button type="button" onClick={() => handleTagRemove(index)} className="text-brand-500 hover:text-white">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dynamic Attributes */}
                <div className="border-t border-[var(--border)]/40 pt-4 space-y-3">
                  <label className="text-xs font-semibold text-[var(--foreground)]">{t('fields.attributes')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newAttrName}
                      onChange={(e) => setNewAttrName(e.target.value)}
                      placeholder={t('placeholders.attrName')}
                      className="flex h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <input
                      type="text"
                      value={newAttrVal}
                      onChange={(e) => setNewAttrVal(e.target.value)}
                      placeholder={t('placeholders.attrValue')}
                      className="flex h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <AppButton
                    size="sm"
                    variant="outline"
                    className="w-full justify-center text-xs"
                    leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
                    onClick={handleAttrAdd}
                  >
                    {t('fields.addAttribute') || 'Add Attribute'}
                  </AppButton>

                  <div className="space-y-2 mt-3">
                    {attributes.map((attr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2">
                        <span className="font-medium">{attr.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--muted-foreground)]">{attr.value}</span>
                          <button type="button" onClick={() => handleAttrRemove(idx)} className="text-rose-400 hover:text-rose-500">
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </FormDrawer>

      {/* Nested Price History Drawer */}
      <FormDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={t('priceHistoryTitle')}
        description={t('priceHistoryDesc')}
      >
        <div className="space-y-4">
          {isHistoryLoading ? (
            <div className="relative border-l-2 border-[var(--border)] pl-4 ml-2 space-y-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="relative space-y-2 animate-pulse">
                  <div className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--border)] bg-[var(--accent)]" />
                  <div className="h-3 w-32 bg-[var(--accent)] rounded" />
                  <div className="h-4 w-20 bg-[var(--accent)] rounded" />
                  <div className="h-10 bg-[var(--accent)]/40 rounded w-full" />
                </div>
              ))}
            </div>
          ) : historyData?.items?.length === 0 ? (
            <div className="text-center text-xs text-[var(--muted-foreground)] py-12">
              {t('noHistory')}
            </div>
          ) : (
            <div className="relative border-l-2 border-[var(--border)] pl-4 ml-2 space-y-6">
              {historyData?.items?.map((hist: any, index: number) => (
                <div key={hist.id} className="relative space-y-1">
                  {/* Dot on line */}
                  <div className={`absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border bg-[var(--card)] ${index === 0 ? 'border-brand-500 bg-brand-500' : 'border-[var(--border)]'}`} />
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{new Date(hist.createdAt).toLocaleString()}</span>
                    {hist.changedBy && (
                      <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 font-medium text-[var(--foreground)]">
                        {hist.changedBy.name}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {parseFloat(hist.sellingPrice).toLocaleString()} EGP
                  </div>
                  {hist.reason && (
                    <p className="text-xs text-[var(--muted-foreground)] italic mt-1 bg-[var(--accent)]/10 border border-[var(--border)]/40 p-2 rounded">
                      &ldquo;{hist.reason}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Simple Pagination inside timeline */}
          {historyData && historyData.total > 5 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-6">
              <AppButton
                size="sm"
                variant="outline"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                {tCommon('buttons.previous') || 'Previous'}
              </AppButton>
              <span className="text-xs">
                {tCommon('table.pageOf', { current: historyPage, total: Math.ceil(historyData.total / 5) })}
              </span>
              <AppButton
                size="sm"
                variant="outline"
                disabled={historyPage >= Math.ceil(historyData.total / 5)}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                {tCommon('buttons.next') || 'Next'}
              </AppButton>
            </div>
          )}
        </div>
      </FormDrawer>

      {/* Radix Styled Confirmation Dialog */}
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
