import { Request, Response } from '../../types';
import { z } from 'zod';

// Schema de validação Zod para criação de paciente
export const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
});

// Handler padrão para criação
export default async function createPatient(req: Request, res: Response) {
  try {
    // req.body já foi validado automaticamente pelo schema Zod
    const patientData = req.body;

    // Simulação de criação (em produção seria um service/database call)
    const newPatient = {
      id: Date.now().toString(),
      ...patientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: newPatient,
      message: 'Paciente criado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
}
