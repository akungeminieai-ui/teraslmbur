import { Injectable } from '@nestjs/common';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class UnitConversionService {
  /**
   * Converts purchase unit quantity to inventory unit quantity.
   * Inventory Qty = Purchase Qty * Conversion Ratio
   */
  purchaseToInventory(purchaseQty: number | string | Decimal, conversionRatio: number | string | Decimal): Decimal {
    const qty = new Decimal(purchaseQty);
    const ratio = new Decimal(conversionRatio);
    return qty.mul(ratio);
  }

  /**
   * Converts inventory unit quantity to purchase unit quantity.
   * Purchase Qty = Inventory Qty / Conversion Ratio
   */
  inventoryToPurchase(inventoryQty: number | string | Decimal, conversionRatio: number | string | Decimal): Decimal {
    const qty = new Decimal(inventoryQty);
    const ratio = new Decimal(conversionRatio);
    if (ratio.isZero()) {
      throw new Error('Conversion ratio cannot be zero');
    }
    return qty.div(ratio);
  }

  /**
   * Calculates cost per inventory unit given purchase unit cost.
   * Cost Per Inventory Unit = Purchase Cost / Conversion Ratio
   */
  calculateCostPerInventoryUnit(purchaseCost: number | string | Decimal, conversionRatio: number | string | Decimal): Decimal {
    const cost = new Decimal(purchaseCost);
    const ratio = new Decimal(conversionRatio);
    if (ratio.isZero()) {
      throw new Error('Conversion ratio cannot be zero');
    }
    return cost.div(ratio);
  }

  /**
   * Validates if conversion ratio is greater than zero.
   */
  validateRatio(conversionRatio: number | string | Decimal): boolean {
    try {
      const ratio = new Decimal(conversionRatio);
      return ratio.gt(0);
    } catch {
      return false;
    }
  }
}
