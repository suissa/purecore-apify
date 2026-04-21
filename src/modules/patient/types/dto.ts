export class PatientDTO {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  address?: Address;

  constructor(data: Partial<PatientDTO>) {
    Object.assign(this, data);
  }

  /**
   * Valida os dados do DTO
   */
  static validate(data: any): { success: boolean; data?: PatientDTO; error?: string } {
    try {
      // Validação seria feita com o schema Zod aqui
      return { success: true, data: new PatientDTO(data) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }
}