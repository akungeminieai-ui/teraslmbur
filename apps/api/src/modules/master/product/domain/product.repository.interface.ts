import { Product, ProductTranslation, ProductStatus, ProductAvailability, SalesChannel, ProductSalesChannel, ProductAvailabilitySchedule, ProductNutrition, ProductTag, ProductAttribute, ProductMedia } from '@/generated/client';

export interface IProductRepository {
  create(data: {
    slug: string;
    sku?: string | null;
    barcode?: string | null;
    sellingPrice: number | string;
    status?: ProductStatus;
    availabilityStatus?: ProductAvailability;
    preparationTime?: number;
    isFeatured?: boolean;
    currentHpp?: number | string;
    categoryId: string;
    translations: { locale: string; name: string; description?: string | null }[];
    stationIds?: string[];
    salesChannels?: SalesChannel[];
    availabilitySchedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
    nutrition?: { calories?: number | null; protein?: number | string | null; fat?: number | string | null; sugar?: number | string | null; allergens?: string[] };
    tags?: string[];
    attributes?: { name: string; value: string }[];
    media?: { mediaId: string; sortOrder: number; isPrimary: boolean }[];
  }): Promise<Product & { translations: ProductTranslation[] }>;

  findAll(query?: {
    search?: string;
    categoryId?: string;
    stationId?: string;
    status?: ProductStatus;
    salesChannel?: SalesChannel;
    isFeatured?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: any[]; total: number }>;

  findById(id: string): Promise<(Product & {
    translations: ProductTranslation[];
    category: any;
    stationAssignments: any[];
    salesChannels: ProductSalesChannel[];
    availabilitySchedules: ProductAvailabilitySchedule[];
    nutrition: ProductNutrition | null;
    tags: (ProductTag & { tag: { name: string } })[];
    attributes: ProductAttribute[];
    media: (ProductMedia & { media: any })[];
  }) | null>;

  findBySlug(slug: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;

  update(
    id: string,
    data: {
      slug?: string;
      sku?: string | null;
      barcode?: string | null;
      sellingPrice?: number | string;
      status?: ProductStatus;
      availabilityStatus?: ProductAvailability;
      preparationTime?: number;
      isFeatured?: boolean;
      currentHpp?: number | string;
      categoryId?: string;
      translations?: { locale: string; name: string; description?: string | null }[];
      stationIds?: string[];
      salesChannels?: SalesChannel[];
      availabilitySchedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
      nutrition?: { calories?: number | null; protein?: number | string | null; fat?: number | string | null; sugar?: number | string | null; allergens?: string[] };
      tags?: string[];
      attributes?: { name: string; value: string }[];
      media?: { mediaId: string; sortOrder: number; isPrimary: boolean }[];
    },
    priceHistoryContext?: { changedById?: string | null; reason?: string | null }
  ): Promise<Product & { translations: ProductTranslation[] }>;

  softDelete(id: string): Promise<Product>;
  restore(id: string): Promise<Product>;

  findPriceHistory(
    productId: string,
    query?: { page?: number; pageSize?: number }
  ): Promise<{ items: any[]; total: number }>;
}
