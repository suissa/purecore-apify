import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema para atualização (campos opcionais)
export const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
}).optional();

export default async function updatePatient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Simulação de atualização
    const updatedPatient = {
      id,
      name: updateData.name || 'João Silva',
      email: updateData.email || 'joao@example.com',
      phone: updateData.phone || '+5511999999999',
      birthDate: updateData.birthDate || '1990-01-01',
      address: updateData.address,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Paciente atualizado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
