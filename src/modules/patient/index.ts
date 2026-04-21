/**
 * Módulo Patient - Auto-gerado
 */

// Exportações principais
export { patientRouter } from './routes';
export { PatientController } from './controllers/patient.controller';
export { PatientService } from './services/patient.service';
export { PatientRepository } from './database/repository';
export { PatientDTO } from './types/dto';
export { IPatient } from './types/interface';
export { default as patientConfig } from './config';

// Re-export do schema Zod original
export { schema } from './database/schema';