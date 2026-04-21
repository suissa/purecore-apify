/**
 * Schema Zod gerado automaticamente para Stock
 * Gerado em: 29/11/2025
 */

import { z } from 'zod';

// =========================================
// SCHEMA ZOD PARA STOCK
// =========================================

export const StockSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number(),
  reservedQuantity: z.number().default(0),
  availableQuantity: z.number(),
  minThreshold: z.number().default(0),
  maxThreshold: z.number().optional(),
  location: z.string(),
  lastUpdated: z.date(),
  supplier: z.string().optional()
});

export type Stock = z.infer<typeof StockSchema>;

// =========================================
// VALIDAÇÃO POR CAMPO - Stock
// =========================================

export const validateId = z.string().uuid();
export const validateIdValidator = (value: any) => validateId.safeParse(value);

export const validateProductId = z.string().uuid();
export const validateProductIdValidator = (value: any) => validateProductId.safeParse(value);

export const validateWarehouseId = z.string().uuid();
export const validateWarehouseIdValidator = (value: any) => validateWarehouseId.safeParse(value);

export const validateQuantity = z.number();
export const validateQuantityValidator = (value: any) => validateQuantity.safeParse(value);

export const validateReservedQuantity = z.number().default(0);
export const validateReservedQuantityValidator = (value: any) => validateReservedQuantity.safeParse(value);

export const validateAvailableQuantity = z.number();
export const validateAvailableQuantityValidator = (value: any) => validateAvailableQuantity.safeParse(value);

export const validateMinThreshold = z.number().default(0);
export const validateMinThresholdValidator = (value: any) => validateMinThreshold.safeParse(value);

export const validateMaxThreshold = z.number().optional();
export const validateMaxThresholdValidator = (value: any) => validateMaxThreshold.safeParse(value);

export const validateLocation = z.string();
export const validateLocationValidator = (value: any) => validateLocation.safeParse(value);

export const validateLastUpdated = z.date();
export const validateLastUpdatedValidator = (value: any) => validateLastUpdated.safeParse(value);

export const validateSupplier = z.string().optional();
export const validateSupplierValidator = (value: any) => validateSupplier.safeParse(value);

// =========================================
// RELACIONAMENTOS - Stock
// =========================================

export const StockRelationships = {
  product: {
    type: 'belongsTo' as const,
    targetEntity: 'Product',
    fieldName: 'product',
    foreignKey: 'productId',
    inverseField: 'stock'
  }
} as const;

// =========================================
// VALIDAÇÃO COMPLETA
// =========================================

export const validateStock = StockSchema;
export const validateStockSafe = (data: any) => StockSchema.safeParse(data);
export const validateStockStrict = (data: any) => StockSchema.parse(data);

// =========================================
// UTILITÁRIOS DE VALIDAÇÃO
// =========================================

export class StockValidator {
  static validate(data: any) {
    return validateStockSafe(data);
  }

  static validateStrict(data: any) {
    return validateStockStrict(data);
  }

  static validateField(fieldName: string, value: any) {
    const fieldValidators: Record<string, z.ZodTypeAny> = {
      id: validateId,
      productId: validateProductId,
      warehouseId: validateWarehouseId,
      quantity: validateQuantity,
      reservedQuantity: validateReservedQuantity,
      availableQuantity: validateAvailableQuantity,
      minThreshold: validateMinThreshold,
      maxThreshold: validateMaxThreshold,
      location: validateLocation,
      lastUpdated: validateLastUpdated,
      supplier: validateSupplier
    };

    const validator = fieldValidators[fieldName];
    return validator ? validator.safeParse(value) : { success: false, error: new Error('Campo não encontrado') };
  }

  static getRelationships() {
    return StockRelationships;
  }

  static getSchema() {
    return StockSchema;
  }

  // Validações específicas de negócio
  static validateAvailableQuantity(total: number, reserved: number, available: number): boolean {
    return available === total - reserved;
  }

  static needsRestock(available: number, minThreshold: number): boolean {
    return available <= minThreshold;
  }

  static isOverstocked(available: number, maxThreshold: number | undefined): boolean {
    return maxThreshold ? available > maxThreshold : false;
  }

  static canReserve(available: number, requestedQuantity: number): boolean {
    return available >= requestedQuantity;
  }

  static updateAvailableQuantity(total: number, reserved: number): number {
    return Math.max(0, total - reserved);
  }
}

export default StockValidator;
