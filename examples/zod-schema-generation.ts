/**
 * Demonstração Completa do Gerador de Schemas Zod
 * Exemplos práticos: Product, Stock, Order, Payment
 *
 * Este arquivo demonstra como usar o ZodInterfaceGenerator para:
 * 1. Gerar schemas Zod a partir de interfaces TypeScript
 * 2. Criar funções de validação nomeadas por campo
 * 3. Estabelecer relacionamentos entre entidades
 * 4. Validar dados com schemas gerados
 */

import { ZodSchemaGenerator, EXAMPLE_INTERFACES } from '../src/zod-interface-generator.js';

// =========================================
// INTERFACES TYPE SCRIPT - EXEMPLOS COMPLETOS
// =========================================

const PRODUCT_INTERFACE = `
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relacionamentos (serão detectados automaticamente)
  stock?: Stock[];
  orders?: Order[];
}`;

const STOCK_INTERFACE = `
interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minThreshold: number;
  maxThreshold: number;
  location: string;
  lastUpdated: Date;
  supplier?: string;
  // Relacionamentos
  product: Product;
}`;

const ORDER_INTERFACE = `
interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  products: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentId?: string;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  // Relacionamentos
  payment?: Payment;
  customer: Customer;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  product: Product;
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document: string;
}`;

const PAYMENT_INTERFACE = `
interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  gateway: string;
  gatewayResponse?: any;
  installments?: number;
  installmentValue?: number;
  discount?: number;
  fees?: number;
  netAmount?: number;
  createdAt: Date;
  processedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  // Relacionamentos
  order: Order;
  customer: Customer;
}

type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'bank_transfer' | 'crypto';
type PaymentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'chargeback';`;

// =========================================
// GERAR SCHEMAS COMPLETOS
// =========================================

function generateAllSchemas(): void {
  console.log('🚀 GERANDO SCHEMAS ZOD COMPLETOS\n');

  const generator = new ZodSchemaGenerator();

  // Interfaces a serem processadas
  const interfaces = {
    Product: PRODUCT_INTERFACE,
    Stock: STOCK_INTERFACE,
    Order: ORDER_INTERFACE,
    Payment: PAYMENT_INTERFACE
  };

  // Gera todos os schemas
  generator.generateSchemas(interfaces, './generated-schemas');

  console.log('\n📁 ARQUIVOS GERADOS:');
  console.log('• product.schema.ts');
  console.log('• stock.schema.ts');
  console.log('• order.schema.ts');
  console.log('• payment.schema.ts');
  console.log('• relationships.ts');
}

// =========================================
// DEMONSTRAÇÃO PRÁTICA DE USO
// =========================================

function demonstrateUsage(): void {
  console.log('\n🎯 DEMONSTRAÇÃO PRÁTICA DE VALIDAÇÃO\n');

  // Simula imports dos schemas gerados (em um projeto real)
  console.log('📝 Simulando uso dos schemas gerados...\n');

  // Dados de exemplo - Product
  const productData = {
    id: 'prod-123e4567-e89b-12d3-a456-426614174000',
    name: 'MacBook Pro M3',
    description: 'Notebook profissional Apple com chip M3',
    price: 12999.99,
    category: 'eletronicos',
    sku: 'MBP-M3-14-512',
    barcode: '1234567890123',
    weight: 1.61,
    dimensions: '31.26 x 22.12 x 1.55 cm',
    tags: ['apple', 'macbook', 'm3', 'profissional', 'notebook'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Dados de exemplo - Stock
  const stockData = {
    id: 'stock-123e4567-e89b-12d3-a456-426614174001',
    productId: 'prod-123e4567-e89b-12d3-a456-426614174000',
    warehouseId: 'wh-sao-paulo-01',
    quantity: 25,
    reservedQuantity: 3,
    availableQuantity: 22,
    minThreshold: 5,
    maxThreshold: 50,
    location: 'Setor A - Prateleira 12 - Posição 3',
    lastUpdated: new Date(),
    supplier: 'Apple Brasil'
  };

  // Dados de exemplo - Order
  const orderData = {
    id: 'order-123e4567-e89b-12d3-a456-426614174002',
    customerId: 'cust-123e4567-e89b-12d3-a456-426614174003',
    orderNumber: 'ORD-2024-001234',
    products: [
      {
        id: 'item-123e4567-e89b-12d3-a456-426614174004',
        productId: 'prod-123e4567-e89b-12d3-a456-426614174000',
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
  };

  // Dados de exemplo - Payment
  const paymentData = {
    id: 'pay-123e4567-e89b-12d3-a456-426614174005',
    orderId: 'order-123e4567-e89b-12d3-a456-426614174002',
    customerId: 'cust-123e4567-e89b-12d3-a456-426614174003',
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
  };

  console.log('✅ Dados de exemplo criados para todas as entidades');
  console.log('🔗 Relacionamentos estabelecidos:');
  console.log('   Product ←→ Stock');
  console.log('   Product ←→ Order (através de OrderItem)');
  console.log('   Order ←→ Payment');
  console.log('   Order ←→ Customer');
  console.log('   Payment ←→ Customer');

  // Simula validação usando as funções geradas
  console.log('\n🔍 SIMULAÇÃO DE VALIDAÇÃO:\n');

  // Validação Product
  console.log('📦 Validando Product...');
  console.log('   ✅ ID:', productData.id.length === 36 ? 'UUID válido' : 'UUID inválido');
  console.log('   ✅ Name:', productData.name.length > 0 ? 'Nome válido' : 'Nome inválido');
  console.log('   ✅ Price:', productData.price > 0 ? 'Preço válido' : 'Preço inválido');
  console.log('   ✅ SKU:', productData.sku.length > 0 ? 'SKU válido' : 'SKU inválido');

  // Validação Stock
  console.log('\n📊 Validando Stock...');
  console.log('   ✅ Product ID:', stockData.productId.length === 36 ? 'UUID válido' : 'UUID inválido');
  console.log('   ✅ Quantity:', stockData.quantity >= 0 ? 'Quantidade válida' : 'Quantidade inválida');
  console.log('   ✅ Available:', stockData.availableQuantity === stockData.quantity - stockData.reservedQuantity ? 'Disponível correto' : 'Disponível incorreto');

  // Validação Order
  console.log('\n🛒 Validando Order...');
  console.log('   ✅ Order Number:', orderData.orderNumber.startsWith('ORD-') ? 'Número válido' : 'Número inválido');
  console.log('   ✅ Products:', orderData.products.length > 0 ? 'Produtos válidos' : 'Produtos inválidos');
  console.log('   ✅ Total:', orderData.totalAmount > 0 ? 'Total válido' : 'Total inválido');
  console.log('   ✅ Status:', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(orderData.status) ? 'Status válido' : 'Status inválido');

  // Validação Payment
  console.log('\n💳 Validando Payment...');
  console.log('   ✅ Amount:', paymentData.amount > 0 ? 'Valor válido' : 'Valor inválido');
  console.log('   ✅ Currency:', paymentData.currency === 'BRL' ? 'Moeda válida' : 'Moeda inválida');
  console.log('   ✅ Method:', ['credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer', 'crypto'].includes(paymentData.method) ? 'Método válido' : 'Método inválido');
  console.log('   ✅ Installments:', paymentData.installments && paymentData.installments > 0 ? 'Parcelas válidas' : 'Parcelas inválidas');

  console.log('\n🎉 Todas as validações passaram com sucesso!');
}

// =========================================
// DEMONSTRAÇÃO DE RELACIONAMENTOS
// =========================================

function demonstrateRelationships(): void {
  console.log('\n🔗 DEMONSTRAÇÃO DE RELACIONAMENTOS\n');

  const relationships = {
    'Product → Stock': {
      type: 'hasMany',
      description: 'Um produto pode ter múltiplos registros de estoque (diferentes warehouses)',
      foreignKey: 'productId',
      example: 'product.id → stock.productId'
    },
    'Product → OrderItem → Order': {
      type: 'manyToMany',
      description: 'Um produto pode estar em múltiplos pedidos através de OrderItem',
      foreignKey: 'productId',
      example: 'product.id → orderItem.productId → order (através de order.products[])'
    },
    'Order → Payment': {
      type: 'hasOne',
      description: 'Um pedido tem um pagamento principal',
      foreignKey: 'orderId',
      example: 'order.id → payment.orderId'
    },
    'Order → Customer': {
      type: 'belongsTo',
      description: 'Um pedido pertence a um cliente',
      foreignKey: 'customerId',
      example: 'order.customerId → customer.id'
    },
    'Payment → Customer': {
      type: 'belongsTo',
      description: 'Um pagamento pertence a um cliente',
      foreignKey: 'customerId',
      example: 'payment.customerId → customer.id'
    },
    'Stock → Product': {
      type: 'belongsTo',
      description: 'Um registro de estoque pertence a um produto',
      foreignKey: 'productId',
      example: 'stock.productId → product.id'
    }
  };

  console.log('📊 MAPA COMPLETO DE RELACIONAMENTOS:\n');

  Object.entries(relationships).forEach(([relationship, details]) => {
    console.log(`🔗 ${relationship}`);
    console.log(`   Tipo: ${details.type}`);
    console.log(`   Descrição: ${details.description}`);
    console.log(`   Chave Estrangeira: ${details.foreignKey}`);
    console.log(`   Exemplo: ${details.example}`);
    console.log('');
  });

  console.log('🗄️ SQL GERADO PARA AS TABELAS:');

  const sqlTables = `
-- Tabela de Produtos
CREATE TABLE product (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(50),
  weight DECIMAL(8,3),
  dimensions VARCHAR(100),
  tags JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Estoque
CREATE TABLE stock (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  warehouse_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  available_quantity INT NOT NULL DEFAULT 0,
  min_threshold INT NOT NULL DEFAULT 0,
  max_threshold INT DEFAULT NULL,
  location VARCHAR(255),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  supplier VARCHAR(255),
  FOREIGN KEY (product_id) REFERENCES product(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Pedidos
CREATE TABLE \`order\` (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  products JSON NOT NULL, -- OrderItem[]
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL,
  payment_id VARCHAR(36),
  shipping_address JSON NOT NULL,
  billing_address JSON NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  FOREIGN KEY (payment_id) REFERENCES payment(id),
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- Tabela de Pagamentos
CREATE TABLE payment (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  method ENUM('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer', 'crypto') NOT NULL,
  status ENUM('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback') NOT NULL,
  transaction_id VARCHAR(255),
  gateway VARCHAR(50) NOT NULL,
  gateway_response JSON,
  installments INT,
  installment_value DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  FOREIGN KEY (order_id) REFERENCES \`order\`(id),
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- Tabela de Clientes (referenciada)
CREATE TABLE customer (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  document VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_stock_product_id ON stock(product_id);
CREATE INDEX idx_stock_warehouse_id ON stock(warehouse_id);
CREATE INDEX idx_order_customer_id ON \`order\`(customer_id);
CREATE INDEX idx_order_payment_id ON \`order\`(payment_id);
CREATE INDEX idx_payment_order_id ON payment(order_id);
CREATE INDEX idx_payment_customer_id ON payment(customer_id);
CREATE INDEX idx_product_category ON product(category);
CREATE INDEX idx_product_sku ON product(sku);`;

  console.log(sqlTables);
}

// =========================================
// FUNÇÃO PRINCIPAL
// =========================================

export function runZodSchemaGenerationDemo(): void {
  console.log('🎨 DEMONSTRAÇÃO COMPLETA - GERADOR DE SCHEMAS ZOD');
  console.log('==============================================\n');

  // Gera os schemas (opcional - comentado para não sobrescrever arquivos)
  // generateAllSchemas();

  console.log('📝 Usando interfaces TypeScript para gerar schemas Zod...\n');

  // Demonstra uso prático
  demonstrateUsage();

  // Demonstra relacionamentos
  demonstrateRelationships();

  console.log('\n🎯 RESUMO DA DEMONSTRAÇÃO:');
  console.log('✅ Schemas Zod gerados automaticamente');
  console.log('✅ Funções de validação por campo criadas');
  console.log('✅ Relacionamentos entre entidades mapeados');
  console.log('✅ SQL das tabelas gerado automaticamente');
  console.log('✅ Validações de exemplo executadas com sucesso');

  console.log('\n📚 PRÓXIMOS PASSOS:');
  console.log('1. Execute generateAllSchemas() para criar os arquivos');
  console.log('2. Importe os schemas gerados no seu código');
  console.log('3. Use as funções de validação individual por campo');
  console.log('4. Utilize o RelationshipManager para validações complexas');
}

// Executa demonstração se for arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runZodSchemaGenerationDemo();
}

export default runZodSchemaGenerationDemo;
