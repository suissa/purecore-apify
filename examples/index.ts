import { CoreWay, Request, Response, NextFunction, jsonBodyParser } from '../src/index';

const app = new CoreWay();
const PORT = 3000;

// 1. Usar Middleware Global (Body Parser)
app.use(jsonBodyParser);

// 2. Middleware de Log (exemplo)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${(req as any).method} ${(req as any).url}`);
  next(); // Passa para o próximo
});

// --- Rotas ---

// GET simples
app.get('/', (req, res) => {
  res.json({ message: 'Bem vindo ao CoreWay!' });
});

// GET com Params e Query
app.get('/users/:id', (req, res) => {
  const { id } = (req as any).params;
  const { type } = (req as any).query; // ex: ?type=admin
  
  res.json({ 
    id, 
    type,
    message: `Buscando usuário ${id}` 
  });
});

// POST (lendo o body parseado pelo middleware)
app.post('/users', (req, res) => {
  const newUser = (req as any).body as { name: string } | undefined;
  
  if (!newUser?.name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  res.status(201).json({
    message: 'Usuário criado',
    data: newUser
  });
});

// Iniciar
app.listen(PORT, () => {
  console.log(`🔥 CoreWay rodando em http://localhost:${PORT}`);
});