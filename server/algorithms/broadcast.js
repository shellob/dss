module.exports = function broadcast(proc, msg) {
    const ctx = proc.context;
  
    switch (msg.type) {
      // Инициация широковещательной рассылки
      case 'START':
        ctx.sent = false;              // Разрешить отправку сообщений
        ctx.received = new Set();       // Инициализация множества полученных сообщений
  
        // Отправляем сообщение всем соседям
        proc.neighbors.forEach(n => {
          proc.send(n, { type: 'BROADCAST', payload: 'hello', from: proc.id });
        });
  
        ctx.sent = true;                // Отмечаем, что отправка выполнена
        break;
  
      // Обработка полученного широковещательного сообщения
      case 'BROADCAST':
        if (!ctx.received) ctx.received = new Set();
  
        // Если сообщение ещё не получали — обрабатываем его
        if (!ctx.received.has(msg.payload)) {
          ctx.received.add(msg.payload);
  
          // Рассылаем сообщение дальше всем соседям, кроме отправителя
          proc.neighbors.forEach(n => {
            if (n !== msg.from) {
              proc.send(n, { type: 'BROADCAST', payload: msg.payload, from: proc.id });
            }
          });
        }
        break;
    }
  };
  