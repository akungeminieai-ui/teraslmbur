import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TranslationService {
  constructor(private readonly prisma: PrismaService) {}

  private getModel(entityType: string) {
    const maps: Record<string, any> = {
      product: { client: this.prisma.productTranslation, fk: 'productId' },
      category: { client: this.prisma.categoryTranslation, fk: 'categoryId' },
      variantGroup: { client: this.prisma.variantGroupTranslation, fk: 'variantGroupId' },
      variantOption: { client: this.prisma.variantOptionTranslation, fk: 'variantOptionId' },
      modifierGroup: { client: this.prisma.modifierGroupTranslation, fk: 'modifierGroupId' },
      modifierOption: { client: this.prisma.modifierOptionTranslation, fk: 'modifierOptionId' },
      kitchenStation: { client: this.prisma.kitchenStationTranslation, fk: 'kitchenStationId' },
      paymentMethod: { client: this.prisma.paymentMethodTranslation, fk: 'paymentMethodId' },
      outlet: { client: this.prisma.outletTranslation, fk: 'outletId' },
    };

    const target = maps[entityType.toLowerCase()];
    if (!target) {
      throw new BadRequestException(`Unsupported translation entity type: ${entityType}`);
    }
    return target;
  }

  /**
   * Retrieves translation details for a specific entity and locale.
   */
  async getTranslation(entityType: string, entityId: string, locale: string): Promise<any> {
    const { client, fk } = this.getModel(entityType);
    return client.findFirst({
      where: {
        [fk]: entityId,
        locale,
      },
    });
  }

  /**
   * Translates entity with requested -> English -> Indonesian fallbacks.
   */
  async getTranslatedEntity<T extends { id: string }>(
    entityType: string,
    entity: T,
    requestedLocale: string,
  ): Promise<T & { name: string; description?: string; address?: string }> {
    const { client, fk } = this.getModel(entityType);

    // Fetch all translations for this entity to apply in-memory fallback chain
    const translations = await client.findMany({
      where: { [fk]: entity.id },
    });

    const findByLocale = (loc: string) => translations.find((t: any) => t.locale === loc);

    // Requested -> English -> Indonesian
    const matched = findByLocale(requestedLocale) || findByLocale('en') || findByLocale('id') || translations[0];

    if (!matched) {
      return {
        ...entity,
        name: 'Untranslated Entity',
      };
    }

    return {
      ...entity,
      name: matched.name,
      ...(matched.description !== undefined ? { description: matched.description } : {}),
      ...(matched.address !== undefined ? { address: matched.address } : {}),
    };
  }

  /**
   * Translates a list of entities.
   */
  async getTranslatedEntities<T extends { id: string }>(
    entityType: string,
    entities: T[],
    requestedLocale: string,
  ): Promise<Array<T & { name: string; description?: string; address?: string }>> {
    return Promise.all(
      entities.map((entity) => this.getTranslatedEntity(entityType, entity, requestedLocale)),
    );
  }

  /**
   * Creates translation record for an entity.
   */
  async createTranslation(
    entityType: string,
    entityId: string,
    locale: string,
    data: { name: string; description?: string; address?: string },
  ): Promise<any> {
    const { client, fk } = this.getModel(entityType);
    try {
      return await client.create({
        data: {
          [fk]: entityId,
          locale,
          name: data.name,
          ...(data.description ? { description: data.description } : {}),
          ...(data.address ? { address: data.address } : {}),
        },
      });
    } catch (e) {
      throw new BadRequestException(`Translation failed to create: ${String(e)}`);
    }
  }

  /**
   * Updates an existing translation record.
   */
  async updateTranslation(
    entityType: string,
    entityId: string,
    locale: string,
    data: { name?: string; description?: string; address?: string },
  ): Promise<any> {
    const { client, fk } = this.getModel(entityType);

    const record = await client.findFirst({
      where: { [fk]: entityId, locale },
    });

    if (!record) {
      throw new NotFoundException(`Translation for locale '${locale}' not found`);
    }

    return client.update({
      where: { id: record.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
      },
    });
  }

  /**
   * Removes a translation record.
   */
  async deleteTranslation(entityType: string, entityId: string, locale: string): Promise<any> {
    const { client, fk } = this.getModel(entityType);

    const record = await client.findFirst({
      where: { [fk]: entityId, locale },
    });

    if (!record) {
      throw new NotFoundException(`Translation for locale '${locale}' not found`);
    }

    return client.delete({
      where: { id: record.id },
    });
  }
}
