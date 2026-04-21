import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema para busca por ID
export const schema = z.object({
  // Não precisa de validação para GET por ID
}).optional();

export default async function getPatient(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Simulação de busca
    const patient = {
      id,
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '+5511999999999',
      birthDate: '1990-01-01',
    };

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
