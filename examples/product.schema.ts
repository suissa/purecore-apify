/**
 * Schema Zod gerado automaticamente para Product
 * Gerado em: 29/11/2025
 */

import { z } from 'zod';

// =========================================
// SCHEMA ZOD PARA PRODUCT
// =========================================

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  tags: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Product = z.infer<typeof ProductSchema>;

// =========================================
// VALIDAÇÃO POR CAMPO - Product
// =========================================

export const validateId = z.string().uuid();
export const validateIdValidator = (value: any) => validateId.safeParse(value);

export const validateName = z.string();
export const validateNameValidator = (value: any) => validateName.safeParse(value);

export const validateDescription = z.string();
export const validateDescriptionValidator = (value: any) => validateDescription.safeParse(value);

export const validatePrice = z.number();
export const validatePriceValidator = (value: any) => validatePrice.safeParse(value);

export const validateCategory = z.string();
export const validateCategoryValidator = (value: any) => validateCategory.safeParse(value);

export const validateSku = z.string();
export const validateSkuValidator = (value: any) => validateSku.safeParse(value);

export const validateBarcode = z.string().optional();
export const validateBarcodeValidator = (value: any) => validateBarcode.safeParse(value);

export const validateWeight = z.number().optional();
export const validateWeightValidator = (value: any) => validateWeight.safeParse(value);

export const validateDimensions = z.string().optional();
export const validateDimensionsValidator = (value: any) => validateDimensions.safeParse(value);

export const validateTags = z.array(z.string());
export const validateTagsValidator = (value: any) => validateTags.safeParse(value);

export const validateIsActive = z.boolean();
export const validateIsActiveValidator = (value: any) => validateIsActive.safeParse(value);

export const validateCreatedAt = z.date();
export const validateCreatedAtValidator = (value: any) => validateCreatedAt.safeParse(value);

export const validateUpdatedAt = z.date();
export const validateUpdatedAtValidator = (value: any) => validateUpdatedAt.safeParse(value);

// =========================================
// RELACIONAMENTOS - Product
// =========================================

export const ProductRelationships = {
  stock: {
    type: 'hasMany' as const,
    targetEntity: 'Stock',
    fieldName: 'stock',
    foreignKey: 'productId',
    inverseField: 'product'
  },
  orders: {
    type: 'hasMany' as const,
    targetEntity: 'Order',
    fieldName: 'orders',
    foreignKey: 'productId',
    inverseField: 'products'
  }
} as const;

// =========================================
// VALIDAÇÃO COMPLETA
// =========================================

export const validateProduct = ProductSchema;
export const validateProductSafe = (data: any) => ProductSchema.safeParse(data);
export const validateProductStrict = (data: any) => ProductSchema.parse(data);

// =========================================
// UTILITÁRIOS DE VALIDAÇÃO
// =========================================

export class ProductValidator {
  static validate(data: any) {
    return validateProductSafe(data);
  }

  static validateStrict(data: any) {
    return validateProductStrict(data);
  }

  static validateField(fieldName: string, value: any) {
    const fieldValidators: Record<string, z.ZodTypeAny> = {
      id: validateId,
      name: validateName,
      description: validateDescription,
      price: validatePrice,
      category: validateCategory,
      sku: validateSku,
      barcode: validateBarcode,
      weight: validateWeight,
      dimensions: validateDimensions,
      tags: validateTags,
      isActive: validateIsActive,
      createdAt: validateCreatedAt,
      updatedAt: validateUpdatedAt
    };

    const validator = fieldValidators[fieldName];
    return validator ? validator.safeParse(value) : { success: false, error: new Error('Campo não encontrado') };
  }

  static getRelationships() {
    return ProductRelationships;
  }

  static getSchema() {
    return ProductSchema;
  }
}

export default ProductValidator;
