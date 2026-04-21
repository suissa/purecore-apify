import { IPatient } from '../types/interface';
import { PatientDTO } from '../types/dto';

export interface PatientRepositoryQuery {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PatientRepositoryResult<T = IPatient> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export class PatientRepository {
  private storage: Map<string, IPatient> = new Map();

  /**
   * Cria uma nova entidade
   */
  async create(data: Omit<IPatient, 'name'>): Promise<IPatient> {
    const id = Date.now().toString();
    const entity: IPatient = {
      name: id,
      ...data,
      
      
    } as IPatient;

    this.storage.set(id, entity);
    return entity;
  }

  /**
   * Busca entidade por ID
   */
  async findById(id: string): Promise<IPatient | null> {
    return this.storage.get(id) || null;
  }

  /**
   * Busca entidades com filtros
   */
  async find(query: PatientRepositoryQuery = {}): Promise<PatientRepositoryResult> {
    let results = Array.from(this.storage.values());

    // Aplicar filtros de busca
    
    if (query.name) {
      results = results.filter(entity =>
        entity.name?.toLowerCase().includes(query.name!.toLowerCase())
      );
    }
    if (query.email) {
      results = results.filter(entity =>
        entity.email?.toLowerCase().includes(query.email!.toLowerCase())
      );
    }
    if (query.phone) {
      results = results.filter(entity =>
        entity.phone?.toLowerCase().includes(query.phone!.toLowerCase())
      );
    }
    if (query.birthDate) {
      results = results.filter(entity =>
        entity.birthDate?.toLowerCase().includes(query.birthDate!.toLowerCase())
      );
    }

    // Ordenação
    if (query.sortBy) {
      results.sort((a, b) => {
        const aVal = (a as any)[query.sortBy!];
        const bVal = (b as any)[query.sortBy!];

        if (aVal < bVal) return query.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return query.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Paginação
    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      data: paginatedResults,
      total: results.length,
      limit,
      offset
    };
  }

  /**
   * Atualiza entidade por ID
   */
  async update(id: string, data: Partial<IPatient>): Promise<IPatient | null> {
    const entity = this.storage.get(id);
    if (!entity) return null;

    const updatedEntity = {
      ...entity,
      ...data,
      
    };

    this.storage.set(id, updatedEntity);
    return updatedEntity;
  }

  /**
   * Remove entidade por ID
   */
  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  /**
   * Conta total de entidades
   */
  async count(query: PatientRepositoryQuery = {}): Promise<number> {
    const result = await this.find(query);
    return result.total;
  }
}