import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PosService } from '../application/pos.service';
import { CreateSaleDto, createSaleSchema } from '../application/dto/create-sale.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('POS')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('pos/products')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Get active products list formatted for POS cashier' })
  async getPosProducts(@Query('locale') localeQuery?: string) {
    const locale = localeQuery || 'en';
    
    // Fetch aggregated stocks for ingredients
    const txSums = await this.prisma.inventoryTransaction.groupBy({
      by: ['ingredientId'],
      _sum: {
        quantity: true
      }
    });
    const stockMap = new Map(txSums.map((tx) => [tx.ingredientId, tx._sum.quantity?.toNumber() || 0]));

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        translations: true,
        category: {
          include: {
            translations: true,
          },
        },
        media: {
          include: {
            media: true,
          },
        },
        recipes: {
          where: { isActive: true, deletedAt: null },
          include: {
            items: true
          }
        },
        modifiers: {
          include: {
            group: {
              include: {
                translations: true,
                options: {
                  where: { isActive: true, deletedAt: null },
                  include: {
                    translations: true
                  }
                }
              }
            }
          }
        },
        variants: {
          where: { isActive: true, deletedAt: null },
          include: {
            option: {
              include: {
                group: {
                  include: {
                    translations: true
                  }
                },
                translations: true
              }
            }
          }
        }
      },
    });

    return products.map((p) => {
      const nameTranslation = p.translations.find((t) => t.locale === locale) || p.translations[0];
      const categoryTranslation = p.category.translations.find((t) => t.locale === locale) || p.category.translations[0];
      const primaryMedia = p.media.find((m) => m.isPrimary) || p.media[0];

      // Calculate recipe stock
      let productStock = Infinity;
      const recipe = p.recipes[0];
      if (recipe && recipe.items.length > 0) {
        for (const item of recipe.items) {
          const ingStock = stockMap.get(item.ingredientId) || 0;
          const reqQty = parseFloat(item.quantity.toString());
          if (reqQty > 0) {
            const possibleQty = ingStock / reqQty;
            if (possibleQty < productStock) {
              productStock = possibleQty;
            }
          }
        }
      } else {
        productStock = 999; // Default large stock if no recipe
      }

      // Map modifiers
      const modifiers = p.modifiers.map((pm) => {
        const g = pm.group;
        const gNameTrans = g.translations.find((t) => t.locale === locale) || g.translations[0];
        return {
          id: g.id,
          name: gNameTrans?.name || g.id,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((opt) => {
            const optNameTrans = opt.translations.find((t) => t.locale === locale) || opt.translations[0];
            return {
              id: opt.id,
              name: optNameTrans?.name || opt.id,
              priceAdjustment: parseFloat(opt.priceAdjustment.toString()),
            };
          }),
        };
      });

      // Map variants as virtual modifier options (required single-select choices)
      const variantGroupsMap = new Map<string, {
        id: string;
        name: string;
        isRequired: boolean;
        minSelect: number;
        maxSelect: number;
        options: {
          id: string;
          name: string;
          priceAdjustment: number;
        }[];
      }>();

      if ((p as any).variants && (p as any).variants.length > 0) {
        for (const pv of (p as any).variants) {
          const opt = pv.option;
          if (!opt) continue;
          const vg = opt.group;
          if (!vg) continue;
          const vgTr = vg.translations.find((t: any) => t.locale === locale) || vg.translations[0];
          const optTr = opt.translations.find((t: any) => t.locale === locale) || opt.translations[0];

          if (!variantGroupsMap.has(vg.id)) {
            variantGroupsMap.set(vg.id, {
              id: vg.id,
              name: vgTr?.name || vg.id,
              isRequired: true,
              minSelect: 1,
              maxSelect: 1,
              options: [],
            });
          }

          variantGroupsMap.get(vg.id)!.options.push({
            id: opt.id,
            name: optTr?.name || opt.id,
            priceAdjustment: parseFloat(pv.priceAdjustment.toString()),
          });
        }
      }

      const virtualModifiers = Array.from(variantGroupsMap.values());
      const allModifiers = [...virtualModifiers, ...modifiers];

      return {
        id: p.id,
        name: nameTranslation?.name || p.slug,
        image: primaryMedia?.media?.fileUrl || null,
        sellingPrice: parseFloat(p.sellingPrice.toString()),
        category: categoryTranslation?.name || 'Uncategorized',
        stock: productStock === Infinity ? 999 : Math.floor(productStock),
        modifiers: allModifiers,
        availabilityStatus: p.availabilityStatus,
      };
    });
  }

  @Post('sales')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Process POS checkout sale transaction' })
  async create(
    @Body(new ZodValidationPipe(createSaleSchema)) dto: CreateSaleDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.id;
    const outletId = user.outletId || 'default-outlet';
    return this.posService.createSale(outletId, userId, dto);
  }

  @Get('sales')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get sales history list' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const outletId = user.outletId || 'default-outlet';
    return this.posService.findAllSales(outletId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('sales/:id')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Get sale details by ID' })
  async findOne(@Param('id') id: string) {
    return this.posService.findSaleById(id);
  }
}
