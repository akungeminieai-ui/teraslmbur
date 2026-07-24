/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useAuth } from '@/providers/auth-provider';
import { AppButton } from '@teras-lmbur/ui';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ShoppingCart, AlertCircle, Pencil, QrCode, CheckCircle2, Loader2, Flame } from 'lucide-react';

// ── Components ──
import { PosHeader } from './components/pos-header';
import { LiveOrderQueue } from './components/live-order-queue';
import { SearchBar } from './components/search-bar';
import { CategoryTabs } from './components/category-tabs';
import { ProductGrid } from './components/product-grid';
import { CartPanel, type CartItem } from './components/cart-panel';
import { ReceiptModal } from './components/receipt-modal';
import { ModifierModal } from './components/modifier-modal';
import type { PosProduct } from './components/product-card';

interface CompletedSale {
  receiptCode: string;
  customerName: string;
  tableNumber: string;
  orderType: 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY';
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
  cashierName: string;
  dateStr: string;
}

export default function PosPage() {
  const t = useTranslations('pos');
  const locale = useLocale();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── States ──
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Cart & Customer States
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerAddress, setCustomerAddress] = React.useState('');
  const [selectedTableId, setSelectedTableId] = React.useState('');
  const [orderType, setOrderType] = React.useState<'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY'>('TAKE_AWAY');
  const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'QRIS'>('CASH');
  const [amountReceived, setAmountReceived] = React.useState<number>(0);
  const [qrisStatus, setQrisStatus] = React.useState<'Pending' | 'Paid'>('Paid');
  const [discount, setDiscount] = React.useState(0);

  // Modifiers States
  const [selectedProductForModifiers, setSelectedProductForModifiers] = React.useState<PosProduct | null>(null);
  const [isModifierModalOpen, setIsModifierModalOpen] = React.useState(false);

  // Checkout submission states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [completedSale, setCompletedSale] = React.useState<CompletedSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);

  // Shift Management States
  const [openingCashInput, setOpeningCashInput] = React.useState('');
  const [isOpeningShift, setIsOpeningShift] = React.useState(false);

  const [isCloseShiftOpen, setIsCloseShiftOpen] = React.useState(false);
  const [closingCashInput, setClosingCashInput] = React.useState('');
  const [closeShiftNotes, setCloseShiftNotes] = React.useState('');
  const [isClosingShift, setIsClosingShift] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'menu' | 'cart'>('menu');

  const [requireShift, setRequireShift] = React.useState(true);
  const [taxEnable, setTaxEnable] = React.useState(false);

  // Queue order priority control states
  const [selectedQueueOrder, setSelectedQueueOrder] = React.useState<any | null>(null);
  const [isUpdatingPriority, setIsUpdatingPriority] = React.useState(false);

  // Edit Order Mode states
  const [editingOrderId, setEditingOrderId] = React.useState<string | null>(null);
  const [editingOrderCode, setEditingOrderCode] = React.useState<string | null>(null);
  const [isSavingChanges, setIsSavingChanges] = React.useState(false);

  // Unpaid queue filter state
  const [orderQueueFilter, setOrderQueueFilter] = React.useState<'unpaid' | 'all'>('all');

  // Direct payment step states
  const [isDirectPaymentStep, setIsDirectPaymentStep] = React.useState(false);
  const [directPaymentMethod, setDirectPaymentMethod] = React.useState<'CASH' | 'QRIS'>('CASH');
  const [directAmountReceived, setDirectAmountReceived] = React.useState(0);
  const [isSubmittingDirectPayment, setIsSubmittingDirectPayment] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('teras_lmbur_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setRequireShift(parsed.requireShift !== false);
          setTaxEnable(!!parsed.taxEnable);
        }, 0);
      }
    } catch {
      // Ignore error
    }
  }, []);

  // ── Keyboard Shortcuts ──
  useKeyboardShortcuts({
    onSearch: () => {
      searchRef.current?.focus();
    },
  });

  // ── Data Queries ──
  const { data: activeShift, isLoading: isActiveShiftLoading, refetch: refetchActiveShift } = useQuery<any>({
    queryKey: ['active-shift'],
    queryFn: () => apiClient.get('/pos/shifts/active'),
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery<PosProduct[]>({
    queryKey: ['pos-products', locale],
    queryFn: () => apiClient.get(`/pos/products?locale=${locale}`),
  });

  const { data: tables = [] } = useQuery<any[]>({
    queryKey: ['tables'],
    queryFn: () => apiClient.get('/tables'),
  });

  const { data: ordersData, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery<any>({
    queryKey: ['orders'],
    queryFn: () => apiClient.get('/orders?page=1&pageSize=20'),
  });

  const allQueueOrders = React.useMemo(() => ordersData?.items || [], [ordersData]);
  const unpaidQueueOrders = React.useMemo(() => allQueueOrders.filter((o: any) => !o.isPaid), [allQueueOrders]);
  const unpaidQueueCount = unpaidQueueOrders.length;
  const filteredQueueOrders = React.useMemo(() => {
    return orderQueueFilter === 'unpaid' ? unpaidQueueOrders : allQueueOrders;
  }, [orderQueueFilter, unpaidQueueOrders, allQueueOrders]);

  // Autocomplete customer lookup on phone typing
  React.useEffect(() => {
    if (customerPhone.trim().length >= 4) {
      const timer = setTimeout(async () => {
        try {
          const matches = await apiClient.get<any[]>(`/customers?search=${customerPhone}`);
          if (matches && matches.length > 0) {
            const exact = matches.find((c) => c.phone === customerPhone) || matches[0];
            setCustomerName(exact.name);
            if (exact.address) setCustomerAddress(exact.address);
          }
        } catch (e) {
          console.error('Error autocomplete customer', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [customerPhone]);

  // ── Filter Computations ──
  const categories = React.useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // ── Cart Handlers ──
  const handleAddToCart = React.useCallback((product: PosProduct) => {
    if (product.modifiers && product.modifiers.length > 0) {
      setSelectedProductForModifiers(product);
      setIsModifierModalOpen(true);
    } else {
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.product.id === product.id && item.selectedModifiers.length === 0
        );
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id && item.selectedModifiers.length === 0
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { product, quantity: 1, notes: '', selectedModifiers: [], discount: 0 }];
      });
      toast.rawSuccess(`${product.name} added to cart`);
    }
  }, [toast]);

  const handleConfirmModifiers = (selectedMods: any[]) => {
    if (!selectedProductForModifiers) return;
    setCart((prev) => {
      const existing = prev.find((item) => {
        if (item.product.id !== selectedProductForModifiers.id) return false;
        if (item.selectedModifiers.length !== selectedMods.length) return false;
        const existingOptIds = item.selectedModifiers.map((m) => m.optionId).sort().join(',');
        const newOptIds = selectedMods.map((m) => m.optionId).sort().join(',');
        return existingOptIds === newOptIds;
      });

      if (existing) {
        return prev.map((item) => {
          const existingOptIds = item.selectedModifiers.map((m) => m.optionId).sort().join(',');
          const newOptIds = selectedMods.map((m) => m.optionId).sort().join(',');
          if (item.product.id === selectedProductForModifiers.id && existingOptIds === newOptIds) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      }

      return [...prev, {
        product: selectedProductForModifiers,
        quantity: 1,
        notes: '',
        selectedModifiers: selectedMods,
        discount: 0,
      }];
    });
    toast.rawSuccess(`${selectedProductForModifiers.name} (Customized) added to cart`);
  };

  const handleUpdateQty = React.useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleUpdateNotes = React.useCallback((productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  }, []);

  const handleUpdateItemDiscount = React.useCallback((productId: string, discountAmount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discount: discountAmount } : item
      )
    );
  }, []);

  const handleRemoveItem = React.useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    toast.info('Item removed from cart');
  }, [toast]);

  const handleClearCart = React.useCallback(() => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedTableId('');
    setDiscount(0);
    setAmountReceived(0);
    setPaymentMethod('CASH');
    toast.info('Cart cleared');
  }, [toast]);

  const handleSelectOrder = React.useCallback((order: any) => {
    setSelectedQueueOrder(order);
  }, []);

  // ── Cart & Prices Computations ──
  const { subtotal, discountAmount, taxAmount, grandTotal } = React.useMemo(() => {
    const sub = cart.reduce((sum, item) => {
      const modifierAdjustments = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
      const unitPrice = item.product.sellingPrice + modifierAdjustments;
      const finalPrice = Math.max(0, unitPrice - item.discount);
      return sum + finalPrice * item.quantity;
    }, 0);
    const disc = Math.min(discount, sub);
    const tx = taxEnable ? (sub - disc) * 0.14 : 0;
    const total = Math.max(0, sub - disc + tx);
    return { subtotal: sub, discountAmount: disc, taxAmount: tx, grandTotal: total };
  }, [cart, discount, taxEnable]);

  const handleCancelEdit = React.useCallback(() => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedTableId('');
    setDiscount(0);
    setAmountReceived(0);
    setPaymentMethod('CASH');
    setEditingOrderId(null);
    setEditingOrderCode(null);
  }, []);

  const handleSaveChanges = async () => {
    if (!editingOrderId || cart.length === 0) return;

    setIsSavingChanges(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        discount: item.discount,
        modifiers: item.selectedModifiers,
        notes: item.notes || null,
      }));

      const payload = {
        items: itemsPayload,
        discount: discountAmount,
        orderType,
        customerName: customerName.trim() || 'Walk-in',
        customerPhone: customerPhone.trim() || null,
        tableId: orderType === 'DINE_IN' ? selectedTableId : null,
        enableTax: taxEnable,
      };

      await apiClient.patch(`/orders/${editingOrderId}`, payload);
      toast.rawSuccess(`Perubahan order ${editingOrderCode} berhasil disimpan!`);

      const matchedTable = tables.find((t) => t.id === selectedTableId);
      const tableNumberLabel = matchedTable ? matchedTable.number.toString() : '';

      setCompletedSale({
        receiptCode: editingOrderCode || 'REC-SUCCESS',
        customerName: customerName.trim() || 'Walk-in',
        tableNumber: tableNumberLabel,
        orderType,
        paymentMethod: 'PAY_LATER',
        items: cart.map((item) => {
          const modText = item.selectedModifiers.map((m) => m.optionName).join(', ');
          return {
            name: item.product.name + (modText ? ` (${modText})` : ''),
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0),
          };
        }),
        subtotal: subtotal,
        discount: discountAmount,
        grandTotal: grandTotal,
        cashierName: user?.name || 'Cashier',
        dateStr: new Date().toLocaleString(),
      });
      setIsReceiptOpen(true);

      // Sync caches
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

      handleCancelEdit();
    } catch (err: any) {
      toast.rawError(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // ── Checkout Settle Flow ──
  const handleCheckout = async (isPaidOverride?: boolean) => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        discount: item.discount,
        modifiers: item.selectedModifiers,
        notes: item.notes || null,
      }));

      const isPaid = isPaidOverride !== undefined ? isPaidOverride : true;

      // If editing an existing order AND settling payment (isPaid is true)
      if (editingOrderId && isPaid) {
        const payload = {
          paymentMethod,
          amountReceived: paymentMethod === 'CASH' ? amountReceived : 0,
          change: paymentMethod === 'CASH' ? Math.max(0, amountReceived - grandTotal) : 0,
          qrisStatus: paymentMethod === 'QRIS' ? qrisStatus : null,
        };

        const response = await apiClient.patch<any>(`/orders/${editingOrderId}/pay`, payload);

        const matchedTable = tables.find((t) => t.id === selectedTableId);
        const tableNumberLabel = matchedTable ? matchedTable.number.toString() : '';

        // Prepare receipt modal metadata
        setCompletedSale({
          receiptCode: response.code || 'REC-SUCCESS',
          customerName: customerName.trim() || 'Walk-in',
          tableNumber: tableNumberLabel,
          orderType,
          paymentMethod,
          items: cart.map((item) => {
            const modText = item.selectedModifiers.map((m) => m.optionName).join(', ');
            return {
              name: item.product.name + (modText ? ` (${modText})` : ''),
              quantity: item.quantity,
              unitPrice: item.product.sellingPrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0),
            };
          }),
          subtotal: subtotal,
          discount: discountAmount,
          grandTotal: grandTotal,
          cashierName: user?.name || 'Cashier',
          dateStr: new Date().toLocaleString(),
        });
        setIsReceiptOpen(true);

        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        
        handleCancelEdit();
        return;
      }

      // Normal new order checkout path
      const payload = {
        items: itemsPayload,
        discount: discountAmount,
        orderType,
        customerPhone: customerPhone.trim() || null,
        customerName: customerName.trim() || 'Walk-in',
        customerAddress: orderType === 'DELIVERY' ? customerAddress.trim() : null,
        tableId: orderType === 'DINE_IN' ? selectedTableId : null,
        paymentMethod,
        amountReceived: paymentMethod === 'CASH' ? amountReceived : 0,
        change: paymentMethod === 'CASH' ? Math.max(0, amountReceived - grandTotal) : 0,
        qrisStatus: paymentMethod === 'QRIS' ? qrisStatus : null,
        notes: '',
        skipShiftCheck: !requireShift,
        enableTax: taxEnable,
        isPaid,
      };

      const response = await apiClient.post<any>('/orders', payload);

      const matchedTable = tables.find((t) => t.id === selectedTableId);
      const tableNumberLabel = matchedTable ? matchedTable.number.toString() : '';

      setCompletedSale({
        receiptCode: response.code || 'REC-SUCCESS',
        customerName: customerName.trim() || 'Walk-in',
        tableNumber: tableNumberLabel,
        orderType,
        paymentMethod: isPaid ? paymentMethod : 'PAY_LATER',
        items: cart.map((item) => {
          const modText = item.selectedModifiers.map((m) => m.optionName).join(', ');
          return {
            name: item.product.name + (modText ? ` (${modText})` : ''),
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0),
          };
        }),
        subtotal: subtotal,
        discount: discountAmount,
        grandTotal: grandTotal,
        cashierName: user?.name || 'Cashier',
        dateStr: new Date().toLocaleString(),
      });
      setIsReceiptOpen(true);

      if (!isPaid) {
        toast.rawSuccess(`Order ${response.code} berhasil disimpan!`);
      }

      // Invalidate React Query caches to instantly sync UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

      // Reset checkout states
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSelectedTableId('');
      setDiscount(0);
      setAmountReceived(0);
      setPaymentMethod('CASH');
      setActiveTab('menu');
      setEditingOrderId(null);
      setEditingOrderCode(null);

    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || (err as { message?: string })?.message || 'Checkout failed. Please retry.';
      toast.rawError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shift close calculations
  const openingCash = activeShift?.openingCash ? parseFloat(activeShift.openingCash) : 0;
  const cashSales = activeShift?.cashSales ? parseFloat(activeShift.cashSales) : 0;
  const expectedCash = openingCash + cashSales;
  const closingCash = parseFloat(closingCashInput) || 0;
  const difference = closingCash - expectedCash;

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosingShift(true);
    try {
      await apiClient.post('/pos/shifts/close', {
        closingCash,
        notes: closeShiftNotes.trim() || undefined,
      });
      toast.rawSuccess('Shift closed successfully');
      setIsCloseShiftOpen(false);
      refetchActiveShift();
    } catch (err: any) {
      toast.rawError(err.message || 'Failed to close shift');
    } finally {
      setIsClosingShift(false);
    }
  };

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpeningShift(true);
    try {
      const openingCash = parseFloat(openingCashInput) || 0;
      await apiClient.post('/pos/shifts/open', { openingCash });
      toast.rawSuccess('Shift opened successfully');
      setOpeningCashInput('');
      refetchActiveShift();
    } catch (err: any) {
      toast.rawError(err.message || 'Failed to open shift');
    } finally {
      setIsOpeningShift(false);
    }
  };

  const tCommon = useTranslations('common');

  if (isActiveShiftLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-6">
        <div className="h-14 w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="h-24 w-full bg-[var(--card)] rounded-2xl" />
            <div className="h-10 w-full bg-[var(--card)] rounded-lg" />
            <div className="h-10 w-full bg-[var(--card)] rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="h-32 bg-[var(--card)] rounded-2xl" />
              <div className="h-32 bg-[var(--card)] rounded-2xl" />
              <div className="h-32 bg-[var(--card)] rounded-2xl" />
            </div>
          </div>
          <div className="w-full lg:w-[380px] h-[500px] bg-[var(--card)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (requireShift && !activeShift) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {t('shiftRequired') || 'Shift Opening Required'}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {t('enterOpeningCash') || 'Enter opening cash to unlock POS workspace.'}
          </p>

          <form onSubmit={handleOpenShiftSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="opening-cash">
                {t('openingCash') || 'Opening Cash'} (EGP)
              </label>
              <input
                id="opening-cash"
                type="number"
                step="0.01"
                required
                autoFocus
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="0.00"
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <AppButton
                type="submit"
                isLoading={isOpeningShift}
                className="w-full justify-center"
              >
                {t('openShift') || 'Open Shift'}
              </AppButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none gap-6">
      {/* Mobile view selector tabs */}
      <div className="lg:hidden flex p-1 rounded-xl bg-[var(--card)] border border-[var(--border)] w-full">
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
            activeTab === 'menu'
              ? "bg-brand-500 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Menu & Catalog
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cart')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'cart'
              ? "bg-brand-500 text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Section (Catalog & Orders - 70% width) */}
        <div className={cn("flex-1 min-w-0 w-full space-y-6 lg:block", activeTab === 'menu' ? "block" : "hidden")}>
          <PosHeader
            activeShift={activeShift}
            userName={user?.name || 'Cashier'}
            onCloseShift={() => {
              setClosingCashInput('');
              setCloseShiftNotes('');
              setIsCloseShiftOpen(true);
            }}
          />

          {/* Recent Orders Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                Recent Orders Queue
              </h2>
              {/* Queue Filter Segment Control */}
              <div className="flex rounded-lg bg-[var(--background)] border border-[var(--border)] p-0.5 h-8">
                <button
                  type="button"
                  onClick={() => setOrderQueueFilter('all')}
                  className={cn(
                    "px-3 rounded-md text-[10px] font-bold transition-all cursor-pointer border-none",
                    orderQueueFilter === 'all'
                      ? "bg-[var(--card)] text-brand-500 border border-[var(--border)] shadow-xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-transparent"
                  )}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setOrderQueueFilter('unpaid')}
                  className={cn(
                    "px-3 rounded-md text-[10px] font-bold transition-all cursor-pointer border-none",
                    orderQueueFilter === 'unpaid'
                      ? "bg-[var(--card)] text-brand-500 border border-[var(--border)] shadow-xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-transparent"
                  )}
                >
                  Belum Bayar ({unpaidQueueCount})
                </button>
              </div>
            </div>
            <LiveOrderQueue
              sales={filteredQueueOrders}
              isLoading={isOrdersLoading}
              onSelectOrder={handleSelectOrder}
            />
          </div>

          {/* Catalog Filters */}
          <div className="space-y-4">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setSelectedCategory('All');
              }}
              placeholder={t('searchPlaceholder')}
              inputRef={searchRef}
            />
            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={(cat) => {
                setSelectedCategory(cat);
                setSearch('');
              }}
              allLabel={t('allCategories')}
            />
          </div>

          {/* Catalog Product Grid */}
          <div>
            <ProductGrid
              products={filteredProducts}
              isLoading={isProductsLoading}
              onAddProduct={handleAddToCart}
            />
          </div>
        </div>

        {/* Right Section (Cart Panel) */}
        <div className={cn("w-full lg:w-[380px] shrink-0 lg:h-[calc(100vh-120px)] lg:sticky lg:top-20 lg:block", activeTab === 'cart' ? "block" : "hidden")}>
          <CartPanel
            items={cart}
            onUpdateQty={handleUpdateQty}
            onUpdateNotes={handleUpdateNotes}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            orderType={orderType}
            setOrderType={setOrderType}
            tables={tables}
            selectedTableId={selectedTableId}
            setSelectedTableId={setSelectedTableId}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            amountReceived={amountReceived}
            setAmountReceived={setAmountReceived}
            qrisStatus={qrisStatus}
            setQrisStatus={setQrisStatus}
            discount={discount}
            setDiscount={setDiscount}
            isSubmitting={isSubmitting}
            onCheckout={handleCheckout}
            taxEnable={taxEnable}
            
            editingOrderId={editingOrderId}
            editingOrderCode={editingOrderCode}
            onCancelEdit={handleCancelEdit}
            onSaveChanges={handleSaveChanges}
            isSavingChanges={isSavingChanges}
          />
        </div>
      </div>

      {/* Modifier Selection Modal popup */}
      <ModifierModal
        product={selectedProductForModifiers as any}
        isOpen={isModifierModalOpen}
        onClose={() => {
          setIsModifierModalOpen(false);
          setSelectedProductForModifiers(null);
        }}
        onConfirm={handleConfirmModifiers}
      />

      {/* Checkout Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setCompletedSale(null);
          }}
          receiptCode={completedSale.receiptCode}
          customerName={completedSale.customerName}
          tableNumber={completedSale.tableNumber}
          orderType={completedSale.orderType}
          paymentMethod={completedSale.paymentMethod}
          items={completedSale.items}
          subtotal={completedSale.subtotal}
          discount={completedSale.discount}
          grandTotal={completedSale.grandTotal}
          cashierName={completedSale.cashierName}
          dateStr={completedSale.dateStr}
        />
      )}

      {/* Close Shift Modal Overlay */}
      {isCloseShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {t('confirmCloseShift') || 'Close Shift'}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t('closeShiftWarning') || 'Are you sure you want to close this shift? This will log you out of this shift session.'}
            </p>

            <form onSubmit={handleCloseShiftSubmit} className="mt-6 space-y-4">
              <div className="rounded-lg bg-[var(--accent)]/10 border border-[var(--border)] p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">{t('openingCash') || 'Opening Cash'}:</span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">{openingCash.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">{t('cashSales') || 'Cash Sales'}:</span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">{cashSales.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border)]/40 pt-2 font-bold">
                  <span className="text-[var(--foreground)]">{t('expectedCash') || 'Expected Cash'}:</span>
                  <span className="font-mono text-brand-500">{expectedCash.toFixed(2)} EGP</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="closing-cash">
                  {t('actualCash') || 'Actual Cash in Drawer'} (EGP)
                </label>
                <input
                  id="closing-cash"
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="rounded-lg bg-[var(--accent)]/5 border border-[var(--border)]/60 p-3 text-xs flex justify-between items-center font-bold">
                <span className="text-[var(--muted-foreground)]">{t('difference') || 'Difference'}:</span>
                <span className={cn(
                  "font-mono",
                  difference === 0 ? "text-success-500" : difference > 0 ? "text-emerald-400" : "text-danger-500"
                )}>
                  {difference >= 0 ? '+' : ''}{difference.toFixed(2)} EGP
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="close-notes">
                  {t('notes') || 'Notes'}
                </label>
                <textarea
                  id="close-notes"
                  value={closeShiftNotes}
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="mt-1 flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCloseShiftOpen(false)}
                >
                  {tCommon('buttons.cancel') || 'Cancel'}
                </AppButton>
                <AppButton
                  type="submit"
                  size="sm"
                  isLoading={isClosingShift}
                  className="bg-danger-500 text-white hover:bg-danger-600 border-none"
                >
                  {t('closeShift') || 'Close Shift'}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Button */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
          <button
            type="button"
            onClick={() => setActiveTab('cart')}
            className="w-full flex items-center justify-between bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-5 py-3.5 shadow-lg shadow-brand-500/20 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4.5 w-4.5" />
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</span>
            </span>
            <span className="font-mono font-bold">View Cart • {grandTotal.toFixed(2)} EGP</span>
          </button>
        </div>
      )}
      {/* Queue Order Detail / Priority Toggle Modal */}
      {selectedQueueOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in text-left">
            {isDirectPaymentStep ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]/40">
                  <h2 className="text-base font-bold text-[var(--foreground)]">
                    Settle Payment
                  </h2>
                  <span className="text-xs text-[var(--muted-foreground)] font-mono font-bold">
                    {selectedQueueOrder.code}
                  </span>
                </div>

                {/* Amount to pay */}
                <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)] flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Bill:</span>
                  <span className="text-xl font-black text-brand-500 font-mono">
                    {selectedQueueOrder.total.toFixed(2)} EGP
                  </span>
                </div>

                {/* Payment method segmented control */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Metode Pembayaran</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDirectPaymentMethod('CASH');
                        setDirectAmountReceived(selectedQueueOrder.total);
                      }}
                      className={cn(
                        "flex items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer text-xs font-bold uppercase border-none",
                        directPaymentMethod === 'CASH'
                          ? "border-brand-500 text-brand-500 bg-brand-500/5"
                          : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectPaymentMethod('QRIS')}
                      className={cn(
                        "flex items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer text-xs font-bold uppercase border-none",
                        directPaymentMethod === 'QRIS'
                          ? "border-brand-500 text-brand-500 bg-brand-500/5"
                          : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                    >
                      QRIS / E-Wallet
                    </button>
                  </div>
                </div>

                {/* Dynamic inputs based on method */}
                {directPaymentMethod === 'CASH' ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-[var(--muted-foreground)]">Uang Diterima</span>
                      <input
                        type="number"
                        value={directAmountReceived || ''}
                        onChange={(e) => setDirectAmountReceived(parseFloat(e.target.value) || 0)}
                        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] font-mono font-bold focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Masukkan nominal..."
                      />
                    </div>

                    {/* Quick Cash options */}
                    <div className="flex flex-wrap gap-2.5">
                      {[selectedQueueOrder.total, 50, 100, 200].map((nominal) => {
                        if (nominal < selectedQueueOrder.total) return null;
                        return (
                          <button
                            key={nominal}
                            type="button"
                            onClick={() => setDirectAmountReceived(nominal)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[10px] font-bold text-[var(--muted-foreground)] hover:text-brand-500 hover:border-brand-500 transition-all cursor-pointer bg-transparent"
                          >
                            {nominal === selectedQueueOrder.total ? 'Uang Pas' : `${nominal} EGP`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Change due */}
                    {directAmountReceived >= selectedQueueOrder.total && (
                      <div className="flex justify-between items-baseline bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-emerald-500 font-bold text-xs">
                        <span>Kembalian:</span>
                        <span className="text-sm font-mono font-bold">
                          {(directAmountReceived - selectedQueueOrder.total).toFixed(2)} EGP
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center text-blue-500 animate-fade-in">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center border-none">
                      <QrCode className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Simulasi Bayar QRIS</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">System will auto-confirm payment reference as SUCCESS</span>
                  </div>
                )}

                {/* Direct payment action buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirectPaymentStep(false);
                    }}
                    className="flex-1 flex h-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-bold transition-all bg-[var(--card)] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={
                      isSubmittingDirectPayment ||
                      (directPaymentMethod === 'CASH' && directAmountReceived < selectedQueueOrder.total)
                    }
                    onClick={async () => {
                      setIsSubmittingDirectPayment(true);
                      try {
                        const payload = {
                          paymentMethod: directPaymentMethod,
                          amountReceived: directPaymentMethod === 'CASH' ? directAmountReceived : 0,
                          change: directPaymentMethod === 'CASH' ? Math.max(0, directAmountReceived - selectedQueueOrder.total) : 0,
                          qrisStatus: directPaymentMethod === 'QRIS' ? 'SUCCESS' : null,
                        };

                        const response = await apiClient.patch<any>(`/orders/${selectedQueueOrder.id}/pay`, payload);

                        // Populate receipt completed sale metadata
                        setCompletedSale({
                          receiptCode: response.code || selectedQueueOrder.code,
                          customerName: selectedQueueOrder.customerName || 'Walk-in',
                          tableNumber: selectedQueueOrder.tableNumber ? `T-${selectedQueueOrder.tableNumber}` : '',
                          orderType: selectedQueueOrder.orderType,
                          paymentMethod: directPaymentMethod,
                          items: selectedQueueOrder.items.map((item: any) => ({
                            name: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.product?.sellingPrice || item.unitPrice,
                          })),
                          subtotal: selectedQueueOrder.subtotal || selectedQueueOrder.total,
                          discount: selectedQueueOrder.discount || 0,
                          grandTotal: selectedQueueOrder.total,
                          cashierName: user?.name || 'Cashier',
                          dateStr: new Date().toLocaleString(),
                        });

                        setIsReceiptOpen(true);
                        setSelectedQueueOrder(null); // close details modal
                        setIsDirectPaymentStep(false); // reset modal step
                        refetchOrders(); // refresh queue feed
                        toast.rawSuccess(`Pembayaran order ${selectedQueueOrder.code} berhasil diselesaikan!`);
                      } catch (err: any) {
                        toast.rawError(err.message || 'Gagal menyelesaikan pembayaran');
                      } finally {
                        setIsSubmittingDirectPayment(false);
                      }
                    }}
                    className="flex-2 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
                  >
                    {isSubmittingDirectPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Konfirmasi & Cetak
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[var(--foreground)]">
                      Order {selectedQueueOrder.code}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Customer: <span className="font-semibold text-[var(--foreground)]">{selectedQueueOrder.customerName}</span>
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Table: <span className="font-semibold text-[var(--foreground)]">{selectedQueueOrder.tableNumber ? `Table ${selectedQueueOrder.tableNumber}` : 'Takeaway / Delivery'}</span>
                    </p>
                  </div>
                  {selectedQueueOrder.isPriority && (
                    <span className="flex items-center gap-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
                      <AlertCircle className="h-3 w-3" /> Priority
                    </span>
                  )}
                </div>

                {/* Items Summary */}
                <div className="mt-6 border-y border-[var(--border)]/40 py-4 max-h-[200px] overflow-y-auto space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80 mb-2">
                    Order Items
                  </p>
                  {selectedQueueOrder.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[var(--foreground)]">{item.productName}</span>
                      <span className="font-semibold font-mono text-[var(--muted-foreground)] bg-[var(--accent)]/30 px-2 py-0.5 rounded">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-[var(--border)]/30 text-brand-500">
                    <span>Total Tagihan</span>
                    <span>{selectedQueueOrder.total.toFixed(2)} EGP</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-2">
                  {selectedQueueOrder.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiClient.patch(`/public/orders/${selectedQueueOrder.id}/confirm`);
                          toast.rawSuccess(`Order ${selectedQueueOrder.code} berhasil dikonfirmasi ke dapur!`);
                          refetchOrders();
                          setSelectedQueueOrder((prev: any) => (prev ? { ...prev, status: 'CONFIRMED' } : null));
                        } catch (err: any) {
                          toast.rawError(err.message || 'Gagal konfirmasi order');
                        }
                      }}
                      className="w-full flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-[0.98] border-none animate-pulse"
                    >
                      <Flame className="h-4 w-4" />
                      Konfirmasi & Kirim Tiket Ke Dapur
                    </button>
                  )}

                  {!selectedQueueOrder.isPaid && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectPaymentMethod('CASH');
                        setDirectAmountReceived(selectedQueueOrder.total);
                        setIsDirectPaymentStep(true);
                      }}
                      className="w-full flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] border-none animate-pulse"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Bayar Sekarang (Settle Payment)
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isUpdatingPriority}
                    onClick={async () => {
                      setIsUpdatingPriority(true);
                      try {
                        const isNowPriority = !selectedQueueOrder.isPriority;
                        await apiClient.patch(`/orders/${selectedQueueOrder.id}/priority`, {
                          isPriority: isNowPriority,
                        });
                        
                        toast.rawSuccess(
                          isNowPriority
                            ? 'Order marked as PRIORITY / URGENT!'
                            : 'Priority flag removed.'
                        );
                        
                        // Update state & refetch orders list
                        setSelectedQueueOrder({ ...selectedQueueOrder, isPriority: isNowPriority });
                        refetchOrders();
                      } catch (err: any) {
                        toast.rawError(err.message || 'Failed to update priority');
                      } finally {
                        setIsUpdatingPriority(false);
                      }
                    }}
                    className={cn(
                      "w-full flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 text-white border-none",
                      selectedQueueOrder.isPriority
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-rose-500 hover:bg-rose-600"
                    )}
                  >
                    <AlertCircle className="h-4 w-4" />
                    {selectedQueueOrder.isPriority ? 'Remove Priority / Urgent' : 'Mark as Priority / Urgent'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Map items from selectedQueueOrder into the cart
                      const newCartItems = selectedQueueOrder.items.map((item: any) => ({
                        product: {
                          id: item.productId,
                          name: item.productName,
                          sellingPrice: item.product?.sellingPrice || item.unitPrice,
                          category: item.product?.category || 'General',
                          image: item.product?.image || null,
                        },
                        quantity: item.quantity,
                        notes: item.notes || '',
                        selectedModifiers: item.modifiers || [],
                        discount: item.discount || 0,
                      }));

                      setCart(newCartItems);
                      setCustomerName(selectedQueueOrder.customerName || 'Walk-in');
                      setCustomerPhone(selectedQueueOrder.customerPhone || '');
                      setOrderType(selectedQueueOrder.orderType || 'TAKE_AWAY');
                      setSelectedTableId(selectedQueueOrder.tableId || '');
                      setDiscount(selectedQueueOrder.discount || 0);

                      setEditingOrderId(selectedQueueOrder.id);
                      setEditingOrderCode(selectedQueueOrder.code);
                      setSelectedQueueOrder(null); // Close modal
                      
                      toast.rawSuccess(`Mengedit order ${selectedQueueOrder.code}`);
                    }}
                    className="w-full flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] border-none"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Order (Tambah/Ubah Menu)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQueueOrder(null)}
                    className="w-full flex h-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-bold transition-all bg-[var(--card)] cursor-pointer"
                  >
                    Close Details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
