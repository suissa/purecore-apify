/**
 * Schema de banco de dados para Patient
 */

// SQL para criação da tabela
export const createPatientTableSQL = `
CREATE TABLE IF NOT EXISTS `patients` (
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) NOT NULL,
  `birthDate` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Índices recomendados
export const patientIndexesSQL = [
  `CREATE INDEX idx_patients_name ON `patients` (`name`);`,
  `CREATE INDEX idx_patients_email ON `patients` (`email`);`,
  `CREATE INDEX idx_patients_phone ON `patients` (`phone`);`,
  `CREATE INDEX idx_patients_birthDate ON `patients` (`birthDate`);`
].filter(Boolean);

// Re-export do schema Zod
export { schema } from '../patient';