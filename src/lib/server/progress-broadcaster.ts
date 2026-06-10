// src/lib/server/progress-broadcaster.ts
type ProgressEvent = {
  type: 'progress' | 'complete' | 'error' | 'connected';
  step?: string;
  message: string;
  detail?: string;
  emoji?: string;
  timestamp: string;
};

class ProgressBroadcaster {
  private connections: Map<ReadableStreamDefaultController, { lastPing: number }> = new Map();
  private encoder = new TextEncoder();
  
  addConnection(controller: ReadableStreamDefaultController) {
    this.connections.set(controller, { lastPing: Date.now() });
    this.send(controller, {
      type: 'connected',
      message: 'Connected to progress stream',
      timestamp: new Date().toISOString()
    });
  }
  
  removeConnection(controller: ReadableStreamDefaultController) {
    this.connections.delete(controller);
  }
  
  private send(controller: ReadableStreamDefaultController, data: ProgressEvent) {
    try {
      controller.enqueue(this.encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      this.removeConnection(controller);
    }
  }
  
  broadcast(data: Omit<ProgressEvent, 'timestamp'>) {
    const event = { ...data, timestamp: new Date().toISOString() };
    this.connections.forEach((_, controller) => {
      this.send(controller, event);
    });
  }
  
  broadcastProgress(step: string, message: string, detail?: string, emoji?: string) {
    console.log(`[Progress] ${step}: ${message} ${detail || ''}`);
    this.broadcast({ type: 'progress', step, message, detail, emoji });
  }
  
  broadcastComplete(message: string) {
    console.log(`[Complete] ${message}`);
    this.broadcast({ type: 'complete', message });
    // Don't close connections - let them close naturally or timeout
  }
  
  broadcastError(message: string) {
    console.error(`[Error] ${message}`);
    this.broadcast({ type: 'error', message });
  }
  
  getConnectionCount() {
    return this.connections.size;
  }
}

export const progressBroadcaster = new ProgressBroadcaster();