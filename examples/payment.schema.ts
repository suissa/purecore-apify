/**
 * Schema Zod gerado automaticamente para Payment
 * Gerado em: 29/11/2025
 */

import { z } from 'zod';

// =========================================
// INTERFACES AUXILIARES
// =========================================

export const PaymentMethodSchema = z.enum(['credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer', 'crypto']);
export const PaymentStatusSchema = z.enum(['pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback']);

// =========================================
// SCHEMA ZOD PARA PAYMENT
// =========================================

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  amount: z.number(),
  currency: z.string().default('BRL'),
  method: PaymentMethodSchema,
  status: PaymentStatusSchema,
  transactionId: z.string().optional(),
  gateway: z.string(),
  gatewayResponse: z.any().optional(),
  installments: z.number().optional(),
  installmentValue: z.number().optional(),
  discount: z.number().optional(),
  fees: z.number().optional(),
  netAmount: z.number().optional(),
  createdAt: z.date(),
  processedAt: z.date().optional(),
  approvedAt: z.date().optional(),
  rejectedAt: z.date().optional(),
  refundedAt: z.date().optional(),
  refundAmount: z.number().optional(),
  refundReason: z.string().optional()
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// =========================================
// VALIDAÇÃO POR CAMPO - Payment
// =========================================

export const validateId = z.string().uuid();
export const validateIdValidator = (value: any) => validateId.safeParse(value);

export const validateOrderId = z.string().uuid();
export const validateOrderIdValidator = (value: any) => validateOrderId.safeParse(value);

export const validateCustomerId = z.string().uuid();
export const validateCustomerIdValidator = (value: any) => validateCustomerId.safeParse(value);

export const validateAmount = z.number();
export const validateAmountValidator = (value: any) => validateAmount.safeParse(value);

export const validateCurrency = z.string().default('BRL');
export const validateCurrencyValidator = (value: any) => validateCurrency.safeParse(value);

export const validateMethod = PaymentMethodSchema;
export const validateMethodValidator = (value: any) => validateMethod.safeParse(value);

export const validateStatus = PaymentStatusSchema;
export const validateStatusValidator = (value: any) => validateStatus.safeParse(value);

export const validateTransactionId = z.string().optional();
export const validateTransactionIdValidator = (value: any) => validateTransactionId.safeParse(value);

export const validateGateway = z.string();
export const validateGatewayValidator = (value: any) => validateGateway.safeParse(value);

export const validateGatewayResponse = z.any().optional();
export const validateGatewayResponseValidator = (value: any) => validateGatewayResponse.safeParse(value);

export const validateInstallments = z.number().optional();
export const validateInstallmentsValidator = (value: any) => validateInstallments.safeParse(value);

export const validateInstallmentValue = z.number().optional();
export const validateInstallmentValueValidator = (value: any) => validateInstallmentValue.safeParse(value);

export const validateDiscount = z.number().optional();
export const validateDiscountValidator = (value: any) => validateDiscount.safeParse(value);

export const validateFees = z.number().optional();
export const validateFeesValidator = (value: any) => validateFees.safeParse(value);

export const validateNetAmount = z.number().optional();
export const validateNetAmountValidator = (value: any) => validateNetAmount.safeParse(value);

export const validateCreatedAt = z.date();
export const validateCreatedAtValidator = (value: any) => validateCreatedAt.safeParse(value);

export const validateProcessedAt = z.date().optional();
export const validateProcessedAtValidator = (value: any) => validateProcessedAt.safeParse(value);

export const validateApprovedAt = z.date().optional();
export const validateApprovedAtValidator = (value: any) => validateApprovedAt.safeParse(value);

export const validateRejectedAt = z.date().optional();
export const validateRejectedAtValidator = (value: any) => validateRejectedAt.safeParse(value);

export const validateRefundedAt = z.date().optional();
export const validateRefundedAtValidator = (value: any) => validateRefundedAt.safeParse(value);

export const validateRefundAmount = z.number().optional();
export const validateRefundAmountValidator = (value: any) => validateRefundAmount.safeParse(value);

export const validateRefundReason = z.string().optional();
export const validateRefundReasonValidator = (value: any) => validateRefundReason.safeParse(value);

// =========================================
// RELACIONAMENTOS - Payment
// =========================================

export const PaymentRelationships = {
  order: {
    type: 'belongsTo' as const,
    targetEntity: 'Order',
    fieldName: 'order',
    foreignKey: 'orderId',
    inverseField: 'payment'
  },
  customer: {
    type: 'belongsTo' as const,
    targetEntity: 'Customer',
    fieldName: 'customer',
    foreignKey: 'customerId',
    inverseField: 'payments'
  }
} as const;

// =========================================
// VALIDAÇÃO COMPLETA
// =========================================

export const validatePayment = PaymentSchema;
export const validatePaymentSafe = (data: any) => PaymentSchema.safeParse(data);
export const validatePaymentStrict = (data: any) => PaymentSchema.parse(data);

// =========================================
// UTILITÁRIOS DE VALIDAÇÃO
// =========================================

export class PaymentValidator {
  static validate(data: any) {
    return validatePaymentSafe(data);
  }

  static validateStrict(data: any) {
    return validatePaymentStrict(data);
  }

  static validateField(fieldName: string, value: any) {
    const fieldValidators: Record<string, z.ZodTypeAny> = {
      id: validateId,
      orderId: validateOrderId,
      customerId: validateCustomerId,
      amount: validateAmount,
      currency: validateCurrency,
      method: validateMethod,
      status: validateStatus,
      transactionId: validateTransactionId,
      gateway: validateGateway,
      gatewayResponse: validateGatewayResponse,
      installments: validateInstallments,
      installmentValue: validateInstallmentValue,
      discount: validateDiscount,
      fees: validateFees,
      netAmount: validateNetAmount,
      createdAt: validateCreatedAt,
      processedAt: validateProcessedAt,
      approvedAt: validateApprovedAt,
      rejectedAt: validateRejectedAt,
      refundedAt: validateRefundedAt,
      refundAmount: validateRefundAmount,
      refundReason: validateRefundReason
    };

    const validator = fieldValidators[fieldName];
    return validator ? validator.safeParse(value) : { success: false, error: new Error('Campo não encontrado') };
  }

  static getRelationships() {
    return PaymentRelationships;
  }

  static getSchema() {
    return PaymentSchema;
  }

  // Validações específicas de negócio
  static validateInstallmentValue(amount: number, installments: number, installmentValue: number): boolean {
    if (!installments || !installmentValue) return true; // Opcional

    const expectedTotal = installmentValue * installments;
    const tolerance = amount * 0.01; // 1% de tolerância para juros

    return Math.abs(expectedTotal - amount) <= tolerance;
  }

  static canRefund(status: PaymentStatus): boolean {
    return ['approved', 'processing'].includes(status);
  }

  static calculateNetAmount(amount: number, discount: number = 0, fees: number = 0): number {
    return amount - discount - fees;
  }

  static validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['approved', 'rejected', 'cancelled'],
      approved: ['refunded', 'chargeback'],
      rejected: [],
      cancelled: [],
      refunded: [],
      chargeback: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}

export default PaymentValidator;
