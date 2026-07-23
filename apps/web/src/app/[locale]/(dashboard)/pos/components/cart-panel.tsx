'use client';

import * as React from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Hash,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  MapPin,
  Tag,
} from 'lucide-react';
import { EmptyCart } from './empty-cart';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface CartItem {
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    category: string;
    image: string | null;
    stock?: number;
  };
  quantity: number;
  notes: string;
  selectedModifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }>;
  discount: number; // nominal item discount
}

interface CartPanelProps {
  items: CartItem[];
  onUpdateQty: (productId: string, delta: number) => void;
  onUpdateNotes: (productId: string, notes: string) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;

  // Customer info
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  orderType: 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY';
  setOrderType: (type: 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY') => void;

  // Table Management
  tables: Array<{ id: string; number: number; name?: string | null; status: string }>;
  selectedTableId: string;
  setSelectedTableId: (id: string) => void;

  // Checkout payment details
  paymentMethod: 'CASH' | 'QRIS';
  setPaymentMethod: (method: 'CASH' | 'QRIS') => void;
  amountReceived: number;
  setAmountReceived: (val: number) => void;
  qrisStatus: 'Pending' | 'Paid';
  setQrisStatus: (status: 'Pending' | 'Paid') => void;

  discount: number; // nominal order discount
  setDiscount: (val: number) => void;
  isSubmitting: boolean;
  onCheckout: (isPaid?: boolean) => void;
  taxEnable?: boolean;

  // Editing Order Mode props
  editingOrderId?: string | null;
  editingOrderCode?: string | null;
  onCancelEdit?: () => void;
  onSaveChanges?: () => void;
  isSavingChanges?: boolean;
}

export function CartPanel({
  items,
  onUpdateQty,
  onUpdateNotes,
  onUpdateItemDiscount,
  onRemoveItem,
  onClearCart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  orderType,
  setOrderType,
  tables,
  selectedTableId,
  setSelectedTableId,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  qrisStatus,
  setQrisStatus,
  discount,
  setDiscount,
  isSubmitting,
  onCheckout,
  taxEnable = false,

  editingOrderId = null,
  editingOrderCode = null,
  onCancelEdit,
  onSaveChanges,
  isSavingChanges = false,
}: CartPanelProps) {
  const t = useTranslations('pos');
  const tOrders = useTranslations('orders');

  // Calculations
  const subtotal = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const modifierAdjustments = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
      const unitPrice = item.product.sellingPrice + modifierAdjustments;
      const finalPrice = Math.max(0, unitPrice - item.discount);
      return sum + finalPrice * item.quantity;
    }, 0);
  }, [items]);

  const discountAmount = React.useMemo(() => {
    return Math.min(discount, subtotal);
  }, [discount, subtotal]);

  const taxAmount = React.useMemo(() => {
    return taxEnable ? (subtotal - discountAmount) * 0.14 : 0;
  }, [taxEnable, subtotal, discountAmount]);

  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const totalItemCount = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const changeDue = Math.max(0, amountReceived - grandTotal);

  // Validate inputs (excluding cash payment since that is button-specific)
  const validationError = React.useMemo(() => {
    if (items.length === 0) return 'Cart is empty';
    if (orderType === 'DINE_IN' && !selectedTableId) {
      return 'Table number is required for Dine-in orders';
    }
    if (orderType === 'DELIVERY') {
      if (!customerPhone.trim()) return 'Customer phone number is required for Delivery';
      if (!customerName.trim()) return 'Customer name is required for Delivery';
      if (!customerAddress.trim()) return 'Delivery address is required';
    }
    return null;
  }, [items, orderType, selectedTableId, customerPhone, customerName, customerAddress]);

  const isCashReceivedInvalid = paymentMethod === 'CASH' && amountReceived < grandTotal;

  return (
    <div className="flex h-full w-full flex-col rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
      {/* Edit Order Banner */}
      {editingOrderId && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-amber-600 font-semibold animate-fade-in shrink-0">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Mengedit Order {editingOrderCode}
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[10px] uppercase font-bold text-amber-700 hover:text-amber-800 bg-amber-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Batal Edit
          </button>
        </div>
      )}

      {/* 1. Header (shrink-0) */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3 bg-[var(--background)]/20 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4.5 w-4.5 text-brand-500" />
          <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
            {t('cart')}
          </h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/10 px-2 text-[10px] font-bold text-brand-500 font-mono">
            {totalItemCount}
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-danger-500 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* 2. Customer Information (shrink-0) */}
      <div className="p-5 border-b border-[var(--border)] bg-[var(--card)]/5 space-y-4 shrink-0">
        <span className="text-xs font-semibold text-[var(--foreground)] block">
          1. Customer & Table Information
        </span>

        {/* Order Type Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'DINE_IN', label: tOrders('types.dineIn') },
            { key: 'TAKE_AWAY', label: tOrders('types.takeAway') },
            { key: 'DELIVERY', label: tOrders('types.delivery') },
          ] as const).map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => {
                setOrderType(type.key);
                if (type.key !== 'DINE_IN') setSelectedTableId('');
              }}
              className={cn(
                'flex items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider',
                orderType === type.key
                  ? 'border-brand-500 text-brand-500 bg-brand-500/5'
                  : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-3">
          {/* Phone Input (All types) */}
          <div className="relative w-full">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Customer Phone (e.g. 0812...)"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-brand-500 focus:outline-none transition-all"
            />
          </div>

          {/* Name Input (All types) */}
          <div className="relative w-full">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name..."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-brand-500 focus:outline-none transition-all"
            />
          </div>

          {/* Delivery Address Input (Delivery only) */}
          {orderType === 'DELIVERY' && (
            <div className="relative w-full animate-fade-in">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Delivery Address..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-brand-500 focus:outline-none transition-all"
              />
            </div>
          )}

          {/* Table Dropdown (Dine-in only) */}
          {orderType === 'DINE_IN' && (
            <div className="relative w-full animate-fade-in">
              <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none transition-all font-semibold"
              >
                <option value="">Select Table...</option>
                {tables.map((t) => {
                  const isAvailable = t.status === 'AVAILABLE';
                  const isOccupied = t.status === 'OCCUPIED';
                  const isSelectable = isAvailable || isOccupied;
                  return (
                    <option key={t.id} value={t.id} disabled={!isSelectable}>
                      Table {t.number} {t.name ? `(${t.name})` : ''} ({t.status})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Order Items Section (flex-1 dynamically stretched scroll container) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-3">
        <span className="text-xs font-semibold text-[var(--foreground)] block">
          2. Order Items
        </span>

        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center py-10 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--card)]/20">
            <EmptyCart message={t('emptyCart')} />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const modifierAdjustments = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0);
              const customizedPrice = item.product.sellingPrice + modifierAdjustments;
              const finalPrice = Math.max(0, customizedPrice - item.discount);

              return (
                <div
                  key={item.product.id}
                  className="flex flex-col gap-2 p-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/20 hover:border-[var(--border)]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-medium text-[var(--muted-foreground)] block">
                        {item.product.category}
                      </span>
                      <p className="text-xs font-semibold text-[var(--foreground)] leading-tight truncate">
                        {item.product.name}
                      </p>
                      {/* Modifiers List */}
                      {item.selectedModifiers.length > 0 && (
                        <div className="text-[9px] text-brand-500 font-medium mt-0.5 space-x-1">
                          {item.selectedModifiers.map((m) => (
                            <span key={m.optionId} className="bg-brand-500/10 px-1 py-0.5 rounded">
                              + {m.optionName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-[var(--muted-foreground)] hover:text-danger-500 p-1 rounded-md hover:bg-danger-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Qty & Item Prices */}
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center border border-[var(--border)] rounded-lg bg-[var(--card)] p-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.product.id, -1)}
                        className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold text-[var(--foreground)] font-mono min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.product.id, 1)}
                        className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Item Discount Input */}
                    <div className="flex items-center gap-1.5 border border-[var(--border)] rounded-lg px-2 py-0.5 bg-[var(--card)]">
                      <Tag className="h-3 w-3 text-[var(--muted-foreground)]" />
                      <input
                        type="number"
                        min="0"
                        max={customizedPrice}
                        placeholder="Discount..."
                        value={item.discount || ''}
                        onChange={(e) => onUpdateItemDiscount(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))}
                        className="h-6 w-12 text-[10px] text-right font-mono bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none"
                      />
                      <span className="text-[9px] font-bold text-[var(--muted-foreground)] font-sans">EGP</span>
                    </div>

                    <div className="text-right leading-tight">
                      <p className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {customizedPrice.toFixed(2)} EGP
                      </p>
                      <p className="text-xs font-semibold text-[var(--foreground)] font-mono mt-0.5">
                        {(finalPrice * item.quantity).toFixed(2)} EGP
                      </p>
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => onUpdateNotes(item.product.id, e.target.value)}
                    placeholder="Special instructions..."
                    className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 text-[10px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Payment Method Selection (shrink-0) */}
      <div className="p-5 border-t border-[var(--border)] bg-[var(--card)]/5 space-y-3 shrink-0">
        <span className="text-xs font-semibold text-[var(--foreground)] block">
          3. Payment Method
        </span>
        <div className="grid grid-cols-2 gap-3">
          {(['CASH', 'QRIS'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => {
                setPaymentMethod(method);
                if (method === 'QRIS') setAmountReceived(0);
              }}
              className={cn(
                'flex items-center justify-center px-4 rounded-xl border transition-all cursor-pointer h-10 text-xs font-semibold',
                paymentMethod === method
                  ? 'border-brand-500 text-brand-500 bg-brand-500/5'
                  : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              {method === 'CASH' ? 'Cash' : 'QRIS / E-Wallet'}
            </button>
          ))}
        </div>

        {/* Amount Received Input (CASH only) */}
        {paymentMethod === 'CASH' && (
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]/40 gap-3 animate-fade-in">
            <span className="text-xs text-[var(--muted-foreground)] font-medium">Cash Received:</span>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={amountReceived || ''}
                onChange={(e) => setAmountReceived(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={`${grandTotal.toFixed(2)} EGP`}
                className="h-8 w-28 text-right rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs font-mono text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* QRIS Status Dropdown (QRIS only) */}
        {paymentMethod === 'QRIS' && (
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]/40 gap-3 animate-fade-in">
            <span className="text-xs text-[var(--muted-foreground)] font-medium">QRIS Status:</span>
            <select
              value={qrisStatus}
              onChange={(e) => setQrisStatus(e.target.value as 'Pending' | 'Paid')}
              className="h-8 w-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none font-semibold text-right font-sans"
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. Summary & Settle Action Block (shrink-0) */}
      <div className="border-t border-[var(--border)] bg-[var(--background)]/90 p-5 space-y-4 shrink-0 font-sans">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-[var(--muted-foreground)] font-medium">
            <span>Subtotal</span>
            <span className="font-mono">{subtotal.toFixed(2)} EGP</span>
          </div>

          <div className="flex items-center justify-between text-[var(--muted-foreground)] font-medium">
            <span>Order Discount (EGP)</span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="h-7 w-20 text-right rounded border border-[var(--border)] bg-[var(--card)] px-2 text-[10px] font-mono text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
            />
          </div>

          {taxEnable && (
            <div className="flex justify-between text-[var(--muted-foreground)] font-medium">
              <span>Tax (14%)</span>
              <span className="font-mono">{taxAmount.toFixed(2)} EGP</span>
            </div>
          )}

          {paymentMethod === 'CASH' && amountReceived >= grandTotal && (
            <div className="flex justify-between text-emerald-500 font-semibold animate-fade-in">
              <span>Change Due</span>
              <span className="font-mono">{changeDue.toFixed(2)} EGP</span>
            </div>
          )}

          <hr className="border-[var(--border)]/50 my-1.5" />

          <div className="flex justify-between text-sm font-semibold text-[var(--foreground)]">
            <span>Grand Total</span>
            <span className="font-mono text-brand-500 text-base font-bold leading-none">
              {grandTotal.toFixed(2)} EGP
            </span>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 leading-none">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Buttons based on Editing mode vs Normal mode */}
        {editingOrderId ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={validationError !== null || isSavingChanges || isSubmitting}
              onClick={onSaveChanges}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white shadow-md shadow-amber-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] border-none"
            >
              {isSavingChanges ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </button>

            <button
              type="button"
              disabled={validationError !== null || isSubmitting || isSavingChanges || isCashReceivedInvalid}
              onClick={() => onCheckout(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-semibold text-white shadow-md shadow-brand-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] border-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Settle Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Bayar & Cetak Struk
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={validationError !== null || isSubmitting}
              onClick={() => onCheckout(false)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] hover:border-[var(--foreground)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-semibold bg-[var(--card)] cursor-pointer disabled:opacity-40 transition-all font-sans"
            >
              Pesan Dulu (Pay Later)
            </button>

            <button
              type="button"
              disabled={validationError !== null || isSubmitting || isCashReceivedInvalid}
              onClick={() => onCheckout(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-semibold text-white shadow-md shadow-brand-500/10 transition-all cursor-pointer disabled:opacity-40 active:scale-[0.98] font-sans border-none"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Bayar (Pay Now)'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
