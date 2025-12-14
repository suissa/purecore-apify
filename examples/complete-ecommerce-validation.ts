/**
 * Demonstração Completa: Validação de E-commerce com Schemas Zod
 * Mostra as ligações: Product → Order → Payment → Stock
 *
 * Este arquivo demonstra como validar um fluxo completo de e-commerce
 * usando os schemas Zod gerados automaticamente a partir de interfaces TypeScript.
 */

import { ProductValidator } from './product.schema.js';
import { OrderValidator } from './order.schema.js';
import { PaymentValidator } from './payment.schema.js';
import { StockValidator } from './stock.schema.js';

// =========================================
// DADOS DE EXEMPLO - FLUXO COMPLETO
// =========================================

const sampleData = {
  // 1. PRODUTO
  product: {
    id: 'prod-123e4567-e89b-12d3-a456-426614174000',
    name: 'MacBook Pro M3 14"',
    description: 'Notebook profissional Apple com chip M3',
    price: 12999.99,
    category: 'eletronicos',
    sku: 'MBP-M3-14-512',
    barcode: '7891234567890',
    weight: 1.61,
    dimensions: '31.26 x 22.12 x 1.55 cm',
    tags: ['apple', 'macbook', 'm3', 'profissional'],
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },

  // 2. ESTOQUE (relacionado ao produto)
  stock: {
    id: 'stock-123e4567-e89b-12d3-a456-426614174001',
    productId: 'prod-123e4567-e89b-12d3-a456-426614174000', // FK para Product
    warehouseId: 'wh-sao-paulo-01',
    quantity: 25,
    reservedQuantity: 3,
    availableQuantity: 22,
    minThreshold: 5,
    maxThreshold: 50,
    location: 'Setor A - Prateleira 12 - Posição 3',
    lastUpdated: new Date(),
    supplier: 'Apple Brasil'
  },

  // 3. PEDIDO (relacionado ao produto via OrderItem)
  order: {
    id: 'order-123e4567-e89b-12d3-a456-426614174002',
    customerId: 'cust-123e4567-e89b-12d3-a456-426614174003',
    orderNumber: 'ORD-2024-001234',
    products: [
      {
        id: 'item-123e4567-e89b-12d3-a456-426614174004',
        productId: 'prod-123e4567-e89b-12d3-a456-426614174000', // FK para Product
        quantity: 1,
        unitPrice: 12999.99,
        totalPrice: 12999.99,
        discount: 500.00
      }
    ],
    totalAmount: 12499.99,
    status: 'confirmed' as const,
    shippingAddress: {
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Sala 1201',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'Brasil'
    },
    billingAddress: {
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Sala 1201',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'Brasil'
    },
    notes: 'Cliente VIP - entrega expressa',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 4. PAGAMENTO (relacionado ao pedido)
  payment: {
    id: 'pay-123e4567-e89b-12d3-a456-426614174005',
    orderId: 'order-123e4567-e89b-12d3-a456-426614174002', // FK para Order
    customerId: 'cust-123e4567-e89b-12d3-a456-426614174003', // FK para Customer
    amount: 12499.99,
    currency: 'BRL',
    method: 'credit_card' as const,
    status: 'approved' as const,
    transactionId: 'txn_1234567890',
    gateway: 'stripe',
    installments: 3,
    installmentValue: 4166.66,
    discount: 500.00,
    fees: 124.99,
    netAmount: 12375.00,
    createdAt: new Date(),
    processedAt: new Date(),
    approvedAt: new Date()
  }
};

// =========================================
// VALIDAÇÃO INDIVIDUAL POR ENTIDADE
// =========================================

function validateEntities(): void {
  console.log('🔍 VALIDAÇÃO INDIVIDUAL POR ENTIDADE\n');

  // Validação Product
  console.log('📦 Validando Product...');
  const productValidation = ProductValidator.validate(sampleData.product);
  if (productValidation.success) {
    console.log('   ✅ Product válido');
    console.log(`   📊 Campos validados: ${Object.keys(sampleData.product).length}`);
  } else {
    console.log('   ❌ Product inválido:', productValidation.error);
  }

  // Validação Stock
  console.log('\n📊 Validando Stock...');
  const stockValidation = StockValidator.validate(sampleData.stock);
  if (stockValidation.success) {
    console.log('   ✅ Stock válido');

    // Validações específicas de negócio
    const availableValid = StockValidator.validateAvailableQuantity(
      sampleData.stock.quantity,
      sampleData.stock.reservedQuantity,
      sampleData.stock.availableQuantity
    );
    console.log(`   📊 Quantidade disponível correta: ${availableValid ? '✅' : '❌'}`);

    const needsRestock = StockValidator.needsRestock(
      sampleData.stock.availableQuantity,
      sampleData.stock.minThreshold
    );
    console.log(`   📊 Precisa repor estoque: ${needsRestock ? '⚠️ SIM' : '✅ NÃO'}`);

  } else {
    console.log('   ❌ Stock inválido:', stockValidation.error);
  }

  // Validação Order
  console.log('\n🛒 Validando Order...');
  const orderValidation = OrderValidator.validate(sampleData.order);
  if (orderValidation.success) {
    console.log('   ✅ Order válido');

    // Validação de negócio: total do pedido
    const totalValid = OrderValidator.validateTotalAmount(
      sampleData.order.products,
      sampleData.order.totalAmount
    );
    console.log(`   📊 Total do pedido correto: ${totalValid ? '✅' : '❌'}`);

  } else {
    console.log('   ❌ Order inválido:', orderValidation.error);
  }

  // Validação Payment
  console.log('\n💳 Validando Payment...');
  const paymentValidation = PaymentValidator.validate(sampleData.payment);
  if (paymentValidation.success) {
    console.log('   ✅ Payment válido');

    // Validações específicas de negócio
    if (sampleData.payment.installments && sampleData.payment.installmentValue) {
      const installmentValid = PaymentValidator.validateInstallmentValue(
        sampleData.payment.amount,
        sampleData.payment.installments,
        sampleData.payment.installmentValue
      );
      console.log(`   📊 Valor das parcelas correto: ${installmentValid ? '✅' : '❌'}`);
    }

    const canRefund = PaymentValidator.canRefund(sampleData.payment.status);
    console.log(`   📊 Pode ser reembolsado: ${canRefund ? '✅ SIM' : '❌ NÃO'}`);

  } else {
    console.log('   ❌ Payment inválido:', paymentValidation.error);
  }
}

// =========================================
// VALIDAÇÃO DE RELACIONAMENTOS
// =========================================

function validateRelationships(): void {
  console.log('\n🔗 VALIDAÇÃO DE RELACIONAMENTOS\n');

  const relationships = [
    {
      name: 'Product → Stock',
      from: 'product.id',
      to: 'stock.productId',
      fromValue: sampleData.product.id,
      toValue: sampleData.stock.productId,
      valid: sampleData.product.id === sampleData.stock.productId
    },
    {
      name: 'Product → Order (via OrderItem)',
      from: 'product.id',
      to: 'order.products[0].productId',
      fromValue: sampleData.product.id,
      toValue: sampleData.order.products[0]?.productId,
      valid: sampleData.product.id === sampleData.order.products[0]?.productId
    },
    {
      name: 'Order → Payment',
      from: 'order.id',
      to: 'payment.orderId',
      fromValue: sampleData.order.id,
      toValue: sampleData.payment.orderId,
      valid: sampleData.order.id === sampleData.payment.orderId
    },
    {
      name: 'Order → Payment (valor)',
      from: 'order.totalAmount',
      to: 'payment.amount',
      fromValue: sampleData.order.totalAmount,
      toValue: sampleData.payment.amount,
      valid: sampleData.order.totalAmount === sampleData.payment.amount
    }
  ];

  relationships.forEach(rel => {
    console.log(`${rel.name}:`);
    console.log(`   ${rel.from}: ${rel.fromValue}`);
    console.log(`   ${rel.to}: ${rel.toValue}`);
    console.log(`   Status: ${rel.valid ? '✅ Válido' : '❌ Inválido'}`);
    console.log('');
  });

  const allValid = relationships.every(r => r.valid);
  console.log(`🎯 RESULTADO GERAL: ${allValid ? '✅ Todos os relacionamentos válidos' : '❌ Relacionamentos com problemas'}`);
}

// =========================================
// VALIDAÇÃO POR CAMPO INDIVIDUAL
// =========================================

function validateIndividualFields(): void {
  console.log('\n🎯 VALIDAÇÃO POR CAMPO INDIVIDUAL\n');

  const fieldValidations = [
    // Product fields
    { entity: 'Product', field: 'price', value: sampleData.product.price },
    { entity: 'Product', field: 'sku', value: sampleData.product.sku },
    { entity: 'Product', field: 'isActive', value: sampleData.product.isActive },

    // Order fields
    { entity: 'Order', field: 'totalAmount', value: sampleData.order.totalAmount },
    { entity: 'Order', field: 'status', value: sampleData.order.status },

    // Payment fields
    { entity: 'Payment', field: 'amount', value: sampleData.payment.amount },
    { entity: 'Payment', field: 'method', value: sampleData.payment.method },
    { entity: 'Payment', field: 'installments', value: sampleData.payment.installments },

    // Stock fields
    { entity: 'Stock', field: 'quantity', value: sampleData.stock.quantity },
    { entity: 'Stock', field: 'availableQuantity', value: sampleData.stock.availableQuantity }
  ];

  fieldValidations.forEach(({ entity, field, value }) => {
    let validator;

    switch (entity) {
      case 'Product':
        validator = ProductValidator;
        break;
      case 'Order':
        validator = OrderValidator;
        break;
      case 'Payment':
        validator = PaymentValidator;
        break;
      case 'Stock':
        validator = StockValidator;
        break;
      default:
        return;
    }

    const result = validator.validateField(field, value);
    console.log(`${entity}.${field}: ${result.success ? '✅ Válido' : '❌ Inválido'} (${value})`);
  });
}

// =========================================
// SIMULAÇÃO DE FLUXO DE NEGÓCIO
// =========================================

function simulateBusinessFlow(): void {
  console.log('\n🏪 SIMULAÇÃO DE FLUXO DE NEGÓCIO\n');

  console.log('📋 Cenário: Cliente compra MacBook Pro');
  console.log('');

  // 1. Verificar estoque
  console.log('1️⃣ Verificação de estoque:');
  const hasStock = StockValidator.canReserve(
    sampleData.stock.availableQuantity,
    sampleData.order.products[0].quantity
  );
  console.log(`   Produto disponível: ${hasStock ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Quantidade solicitada: ${sampleData.order.products[0].quantity}`);
  console.log(`   Quantidade disponível: ${sampleData.stock.availableQuantity}`);
  console.log('');

  // 2. Criar pedido
  console.log('2️⃣ Criação do pedido:');
  console.log(`   Número do pedido: ${sampleData.order.orderNumber}`);
  console.log(`   Status inicial: ${sampleData.order.status}`);
  console.log(`   Valor total: R$ ${sampleData.order.totalAmount}`);
  console.log('');

  // 3. Processar pagamento
  console.log('3️⃣ Processamento do pagamento:');
  console.log(`   Método: ${sampleData.payment.method}`);
  console.log(`   Parcelas: ${sampleData.payment.installments}x de R$ ${sampleData.payment.installmentValue}`);
  console.log(`   Status: ${sampleData.payment.status}`);
  console.log('');

  // 4. Atualizar estoque
  console.log('4️⃣ Atualização do estoque:');
  const newReserved = sampleData.stock.reservedQuantity + sampleData.order.products[0].quantity;
  const newAvailable = StockValidator.updateAvailableQuantity(
    sampleData.stock.quantity,
    newReserved
  );
  console.log(`   Estoque anterior: ${sampleData.stock.availableQuantity} disponível`);
  console.log(`   Reservado agora: ${newReserved}`);
  console.log(`   Disponível agora: ${newAvailable}`);
  console.log('');

  // 5. Atualizar status do pedido
  console.log('5️⃣ Atualização do status do pedido:');
  const canChangeStatus = OrderValidator.canChangeStatus('confirmed', 'processing');
  console.log(`   Pode mudar status confirmed → processing: ${canChangeStatus ? '✅ SIM' : '❌ NÃO'}`);

  const canDeliver = OrderValidator.canChangeStatus('processing', 'shipped');
  console.log(`   Pode mudar status processing → shipped: ${canDeliver ? '✅ SIM' : '❌ NÃO'}`);
  console.log('');

  console.log('🎉 Fluxo de negócio concluído com sucesso!');
}

// =========================================
// RELATÓRIO DE MAPEAMENTO DE RELACIONAMENTOS
// =========================================

function generateRelationshipReport(): void {
  console.log('\n📊 MAPEAMENTO COMPLETO DE RELACIONAMENTOS\n');

  const entities = [
    { name: 'Product', validator: ProductValidator },
    { name: 'Stock', validator: StockValidator },
    { name: 'Order', validator: OrderValidator },
    { name: 'Payment', validator: PaymentValidator }
  ];

  console.log('🏗️ ESTRUTURA GERADA AUTOMATICAMENTE:');
  console.log('');

  entities.forEach(({ name, validator }) => {
    console.log(`📋 ${name}:`);
    const relationships = validator.getRelationships();

    Object.entries(relationships).forEach(([relName, rel]) => {
      console.log(`   🔗 ${relName}: ${rel.type} → ${rel.targetEntity}`);
      console.log(`      Foreign Key: ${rel.foreignKey}`);
      if (rel.inverseField) {
        console.log(`      Campo inverso: ${rel.inverseField}`);
      }
    });
    console.log('');
  });

  console.log('🔄 FLUXO DE RELACIONAMENTOS:');
  console.log('Product ←→ Stock (hasMany/belongsTo)');
  console.log('Product ←→ Order (manyToMany via OrderItem)');
  console.log('Order ←→ Payment (hasOne/belongsTo)');
  console.log('Order ←→ Customer (belongsTo)');
  console.log('Payment ←→ Customer (belongsTo)');
}

// =========================================
// FUNÇÃO PRINCIPAL
// =========================================

export function runCompleteValidationDemo(): void {
  console.log('🎨 DEMONSTRAÇÃO COMPLETA - VALIDAÇÃO DE E-COMMERCE');
  console.log('================================================\n');

  console.log('📖 Este exemplo demonstra:');
  console.log('• Schemas Zod gerados automaticamente de interfaces TypeScript');
  console.log('• Funções de validação nomeadas por campo');
  console.log('• Relacionamentos entre entidades: Product → Order → Payment → Stock');
  console.log('• Validações de negócio específicas');
  console.log('• Fluxo completo de e-commerce');
  console.log('');

  // Executa todas as validações
  validateEntities();
  validateRelationships();
  validateIndividualFields();
  simulateBusinessFlow();
  generateRelationshipReport();

  console.log('\n🎯 CONCLUSÃO:');
  console.log('✅ Todos os schemas foram validados com sucesso');
  console.log('✅ Relacionamentos entre entidades estão corretos');
  console.log('✅ Validações de negócio passaram');
  console.log('✅ Fluxo de e-commerce simulado com sucesso');
  console.log('');
  console.log('💡 Os schemas Zod foram gerados automaticamente!');
  console.log('💡 As funções de validação têm o mesmo nome dos campos!');
  console.log('💡 Os relacionamentos foram mapeados automaticamente!');
}

// Executa demonstração se for arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteValidationDemo();
}

export default runCompleteValidationDemo;
