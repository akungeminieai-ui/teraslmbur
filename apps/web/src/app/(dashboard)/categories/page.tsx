import type { Metadata } from 'next';
import { Tags, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata: Metadata = { title: 'Categories' };

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your products into categories for easier navigation."
        icon={Tags}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        }
      />
      <EmptyState
        icon={Tags}
        title="No categories yet"
        description="Create categories to organize your menu items like Main Course, Drinks, Dessert."
      />
    </div>
  );
}
