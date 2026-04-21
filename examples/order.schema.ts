/**
 * Schema Zod gerado automaticamente para Order
 * Gerado em: 29/11/2025
 */

import { z } from 'zod';

// =========================================
// INTERFACES AUXILIARES
// =========================================

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  discount: z.number().optional()
});

export const AddressSchema = z.object({
  street: z.string(),
  number: z.string(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string()
});

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);

// =========================================
// SCHEMA ZOD PARA ORDER
// =========================================

export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  orderNumber: z.string(),
  products: z.array(OrderItemSchema),
  totalAmount: z.number(),
  status: OrderStatusSchema,
  paymentId: z.string().uuid().optional(),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema,
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deliveredAt: z.date().optional()
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// =========================================
// VALIDAÇÃO POR CAMPO - Order
// =========================================

export const validateId = z.string().uuid();
export const validateIdValidator = (value: any) => validateId.safeParse(value);

export const validateCustomerId = z.string().uuid();
export const validateCustomerIdValidator = (value: any) => validateCustomerId.safeParse(value);

export const validateOrderNumber = z.string();
export const validateOrderNumberValidator = (value: any) => validateOrderNumber.safeParse(value);

export const validateProducts = z.array(OrderItemSchema);
export const validateProductsValidator = (value: any) => validateProducts.safeParse(value);

export const validateTotalAmount = z.number();
export const validateTotalAmountValidator = (value: any) => validateTotalAmount.safeParse(value);

export const validateStatus = OrderStatusSchema;
export const validateStatusValidator = (value: any) => validateStatus.safeParse(value);

export const validatePaymentId = z.string().uuid().optional();
export const validatePaymentIdValidator = (value: any) => validatePaymentId.safeParse(value);

export const validateShippingAddress = AddressSchema;
export const validateShippingAddressValidator = (value: any) => validateShippingAddress.safeParse(value);

export const validateBillingAddress = AddressSchema;
export const validateBillingAddressValidator = (value: any) => validateBillingAddress.safeParse(value);

export const validateNotes = z.string().optional();
export const validateNotesValidator = (value: any) => validateNotes.safeParse(value);

export const validateCreatedAt = z.date();
export const validateCreatedAtValidator = (value: any) => validateCreatedAt.safeParse(value);

export const validateUpdatedAt = z.date();
export const validateUpdatedAtValidator = (value: any) => validateUpdatedAt.safeParse(value);

export const validateDeliveredAt = z.date().optional();
export const validateDeliveredAtValidator = (value: any) => validateDeliveredAt.safeParse(value);

// =========================================
// RELACIONAMENTOS - Order
// =========================================

export const OrderRelationships = {
  payment: {
    type: 'hasOne' as const,
    targetEntity: 'Payment',
    fieldName: 'payment',
    foreignKey: 'paymentId',
    inverseField: 'order'
  },
  customer: {
    type: 'belongsTo' as const,
    targetEntity: 'Customer',
    fieldName: 'customer',
    foreignKey: 'customerId',
    inverseField: 'orders'
  },
  products: {
    type: 'manyToMany' as const,
    targetEntity: 'Product',
    fieldName: 'products',
    foreignKey: 'productId',
    inverseField: 'orders'
  }
} as const;

// =========================================
// VALIDAÇÃO COMPLETA
// =========================================

export const validateOrder = OrderSchema;
export const validateOrderSafe = (data: any) => OrderSchema.safeParse(data);
export const validateOrderStrict = (data: any) => OrderSchema.parse(data);

// =========================================
// UTILITÁRIOS DE VALIDAÇÃO
// =========================================

export class OrderValidator {
  static validate(data: any) {
    return validateOrderSafe(data);
  }

  static validateStrict(data: any) {
    return validateOrderStrict(data);
  }

  static validateField(fieldName: string, value: any) {
    const fieldValidators: Record<string, z.ZodTypeAny> = {
      id: validateId,
      customerId: validateCustomerId,
      orderNumber: validateOrderNumber,
      products: validateProducts,
      totalAmount: validateTotalAmount,
      status: validateStatus,
      paymentId: validatePaymentId,
      shippingAddress: validateShippingAddress,
      billingAddress: validateBillingAddress,
      notes: validateNotes,
      createdAt: validateCreatedAt,
      updatedAt: validateUpdatedAt,
      deliveredAt: validateDeliveredAt
    };

    const validator = fieldValidators[fieldName];
    return validator ? validator.safeParse(value) : { success: false, error: new Error('Campo não encontrado') };
  }

  static getRelationships() {
    return OrderRelationships;
  }

  static getSchema() {
    return OrderSchema;
  }

  // Validações específicas de negócio
  static validateTotalAmount(products: OrderItem[], expectedTotal: number): boolean {
    const calculatedTotal = products.reduce((sum, item) => sum + item.totalPrice, 0);
    return Math.abs(calculatedTotal - expectedTotal) < 0.01; // Tolerância de 1 centavo
  }

  static canChangeStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const statusFlow: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: []
    };

    return statusFlow[currentStatus]?.includes(newStatus) ?? false;
  }
}

export default OrderValidator;
