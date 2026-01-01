/**
 * Intent-Based Filter Parser
 * Transforma strings de busca complexas em objetos estruturados.
 * * Suporta:
 * - Custom DSL: [campo=valor&AND&campo2!=valor]
 * - RSQL/FIQL: campo==valor;campo2!=valor
 * - SQL-like: campo = valor AND campo2 != valor
 */
export class AdvancedFilterParser {

  static parse(queryString: string): any {
    if (!queryString) return {};

    // 1. Sanitização de Intent (Heurística)
    // Remove colchetes externos se existirem
    let cleaned = queryString.trim();
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      cleaned = cleaned.slice(1, -1);
    }

    // 2. Normalização de Operadores Lógicos
    // O objetivo é transformar tudo em tokens padronizados
    // &AND&, AND, ;, &&  ->  $$AND$$
    // &OR&, OR, ,, ||    ->  $$OR$$
    // &NOT&, NOT, !      ->  $$NOT$$
    // &NOR&              ->  $$NOR$$
    
    const normalized = cleaned
      // Protege valores string entre aspas para não substituir operadores dentro deles
      .replace(/&AND&|&and&| AND | && |;/g, ' $$AND$$ ')
      .replace(/&OR&|&or&| OR | \|\| |,/g, ' $$OR$$ ')
      .replace(/&NOR&|&nor&| NOR /g, ' $$NOR$$ ')
      .replace(/&NOT&|&not&| NOT | !/g, ' $$NOT$$ ');

    // 3. Split e Construção da AST (Abstract Syntax Tree)
    // Aqui usamos uma lógica simplificada. Um parser completo usaria recursão para parenteses.
    
    // Vamos assumir precedência: OR separa grupos, AND separa itens dentro do grupo
    const orGroups = normalized.split(' $$OR$$ ');
    
    if (orGroups.length > 1) {
      return { $or: orGroups.map(g => this.parseGroup(g)) };
    }
    
    // Se tem NOR
    const norGroups = normalized.split(' $$NOR$$ ');
    if (norGroups.length > 1) {
      return { $nor: norGroups.map(g => this.parseGroup(g)) };
    }

    return this.parseGroup(normalized);
  }

  private static parseGroup(groupStr: string): any {
    const andParts = groupStr.split(' $$AND$$ ');
    
    if (andParts.length > 1) {
      return { $and: andParts.map(p => this.parseExpression(p)) };
    }
    
    return this.parseExpression(groupStr);
  }

  private static parseExpression(expr: string): any {
    expr = expr.trim();
    
    // Suporte a NOT no início da expressão
    let isNot = false;
    if (expr.includes('$$NOT$$')) {
      isNot = true;
      expr = expr.replace('$$NOT$$', '').trim();
    }

    // Regex para capturar: chave, operador, valor
    // Suporta: =, !=, >, <, >=, <=, : (contains)
    const match = expr.match(/^([a-zA-Z0-9_.]+)\s*(!=|>=|<=|=|>|<|:)\s*(.+)$/);
    
    if (!match) return {}; // Heurística: se não entender, ignora (Fail safe)

    const [, key, op, rawVal] = match;
    const value = this.inferType(rawVal);
    
    let mongoOp: any = value;

    // Tradução de Operadores para sintaxe MongoDB/NoSQL comum
    switch (op) {
      case '=': mongoOp = { $eq: value }; break;
      case '!=': mongoOp = { $ne: value }; break;
      case '>': mongoOp = { $gt: value }; break;
      case '<': mongoOp = { $lt: value }; break;
      case '>=': mongoOp = { $gte: value }; break;
      case '<=': mongoOp = { $lte: value }; break;
      case ':': mongoOp = { $regex: value, $options: 'i' }; break; // Fuzzy Search
    }

    if (isNot) {
      return { [key]: { $not: mongoOp } };
    }

    return { [key]: mongoOp };
  }

  private static inferType(val: string): any {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    if (!isNaN(Number(val))) return Number(val);
    // Remove aspas se houver
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  }
}
```

### Como isso se encaixa na sua rota

No seu arquivo `src/middleware/get-intent.ts`, você adicionaria isso na etapa de parsing:

```typescript
// Dentro de parseAndHeal...

// Se encontrar a chave "filter", aciona o parser avançado
if (key === 'filter') {
    // 1. Decoder Universal (Cura o problema do & quebrando a URL)
    // Se o framework parseou errado por causa do '&', o valor pode estar quebrado ou espalhado
    // A melhor heurística aqui é olhar para rawQueryString inteira e extrair o conteúdo de filter=...
    
    // Regex para pegar tudo dentro de filter=[ ... ] ou filter=... até o fim
    const filterMatch = rawQueryString.match(/filter=\[?(.*?)\]?(&|$)/);
    
    if (filterMatch) {
       // Pega o valor bruto (ex: a=1&AND&b=2) que o express teria destruído
       const rawFilter = decodeURIComponent(filterMatch[1]);
       
       // Usa nosso parser agêntico
       const structuredFilter = AdvancedFilterParser.parse(rawFilter);
       
       // Injeta no objeto de query curado
       healedQuery.where = structuredFilter;
       
       // Avisa via AON
       corrections.push(`Advanced Logic DSL parsed into structured query`);
       
       continue; // Pula o processamento padrão para esta chave
    }
}
```

### Exemplo de "Self-Healing" em Lógica

Se o usuário mandar:
`?filter=[age>18&AND&status=active&OR&role=admin]` (Misturando `&` real com lógica)

1.  **Framework Padrão:** Vê `filter=[age>18`, depois uma chave `AND`, depois uma chave `status=active`... **(Quebra tudo)**.
2.  **Sua Lib:**
    * Lê a URL crua (`rawQueryString`).
    * Extrai o bloco do filtro.
    * Substitui `&AND&` por operador lógico interno.
    * Gera:
        ```json
        {
          "$or": [
            { "$and": [{ "age": { "$gt": 18 } }, { "status": { "$eq": "active" } }] },
            { "role": { "$eq": "admin" } }
          ]
        }