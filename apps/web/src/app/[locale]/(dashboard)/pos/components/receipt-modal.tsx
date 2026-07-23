'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Printer, X, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface ReceiptModalItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptCode: string;
  customerName: string;
  tableNumber: string;
  orderType: 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY';
  paymentMethod: string;
  items: ReceiptModalItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  cashierName: string;
  dateStr: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receiptCode,
  customerName,
  tableNumber,
  orderType,
  paymentMethod,
  items,
  subtotal,
  discount,
  grandTotal,
  cashierName,
  dateStr,
}: ReceiptModalProps) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');

  const [settings, setSettings] = useState({
    restaurantName: 'Teras Lmbur',
    receiptWidth: '80mm',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teras_lmbur_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setSettings({
            restaurantName: parsed.restaurantName || 'Teras Lmbur',
            receiptWidth: parsed.receiptWidth || '80mm',
          });
        }, 0);
      }
    } catch {
      // Ignore error
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-receipt-overlay>
      {/* Print Stylesheet — hides everything except the receipt content */}
      <style>{`
        @media print {
          /* Hide the entire app shell */
          body > * { visibility: hidden !important; }
          /* Show only the receipt overlay */
          [data-receipt-overlay] {
            visibility: visible !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 99999 !important;
            background: white !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }
          [data-receipt-overlay] * { visibility: visible !important; }
          /* Style the receipt card for thermal paper */
          [data-receipt-card] {
            max-width: ${settings.receiptWidth} !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            max-height: none !important;
            margin: 0 auto !important;
            background: white !important;
            color: black !important;
          }
          /* Hide non-printable UI elements */
          [data-receipt-success-badge] { display: none !important; }
          [data-receipt-close-btn] { display: none !important; }
          [data-receipt-actions] { display: none !important; }
          /* Force black text for readability */
          [data-receipt-card] * {
            color: black !important;
            border-color: #ccc !important;
          }
          [data-receipt-card] .text-brand-500,
          [data-receipt-card] .text-emerald-500,
          [data-receipt-card] .text-amber-500,
          [data-receipt-card] .text-rose-500 {
            color: black !important;
          }
        }
      `}</style>
      {/* Modal Card */}
      <div data-receipt-card className="relative flex flex-col w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden animate-fade-in max-h-[90vh]">
        {/* Close Button */}
        <button
          data-receipt-close-btn
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--background)] transition-colors cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Successful Badge Section */}
        {paymentMethod === 'PAY_LATER' ? (
          <div data-receipt-success-badge className="flex flex-col items-center text-center p-6 bg-gradient-to-b from-amber-500/10 to-transparent border-b border-[var(--border)]/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3 animate-pulse">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] text-amber-500">
              BILL BELUM BAYAR (UNPAID)
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Struk bukti pesanan dapur & meja.
            </p>
          </div>
        ) : (
          <div data-receipt-success-badge className="flex flex-col items-center text-center p-6 bg-gradient-to-b from-brand-500/10 to-transparent border-b border-[var(--border)]/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3 animate-pulse">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              {t('checkoutSuccess') || 'Sale Completed Successfully'}
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              The transaction has been processed and recorded.
            </p>
          </div>
        )}

        {/* Receipt Paper Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-xs">
          {/* Header metadata */}
          <div className="flex flex-col items-center text-center border-b border-dashed border-[var(--border)] pb-4 space-y-1">
            <Receipt className="h-5 w-5 text-brand-500" />
            <h4 className="font-bold text-sm text-[var(--foreground)] uppercase">{settings.restaurantName}</h4>
            <p className="text-[10px] text-[var(--muted-foreground)]">Teras Lmbur Outlet</p>
            <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{dateStr}</p>
          </div>

          {/* Details info */}
          <div className="grid grid-cols-2 gap-y-1.5 text-[11px] border-b border-dashed border-[var(--border)] pb-4">
            <span className="text-[var(--muted-foreground)]">{t('receiptNumber') || 'Receipt No'}:</span>
            <span className="text-right font-mono font-bold text-[var(--foreground)]">{receiptCode}</span>

            <span className="text-[var(--muted-foreground)]">Customer:</span>
            <span className="text-right text-[var(--foreground)] font-medium">{customerName || 'Walk-in'}</span>

            <span className="text-[var(--muted-foreground)]">Service Type:</span>
            <span className="text-right text-[var(--foreground)] font-medium">
              {orderType === 'DINE_IN'
                ? `Dine In (${tableNumber || '-'})`
                : orderType === 'DELIVERY'
                ? 'Delivery'
                : 'Takeaway'}
            </span>

            <span className="text-[var(--muted-foreground)]">{t('cashier') || 'Cashier'}:</span>
            <span className="text-right text-[var(--foreground)] font-medium">{cashierName}</span>

            <span className="text-[var(--muted-foreground)]">{t('paymentMethod') || 'Payment'}:</span>
            <span className={cn(
              "text-right font-bold uppercase",
              paymentMethod === 'PAY_LATER' ? "text-amber-500" : "text-brand-500"
            )}>
              {paymentMethod === 'PAY_LATER' ? 'BELUM BAYAR (PAY LATER)' : paymentMethod}
            </span>
          </div>

          {/* Line items list */}
          <div className="border-b border-dashed border-[var(--border)] pb-4 space-y-2">
            <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
              <span className="col-span-6">{t('item') || 'Item'}</span>
              <span className="col-span-2 text-center">{t('quantity') || 'Qty'}</span>
              <span className="col-span-4 text-right">{t('total') || 'Amount'}</span>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[11px] text-[var(--foreground)] leading-snug">
                <span className="col-span-6 truncate font-medium">{item.name}</span>
                <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                <span className="col-span-4 text-right font-mono">
                  {(item.unitPrice * item.quantity).toFixed(2)} EGP
                </span>
              </div>
            ))}
          </div>

          {/* Summary Breakdown */}
          <div className="space-y-1.5 text-[11px] border-b border-double border-[var(--border)] pb-4">
            <div className="flex justify-between text-[var(--muted-foreground)]">
              <span>{t('subtotal') || 'Subtotal'}</span>
              <span className="font-mono">{subtotal.toFixed(2)} EGP</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>{t('discount') || 'Discount'}</span>
                <span className="font-mono">-{discount.toFixed(2)} EGP</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-[var(--foreground)] pt-1">
              <span>{paymentMethod === 'PAY_LATER' ? 'TOTAL TAGIHAN' : 'TOTAL PAID'}</span>
              <span className={cn(
                "font-mono text-base",
                paymentMethod === 'PAY_LATER' ? "text-amber-500" : "text-brand-500"
              )}>{grandTotal.toFixed(2)} EGP</span>
            </div>
          </div>

          {/* Bottom message */}
          <div className="text-center text-[10px] text-[var(--muted-foreground)] pt-2">
            <p>Thank you for dining with us!</p>
            <p className="font-mono mt-0.5 animate-pulse text-brand-500 font-bold">TERAS LMBUR</p>
          </div>
        </div>

        {/* Action Button footer */}
        <div data-receipt-actions className="flex gap-2.5 p-4 border-t border-[var(--border)] bg-[var(--background)] shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--background)] transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {tCommon('buttons.print') || 'Print Receipt'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 text-xs font-black text-white hover:bg-brand-600 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all cursor-pointer"
          >
            {tCommon('buttons.close') || 'Close Window'}
          </button>
        </div>
      </div>
    </div>
  );
}
