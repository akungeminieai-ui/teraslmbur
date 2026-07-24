import { Sale, SaleItem, Product, ProductTranslation } from '@/generated/client';

export type SaleWithItems = Sale & {
  items: (SaleItem & {
    product: Product & {
      translations: ProductTranslation[];
    };
  })[];
  user?: {
    id: string;
    name: string;
  };
};

export interface IPosRepository {
  createSale(data: {
    outletId: string;
    userId: string;
    code: string;
    subtotal: number | string;
    discount: number | string;
    tax: number | string;
    total: number | string;
    paymentMethod: string;
    notes?: string | null;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number | string;
      subtotal: number | string;
      hppSnapshot: number | string;
      notes?: string | null;
    }[];
  }): Promise<SaleWithItems>;

  findById(id: string): Promise<SaleWithItems | null>;

  findAll(query?: {
    outletId?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: SaleWithItems[]; total: number }>;
}
