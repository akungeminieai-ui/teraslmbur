import { Category, CategoryTranslation } from '@/generated/client';

export interface ICategoryRepository {
  create(data: {
    slug: string;
    icon?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
    translations: { locale: string; name: string }[];
  }): Promise<Category & { translations: CategoryTranslation[] }>;

  findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    parentId?: string | null;
    isActive?: boolean;
  }): Promise<{
    items: (Category & { translations: CategoryTranslation[]; productCount?: number })[];
    total: number;
  }>;

  findById(id: string): Promise<(Category & { translations: CategoryTranslation[] }) | null>;
  findBySlug(slug: string): Promise<Category | null>;

  update(
    id: string,
    data: {
      slug?: string;
      icon?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      parentId?: string | null;
      translations?: { locale: string; name: string }[];
    }
  ): Promise<Category & { translations: CategoryTranslation[] }>;

  softDelete(id: string): Promise<Category>;
}
