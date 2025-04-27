const Process = require('./process');
const Channel = require('./channel');

class ProcessManager {
  constructor(topology, io) {
    this.io = io;  // WebSocket-сервер для отправки событий клиентам
    this.originalTopology = topology; // Исходная топология
    this.algorithm = topology.algorithm || 'christian'; // Алгоритм по умолчанию
    this._buildNetwork(topology); // Строим сеть процессов и каналов
    this.running = false; // Флаг запущена ли симуляция
  }

  // Построение сети процессов и каналов по топологии
  _buildNetwork({ nodes, edges }) {
    this.processes = new Map();
    this.channels = [];
    nodes.forEach(node => {
      this.processes.set(node.id, new Process(node.id, node.neighbors, this));
    });
    edges.forEach(e => {
      this.channels.push(new Channel(e.from, e.to, e.delay, this));
    });
  }

  // Запустить симуляцию
  start() {
    if (this.running) return;
    this.running = true;
    this.processes.forEach(p => p.onMessage({ type: 'START' }));
    this.io.emit('state', this.getState());
  }

  // Поставить симуляцию на паузу
  pause() {
    this.running = false;
  }

  // Выполнить один шаг симуляции
  step() {
    this.processes.forEach(p => p.processNext());
    const state = this.getState();
    this.io.emit('state', state);
    return state;
  }

  // Полностью сбросить симуляцию и перестроить сеть
  reset() {
    this.pause();
    this._buildNetwork(this.originalTopology);
    this.io.emit('topology', this.getTopology());
    this.io.emit('state', this.getState());
  }

  // Установить текущий алгоритм
  setAlgorithm(alg) {
    this.algorithm = alg;
  }

  // Получить текущую топологию
  getTopology() {
    return {
      nodes: this.originalTopology.nodes,
      edges: this.originalTopology.edges,
      algorithm: this.algorithm
    };
  }

  // Получить текущее состояние всех процессов
  getState() {
    return Array.from(this.processes.values()).map(p => ({
      id: p.id,
      context: p.context,
      inboxLength: p.inbox.length
    }));
  }

  // Получить процесс по идентификатору
  getProcess(id) {
    return this.processes.get(id);
  }

  // Отправить событие всем клиентам через WebSocket
  emit(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = ProcessManager;