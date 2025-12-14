/**
 * Exemplo Completo de Uso do Gerador de Schemas Zod
 * Demonstrando as ligações entre Product -> Order -> Payment -> Stock
 */

import {
  ZodSchemaGenerator,
  EcommerceExample,
  validateEntity,
  validateField,
  // Funções de validação individuais
  id, name, description, price, category, sku, quantity, totalAmount, status, customerEmail, amount
} from '../src/zod-schema-generator.js';

async function main() {
  console.log('🎯 Gerador de Schemas Zod - Exemplo Completo\n');

  try {
    // 1. Executar demonstração completa das ligações
    console.log('=' .repeat(60));
    console.log('DEMONSTRAÇÃO COMPLETA DAS LIGAÇÕES ENTRE ENTIDADES');
    console.log('=' .repeat(60));

    const entities = await EcommerceExample.demonstrateRelationships();

    // 2. Demonstrar validação individual de campos
    console.log('=' .repeat(60));
    console.log('VALIDAÇÃO INDIVIDUAL DE CAMPOS');
    console.log('=' .repeat(60));

    console.log('\n🔍 Testando funções de validação individuais:');

    // Testes positivos
    console.log('\n✅ Testes de validação bem-sucedidos:');
    validateField('id', id, '550e8400-e29b-41d4-a716-446655440001');
    validateField('name', name, 'Produto de Teste');
    validateField('price', price, 99.99);
    validateField('category', category, 'Eletrônicos');
    validateField('sku', sku, 'TEST-001');
    validateField('quantity', quantity, 10);
    validateField('totalAmount', totalAmount, 199.99);
    validateField('status', status, 'pending');
    validateField('customerEmail', customerEmail, 'teste@email.com');
    validateField('amount', amount, 150.00);

    // 3. Demonstrar validação de entidades completas
    console.log('\n📋 Testando validação de entidades completas:');

    // Produto válido
    const validProduct = validateEntity(
      ZodSchemaGenerator.generateProductSchema(),
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        name: 'Notebook Dell Inspiron',
        description: 'Notebook Dell Inspiron 15 3000 com processador Intel Core i5',
        price: 3499.99,
        category: 'Informática',
        sku: 'NOTE-DELL-I5',
        barcode: '7891234567890',
        weight: 2.1,
        dimensions: { length: 35.6, width: 24.2, height: 2.1 },
        tags: ['notebook', 'dell', 'intel', 'i5'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      'Product'
    );

    // Estoque válido
    const validStock = validateEntity(
      ZodSchemaGenerator.generateStockSchema(),
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        productId: validProduct.id,
        warehouseId: '550e8400-e29b-41d4-a716-446655440010',
        quantity: 25,
        minQuantity: 5,
        maxQuantity: 50,
        location: 'Armazém Central - Prateleira B7',
        batchNumber: 'BATCH-2025-002',
        expiryDate: new Date('2027-01-15'),
        status: 'available' as const,
        lastUpdated: new Date()
      },
      'Stock'
    );

    console.log('✅ Produto validado:', validProduct.name);
    console.log('✅ Estoque validado:', `${validStock.quantity} unidades`);

    // 4. Demonstrar validação com dados inválidos
    console.log('\n❌ Testando validação com dados inválidos:');

    try {
      validateField('price', price, -10);
    } catch (error) {
      console.log('   Capturado erro esperado: preço negativo');
    }

    try {
      validateField('sku', sku, 'sku inválido com espaços');
    } catch (error) {
      console.log('   Capturado erro esperado: SKU com caracteres inválidos');
    }

    try {
      validateField('customerEmail', customerEmail, 'email-invalido');
    } catch (error) {
      console.log('   Capturado erro esperado: e-mail inválido');
    }

    // 5. Demonstrar ligações complexas
    console.log('\n🔗 DEMONSTRANDO LIGAÇÕES COMPLEXAS');
    console.log('=' .repeat(60));

    // Criar um cenário completo: Produto -> Múltiplos Pedidos -> Pagamentos -> Controle de Estoque
    const complexScenario = await createComplexScenario();
    console.log('\n🎯 Cenário complexo criado com sucesso!');
    console.log(`   📱 Produto: ${complexScenario.product.name}`);
    console.log(`   📦 Estoque inicial: ${complexScenario.initialStock} unidades`);
    console.log(`   🛒 Total de pedidos: ${complexScenario.orders.length}`);
    console.log(`   💰 Total de pagamentos: ${complexScenario.payments.length}`);
    console.log(`   📊 Estoque final: ${complexScenario.finalStock} unidades`);

    // 6. Demonstrar validação em lote
    console.log('\n📊 VALIDAÇÃO EM LOTE');
    console.log('=' .repeat(60));

    const batchValidationResults = await validateBatch(entities);
    console.log('\n✅ Resultados da validação em lote:');
    console.log(`   📱 Produtos válidos: ${batchValidationResults.products}`);
    console.log(`   📦 Estoques válidos: ${batchValidationResults.stocks}`);
    console.log(`   🛒 Pedidos válidos: ${batchValidationResults.orders}`);
    console.log(`   💳 Pagamentos válidos: ${batchValidationResults.payments}`);

  } catch (error) {
    console.error('❌ Erro na execução:', error);
  }
}

/**
 * Criar um cenário complexo com múltiplas ligações
 */
async function createComplexScenario() {
  // Produto base
  const product = validateEntity(
    ZodSchemaGenerator.generateProductSchema(),
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      name: 'Smart TV Samsung 55"',
      description: 'Smart TV Samsung 55 polegadas 4K UHD com HDR e Tizen OS',
      price: 2999.99,
      category: 'Eletrônicos',
      sku: 'TV-SAMSUNG-55-4K',
      barcode: '7899876543210',
      weight: 15.5,
      dimensions: { length: 122.5, width: 70.8, height: 8.2 },
      tags: ['tv', 'samsung', '4k', 'smart', 'hdr'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    'Product'
  );

  // Estoque inicial
  const initialStock = 100;

  // Criar múltiplos pedidos
  const orders = [];
  const payments = [];
  let stockConsumed = 0;

  for (let i = 0; i < 5; i++) {
    const orderQuantity = Math.floor(Math.random() * 3) + 1; // 1-3 unidades
    stockConsumed += orderQuantity;

    const order = validateEntity(
      ZodSchemaGenerator.generateOrderSchema(),
      {
        id: `550e8400-e29b-41d4-a716-44665544002${i}`,
        customerId: `550e8400-e29b-41d4-a716-44665544003${i}`,
        customerEmail: `cliente${i}@email.com`,
        customerName: `Cliente ${i}`,
        items: [{
          id: `550e8400-e29b-41d4-a716-44665544004${i}`,
          orderId: `550e8400-e29b-41d4-a716-44665544002${i}`,
          productId: product.id,
          quantity: orderQuantity,
          unitPrice: product.price,
          totalPrice: product.price * orderQuantity,
          discount: 0,
          product: product
        }],
        totalAmount: product.price * orderQuantity + 49.90,
        taxAmount: product.price * orderQuantity * 0.1,
        discountAmount: 0,
        shippingAmount: 49.90,
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        shippingAddress: {
          street: `Rua ${i + 1}`,
          number: `${100 + i}`,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          zipCode: '01234000'
        },
        billingAddress: {
          street: `Rua ${i + 1}`,
          number: `${100 + i}`,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          zipCode: '01234000'
        },
        orderDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Dias diferentes
        estimatedDelivery: new Date(Date.now() + (7 - i) * 24 * 60 * 60 * 1000)
      },
      `Order ${i}`
    );

    const payment = validateEntity(
      ZodSchemaGenerator.generatePaymentSchema(),
      {
        id: `550e8400-e29b-41d4-a716-44665544005${i}`,
        orderId: order.id,
        customerId: order.customerId,
        amount: order.totalAmount,
        currency: 'BRL',
        method: i % 2 === 0 ? 'credit_card' : 'debit_card' as const,
        status: 'completed' as const,
        transactionId: `TXN-2025-${String(i + 1).padStart(3, '0')}`,
        paymentDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        metadata: {
          cardLastFour: `${1234 + i}`,
          cardBrand: i % 2 === 0 ? 'visa' : 'mastercard',
          installments: i + 1
        }
      },
      `Payment ${i}`
    );

    orders.push(order);
    payments.push(payment);
  }

  return {
    product,
    initialStock,
    orders,
    payments,
    finalStock: initialStock - stockConsumed,
    stockConsumed
  };
}

/**
 * Validar múltiplas entidades em lote
 */
async function validateBatch(entities: any) {
  const results = {
    products: 0,
    stocks: 0,
    orders: 0,
    payments: 0
  };

  // Simular validação de múltiplos produtos
  for (let i = 0; i < 10; i++) {
    try {
      validateEntity(
        ZodSchemaGenerator.generateProductSchema(),
        {
          id: `550e8400-e29b-41d4-a716-44665544010${i}`,
          name: `Produto ${i}`,
          description: `Descrição completa do produto ${i} com detalhes técnicos e especificações`,
          price: Math.random() * 1000 + 10,
          category: 'Teste',
          sku: `TEST-${String(i).padStart(3, '0')}`,
          tags: ['teste'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        `Product ${i}`
      );
      results.products++;
    } catch (error) {
      // Ignorar erros para contagem
    }
  }

  // Simular validação de estoques
  for (let i = 0; i < 5; i++) {
    try {
      validateEntity(
        ZodSchemaGenerator.generateStockSchema(),
        {
          id: `550e8400-e29b-41d4-a716-44665544011${i}`,
          productId: entities.product.id,
          warehouseId: `550e8400-e29b-41d4-a716-446655440012`,
          quantity: Math.floor(Math.random() * 100) + 1,
          minQuantity: 5,
          location: `Local ${i}`,
          status: 'available' as const,
          lastUpdated: new Date()
        },
        `Stock ${i}`
      );
      results.stocks++;
    } catch (error) {
      // Ignorar erros para contagem
    }
  }

  // Simular validação de pedidos
  for (let i = 0; i < 3; i++) {
    try {
      validateEntity(
        ZodSchemaGenerator.generateOrderSchema(),
        {
          id: `550e8400-e29b-41d4-a716-44665544013${i}`,
          customerId: `550e8400-e29b-41d4-a716-446655440014`,
          customerEmail: `cliente${i}@teste.com`,
          customerName: `Cliente Teste ${i}`,
          items: [{
            id: `550e8400-e29b-41d4-a716-44665544015${i}`,
            orderId: `550e8400-e29b-41d4-a716-44665544013${i}`,
            productId: entities.product.id,
            quantity: 1,
            unitPrice: entities.product.price,
            totalPrice: entities.product.price,
            discount: 0
          }],
          totalAmount: entities.product.price + 10,
          taxAmount: entities.product.price * 0.1,
          discountAmount: 0,
          shippingAmount: 10,
          status: 'pending' as const,
          paymentStatus: 'pending' as const,
          shippingAddress: {
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'Teste',
            state: 'TS',
            country: 'Brasil',
            zipCode: '12345678'
          },
          billingAddress: {
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'Teste',
            state: 'TS',
            country: 'Brasil',
            zipCode: '12345678'
          },
          orderDate: new Date()
        },
        `Order ${i}`
      );
      results.orders++;
    } catch (error) {
      // Ignorar erros para contagem
    }
  }

  // Simular validação de pagamentos
  for (let i = 0; i < 3; i++) {
    try {
      validateEntity(
        ZodSchemaGenerator.generatePaymentSchema(),
        {
          id: `550e8400-e29b-41d4-a716-44665544016${i}`,
          orderId: entities.order.id,
          customerId: entities.order.customerId,
          amount: entities.order.totalAmount,
          currency: 'BRL',
          method: 'credit_card' as const,
          status: 'completed' as const,
          transactionId: `TXN-${i}`,
          paymentDate: new Date()
        },
        `Payment ${i}`
      );
      results.payments++;
    } catch (error) {
      // Ignorar erros para contagem
    }
  }

  return results;
}

// Executar exemplo
if (import.meta.main) {
  main().catch(console.error);
}

export { main, createComplexScenario, validateBatch };
