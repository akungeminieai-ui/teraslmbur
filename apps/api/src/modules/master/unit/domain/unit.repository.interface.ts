import { Unit, UnitType } from '@prisma/client';

export interface IUnitRepository {
  create(data: { name: string; abbreviation: string; type: UnitType }): Promise<Unit>;
  findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Unit[]; total: number }>;
  findById(id: string): Promise<Unit | null>;
  findByName(name: string): Promise<Unit | null>;
  findByAbbreviation(abbreviation: string): Promise<Unit | null>;
  update(id: string, data: { name?: string; abbreviation?: string; type?: UnitType }): Promise<Unit>;
  softDelete(id: string): Promise<Unit>;
}
