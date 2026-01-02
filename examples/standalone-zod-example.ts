/**
 * Exemplo Standalone do Gerador de Schemas Zod
 * Demonstração independente das funcionalidades
 */

import { z } from 'zod';

// =========================================
// INTERFACES TYPESCRIPT
// =========================================

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  location: string;
  batchNumber?: string;
  expiryDate?: Date;
  status: 'available' | 'reserved' | 'damaged' | 'expired';
  lastUpdated: Date;
}

interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  billingAddress: Address;
  orderDate: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingNumber?: string;
  notes?: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
}

interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'cash' | 'crypto';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId?: string;
  paymentDate?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

// =========================================
// GERADOR DE SCHEMAS ZOD
// =========================================

class ZodSchemaGenerator {
  static generateProductSchema(): z.ZodSchema<Product> {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
      name: z.string()
        .min(1, 'Nome é obrigatório')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
      description: z.string()
        .min(10, 'Descrição deve ter pelo menos 10 caracteres')
        .max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
      price: z.number()
        .positive('Preço deve ser maior que zero')
        .max(999999.99, 'Preço deve ser menor que 1.000.000'),
      category: z.string()
        .min(1, 'Categoria é obrigatória')
        .max(50, 'Categoria deve ter no máximo 50 caracteres'),
      sku: z.string()
        .min(1, 'SKU é obrigatório')
        .max(50, 'SKU deve ter no máximo 50 caracteres')
        .regex(/^[A-Z0-9\-]+$/, 'SKU deve conter apenas letras maiúsculas, números e hífens'),
      barcode: z.string()
        .regex(/^[0-9]{8,18}$/, 'Código de barras deve ter entre 8 e 18 dígitos')
        .optional(),
      weight: z.number()
        .positive('Peso deve ser maior que zero')
        .max(1000, 'Peso deve ser menor que 1000kg')
        .optional(),
      dimensions: z.object({
        length: z.number().positive('Comprimento deve ser maior que zero'),
        width: z.number().positive('Largura deve ser maior que zero'),
        height: z.number().positive('Altura deve ser maior que zero')
      }).optional(),
      tags: z.array(z.string().min(1).max(30))
        .max(10, 'Produto pode ter no máximo 10 tags'),
      isActive: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date()
    }).refine(
      (data) => data.updatedAt >= data.createdAt,
      {
        message: 'Data de atualização deve ser maior ou igual à data de criação',
        path: ['updatedAt']
      }
    );
  }

  static generateStockSchema(): z.ZodSchema<Stock> {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
      productId: z.string().uuid('ID do produto deve ser um UUID válido'),
      warehouseId: z.string().uuid('ID do armazém deve ser um UUID válido'),
      quantity: z.number()
        .int('Quantidade deve ser um número inteiro')
        .min(0, 'Quantidade não pode ser negativa'),
      minQuantity: z.number()
        .int('Quantidade mínima deve ser um número inteiro')
        .min(0, 'Quantidade mínima não pode ser negativa'),
      maxQuantity: z.number()
        .int('Quantidade máxima deve ser um número inteiro')
        .min(1, 'Quantidade máxima deve ser pelo menos 1')
        .optional(),
      location: z.string()
        .min(1, 'Localização é obrigatória')
        .max(100, 'Localização deve ter no máximo 100 caracteres'),
      batchNumber: z.string()
        .max(50, 'Número do lote deve ter no máximo 50 caracteres')
        .optional(),
      expiryDate: z.date()
        .min(new Date(), 'Data de validade deve ser futura')
        .optional(),
      status: z.enum(['available', 'reserved', 'damaged', 'expired']),
      lastUpdated: z.date()
    }).refine(
      (data) => !data.maxQuantity || data.maxQuantity >= data.minQuantity,
      {
        message: 'Quantidade máxima deve ser maior ou igual à quantidade mínima',
        path: ['maxQuantity']
      }
    ).refine(
      (data) => data.quantity >= data.minQuantity,
      {
        message: 'Quantidade atual deve ser maior ou igual à quantidade mínima',
        path: ['quantity']
      }
    );
  }

  static generateOrderSchema(): z.ZodSchema<Order> {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
      customerId: z.string().uuid('ID do cliente deve ser um UUID válido'),
      customerEmail: z.string()
        .email('E-mail deve ser válido')
        .max(255),
      customerName: z.string()
        .min(1, 'Nome do cliente é obrigatório')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
      items: z.array(this.generateOrderItemSchema())
        .min(1, 'Pedido deve ter pelo menos 1 item'),
      totalAmount: z.number()
        .positive('Valor total deve ser maior que zero')
        .max(999999.99),
      taxAmount: z.number()
        .min(0, 'Valor de impostos não pode ser negativo')
        .max(99999.99),
      discountAmount: z.number()
        .min(0, 'Valor de desconto não pode ser negativo')
        .max(99999.99),
      shippingAmount: z.number()
        .min(0, 'Valor de frete não pode ser negativo')
        .max(9999.99),
      status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
      shippingAddress: this.generateAddressSchema(),
      billingAddress: this.generateAddressSchema(),
      orderDate: z.date(),
      estimatedDelivery: z.date().optional(),
      actualDelivery: z.date().optional(),
      trackingNumber: z.string().max(50).optional(),
      notes: z.string().max(500).optional()
    }).refine(
      (data) => !data.actualDelivery || data.actualDelivery >= data.orderDate,
      {
        message: 'Data de entrega deve ser posterior à data do pedido',
        path: ['actualDelivery']
      }
    );
  }

  static generateOrderItemSchema(): z.ZodSchema<OrderItem> {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
      orderId: z.string().uuid('ID do pedido deve ser um UUID válido'),
      productId: z.string().uuid('ID do produto deve ser um UUID válido'),
      quantity: z.number()
        .int('Quantidade deve ser um número inteiro')
        .min(1, 'Quantidade deve ser pelo menos 1'),
      unitPrice: z.number()
        .positive('Preço unitário deve ser maior que zero')
        .max(999999.99),
      totalPrice: z.number()
        .positive('Preço total deve ser maior que zero')
        .max(999999.99),
      discount: z.number()
        .min(0, 'Desconto não pode ser negativo')
        .max(100, 'Desconto não pode ser maior que 100%')
    });
  }

  static generatePaymentSchema(): z.ZodSchema<Payment> {
    return z.object({
      id: z.string().uuid('ID deve ser um UUID válido'),
      orderId: z.string().uuid('ID do pedido deve ser um UUID válido'),
      customerId: z.string().uuid('ID do cliente deve ser um UUID válido'),
      amount: z.number()
        .positive('Valor deve ser maior que zero')
        .max(999999.99),
      currency: z.string()
        .length(3, 'Moeda deve ter 3 caracteres')
        .regex(/^[A-Z]{3}$/, 'Moeda deve ser em maiúsculo'),
      method: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'crypto']),
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']),
      transactionId: z.string()
        .max(100, 'ID da transação deve ter no máximo 100 caracteres')
        .optional(),
      paymentDate: z.date().optional(),
      failureReason: z.string().max(500).optional(),
      metadata: z.record(z.any()).optional()
    });
  }

  static generateAddressSchema(): z.ZodSchema<Address> {
    return z.object({
      street: z.string().min(1, 'Rua é obrigatória').max(100),
      number: z.string().min(1, 'Número é obrigatório').max(20),
      complement: z.string().max(50).optional(),
      neighborhood: z.string().min(1, 'Bairro é obrigatório').max(50),
      city: z.string().min(1, 'Cidade é obrigatória').max(50),
      state: z.string().min(1, 'Estado é obrigatório').max(50),
      country: z.string().min(1, 'País é obrigatório').max(50),
      zipCode: z.string()
        .regex(/^[0-9]{5}-?[0-9]{3}$/, 'CEP deve estar no formato XXXXX-XXX ou XXXXXXXX'),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional()
    });
  }
}

// =========================================
// FUNÇÕES DE VALIDAÇÃO INDIVIDUAIS
// =========================================

export const id = (value: unknown): string => {
  return z.string().uuid().parse(value);
};

export const name = (value: unknown): string => {
  return z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .parse(value);
};

export const description = (value: unknown): string => {
  return z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .parse(value);
};

export const price = (value: unknown): number => {
  return z.number()
    .positive('Preço deve ser maior que zero')
    .max(999999.99, 'Preço deve ser menor que 1.000.000')
    .parse(value);
};

export const category = (value: unknown): string => {
  return z.string()
    .min(1, 'Categoria é obrigatória')
    .max(50, 'Categoria deve ter no máximo 50 caracteres')
    .parse(value);
};

export const sku = (value: unknown): string => {
  return z.string()
    .min(1, 'SKU é obrigatório')
    .max(50, 'SKU deve ter no máximo 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'SKU deve conter apenas letras maiúsculas, números e hífens')
    .parse(value);
};

export const quantity = (value: unknown): number => {
  return z.number()
    .int('Quantidade deve ser um número inteiro')
    .min(0, 'Quantidade não pode ser negativa')
    .parse(value);
};

export const totalAmount = (value: unknown): number => {
  return z.number()
    .positive('Valor total deve ser maior que zero')
    .max(999999.99)
    .parse(value);
};

export const status = (value: unknown): string => {
  return z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .parse(value);
};

export const customerEmail = (value: unknown): string => {
  return z.string()
    .email('E-mail deve ser válido')
    .max(255)
    .parse(value);
};

export const amount = (value: unknown): number => {
  return z.number()
    .positive('Valor deve ser maior que zero')
    .max(999999.99)
    .parse(value);
};

// =========================================
// DEMONSTRAÇÃO COMPLETA
// =========================================

function demonstrateEcommerceFlow() {
  console.log('🚀 Demonstração Completa: Product → Order → Payment → Stock\n');

  try {
    // 1. Criar Produto
    const productData = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'iPhone 15 Pro Max',
      description: 'Smartphone Apple iPhone 15 Pro Max 256GB - Titânio Natural. Tela Super Retina XDR de 6,7 polegadas, chip A17 Pro, câmera profissional de 48MP.',
      price: 8999.99,
      category: 'Eletrônicos',
      sku: 'IPH15PM-256-TN',
      barcode: '1234567890123',
      weight: 0.221,
      dimensions: { length: 15.9, width: 7.6, height: 0.81 },
      tags: ['smartphone', 'apple', 'ios', 'premium'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const productSchema = ZodSchemaGenerator.generateProductSchema();
    const validatedProduct = productSchema.parse(productData);
    console.log('✅ Produto validado:', validatedProduct.name);

    // 2. Criar Estoque
    const stockData = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      productId: validatedProduct.id,
      warehouseId: '550e8400-e29b-41d4-a716-446655440003',
      quantity: 150,
      minQuantity: 10,
      maxQuantity: 200,
      location: 'Setor A - Prateleira 5',
      batchNumber: 'BATCH-2025-001',
      expiryDate: new Date('2026-12-31'),
      status: 'available' as const,
      lastUpdated: new Date()
    };

    const stockSchema = ZodSchemaGenerator.generateStockSchema();
    const validatedStock = stockSchema.parse(stockData);
    console.log('📦 Estoque validado:', `${validatedStock.quantity} unidades disponíveis`);

    // 3. Criar Pedido
    const orderData = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      customerId: '550e8400-e29b-41d4-a716-446655440005',
      customerEmail: 'cliente@email.com',
      customerName: 'João Silva',
      items: [{
        id: '550e8400-e29b-41d4-a716-446655440006',
        orderId: '550e8400-e29b-41d4-a716-446655440004',
        productId: validatedProduct.id,
        quantity: 2,
        unitPrice: validatedProduct.price,
        totalPrice: validatedProduct.price * 2,
        discount: 0
      }],
      totalAmount: validatedProduct.price * 2 + 29.90 + 179.99,
      taxAmount: 179.99,
      discountAmount: 0,
      shippingAmount: 29.90,
      status: 'confirmed' as const,
      paymentStatus: 'pending' as const,
      shippingAddress: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        zipCode: '01234567'
      },
      billingAddress: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        zipCode: '01234567'
      },
      orderDate: new Date(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      trackingNumber: 'BR123456789BR'
    };

    const orderSchema = ZodSchemaGenerator.generateOrderSchema();
    const validatedOrder = orderSchema.parse(orderData);
    console.log('🛒 Pedido validado:', `R$ ${validatedOrder.totalAmount.toFixed(2)}`);

    // 4. Criar Pagamento
    const paymentData = {
      id: '550e8400-e29b-41d4-a716-446655440007',
      orderId: validatedOrder.id,
      customerId: validatedOrder.customerId,
      amount: validatedOrder.totalAmount,
      currency: 'BRL',
      method: 'credit_card' as const,
      status: 'completed' as const,
      transactionId: 'TXN-2025-001-ABC123',
      paymentDate: new Date(),
      metadata: {
        cardLastFour: '1234',
        cardBrand: 'visa',
        installments: 3
      }
    };

    const paymentSchema = ZodSchemaGenerator.generatePaymentSchema();
    const validatedPayment = paymentSchema.parse(paymentData);
    console.log('💳 Pagamento validado:', `${validatedPayment.currency} ${validatedPayment.amount.toFixed(2)}`);

    // 5. Demonstrar Ligações
    console.log('\n🔗 Ligações entre as Entidades:\n');

    console.log('📱 Product → Stock:');
    console.log(`   ${validatedProduct.name} está no estoque: ${validatedStock.location}`);
    console.log(`   Quantidade disponível: ${validatedStock.quantity} unidades\n`);

    console.log('🛒 Product → Order:');
    console.log(`   ${validatedProduct.name} foi pedido por ${validatedOrder.customerName}`);
    console.log(`   Quantidade: ${validatedOrder.items[0].quantity} unidades`);
    console.log(`   Valor unitário: R$ ${validatedOrder.items[0].unitPrice.toFixed(2)}\n`);

    console.log('💰 Order → Payment:');
    console.log(`   Pedido ${validatedOrder.id} foi pago via ${validatedPayment.method}`);
    console.log(`   Valor: ${validatedPayment.currency} ${validatedPayment.amount.toFixed(2)}`);
    console.log(`   Status: ${validatedPayment.status}\n`);

    console.log('🔄 Stock Update (Simulado):');
    const newStockQuantity = validatedStock.quantity - validatedOrder.items[0].quantity;
    console.log(`   Estoque anterior: ${validatedStock.quantity} unidades`);
    console.log(`   Estoque após venda: ${newStockQuantity} unidades\n`);

    // 6. Usar funções de validação individuais
    console.log('🔍 Usando funções de validação individuais:');
    try {
      console.log('✅ ID válido:', id(validatedProduct.id));
      console.log('✅ Nome válido:', name(validatedProduct.name));
      console.log('✅ Preço válido:', price(validatedProduct.price));
      console.log('✅ SKU válido:', sku(validatedProduct.sku));
      console.log('✅ Quantidade válida:', quantity(validatedStock.quantity));
      console.log('✅ Valor total válido:', totalAmount(validatedOrder.totalAmount));
      console.log('✅ Status válido:', status(validatedOrder.status));
      console.log('✅ E-mail válido:', customerEmail(validatedOrder.customerEmail));
      console.log('✅ Valor válido:', amount(validatedPayment.amount));
    } catch (error) {
      console.error('❌ Erro de validação:', error);
    }

    return {
      product: validatedProduct,
      stock: validatedStock,
      order: validatedOrder,
      payment: validatedPayment
    };

  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
    return null;
  }
}

// Executar demonstração
console.log('🎯 Gerador de Schemas Zod - Demonstração Standalone');
console.log('=' .repeat(60));

const result = demonstrateEcommerceFlow();

if (result) {
  console.log('\n✅ Demonstração concluída com sucesso!');
  console.log('📊 Resumo:');
  console.log(`   📱 Produto: ${result.product.name}`);
  console.log(`   📦 Estoque: ${result.stock.quantity} unidades`);
  console.log(`   🛒 Pedido: R$ ${result.order.totalAmount.toFixed(2)}`);
  console.log(`   💳 Pagamento: ${result.payment.status}`);
} else {
  console.log('\n❌ Demonstração falhou!');
}

export { ZodSchemaGenerator, demonstrateEcommerceFlow };
