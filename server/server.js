const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ProcessManager = require('./processManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const topology = require('./topology');
const manager = new ProcessManager(topology, io);

// Статика для клиента
app.use(express.static(__dirname + '/../client/public'));

// Для приёма JSON через REST-запросы
app.use(express.json());

// REST API
app.get('/state', (req, res) => res.json(manager.getState()));

app.post('/setTopology', (req, res) => {
  manager.setTopology(req.body);
  res.json({ status: 'ok', topology: manager.getTopology() });
});

// WebSocket события
io.on('connection', socket => {
  console.log('[SERVER] Клиент подключился');

  // При подключении отправляем клиенту текущее состояние
  socket.emit('topology', manager.getTopology());
  socket.emit('algorithm', manager.algorithm);
  socket.emit('state', manager.getState());

  // Управление симуляцией
  socket.on('start', () => manager.start());
  socket.on('pause', () => manager.pause());
  socket.on('step', () => socket.emit('state', manager.step()));
  socket.on('reset', () => manager.reset());

  socket.on('startFromNode', ({ id }) => {
    console.log(`[SERVER] Старт от выбранного узла: ${id}`);
    const proc = manager.processes.get(id);
    if (proc) {
      proc.receive({ type: 'START' });
      io.emit('state', manager.getState());
    } else {
      console.warn(`[SERVER] Процесс не найден для узла: ${id}`);
    }
  });

  socket.on('setAlgorithm', alg => {
    manager.setAlgorithm(alg);
    manager.reset();
    socket.emit('algorithm', manager.algorithm);
    socket.emit('topology', manager.getTopology());
    socket.emit('state', manager.getState());
  });

  socket.on('getState', () => socket.emit('state', manager.getState()));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[SERVER] Сервер запущен на порту ${PORT}`));