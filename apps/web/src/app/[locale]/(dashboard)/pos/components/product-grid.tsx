'use client';

import * as React from 'react';
import { ProductCard, type PosProduct } from './product-card';

interface ProductGridProps {
  products: PosProduct[];
  isLoading: boolean;
  onAddProduct: (product: PosProduct) => void;
}

export function ProductGrid({ products, isLoading, onAddProduct }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden p-0 animate-pulse min-h-[270px]"
          >
            <div className="h-[174px] w-full bg-[var(--border)]/45 shrink-0" />
            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="h-3 bg-[var(--border)]/40 rounded w-3/4" />
                <div className="h-2.5 bg-[var(--border)]/40 rounded w-1/2" />
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)]/20 pt-2">
                <div className="h-3 bg-[var(--border)]/40 rounded w-1/3" />
                <div className="h-2.5 bg-[var(--border)]/40 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/20 p-8">
        <p className="text-xs font-semibold text-[var(--foreground)]">No products found</p>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
          Try adjusting your search query or choosing another category filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAddProduct} />
      ))}
    </div>
  );
}
