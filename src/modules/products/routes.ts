import { Router } from '../../router';
import { Request, Response } from '../../types';

const productsRouter = new Router();

// Lista todos os produtos
productsRouter.get('/', (req: Request, res: Response) => {
  res.json({
    total: 0,
    data: [],
    message: 'Lista de produtos'
  });
});

// Busca produto por ID
productsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    id,
    name: `Produto ${id}`,
    price: 99.99,
    category: 'Eletrônicos'
  });
});

// Cria produto
productsRouter.post('/', (req: Request, res: Response) => {
  const productData = req.body;
  res.status(201).json({
    id: Date.now(),
    ...productData,
    createdAt: new Date()
  });
});

export { productsRouter };
