import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema opcional para validação adicional
export const schema = z.object({}).optional();

export default async function getPatientByPhone(req: Request, res: Response) {
  try {
    const { phone } = req.params;

    // Simulação de busca por telefone
    const patient = {
      id: '123',
      name: 'João Silva',
      email: 'joao@example.com',
      phone, // Mesmo telefone usado na busca
      birthDate: '1990-01-01',
    };

    res.json({
      success: true,
      data: patient,
      searchedBy: 'phone',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
