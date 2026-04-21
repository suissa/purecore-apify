#!/usr/bin/env node
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';

type TemplateKind = 'crud';

const HELP_MESSAGE = `
Uso:
  npx @purecore/apify create crud <resource> [--entry src/index.ts]

Exemplo:
  npx @purecore/apify create crud users
`.trim();

const args = process.argv.slice(2);

function fatal(message: string): never {
  console.error(`\n❌ ${message}\n`);
  console.info(HELP_MESSAGE);
  return process.exit(1);
}

if (args.length < 3) {
  fatal('Argumentos insuficientes.');
}

const [command, templateArg, resourceArg] = args;

if (command !== 'create') {
  fatal(`Comando "${command}" não suportado.`);
}

const template = templateArg as TemplateKind;
if (template !== 'crud') {
  fatal(`Template "${templateArg}" não suportado (use "crud").`);
}

const resourceName = resourceArg.trim();
if (!resourceName) {
  fatal('Nome do recurso inválido.');
}

const entryFlagIndex = args.indexOf('--entry');
const configuredEntry =
  entryFlagIndex >= 0 && args[entryFlagIndex + 1] ? args[entryFlagIndex + 1] : 'src/index.ts';

const cwd = process.cwd();
const modulesDir = join(cwd, 'modules', resourceName);
const routesFilePath = join(modulesDir, 'routes.ts');

ensureDir(modulesDir);
ensureFileNotExists(routesFilePath);

const crudSource = buildCrudTemplate(resourceName);
writeFileSync(routesFilePath, crudSource, 'utf8');
console.log(`✅ Criado: ${relative(cwd, routesFilePath)}`);

const entryFile = resolveEntryFile(configuredEntry);
if (!entryFile) {
  fatal(
    `Arquivo de entrada "${configuredEntry}" não encontrado. Use --entry <caminho> com um arquivo existente.`,
  );
}

wireRouterIntoEntry(entryFile, routesFilePath, resourceName);

console.log('\n✨ CRUD gerado com sucesso!');

// ---- helpers ----

function ensureDir(pathname: string) {
  mkdirSync(pathname, { recursive: true });
}

function ensureFileNotExists(pathname: string) {
  if (existsSync(pathname)) {
    fatal(`O arquivo ${pathname} já existe.`);
  }
}

function resolveEntryFile(candidate: string): string | null {
  const absolute = join(cwd, candidate);
  return existsSync(absolute) ? absolute : null;
}

function toPascalCase(value: string): string {
  return value
    .replace(/[-_\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function buildCrudTemplate(resource: string): string {
  const pascal = toPascalCase(resource);
  const camel = toCamelCase(resource);
  const entityInterface = `${pascal}Entity`;
  const payloadInterface = `${pascal}Payload`;
  const storeName = `${camel}Store`;
  const routerName = `${camel}Router`;

  return `import { randomUUID } from 'node:crypto';
import { Router, Request, Response, NextFunction } from '@purecore/apify';

interface ${entityInterface} {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

interface ${payloadInterface} {
  name: string;
  email: string;
  role?: string;
}

const ${storeName} = new Map<string, ${entityInterface}>();
const ${routerName} = new Router();

const isValidPayload = (payload: Partial<${payloadInterface}>): payload is ${payloadInterface} => {
  return Boolean(payload?.name && payload?.email);
};

const sanitizePayload = (payload: Partial<${payloadInterface}>): Partial<${payloadInterface}> => {
  const sanitized: Partial<${payloadInterface}> = {};
  if (payload.name) sanitized.name = payload.name;
  if (payload.email) sanitized.email = payload.email;
  if (payload.role) sanitized.role = payload.role;
  return sanitized;
};

const handleNotFound = (res: Response) => {
  res.status(404).json({ error: '${pascal} not found' });
};

// CREATE
${routerName}.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as Partial<${payloadInterface}>;
    if (!isValidPayload(payload)) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const now = new Date().toISOString();
    const entity: ${entityInterface} = {
      id: randomUUID(),
      name: payload.name,
      email: payload.email,
      role: payload.role,
      createdAt: now,
      updatedAt: now,
    };

    ${storeName}.set(entity.id, entity);
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
});

// FETCH ONE
${routerName}.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const entity = ${storeName}.get(id);
    if (!entity) {
      return handleNotFound(res);
    }
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

// LIST MANY
${routerName}.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = Array.from(${storeName}.values());
    res.json({ total: data.length, data });
  } catch (error) {
    next(error);
  }
});

// UPDATE ONE (PUT/PATCH)
const updateOneHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const existing = ${storeName}.get(id);
    if (!existing) {
      return handleNotFound(res);
    }

    const changes = sanitizePayload(req.body as Partial<${payloadInterface}>);
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated: ${entityInterface} = {
      ...existing,
      ...changes,
      updatedAt: new Date().toISOString(),
    };

    ${storeName}.set(id, updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

${routerName}.put('/:id', updateOneHandler);
${routerName}.patch('/:id', updateOneHandler);

// UPDATE MANY (PUT/PATCH)
const updateManyHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, data } = req.body as { ids?: string[]; data?: Partial<${payloadInterface}> };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const changes = sanitizePayload(data ?? {});
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'data must include at least one field' });
    }

    const updatedEntities: ${entityInterface}[] = [];

    ids.forEach((id) => {
      const existing = ${storeName}.get(id);
      if (!existing) {
        return;
      }
      const updated: ${entityInterface} = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      };
      ${storeName}.set(id, updated);
      updatedEntities.push(updated);
    });

    res.json({ matched: ids.length, updated: updatedEntities.length, data: updatedEntities });
  } catch (error) {
    next(error);
  }
};

${routerName}.put('/bulk', updateManyHandler);
${routerName}.patch('/bulk', updateManyHandler);

// DELETE
${routerName}.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const existed = ${storeName}.delete(id);
    if (!existed) {
      return handleNotFound(res);
    }
    res.status(204).send('');
  } catch (error) {
    next(error);
  }
});

export { ${routerName} };
`;
}

function wireRouterIntoEntry(entryFile: string, routesFile: string, resource: string) {
  const entryContent = readFileSync(entryFile, 'utf8');
  const lines = entryContent.split(/\r?\n/);
  const routerName = `${toCamelCase(resource)}Router`;

  const importPath = buildRelativeImportPath(entryFile, routesFile);
  const importStatement = `import { ${routerName} } from '${importPath}';`;
  if (!entryContent.includes(importStatement)) {
    insertImport(lines, importStatement);
  }

  const useStatement = `app.use('/${resource}', ${routerName});`;
  if (!entryContent.includes(useStatement)) {
    insertUseLine(lines, useStatement);
  }

  writeFileSync(entryFile, lines.join('\n'), 'utf8');
  console.log(`✅ Atualizado: ${relative(cwd, entryFile)}`);
}

function buildRelativeImportPath(entryFile: string, routesFile: string): string {
  const fromDir = dirname(entryFile);
  const raw = relative(fromDir, routesFile).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (raw.startsWith('.')) {
    return raw;
  }
  return `./${raw}`;
}

function insertImport(lines: string[], importLine: string) {
  let lastImportIndex = -1;
  lines.forEach((line, index) => {
    if (line.startsWith('import ')) {
      lastImportIndex = index;
    }
  });
  const targetIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
  lines.splice(targetIndex, 0, importLine);
}

function insertUseLine(lines: string[], useLine: string) {
  let lastUseIndex = -1;
  let listenIndex = -1;

  lines.forEach((line, index) => {
    if (line.includes('app.use(')) {
      lastUseIndex = index;
    }
    if (listenIndex === -1 && line.includes('app.listen')) {
      listenIndex = index;
    }
  });

  if (lastUseIndex >= 0) {
    lines.splice(lastUseIndex + 1, 0, useLine);
    return;
  }

  if (listenIndex >= 0) {
    lines.splice(listenIndex, 0, useLine);
    return;
  }

  lines.push(useLine);
}

