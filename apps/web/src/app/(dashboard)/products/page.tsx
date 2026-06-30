import type { Metadata } from 'next';
import { Package, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata: Metadata = { title: 'Products' };

const upcomingFeatures = [
  'Product catalog with images and descriptions',
  'Category assignment and filtering',
  'SKU management and barcode support',
  'Recipe BOM linking for automatic HPP',
  'Bulk import/export via CSV',
  'Active/inactive status toggle',
];

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your menu items, pricing, and availability."
        icon={Package}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Start building your menu by adding your first product."
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add Your First Product
          </button>
        }
      />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Upcoming Features</h3>
        <ul className="mt-3 space-y-2">
          {upcomingFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
