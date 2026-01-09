import { Request, Response } from '../../types';
import { PatientService } from '../services/patient.service';
import { PatientDTO } from '../types/dto';
import { ApifyCompleteSentinel } from '../../decorators';

export class PatientController {
  constructor(private patientService: PatientService) {}

  /**
   * Lista entidades com paginação
   */
  @ApifyCompleteSentinel
  async list(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        sortBy,
        sortOrder = 'asc'
      } = req.query;

      const result = await this.patientService.list({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca entidade por ID
   */
  @ApifyCompleteSentinel
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const entity = await this.patientService.getById(id);

      res.json({
        success: true,
        data: entity
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cria nova entidade
   */
  @ApifyCompleteSentinel
  async create(req: Request, res: Response) {
    try {
      const entity = await this.patientService.create(req.body);

      res.status(201).json({
        success: true,
        data: entity,
        message: 'Patient criado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar Patient'
      });
    }
  }

  /**
   * Atualiza entidade
   */
  @ApifyCompleteSentinel
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const entity = await this.patientService.update(id, req.body);

      res.json({
        success: true,
        data: entity,
        message: 'Patient atualizado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Patient'
      });
    }
  }

  /**
   * Remove entidade
   */
  @ApifyCompleteSentinel
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await this.patientService.delete(id);

      res.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao remover Patient'
      });
    }
  }
}