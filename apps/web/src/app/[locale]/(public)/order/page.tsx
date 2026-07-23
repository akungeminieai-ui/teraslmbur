/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { apiPublic } from '@/lib/api-public';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
  Package,
  MessageCircle,
  ExternalLink,
  Download,
  Receipt,
  PlusCircle,
  Armchair,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sellingPrice: number;
  category: string;
  categorySlug: string;
  stock: number;
  modifiers: ModifierGroup[];
  availabilityStatus: string;
}

interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

interface CartItem {
  product: MenuProduct;
  quantity: number;
  notes: string;
  selectedModifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }>;
}

interface OrderDetail {
  id: string;
  code: string;
  type: string;
  status: string;
  tableId?: string | null;
  tableNumber?: number | null;
  tableName?: string | null;
  customerName: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  isPaid: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    modifiers: any;
    notes?: string;
  }>;
}

interface PublicTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: string;
}

// ─────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return `${value.toFixed(2)} EGP`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function SelfOrderPage() {
  const t = useTranslations('selfOrder');
  const locale = useLocale();

  // ── State ──
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  // Active Order state (persisted in localStorage)
  const [activeOrderCode, setActiveOrderCode] = React.useState<string | null>(null);
  const [customerName, setCustomerName] = React.useState('');
  const [selectedTableId, setSelectedTableId] = React.useState<string>('');
  const [orderType, setOrderType] = React.useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');
  const [appendToExisting, setAppendToExisting] = React.useState(true);
  const [orderNotes, setOrderNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showReceiptScreen, setShowReceiptScreen] = React.useState(false);

  // Social Links state
  const [socialLinks, setSocialLinks] = React.useState({
    whatsapp: 'https://chat.whatsapp.com/your-group-link',
    instagram: 'https://instagram.com/teraslmbur',
    tiktok: 'https://tiktok.com/@teraslmbur',
  });

  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Load active order, table params & social links
  React.useEffect(() => {
    try {
      const savedCode = localStorage.getItem('teras_active_order_code');
      const savedName = localStorage.getItem('teras_active_customer_name');
      if (savedCode) {
        setActiveOrderCode(savedCode);
      }
      if (savedName) {
        setCustomerName(savedName);
      }

      const savedSocials = localStorage.getItem('teras_social_links');
      if (savedSocials) {
        const parsed = JSON.parse(savedSocials);
        setSocialLinks({
          whatsapp: parsed.whatsapp || 'https://chat.whatsapp.com/your-group-link',
          instagram: parsed.instagram || 'https://instagram.com/teraslmbur',
          tiktok: parsed.tiktok || 'https://tiktok.com/@teraslmbur',
        });
      }

      // Read table query param from URL (e.g. ?table=5 or ?tableId=xxx)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlTable = params.get('table');
        const urlTableId = params.get('tableId');
        if (urlTableId) {
          setSelectedTableId(urlTableId);
        } else if (urlTable) {
          (window as any).__urlTableNum = parseInt(urlTable, 10);
        }
      }
    } catch {
      // Ignore error
    }
  }, []);

  // Modifier modal state
  const [modifierProduct, setModifierProduct] = React.useState<MenuProduct | null>(null);
  const [modifierSelections, setModifierSelections] = React.useState<Record<string, string[]>>({});

  // ── Menu Query ──
  const { data: products = [], isLoading } = useQuery<MenuProduct[]>({
    queryKey: ['public-menu', locale],
    queryFn: () => apiPublic.get(`/public/menu?locale=${locale}`),
    staleTime: 30000,
  });

  // ── Tables Query ──
  const { data: tables = [] } = useQuery<PublicTable[]>({
    queryKey: ['public-tables'],
    queryFn: () => apiPublic.get('/public/tables'),
  });

  // Pre-select table if table number was passed in URL
  React.useEffect(() => {
    if (tables.length > 0 && (window as any).__urlTableNum) {
      const targetNum = (window as any).__urlTableNum;
      const matched = tables.find((t) => t.number === targetNum);
      if (matched) {
        setSelectedTableId(matched.id);
      }
    }
  }, [tables]);

  // ── Active Order Detail Query ──
  const { data: activeOrder, refetch: refetchActiveOrder } = useQuery<OrderDetail>({
    queryKey: ['public-order', activeOrderCode],
    queryFn: () => apiPublic.get(`/public/orders/${activeOrderCode}`),
    enabled: !!activeOrderCode,
    refetchInterval: 10000,
  });

  // ── Categories ──
  const categories = React.useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return [t('allCategories'), ...Array.from(cats)];
  }, [products, t]);

  // ── Filtered Products ──
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === t('allCategories') || selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory, t]);

  // ── Cart computations ──
  const cartItemCount = React.useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const cartTotal = React.useMemo(() => {
    return cart.reduce((sum, item) => {
      const modAdj = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
      return sum + (item.product.sellingPrice + modAdj) * item.quantity;
    }, 0);
  }, [cart]);

  // ── Handlers ──
  const handleAddToCart = React.useCallback((product: MenuProduct) => {
    if (product.modifiers && product.modifiers.length > 0) {
      setModifierProduct(product);
      setModifierSelections({});
    } else {
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.product.id === product.id && item.selectedModifiers.length === 0,
        );
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id && item.selectedModifiers.length === 0
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [...prev, { product, quantity: 1, notes: '', selectedModifiers: [] }];
      });
      toast.success(`${product.name} +1`);
    }
  }, []);

  const handleConfirmModifiers = () => {
    if (!modifierProduct) return;

    for (const group of modifierProduct.modifiers) {
      if (group.isRequired) {
        const selected = modifierSelections[group.id] || [];
        if (selected.length < group.minSelect) {
          toast.error(`${group.name}: ${t('modifierRequired')}`);
          return;
        }
      }
    }

    const selectedMods: CartItem['selectedModifiers'] = [];
    for (const group of modifierProduct.modifiers) {
      const selected = modifierSelections[group.id] || [];
      for (const optId of selected) {
        const option = group.options.find((o) => o.id === optId);
        if (option) {
          selectedMods.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceAdjustment: option.priceAdjustment,
          });
        }
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => {
        if (item.product.id !== modifierProduct.id) return false;
        if (item.selectedModifiers.length !== selectedMods.length) return false;
        const existingIds = item.selectedModifiers.map((m) => m.optionId).sort().join(',');
        const newIds = selectedMods.map((m) => m.optionId).sort().join(',');
        return existingIds === newIds;
      });

      if (existing) {
        return prev.map((item) => {
          const existingIds = item.selectedModifiers.map((m) => m.optionId).sort().join(',');
          const newIds = selectedMods.map((m) => m.optionId).sort().join(',');
          if (item.product.id === modifierProduct.id && existingIds === newIds) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      }

      return [...prev, { product: modifierProduct, quantity: 1, notes: '', selectedModifiers: selectedMods }];
    });

    toast.success(`${modifierProduct.name} +1`);
    setModifierProduct(null);
    setModifierSelections({});
  };

  const handleToggleModifierOption = (groupId: string, optionId: string, maxSelect: number) => {
    setModifierSelections((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.length >= maxSelect) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    const isAppending = appendToExisting && !!activeOrderCode;
    if (!isAppending && !customerName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    if (orderType === 'DINE_IN' && !selectedTableId && !isAppending) {
      toast.error('Harap pilih nomor meja untuk Makan di Tempat');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || activeOrder?.customerName || 'Walk-in',
        orderType,
        tableId: selectedTableId || undefined,
        existingOrderCode: isAppending ? activeOrderCode! : undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          modifiers: item.selectedModifiers,
          notes: item.notes || null,
        })),
        notes: orderNotes.trim() || null,
      };

      const result = await apiPublic.post<any>('/public/orders', payload);

      // Save active order code
      localStorage.setItem('teras_active_order_code', result.code);
      localStorage.setItem('teras_active_customer_name', result.customerName);
      setActiveOrderCode(result.code);

      setCart([]);
      setIsCartOpen(false);
      setShowReceiptScreen(true);
      refetchActiveOrder();

      if (result.isAppended) {
        toast.success(`Berhasil menambah pesanan ke ${result.code}!`);
      } else {
        toast.success(`Pesanan ${result.code} berhasil dibuat!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    localStorage.removeItem('teras_active_order_code');
    setActiveOrderCode(null);
    setShowReceiptScreen(false);
    setCart([]);
    setSearch('');
    setSelectedCategory('All');
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  // ── Order Success / Struk Online Screen (POS Thermal Receipt Design) ──
  if (showReceiptScreen || (activeOrderCode && activeOrder && showReceiptScreen)) {
    const displayOrder = activeOrder;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]">
        {/* Success Header */}
        <div className="relative mb-4 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-black text-[var(--foreground)] tracking-tight">
            Pesanan Terkirim!
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Pesanan kamu telah diterima dan sedang diproses.
          </p>
        </div>

        {/* ── POS Thermal Paper Struk Card ── */}
        <div
          ref={receiptRef}
          className="w-full max-w-sm rounded-2xl bg-white text-black shadow-2xl p-6 font-sans border border-zinc-200 space-y-4 print:shadow-none print:border-none print:w-full print:p-0"
        >
          {/* Receipt Top Brand Header */}
          <div className="flex flex-col items-center text-center space-y-1">
            <div className="h-9 w-9 rounded-lg border-2 border-black flex items-center justify-center mb-1">
              <Receipt className="h-5 w-5 text-black" />
            </div>
            <h2 className="text-base font-extrabold tracking-tight uppercase text-black">
              TERAS LMBUR
            </h2>
            <p className="text-xs text-zinc-600 font-medium">Teras Lmbur Outlet</p>
            {displayOrder && (
              <p className="text-xs text-zinc-600 font-mono">
                {formatDate(displayOrder.createdAt)}
              </p>
            )}
          </div>

          {/* Top Dashed Divider */}
          <div className="border-t border-dashed border-zinc-300 my-3" />

          {/* Key-Value Details Grid */}
          {displayOrder ? (
            <>
              <div className="space-y-1.5 text-xs text-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Nomor Struk:</span>
                  <span className="font-mono font-bold text-black text-sm">{displayOrder.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Customer:</span>
                  <span className="font-medium text-black">{displayOrder.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Service Type:</span>
                  <span className="font-medium text-black">
                    {displayOrder.type === 'DINE_IN'
                      ? `Dine In ${displayOrder.tableNumber ? `(Meja #${displayOrder.tableNumber})` : ''}`
                      : 'Takeaway'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Kasir:</span>
                  <span className="font-medium text-black">Self-Order QR</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-zinc-600">Pembayaran:</span>
                  <span className="font-bold text-black text-right max-w-[170px] leading-tight">
                    {displayOrder.isPaid ? 'LUNAS (PAID)' : 'BELUM BAYAR (PAY LATER)'}
                  </span>
                </div>
              </div>

              {/* Middle Dashed Divider */}
              <div className="border-t border-dashed border-zinc-300 my-3" />

              {/* Items Table Header */}
              <div>
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-zinc-700 pb-1.5">
                  <span className="col-span-6">ITEM</span>
                  <span className="col-span-2 text-center">JUMLAH</span>
                  <span className="col-span-4 text-right">TOTAL</span>
                </div>

                {/* Items List */}
                <div className="space-y-2 text-xs">
                  {displayOrder.items.map((item) => (
                    <div key={item.id} className="space-y-0.5">
                      <div className="grid grid-cols-12 text-zinc-900 leading-snug font-medium">
                        <span className="col-span-6 truncate pr-1">{item.productName}</span>
                        <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                        <span className="col-span-4 text-right font-mono">{formatCurrency(item.subtotal)}</span>
                      </div>
                      {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                        <p className="text-[10px] text-zinc-500 pl-2">
                          + {item.modifiers.map((m: any) => m.optionName || m.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-zinc-500 italic pl-2">
                          Catatan: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Breakdown */}
              <div className="border-t border-dashed border-zinc-300 my-3" />

              <div className="space-y-2 text-xs text-zinc-800">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-600">Subtotal</span>
                  <span>{formatCurrency(displayOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black uppercase text-black">TOTAL TAGIHAN</span>
                  <span className="font-mono text-base font-black text-black">
                    {formatCurrency(displayOrder.total)}
                  </span>
                </div>
              </div>

              {/* Bottom Solid Divider Line */}
              <div className="border-t-2 border-zinc-400 my-4" />

              {/* Bottom Message */}
              <div className="text-center space-y-1">
                <p className="text-xs text-zinc-700 font-medium">Thank you for dining with us!</p>
                <p className="font-mono text-xs font-bold tracking-widest text-black">TERAS LMBUR</p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
            </div>
          )}
        </div>

        {/* Cashier Payment Notice */}
        <div className="mt-4 w-full max-w-sm text-center bg-amber-500/10 rounded-2xl p-3.5 border border-amber-500/30">
          <p className="text-xs font-bold text-amber-500 leading-snug">
            📌 Tunjukkan struk ini ke kasir/bar saat melakukan pembayaran
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 w-full max-w-sm flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--background)] cursor-pointer transition-all active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-brand-500" />
            Download / Cetak Struk
          </button>

          <button
            type="button"
            onClick={() => setShowReceiptScreen(false)}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Tambah Pesanan Lagi (Menu)
          </button>
        </div>

        {/* Social CTA */}
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg">
          <h3 className="text-sm font-bold text-[var(--foreground)] text-center">
            {t('followUs')} 🎉
          </h3>
          <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-1">
            {t('followUsDesc')}
          </p>

          <div className="mt-4 space-y-2.5">
            {/* WhatsApp Group */}
            {socialLinks.whatsapp && (
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold flex-1">{t('joinWhatsApp')}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            )}

            {/* Instagram */}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full rounded-xl bg-pink-500/10 border border-pink-500/20 px-4 py-3 text-pink-500 hover:bg-pink-500/20 transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                <span className="text-xs font-bold flex-1">{t('instagram')}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            )}

            {/* TikTok */}
            {socialLinks.tiktok && (
              <a
                href={socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full rounded-xl bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)] hover:bg-[var(--card)] transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15v-3.44a4.85 4.85 0 01-2.65-.76v-4.26h2.65z"/>
                </svg>
                <span className="text-xs font-bold flex-1">{t('tiktok')}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            )}
          </div>
        </div>

        {/* Start Fresh Order */}
        <button
          type="button"
          onClick={handleNewOrder}
          className="mt-6 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline transition-colors cursor-pointer"
        >
          Buat Pesanan Baru untuk Orang Lain
        </button>
      </div>
    );
  }

  // ── Main Menu Page ──
  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* ── Hero Header ── */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="h-5 w-5 text-brand-500" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-[var(--foreground)] tracking-tight truncate">
                  {t('brandName')}
                </h1>
                <p className="text-[10px] text-[var(--muted-foreground)] font-medium">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* Active Order Button */}
            {activeOrderCode && (
              <button
                type="button"
                onClick={() => setShowReceiptScreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold hover:bg-brand-500/20 cursor-pointer transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px]">{activeOrderCode}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 flex-1">
        {/* Active Order Top Banner */}
        {activeOrderCode && activeOrder && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[var(--foreground)] truncate">
                  Pesanan Aktif: <span className="font-mono text-brand-500">{activeOrder.code}</span>
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  An. {activeOrder.customerName} {activeOrder.tableNumber ? `· Meja #${activeOrder.tableNumber}` : ''} · {formatCurrency(activeOrder.total)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReceiptScreen(true)}
              className="shrink-0 text-[10px] font-bold text-brand-500 bg-brand-500/20 hover:bg-brand-500/30 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              Lihat Struk
            </button>
          </div>
        )}

        {/* ── Search ── */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedCategory('All');
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* ── Category Filter ── */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat === t('allCategories') ? 'All' : cat);
                setSearch('');
              }}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border",
                (selectedCategory === cat || (selectedCategory === 'All' && cat === t('allCategories')))
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/20"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Product Grid ── */}
        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-xs text-[var(--muted-foreground)] font-medium">Loading menu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Package className="h-10 w-10 text-[var(--muted-foreground)]/30" />
              <p className="text-xs text-[var(--muted-foreground)] font-medium">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0 || product.availabilityStatus === 'OUT_OF_STOCK';
                const isUnavailable = product.availabilityStatus === 'UNAVAILABLE' || product.availabilityStatus === 'DISCONTINUED';

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOutOfStock || isUnavailable}
                    onClick={() => handleAddToCart(product)}
                    className={cn(
                      "group relative rounded-2xl border bg-[var(--card)] overflow-hidden transition-all text-left cursor-pointer active:scale-[0.97]",
                      isOutOfStock || isUnavailable
                        ? "opacity-50 cursor-not-allowed border-[var(--border)]"
                        : "border-[var(--border)] hover:border-brand-500/30 hover:shadow-md hover:shadow-brand-500/5"
                    )}
                  >
                    {/* Product Image */}
                    <div className="relative aspect-[4/3] bg-[var(--background)] overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-[var(--muted-foreground)]/20" />
                        </div>
                      )}

                      {/* Out of stock badge */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-full">
                            {t('outOfStock')}
                          </span>
                        </div>
                      )}

                      {/* Add button overlay */}
                      {!isOutOfStock && !isUnavailable && (
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500 truncate">
                        {product.category}
                      </p>
                      <h3 className="text-xs font-bold text-[var(--foreground)] mt-0.5 line-clamp-2 leading-snug">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-black text-[var(--foreground)]">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        {product.modifiers.length > 0 && (
                          <span className="text-[8px] font-bold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded-full border border-brand-500/20">
                            {t('selectModifiers')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Cart Button ── */}
      {cartItemCount > 0 && !isCartOpen && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-brand-500 text-white px-6 py-3.5 shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.97] cursor-pointer animate-fade-in"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white text-brand-500 text-[9px] font-black flex items-center justify-center">
              {cartItemCount}
            </span>
          </div>
          <span className="text-sm font-bold">{t('cart')}</span>
          <span className="text-sm font-black">{formatCurrency(cartTotal)}</span>
        </button>
      )}

      {/* ── Cart Drawer (Slide-up) ── */}
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Cart Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col rounded-t-3xl border-t border-[var(--border)] bg-[var(--card)] shadow-2xl"
               style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[var(--muted-foreground)]/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand-500" />
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  {t('cart')} ({cartItemCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <ShoppingCart className="h-10 w-10 text-[var(--muted-foreground)]/20" />
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">{t('cartEmpty')}</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map((item, idx) => {
                      const modAdj = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
                      const unitPrice = item.product.sellingPrice + modAdj;

                      return (
                        <div key={`${item.product.id}-${idx}`} className="flex gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                          {/* Thumbnail */}
                          <div className="h-14 w-14 rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden shrink-0">
                            {item.product.image ? (
                              <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UtensilsCrossed className="h-4 w-4 text-[var(--muted-foreground)]/20" />
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[var(--foreground)] truncate">{item.product.name}</h4>
                            {item.selectedModifiers.length > 0 && (
                              <p className="text-[10px] text-brand-500 font-medium mt-0.5 truncate">
                                {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                              </p>
                            )}
                            <p className="text-xs font-bold text-[var(--foreground)] mt-1">
                              {formatCurrency(unitPrice * item.quantity)}
                            </p>

                            {/* Qty Controls */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, -1)}
                                className="h-7 w-7 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold text-[var(--foreground)] w-6 text-center font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, 1)}
                                className="h-7 w-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 hover:bg-brand-500/20 cursor-pointer transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 cursor-pointer transition-colors ml-auto"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Order Append Mode Toggle */}
                  {activeOrderCode && (
                    <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-500 block">
                        Tujuan Pesanan Ini
                      </label>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="appendOption"
                            checked={appendToExisting}
                            onChange={() => setAppendToExisting(true)}
                            className="accent-brand-500 h-4 w-4"
                          />
                          <span className="text-xs font-bold text-[var(--foreground)]">
                            Tambah ke Pesanan Aktif (<span className="font-mono text-brand-500">{activeOrderCode}</span>)
                          </span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="appendOption"
                            checked={!appendToExisting}
                            onChange={() => setAppendToExisting(false)}
                            className="accent-brand-500 h-4 w-4"
                          />
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">
                            Buat Pesanan Baru Terpisah
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Customer Info & Table Picker */}
                  <div className="space-y-3">
                    {/* Name Input */}
                    {(!activeOrderCode || !appendToExisting) && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5">
                          {t('yourName')} *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={t('yourNamePlaceholder')}
                          className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    )}

                    {/* Order Type */}
                    {(!activeOrderCode || !appendToExisting) && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5">
                          {t('orderType')}
                        </label>
                        <div className="flex rounded-xl bg-[var(--background)] border border-[var(--border)] p-1 gap-1">
                          <button
                            type="button"
                            onClick={() => setOrderType('DINE_IN')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              orderType === 'DINE_IN'
                                ? "bg-brand-500 text-white shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                          >
                            {t('dineIn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('TAKE_AWAY')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              orderType === 'TAKE_AWAY'
                                ? "bg-brand-500 text-white shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                          >
                            {t('takeAway')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Table Selection dropdown if DINE_IN */}
                    {orderType === 'DINE_IN' && (!activeOrderCode || !appendToExisting) && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5 flex items-center gap-1">
                          <Armchair className="h-3 w-3 text-brand-500" /> Nomor Meja *
                        </label>
                        <select
                          value={selectedTableId}
                          onChange={(e) => setSelectedTableId(e.target.value)}
                          className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-semibold text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Nomor Meja --</option>
                          {tables.map((tItem) => (
                            <option key={tItem.id} value={tItem.id}>
                              Meja #{tItem.number} {tItem.name ? `(${tItem.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5">
                        {t('specialNotes')}
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder={t('specialNotesPlaceholder')}
                        rows={2}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer — Summary & Submit */}
            {cart.length > 0 && (
              <div className="border-t border-[var(--border)] px-5 py-4 space-y-3 bg-[var(--card)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)] font-medium">{t('total')}</span>
                  <span className="text-lg font-black text-[var(--foreground)]">{formatCurrency(cartTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {appendToExisting && activeOrderCode ? `Tambah Pesanan (${activeOrderCode})` : t('submitOrder')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Slide-up animation */}
          <style jsx global>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}

      {/* ── Modifier Modal ── */}
      {modifierProduct && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setModifierProduct(null);
              setModifierSelections({});
            }}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
               style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--foreground)] truncate">{modifierProduct.name}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{t('selectModifiers')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModifierProduct(null);
                  setModifierSelections({});
                }}
                className="h-8 w-8 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modifier Groups */}
            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {modifierProduct.modifiers.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[var(--foreground)]">{group.name}</h4>
                    <span className={cn(
                      "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                      group.isRequired
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)]"
                    )}>
                      {group.isRequired ? t('modifierRequired') : t('modifierOptional')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.options.map((option) => {
                      const isSelected = (modifierSelections[group.id] || []).includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleToggleModifierOption(group.id, option.id, group.maxSelect)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer",
                            isSelected
                              ? "border-brand-500 bg-brand-500/10 text-brand-500"
                              : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                          )}
                        >
                          <span className="font-semibold">{option.name}</span>
                          {option.priceAdjustment > 0 && (
                            <span className="font-bold">+{formatCurrency(option.priceAdjustment)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setModifierProduct(null);
                  setModifierSelections({});
                }}
                className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmModifiers}
                className="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white cursor-pointer transition-all shadow-sm shadow-brand-500/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>

          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
              to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
