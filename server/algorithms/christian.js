module.exports = function christian(proc, msg) {
    const ctx = proc.context;
  
    switch (msg.type) {
      // Инициация синхронизации времени
      case 'START':
        ctx.requestTime = Date.now(); // Сохраняем момент отправки запросов
        ctx.responses = [];           // Ответы от соседей
        ctx.waiting = proc.neighbors.length; // Сколько ответов ожидаем
        proc.neighbors.forEach(n => {
          proc.send(n, { type: 'TIME_REQ', from: proc.id });
        });
        break;
  
      // Обработка запроса времени от соседа
      case 'TIME_REQ':
        // Отвечаем отправителю своим временем
        proc.send(msg.from, { type: 'TIME_RESP', time: Date.now() });
        
        // Если узел ещё не инициировал свою синхронизацию — инициируем
        if (!ctx.synced) {
          ctx.requestTime = Date.now();
          ctx.responses = [];
          ctx.waiting = proc.neighbors.length;
          proc.neighbors.forEach(n => {
            proc.send(n, { type: 'TIME_REQ', from: proc.id });
          });
        }
        ctx.synced = true;
        break;
  
      // Обработка ответа от соседа
      case 'TIME_RESP':
        if (!ctx.responses) ctx.responses = [];
        ctx.responses.push(msg.time);
  
        ctx.waiting--;
  
        // После получения всех ответов — рассчитываем оффсет
        if (ctx.waiting === 0) {
          const now = Date.now();
          const avgNeighborTime = ctx.responses.reduce((a, b) => a + b, 0) / ctx.responses.length;
          const rtt = now - ctx.requestTime;
          ctx.offset = (avgNeighborTime + rtt / 2) - now;
  
          // Отправляем обновлённое значение оффсета на клиент
          proc.manager.emit('offset_updated', { id: proc.id, offset: ctx.offset.toFixed(0) });
        }
        break;
    }
  };
  