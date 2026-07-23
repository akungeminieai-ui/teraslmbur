'use client';

import * as React from 'react';
import { Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PosProduct {
  id: string;
  name: string;
  image: string | null;
  sellingPrice: number;
  category: string;
  stock?: number;
  modifiers?: unknown[];
  availabilityStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
}

interface ProductCardProps {
  product: PosProduct;
  onAdd: (product: PosProduct) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const categoryLabel = product.category.toUpperCase();
  const isUnavailable = product.availabilityStatus === 'UNAVAILABLE';
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || isUnavailable;
  const isLowStock = !isOutOfStock && product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => onAdd(product)}
      className={cn(
        "group flex flex-col w-full h-full min-h-[270px] rounded-2xl border bg-[var(--card)] overflow-hidden text-left relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shadow-sm transition-all duration-200",
        isOutOfStock
          ? "opacity-60 border-[var(--border)] cursor-not-allowed"
          : isLowStock
            ? "border-amber-500/50 dark:border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/[0.02] shadow-[0_0_12px_rgba(245,158,11,0.12)] cursor-pointer hover:border-amber-500 hover:shadow-md"
            : "cursor-pointer hover:border-brand-500/50 hover:shadow-md border-[var(--border)]"
      )}
    >
      {/* Availability / Stock status badge (floating top-right) */}
      {(isOutOfStock || isLowStock) && (
        <span className={cn(
          "absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded text-[9px] font-bold uppercase leading-none shadow-sm",
          isUnavailable
            ? "bg-rose-500 text-white"
            : isLowStock
              ? "bg-amber-500 text-white animate-pulse"
              : "bg-rose-500 text-white"
        )}>
          {isUnavailable ? 'Tidak Ready' : isLowStock ? `Low Stock (${product.stock})` : 'Out of Stock'}
        </span>
      )}

      {/* 2. Product Image */}
      <div className="relative aspect-[4/3] w-full bg-[var(--background)] overflow-hidden border-b border-[var(--border)] shrink-0">
        {product.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain bg-[var(--accent)]/5 transition-transform duration-300 group-hover:scale-102"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]/30 bg-[var(--background)]">
            <Coffee className="h-8 w-8 stroke-[1.5] opacity-50" />
            <span className="text-[10px] font-semibold opacity-60">
              No Image
            </span>
          </div>
        )}
      </div>

      {/* 3. Product Details */}
      <div className="flex flex-col p-4 flex-1 justify-between min-h-0 bg-gradient-to-b from-transparent to-[var(--background)]/5">
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs font-semibold text-[var(--foreground)] line-clamp-2 leading-tight group-hover:text-brand-500 transition-colors">
            {product.name}
          </h4>
        </div>

        {/* Bottom row: Price & Add Button */}
        <div className="flex items-center justify-between border-t border-[var(--border)]/20 pt-2.5 mt-auto">
          <span className="text-xs font-semibold text-brand-500 font-mono">
            {product.sellingPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            EGP
          </span>

          <span className={cn(
            "px-3 py-1 rounded-xl border text-xs font-semibold leading-none transition-colors",
            isOutOfStock
              ? "border-[var(--border)] text-[var(--muted-foreground)]"
              : "border-[var(--border)] text-[var(--foreground)] group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500"
          )}>
            {isOutOfStock ? (isUnavailable ? 'Tidak Ready' : 'Sold Out') : '+ Add'}
          </span>
        </div>
      </div>
    </button>
  );
}
