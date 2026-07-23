import { VariantGroup, VariantGroupTranslation, VariantOption, VariantOptionTranslation } from '@prisma/client';

export interface IVariantRepository {
  create(data: {
    displayOrder?: number;
    isActive?: boolean;
    translations: { locale: string; name: string }[];
    options: { displayOrder: number; translations: { locale: string; name: string }[] }[];
  }): Promise<VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }>;

  findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }): Promise<{
    items: (VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] })[];
    total: number;
  }>;

  findById(id: string): Promise<(VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }) | null>;

  update(
    id: string,
    data: {
      displayOrder?: number;
      isActive?: boolean;
      translations?: { locale: string; name: string }[];
      options?: { id?: string; displayOrder: number; translations: { locale: string; name: string }[] }[];
    }
  ): Promise<VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }>;

  softDelete(id: string): Promise<VariantGroup>;
}
