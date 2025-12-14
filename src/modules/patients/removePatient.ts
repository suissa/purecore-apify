import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema opcional para remoção
export const schema = z.object({}).optional();

export default async function removePatient(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Simulação de soft delete
    const deletedPatient = {
      id,
      deletedAt: new Date().toISOString(),
      status: 'deleted',
    };

    res.json({
      success: true,
      data: deletedPatient,
      message: 'Paciente removido com sucesso (soft delete)',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
