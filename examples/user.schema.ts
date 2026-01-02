/**
 * Schema Zod para entidade User - Exemplo completo para DDD Generator
 * Este arquivo demonstra como criar schemas compatíveis com o AutoGeneratorDDD
 */

import { z } from 'zod';

// Value Objects (Objetos de Valor)
export const EmailSchema = z.string()
  .email('Email inválido')
  .min(5, 'Email deve ter pelo menos 5 caracteres')
  .max(254, 'Email deve ter no máximo 254 caracteres')
  .toLowerCase()
  .trim();

export const PasswordSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial');

export const NameSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .trim()
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços');

// Enums para domínio
export const UserRoleSchema = z.enum(['admin', 'moderator', 'user'], {
  errorMap: () => ({ message: 'Role deve ser admin, moderator ou user' })
});

export const UserStatusSchema = z.enum(['active', 'inactive', 'pending', 'suspended'], {
  errorMap: () => ({ message: 'Status deve ser active, inactive, pending ou suspended' })
});

// Schema principal da entidade User
export const UserSchema = z.object({
  // Identificação
  id: z.string().uuid('ID deve ser um UUID válido'),

  // Dados pessoais
  name: NameSchema,
  email: EmailSchema,

  // Segurança
  password: PasswordSchema.optional(), // Opcional para updates
  role: UserRoleSchema.default('user'),
  status: UserStatusSchema.default('pending'),

  // Metadados
  emailVerified: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
  loginAttempts: z.number().int().min(0).default(0),

  // Timestamps (geralmente gerenciados pelo banco)
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),

  // Campos opcionais/avançados
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    language: z.string().default('pt-BR'),
    notifications: z.boolean().default(true)
  }).default({})
});

// Schema para criação (sem campos gerados automaticamente)
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  loginAttempts: true
});

// Schema para atualização (todos os campos opcionais exceto ID)
export const UpdateUserSchema = UserSchema.partial().required({
  id: true,
  updatedAt: true
});

// Schema para login
export const LoginUserSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Senha é obrigatória')
});

// Schema para mudança de senha
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: PasswordSchema,
  confirmPassword: PasswordSchema
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Nova senha e confirmação devem ser iguais',
  path: ['confirmPassword']
});

// Tipos TypeScript inferidos dos schemas
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

// Email como Value Object
export type Email = z.infer<typeof EmailSchema>;
export type Password = z.infer<typeof PasswordSchema>;
export type Name = z.infer<typeof NameSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;

// Export do schema principal (obrigatório para o DDD Generator)
export const schema = UserSchema;
