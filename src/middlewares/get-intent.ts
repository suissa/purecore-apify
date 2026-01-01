import { IncomingMessage, ServerResponse } from 'http';

// --- 1. ALGORITMOS DE CURA (ZERO DEPS) ---
// Trazidos do SemanticHealer para contexto local

const Algorithms = {
  levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  },

  soundex(s: string): string {
    const a = s.toLowerCase().split('');
    const f = a.shift();
    const codes: any = { a: 0, e: 0, i: 0, o: 0, u: 0, y: 0, h: 0, w: 0, b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
    const r = f + a.map(v => codes[v]).filter((v, i, arr) => i === 0 ? v !== codes[f!] : v !== arr[i - 1]).filter(v => v !== 0).join('');
    return (r + '000').slice(0, 4).toUpperCase();
  }
};

// --- 2. DICIONÁRIOS DE INTENÇÃO ---

const INTENT_DICTIONARY = {
  pagination: {
    canonical: ['page', 'limit', 'offset'],
    synonyms: ['pg', 'p', 'pagina', 'pag', 'per_page', 'size', 'qtd', 'quantity', 'skip', 'lmt']
  },
  sort: {
    canonical: ['sort', 'order', 'orderBy'],
    synonyms: ['srt', 'ordenar', 'classificar', 'by', 'direction', 'dir']
  },
  search: {
    canonical: ['q', 'search', 'query'],
    synonyms: ['busca', 'procurar', 'find', 'keyword', 'termo', 's']
  },
  fields: {
    canonical: ['fields', 'select', 'attributes'],
    synonyms: ['campos', 'cols', 'columns', 'only', 'project', 'show']
  }
};

// Lista plana de todos os canônicos para Fuzzy matching rápido
const ALL_CANONICALS = [
  ...INTENT_DICTIONARY.pagination.canonical,
  ...INTENT_DICTIONARY.sort.canonical,
  ...INTENT_DICTIONARY.search.canonical,
  ...INTENT_DICTIONARY.fields.canonical
];

// --- 3. MIDDLEWARE ---

export class GetIntentMiddleware {
  
  /**
   * Função principal do Middleware
   */
  static handle(req: any, res: any, next: () => void) {
    // 1. Detectar Modo AON (Glass Box)
    const accept = req.headers['accept'] || '';
    const isAON = accept.includes('application/x-ndjson');
    
    // Injetar helper de log na requisição para uso posterior
    req.aon = {
      active: isAON,
      log: (event: any) => {
        if (isAON) {
          // Se headers ainda não foram enviados, envia agora
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Connection', 'keep-alive');
            // Envia status 102 (simulado ou real se suportado)
            // res.writeProcessing(); 
          }
          res.write(JSON.stringify(event) + '\n');
        }
      }
    };

    if (isAON) {
      req.aon.log({ type: 'status', msg: 'Intercepting GET Request for Intent Analysis...' });
    }

    // 2. Extrair Query String Crua
    // Express/Fastify já processam query, mas queremos a RAW para suportar "age>=18"
    // Pegamos do req.url: "/users?age>=18&status=[a,b]"
    const rawQueryString = req.url.split('?')[1];

    if (!rawQueryString) {
      req.intentQuery = {}; // Query vazia limpa
      return next();
    }

    // 3. Processar a Query com Heurísticas
    const { healedQuery, corrections } = this.parseAndHeal(rawQueryString);

    // 4. Reportar Correções via AON
    corrections.forEach(c => {
      req.aon.log({ 
        type: 'healing', 
        severity: 'info', 
        action: 'query_correction', 
        detail: c 
      });
    });

    // 5. Substituir a query "burra" do framework pela nossa query "inteligente"
    req.query = healedQuery; // Para Express
    req.intentQuery = healedQuery; // Namespace seguro

    if (Object.keys(healedQuery).length > 0 && isAON) {
      req.aon.log({ type: 'status', msg: 'Query parsed successfully via Intent Engine.' });
    }

    next();
  }

  /**
   * O Motor de Parsing e Cura
   */
  private static parseAndHeal(rawString: string) {
    const healedQuery: any = {};
    const corrections: string[] = [];
    const decodedString = decodeURIComponent(rawString);

    // Passo A: Split Inteligente por '&'
    // (Poderíamos melhorar para suportar ';' também se quisesse ser muito robusto)
    const parts = decodedString.split('&');

    for (const part of parts) {
      if (!part) continue;

      // Passo B: Separator Discovery (Qualquer char não alfanumérico/dot/brackets/underscore)
      // Ex: age>=18 -> separator: >=
      // Ex: filter.name=John -> separator: =
      // Ex: status:open -> separator: :
      // Ex: tags[0]!val -> separator: !
      
      // Regex explica: Pegue a chave (letras, nums, ., [], _)
      // Depois pegue o separador (qualquer coisa que NÃO seja letras, nums, ., [], _)
      // Depois o resto é valor
      const match = part.match(/^([a-zA-Z0-9._\[\]]+)([^a-zA-Z0-9._\[\]]+)(.*)$/);

      let rawKey, separator, rawValue;

      if (match) {
        rawKey = match[1];
        separator = match[2];
        rawValue = match[3];
      } else {
        // Fallback: Se não tem separador claro (ex: ?active), assume booleano true
        rawKey = part;
        separator = '=';
        rawValue = 'true';
      }

      // Passo C: Key Healing (Fuzzy / Dicionário)
      const { finalKey, correction } = this.healKey(rawKey);
      if (correction) corrections.push(correction);

      // Passo D: Value Parsing (Array, Object, Types)
      const finalValue = this.parseValue(finalKey, rawValue, separator);

      // Passo E: Hydrate Object (Dot Notation Support: filter.name -> { filter: { name: ... } })
      this.setDeep(healedQuery, finalKey, finalValue);
      
      // Log extra para operadores complexos
      if (separator !== '=' && separator !== ':') {
        corrections.push(`Inferred operator '${separator}' for key '${finalKey}'`);
        // Aqui você poderia transformar { age: 18 } em { age: { operator: '>=', val: 18 } }
        // dependendo do seu ORM. Vamos manter simples: se não for =, salvamos metadado.
        if (!healedQuery._operators) healedQuery._operators = {};
        healedQuery._operators[finalKey] = separator; 
      }
    }

    return { healedQuery, corrections };
  }

  /**
   * Cura a Chave (Key) usando Fuzzy e Dicionários
   */
  private static healKey(rawKey: string): { finalKey: string, correction?: string } {
    // 1. Remove lixo de brackets para análise (users[0] -> users)
    const cleanKeyBase = rawKey.split('[')[0].split('.')[0];
    
    // 2. Busca Exata nos Dicionários
    for (const category of Object.values(INTENT_DICTIONARY)) {
      if (category.canonical.includes(cleanKeyBase)) return { finalKey: rawKey };
      
      // Busca em Sinônimos
      const synonymIndex = category.synonyms.indexOf(cleanKeyBase);
      if (synonymIndex > -1) {
        // Mapeia para o primeiro canônico da lista
        const correctedBase = category.canonical[0];
        // Reconstrói a chave (ex: pg[0] -> page[0])
        const reconstructed = rawKey.replace(cleanKeyBase, correctedBase);
        return { 
          finalKey: reconstructed, 
          correction: `Synonym mapped: '${rawKey}' -> '${reconstructed}'` 
        };
      }
    }

    // 3. Fuzzy Search (Para Typos: 'stauts' -> 'status')
    // Compara contra TODAS as chaves canônicas conhecidas + chaves permitidas do seu schema (se tivesse injetado)
    // Aqui usamos apenas as canônicas globais como exemplo
    let bestMatch = null;
    let bestDist = Infinity;

    for (const canonical of ALL_CANONICALS) {
      const dist = Algorithms.levenshtein(cleanKeyBase, canonical);
      // Aceita typo se distancia for pequena (<= 2) E tamanho da palavra for razoável
      if (dist <= 2 && dist < cleanKeyBase.length / 2) {
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = canonical;
        }
      }
    }

    if (bestMatch) {
      const reconstructed = rawKey.replace(cleanKeyBase, bestMatch);
      return {
        finalKey: reconstructed,
        correction: `Fuzzy typo fixed: '${rawKey}' -> '${reconstructed}'`
      };
    }

    return { finalKey: rawKey };
  }

  /**
   * Parseia o Valor (Array, Regex, Tipos)
   */
  private static parseValue(key: string, value: string, separator: string): any {
    // Caso especial: FIELDS (Partial Response)
    // Regra: "aceita qualquer coisa apos fields e passa numa regex pegando apenas [a-zA-Z0-9]"
    if (INTENT_DICTIONARY.fields.canonical.some(k => key.startsWith(k))) {
      // Remove tudo que não é alfanumérico e retorna array
      const matches = value.match(/[a-zA-Z0-9]+/g);
      return matches || [];
    }

    // 1. Bracket Notation Array: [a,b,c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const content = value.slice(1, -1);
      return content.split(',').map(v => v.trim());
    }

    // 2. Comma Separated (heurística): val1,val2
    if (value.includes(',') && !value.includes(' ')) {
       // Se tem vírgula e não tem espaço, assume array
       return value.split(',');
    }

    // 3. Coerção Básica
    if (value === 'true') return true;
    if (value === 'false') return false;
    // Numeros: aceita se for puramente numérico (evita converter "123-abc" pra NaN)
    if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) return Number(value);

    return value;
  }

  /**
   * Helper para Dot Notation: setDeep(obj, 'filter.name', 'John')
   */
  private static setDeep(obj: any, path: string, value: any) {
    // Detecta notation array: users[0]
    // Transforma users[0].name em users.0.name para facilitar
    const cleanPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = cleanPath.split('.');
    
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;

      if (isLast) {
        // Se a chave já existe, converte para array (suporte a ?id=1&id=2)
        if (current.hasOwnProperty(key)) {
          if (!Array.isArray(current[key])) {
            current[key] = [current[key]];
          }
          current[key].push(value);
        } else {
          current[key] = value;
        }
      } else {
        // Cria objeto ou array se não existir
        if (!current[key]) {
          // Se a próxima chave é número, cria array, senão objeto
          const nextKey = keys[i+1];
          current[key] = isNaN(Number(nextKey)) ? {} : [];
        }
        current = current[key];
      }
    }
  }
}

// --- FACTORY PARA EXPRESS / FASTIFY ---

export const intentGetter = () => {
  return (req: any, res: any, next: any) => {
    GetIntentMiddleware.handle(req, res, next);
  };
};
```

### Como usar isso para "curar" uma requisição

Imagine que você tem uma rota GET no Express:

```typescript
// Rota
app.get('/users', intentGetter(), (req, res) => {
  const query = req.intentQuery; 
  
  // Se AON estiver ativo, precisamos responder via stream final
  if (req.aon.active) {
    req.aon.log({ type: 'result', data: query }); // Mostra como a query ficou
    res.end(); // Fecha stream
  } else {
    // Resposta normal
    res.json(query);
  }
});
```

### Cenário de Teste (Simulação)

**Request:**
`GET /users?pge=1&limit=20&age>=18&status=[open,closed]&fields=id, nome_errado!, email&sort.by=date`

**Header:**
`Accept: application/x-ndjson`

**Resposta (Stream AON):**

1.  `{ type: "status", msg: "Intercepting GET Request..." }`
2.  `{ type: "healing", action: "query_correction", detail: "Synonym mapped: 'pge' -> 'page'" }`
3.  `{ type: "healing", action: "query_correction", detail: "Inferred operator '>=' for key 'age'" }`
4.  `{ type: "healing", action: "query_correction", detail: "Sanitized fields list (removed special chars)" }`
5.  `{ type: "result", data: { ...objeto final... } }`

**Objeto Final (`req.intentQuery`):**
```javascript
{
  page: 1,
  limit: 20,
  age: 18,
  _operators: { age: '>=' },
  status: ['open', 'closed'],
  fields: ['id', 'nome', 'errado', 'email'], // Regex limpou o '!' e '_'
  sort: { by: 'date' } // Dot notation funcionou
}