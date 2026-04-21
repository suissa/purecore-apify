/**
 * Testes para Patient
 */

import { PatientController } from '../controllers/patient.controller';
import { PatientService } from '../services/patient.service';
import { PatientRepository } from '../../database/repository';

describe('Patient Module', () => {
  let repository: PatientRepository;
  let service: PatientService;
  let controller: PatientController;

  beforeEach(() => {
    repository = new PatientRepository();
    service = new PatientService(repository);
    controller = new PatientController(service);
  });

  describe('PatientService', () => {
    it('should create a new patient', async () => {
      const testData = {
        // Adicionar dados de teste baseados nos campos do schema
      };

      const result = await service.create(testData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should get patient by id', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      const found = await service.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should list patients with pagination', async () => {
      // Criar alguns registros de teste
      for (let i = 0; i < 5; i++) {
        await service.create({
          // Adicionar dados de teste
        });
      }

      const result = await service.list({ page: 1, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);
    });

    it('should update patient', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      const updateData = {
        // Adicionar dados de atualização
      };

      const updated = await service.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
    });

    it('should delete patient', async () => {
      const testData = {
        // Adicionar dados de teste
      };

      const created = await service.create(testData);
      await service.delete(created.id);

      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('PatientController', () => {
    it('should handle GET / - list patients', async () => {
      const mockReq = {
        query: {}
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.list(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.any(Object)
        })
      );
    });

    it('should handle POST / - create patient', async () => {
      const mockReq = {
        body: {
          // Adicionar dados de teste
        }
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('criado')
        })
      );
    });
  });
});