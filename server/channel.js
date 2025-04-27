class Channel {
    constructor(from, to, delay, manager) {
      this.from = from;         // Узел-отправитель
      this.to = to;             // Узел-получатель
      this.delay = delay;       // Задержка доставки сообщения (в мс)
      this.manager = manager;   // Ссылка на менеджер процессов
    }
  
    // Передать сообщение через канал с задержкой
    transmit(msg) {
      setTimeout(() => {
        this.manager.getProcess(this.to).receive(msg);
      }, this.delay);
    }
  }
  
  module.exports = Channel;
  