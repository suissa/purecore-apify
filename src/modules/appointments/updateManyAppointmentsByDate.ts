import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema para atualização múltipla por data
export const schema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
}).optional();

export default async function updateManyAppointmentsByDate(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const updateData = req.body;

    // Simulação de atualização múltipla
    const updatedAppointments = [
      {
        id: '1',
        date,
        patientId: '123',
        status: updateData.status || 'confirmed',
        notes: updateData.notes,
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        date,
        patientId: '456',
        status: updateData.status || 'confirmed',
        notes: updateData.notes,
        updatedAt: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: updatedAppointments,
      message: `Consultas da data ${date} atualizadas com sucesso`,
      count: updatedAppointments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
