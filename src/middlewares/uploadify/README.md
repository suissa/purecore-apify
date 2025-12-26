# Uploadify Middleware

O **Uploadify** é uma implementação nativa e robusta de middleware para upload de arquivos em Node.js. Ele foi desenhado para ser totalmente compatível com a API do `multer`, porém sem nenhuma dependência externa (zero-dependencies), utilizando apenas os módulos nativos `node:stream`, `node:fs` e `node:buffer`.

Sua principal filosofia é a **Resiliência Extrema**: o middleware foi projetado para **NUNCA** emitir um erro não tratado que derrube a requisição. Em vez disso, ele adota o **Notification Pattern** para reportar problemas.

## 🛡️ Técnica de Resiliência: Notification Pattern

Ao contrário de middlewares tradicionais que lançam exceções (throw) ou retornam erros imediatos (500/400) ao encontrar problemas (como arquivo muito grande ou tipo inválido), o Uploadify continua o processamento e anexa os erros em uma lista de notificações no objeto `req`.

Isso permite que o Controller tome a decisão final sobre como proceder, garantindo que a requisição sempre chegue ao seu manipulador final.

**Como funciona:**
1. Se um arquivo excede o tamanho limite, ele é truncado ou descartado, e uma notificação `LIMIT_FILE_SIZE` é adicionada.
2. Se um arquivo tem tipo inválido, ele é ignorado e uma notificação `FILE_FILTER_ERROR` é adicionada.
3. O `next()` é sempre chamado, entregando o controle para sua rota.

Acesse as notificações via `req.notifications`:

```typescript
if (req.notifications && req.notifications.length > 0) {
  // Decida se quer retornar erro parcial, warning ou erro total
  return res.status(400).json({ 
    status: 'partial_success', 
    erros: req.notifications 
  });
}
```

## 🚀 Funcionalidades

- **Zero Dependências**: Pura performance nativa do Node.js.
- **API Compatível com Multer**: `.single()`, `.array()`, `.fields()`, `.any()`, `.none()`.
- **Storage Engines**: 
  - `DiskStorage`: Streaming direto para o disco (baixa pegada de memória).
  - `MemoryStorage`: Buffer em memória.
- **High Performance**: Parser multipart manual via Streams (não carrega o arquivo todo na RAM).
- **Limites e Segurança**: Proteção contra DoS via configurações de `limits`.

## 📡 Upload Assíncrono com Processamento via SSE

Um padrão poderoso suportado pelo Uploadify é o processamento assíncrono de uploads pesados. Em vez de fazer o cliente esperar com um loading infinito até o fim do processamento (o que pode gerar timeout em load balancers), você pode utilizar **Server-Sent Events (SSE)** para informar o progresso ou o resultado assim que o upload físico terminar.

### Exemplo de Implementação

```typescript
import { uploadify } from './middlewares/uploadify';

const upload = uploadify({ dest: 'uploads/' });

app.post('/import-data', upload.single('csv'), async (req, res) => {
  // 1. Configurar Headers para SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Envia os headers imediatamente

  // 2. Verificar notificações de erro no upload
  if (req.notifications?.length) {
    res.write(`event: error\ndata: ${JSON.stringify(req.notifications)}\n\n`);
    return res.end();
  }

  // 3. Informar que o upload foi recebido com sucesso
  const fileInfo = req.file;
  res.write(`event: upload_complete\ndata: ${JSON.stringify({ filename: fileInfo.filename })}\n\n`);

  try {
    // 4. Iniciar processamento pesado (ex: ler CSV gigante, processar IA)
    // Como estamos com SSE, podemos enviar progresso
    res.write(`event: processing\ndata: {"progress": 10, "status": "Lendo arquivo..."}\n\n`);
    
    const result = await HeavyController.processFile(fileInfo.path, (progress) => {
        // Callback opcional de progresso do controller
        res.write(`event: processing\ndata: {"progress": ${progress}}\n\n`);
    });

    // 5. Enviar resultado final
    res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
    
  } catch (err) {
    res.write(`event: error\ndata: {"message": "Erro no processamento interno"}\n\n`);
  } finally {
    // 6. Encerrar conexão
    res.end();
  }
});
```

Este padrão garante que o cliente (Frontend) receba feedback imediato:
1. Conexão estabelecida.
2. Upload concluído.
3. Feedback visual de progresso (0-100%).
4. Resultado final.

## 📚 API Reference

### Instalação e Uso Básico

```typescript
import { uploadify } from './middlewares/uploadify';

// Salvar em disco
const upload = uploadify({ dest: 'uploads/' });

// Salvar em memória
// const upload = uploadify({ storage: uploadify.memoryStorage() });

app.post('/profile', upload.single('avatar'), (req, res) => {
  // req.file contém o arquivo
  // req.body contém os campos de texto
  res.json({ file: req.file });
});
```

### Métodos

- `upload.single(fieldname)`: Aceita um único arquivo. `req.file`.
- `upload.array(fieldname[, maxCount])`: Aceita array de arquivos. `req.files`.
- `upload.fields([{ name, maxCount }])`: Aceita múltiplos campos com arquivos. `req.files`.
- `upload.none()`: Aceita apenas campos de texto.
- `upload.any()`: Aceita qualquer arquivo que vier.

### Opções (`UploadifyOptions`)

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `dest` | String com o caminho da pasta (cria automaticamente) | `undefined` (usa MemoryStorage se não informado) |
| `storage` | Instância de StorageEngine (`diskStorage` ou `memoryStorage`) | - |
| `limits` | Objeto com limites (fileSize, files, fieldSize...) | `{ fileSize: Infinity }` |
| `fileFilter` | Função para controlar quais arquivos aceitar | - |

---
**PureCore - Advanced Agentic Coding**
