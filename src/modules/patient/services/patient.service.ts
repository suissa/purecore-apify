import { PatientRepository } from '../database/repository';
import { IPatient } from '../types/interface';
import { PatientDTO } from '../types/dto';

export interface PatientServiceCreateInput {
  email: string;
  phone: string;
  birthDate: string;
  address?: object;
}

export interface PatientServiceUpdateInput {
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: object;
}

export class PatientService {
  constructor(private repository: PatientRepository) {}

  /**
   * Cria uma nova entidade
   */
  async create(input: PatientServiceCreateInput): Promise<IPatient> {
    // Validação de entrada
    this.validateCreateInput(input);

    // Regras de negócio
    const processedInput = await this.processCreateInput(input);

    // Persistir
    return this.repository.create(processedInput);
  }

  /**
   * Busca entidade por ID
   */
  async getById(id: string): Promise<IPatient | null> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new Error('Patient não encontrado');
    }

    return entity;
  }

  /**
   * Lista entidades com paginação e filtros
   */
  async list(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    data: IPatient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    const result = await this.repository.find({
      limit,
      offset,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      // Adicionar campos de busca conforme necessário
    });

    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  /**
   * Atualiza entidade
   */
  async update(id: string, input: PatientServiceUpdateInput): Promise<IPatient> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se entidade existe
    await this.getById(id);

    // Validação de entrada
    this.validateUpdateInput(input);

    // Regras de negócio
    const processedInput = await this.processUpdateInput(input);

    // Atualizar
    const updatedEntity = await this.repository.update(id, processedInput);
    if (!updatedEntity) {
      throw new Error('Falha ao atualizar Patient');
    }

    return updatedEntity;
  }

  /**
   * Remove entidade
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se entidade existe
    await this.getById(id);

    // Regras de negócio antes da exclusão
    await this.beforeDelete(id);

    // Remover
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error('Falha ao remover Patient');
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  private validateCreateInput(input: PatientServiceCreateInput): void {
    if (!input) {
      throw new Error('Dados de entrada são obrigatórios');
    }

    // Validações específicas podem ser adicionadas aqui
    if (input.phone && input.phone.length < 10) {
      throw new Error('phone deve ter pelo menos 10 caracteres');
    }
  }

  private validateUpdateInput(input: PatientServiceUpdateInput): void {
    // Validações para update podem ser menos rigorosas
  }

  private async processCreateInput(input: PatientServiceCreateInput): Promise<Omit<IPatient, 'name'>> {
    // Processamentos específicos antes da criação
    return input;
  }

  private async processUpdateInput(input: PatientServiceUpdateInput): Promise<Partial<IPatient>> {
    // Processamentos específicos antes da atualização
    return input;
  }

  private async beforeDelete(id: string): Promise<void> {
    // Regras de negócio antes da exclusão
    // Ex: verificar dependências, etc.
  }
}