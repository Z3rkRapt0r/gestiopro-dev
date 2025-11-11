/**
 * Sistema di coda offline per gestire operazioni quando non c'è connessione
 * Salva le operazioni in localStorage e le riprende quando torna la connessione
 */

export interface QueuedOperation {
  id: string;
  type: 'attendance-checkin' | 'attendance-checkout' | 'overtime' | 'leave-request';
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'gestiopro_offline_queue';
const MAX_RETRIES = 3;

export class OfflineQueue {
  private queue: QueuedOperation[] = [];

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Carica la coda dal localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Coda offline caricata: ${this.queue.length} operazioni`);
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento della coda offline:', error);
      this.queue = [];
    }
  }

  /**
   * Salva la coda nel localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ Errore nel salvataggio della coda offline:', error);
    }
  }

  /**
   * Aggiunge un'operazione alla coda
   */
  add(type: QueuedOperation['type'], data: any): string {
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log(`➕ Operazione aggiunta alla coda offline: ${type}`, operation);

    // Emette evento per notificare l'aggiunta
    window.dispatchEvent(new CustomEvent('offline-queue-added', { detail: operation }));

    return operation.id;
  }

  /**
   * Rimuove un'operazione dalla coda
   */
  remove(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
    console.log(`➖ Operazione rimossa dalla coda offline: ${id}`);
  }

  /**
   * Ottiene tutte le operazioni in coda
   */
  getAll(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Ottiene il numero di operazioni in coda
   */
  getCount(): number {
    return this.queue.length;
  }

  /**
   * Processa tutte le operazioni in coda
   */
  async processQueue(
    processor: (operation: QueuedOperation) => Promise<void>
  ): Promise<void> {
    if (this.queue.length === 0) {
      console.log('✅ Nessuna operazione in coda da processare');
      return;
    }

    console.log(`⚙️ Inizio processamento coda: ${this.queue.length} operazioni`);

    const operations = [...this.queue];

    for (const operation of operations) {
      try {
        await processor(operation);
        this.remove(operation.id);
        console.log(`✅ Operazione processata con successo: ${operation.type}`);

        // Emette evento per notificare il successo
        window.dispatchEvent(new CustomEvent('offline-queue-processed', {
          detail: { operation, success: true }
        }));
      } catch (error) {
        console.error(`❌ Errore nel processamento dell'operazione ${operation.type}:`, error);

        // Incrementa i tentativi
        operation.retries++;

        if (operation.retries >= MAX_RETRIES) {
          console.warn(`⚠️ Operazione rimossa dopo ${MAX_RETRIES} tentativi falliti`);
          this.remove(operation.id);

          // Emette evento per notificare il fallimento
          window.dispatchEvent(new CustomEvent('offline-queue-failed', {
            detail: { operation, error }
          }));
        } else {
          this.saveQueue();
        }
      }
    }

    console.log('✅ Processamento coda completato');
  }

  /**
   * Configura il listener per processare la coda quando torna online
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connessione ripristinata, processamento coda...');
      window.dispatchEvent(new CustomEvent('connection-restored'));

      // Aspetta un momento per assicurarsi che la connessione sia stabile
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('process-offline-queue'));
      }, 1000);
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connessione persa, modalità offline attiva');
      window.dispatchEvent(new CustomEvent('connection-lost'));
    });
  }

  /**
   * Pulisce tutte le operazioni dalla coda
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
    console.log('🗑️ Coda offline svuotata');
  }
}

// Istanza singleton
export const offlineQueue = new OfflineQueue();
