/**
 * Configuração do módulo Patient
 */

export const PatientConfig = {
  // Configurações de cache
  cache: {
    enabled: true,
    ttl: 300, // 5 minutos
    prefix: 'patient:'
  },

  // Configurações de validação
  validation: {
    strict: true,
    stripUnknown: true
  },

  // Configurações de paginação
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },

  // Configurações de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // requests por windowMs
  }
};

export default PatientConfig;