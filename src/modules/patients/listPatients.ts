import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema opcional para filtros de listagem
export const schema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().optional(),
}).optional();

export default async function listPatients(req: Request, res: Response) {
  try {
    // Parâmetros de query já estão em req.query automaticamente
    const { page = '1', limit = '10', search } = req.query;

    // Simulação de listagem com paginação
    const patients = [
      { id: '1', name: 'João Silva', email: 'joao@example.com' },
      { id: '2', name: 'Maria Santos', email: 'maria@example.com' },
      { id: '3', name: 'Pedro Costa', email: 'pedro@example.com' },
    ];

    // Filtragem básica se houver search
    const filteredPatients = search
      ? patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : patients;

    res.json({
      success: true,
      data: filteredPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredPatients.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
