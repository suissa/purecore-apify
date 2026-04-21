import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

/**
 * Pool de Workers para operações CPU-intensive
 * Evita bloquear o Event Loop principal
 */

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private busyWorkers = new Set<Worker>();
  private readonly maxWorkers: number;

  constructor(maxWorkers: number = cpus().length) {
    this.maxWorkers = maxWorkers;
  }

  async execute<T, R>(taskType: string, data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `${Date.now()}-${Math.random()}`,
        type: taskType,
        data,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) return;

    const task = this.taskQueue.shift()!;
    this.busyWorkers.add(availableWorker);

    availableWorker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data
    });

    // Configura listeners para esta tarefa específica
    const onMessage = (result: any) => {
      if (result.taskId === task.id) {
        this.busyWorkers.delete(availableWorker);
        availableWorker.off('message', onMessage);
        availableWorker.off('error', onError);
        
        if (result.error) {
          task.reject(new Error(result.error));
        } else {
          task.resolve(result.data);
        }

        // Processa próxima tarefa na fila
        this.processQueue();
      }
    };

    const onError = (error: Error) => {
      this.busyWorkers.delete(availableWorker);
      availableWorker.off('message', onMessage);
      availableWorker.off('error', onError);
      task.reject(error);
      
      // Remove worker com erro e cria um novo
      this.replaceWorker(availableWorker);
      this.processQueue();
    };

    availableWorker.on('message', onMessage);
    availableWorker.on('error', onError);
  }

  private getAvailableWorker(): Worker | null {
    // Procura worker disponível
    for (const worker of this.workers) {
      if (!this.busyWorkers.has(worker)) {
        return worker;
      }
    }

    // Cria novo worker se ainda não atingiu o limite
    if (this.workers.length < this.maxWorkers) {
      const worker = this.createWorker();
      this.workers.push(worker);
      return worker;
    }

    return null;
  }

  private createWorker(): Worker {
    const workerPath = fileURLToPath(import.meta.url);
    return new Worker(workerPath, {
      workerData: { isWorkerThread: true }
    });
  }

  private replaceWorker(oldWorker: Worker): void {
    const index = this.workers.indexOf(oldWorker);
    if (index !== -1) {
      oldWorker.terminate();
      this.workers[index] = this.createWorker();
    }
  }

  async terminate(): Promise<void> {
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    this.workers = [];
    this.busyWorkers.clear();
  }
}

// Código do Worker Thread
if (!isMainThread && workerData?.isWorkerThread) {
  parentPort?.on('message', async (message) => {
    const { taskId, type, data } = message;

    try {
      let result: any;

      switch (type) {
        case 'fibonacci':
          result = calculateFibonacci(data.n);
          break;
        
        case 'hash':
          result = await calculateHash(data.input, data.algorithm);
          break;
        
        case 'imageResize':
          result = await processImage(data.buffer, data.options);
          break;
        
        case 'dataProcessing':
          result = await processLargeDataset(data.dataset, data.operations);
          break;
        
        default:
          throw new Error(`Tipo de tarefa desconhecido: ${type}`);
      }

      parentPort?.postMessage({
        taskId,
        data: result
      });

    } catch (error) {
      parentPort?.postMessage({
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// Implementações das tarefas CPU-intensive
function calculateFibonacci(n: number): number {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

async function calculateHash(input: string, algorithm: string = 'sha256'): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash(algorithm).update(input).digest('hex');
}

async function processImage(buffer: Buffer, options: any): Promise<Buffer> {
  // Simulação de processamento de imagem
  // Em produção, usaria bibliotecas como Sharp
  await new Promise(resolve => setTimeout(resolve, 100));
  return buffer;
}

async function processLargeDataset(dataset: any[], operations: string[]): Promise<any[]> {
  // Simulação de processamento de dados pesado
  return dataset.map(item => {
    // Aplica operações pesadas
    let result = item;
    for (const op of operations) {
      switch (op) {
        case 'normalize':
          result = normalizeData(result);
          break;
        case 'validate':
          result = validateData(result);
          break;
        case 'transform':
          result = transformData(result);
          break;
      }
    }
    return result;
  });
}

function normalizeData(data: any): any {
  // Simulação de normalização
  return { ...data, normalized: true };
}

function validateData(data: any): any {
  // Simulação de validação
  return { ...data, valid: true };
}

function transformData(data: any): any {
  // Simulação de transformação
  return { ...data, transformed: true };
}

// Singleton do pool de workers
let workerPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!workerPool) {
    workerPool = new WorkerPool();
  }
  return workerPool;
}

/**
 * Função utilitária para executar tarefas CPU-intensive
 */
export async function executeCpuTask<T, R>(taskType: string, data: T): Promise<R> {
  const pool = getWorkerPool();
  return pool.execute<T, R>(taskType, data);
}