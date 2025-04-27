class Process {
    constructor(id, neighbors, manager) {
      this.id = id;                  // Идентификатор процесса
      this.neighbors = neighbors;    // Список соседей
      this.manager = manager;        // Ссылка на менеджер процессов
      this.context = {};             // Локальное состояние процесса
      this.inbox = [];               // Очередь входящих сообщений
    }
  
    // Отправка сообщения соседу
    send(to, msg) {
      this.manager.channels
        .filter(c => c.from === this.id && c.to === to)
        .forEach(c => c.transmit({ ...msg, from: this.id }));
  
      this.manager.emit('message_sent', { from: this.id, to, type: msg.type });
    }
  
    // Получение сообщения
    receive(msg) {
      this.inbox.push(msg);
      if (this.manager.running) {
        this.processNext();
      }
    }
  
    // Обработка следующего сообщения из очереди
    processNext() {
      const msg = this.inbox.shift();
      if (!msg) return;
  
      const algo = require(`./algorithms/${this.manager.algorithm}.js`);
      algo(this, msg);
  
      this.manager.emit('message_received', { to: this.id, type: msg.type });
    }
  
    // Прямое получение сообщения (без очереди)
    onMessage(msg) {
      this.receive(msg);
    }
  }
  
  module.exports = Process;
  