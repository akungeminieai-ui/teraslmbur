/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface ModifierProduct {
  id: string;
  name: string;
  sellingPrice: number;
  category: string;
  image: string | null;
  modifiers?: ModifierGroup[];
}

interface ModifierModalProps {
  product: ModifierProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }>) => void;
}

export function ModifierModal({ product, isOpen, onClose, onConfirm }: ModifierModalProps) {
  // Key: groupId, Value: selected optionId
  const [selections, setSelections] = React.useState<Record<string, ModifierOption>>({});

  // Reset selections when product changes
  React.useEffect(() => {
    if (product?.modifiers) {
      const defaultSelections: Record<string, ModifierOption> = {};
      product.modifiers.forEach((group) => {
        // Pre-select first option as default for single-select groups to speed up workflow
        if (group.options.length > 0) {
          defaultSelections[group.id] = group.options[0];
        }
      });
      setSelections(defaultSelections);
    } else {
      setSelections({});
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSelectOption = (groupId: string, option: ModifierOption) => {
    setSelections((prev) => ({
      ...prev,
      [groupId]: option,
    }));
  };

  // Compute customized unit price
  const basePrice = product.sellingPrice;
  const modifiersAdjustment = Object.values(selections).reduce(
    (sum, opt) => sum + opt.priceAdjustment,
    0
  );
  const totalPrice = basePrice + modifiersAdjustment;

  const handleConfirm = () => {
    const selectedList = (product.modifiers || []).map((group) => {
      const selectedOption = selections[group.id];
      if (selectedOption) {
        return {
          groupId: group.id,
          groupName: group.name,
          optionId: selectedOption.id,
          optionName: selectedOption.name,
          priceAdjustment: selectedOption.priceAdjustment,
        };
      }
      return null;
    }).filter(Boolean) as Array<{
      groupId: string;
      groupName: string;
      optionId: string;
      optionName: string;
      priceAdjustment: number;
    }>;

    onConfirm(selectedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Modal Container */}
      <div className="relative flex flex-col w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--background)]/20 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider block">
              Customize Item
            </span>
            <h3 className="text-sm font-bold text-[var(--foreground)] truncate leading-tight mt-0.5">
              {product.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--background)] transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Modifier Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {product.modifiers && product.modifiers.length > 0 ? (
            product.modifiers.map((group) => {
              const selectedOpt = selections[group.id];
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-semibold text-[var(--foreground)]">
                      {group.name}
                    </h4>
                    {group.isRequired && (
                      <span className="text-[9px] font-bold text-brand-500 uppercase">
                        Required
                      </span>
                    )}
                  </div>

                  {/* Options Selector Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedOpt?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(group.id, opt)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer text-left',
                            isSelected
                              ? 'border-brand-500 text-brand-500 bg-brand-500/5 font-semibold'
                              : 'border-[var(--border)] bg-[var(--background)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]/80'
                          )}
                        >
                          <span className="truncate">{opt.name}</span>
                          <span className="font-mono text-[10px] opacity-80 shrink-0 ml-1.5">
                            {opt.priceAdjustment > 0
                              ? `+${opt.priceAdjustment.toFixed(2)} EGP`
                              : 'Free'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-6">
              No options customizable for this product.
            </p>
          )}
        </div>

        {/* Footer Settle Action */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/50 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-10 rounded-xl bg-brand-500 text-xs font-bold text-white hover:bg-brand-600 shadow-md shadow-brand-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            Add to Cart
            <span className="font-mono text-[11px] bg-brand-600/30 px-2 py-0.5 rounded-lg">
              {totalPrice.toFixed(2)} EGP
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
