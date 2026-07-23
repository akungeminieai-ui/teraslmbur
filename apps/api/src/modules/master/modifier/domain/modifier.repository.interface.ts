import { ModifierGroup, ModifierGroupTranslation, ModifierOption, ModifierOptionTranslation } from '@prisma/client';

export interface IModifierRepository {
  create(data: {
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    displayOrder?: number;
    isActive?: boolean;
    translations: { locale: string; name: string }[];
    options: { displayOrder: number; priceAdjustment: number; translations: { locale: string; name: string }[] }[];
  }): Promise<ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }>;

  findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }): Promise<{
    items: (ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] })[];
    total: number;
  }>;

  findById(id: string): Promise<(ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }) | null>;

  update(
    id: string,
    data: {
      isRequired?: boolean;
      minSelect?: number;
      maxSelect?: number;
      displayOrder?: number;
      isActive?: boolean;
      translations?: { locale: string; name: string }[];
      options?: { id?: string; displayOrder: number; priceAdjustment: number; translations: { locale: string; name: string }[] }[];
    }
  ): Promise<ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }>;

  softDelete(id: string): Promise<ModifierGroup>;
}
