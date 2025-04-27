const socket = io();
const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select('#graph');
let linkGroup = svg.append('g');
let nodeGroup = svg.append('g');
let simulation, nodes, links;
let selectedSourceNode = null;
let selectedTargetNode = null;

socket.on('topology', ({ nodes: n, edges: e, algorithm }) => {
  nodes = n.map(d => ({ id: d.id }));
  links = e.map(d => ({ source: d.from, target: d.to }));
  populateAlgorithmSelect(algorithm);
  drawGraph();
});
socket.on('state', updateState);
socket.on('message_sent', animateMessage);
socket.on('message_received', d => highlightNode(d.to, 'received'));
socket.on('offset_updated', d => updateOffsetLabel(d.id, d.offset));
['start', 'pause', 'step', 'reset'].forEach(cmd => {
    document.getElementById(cmd).onclick = () => {
      socket.emit(cmd);
      if (cmd === 'reset') {
        selectedSourceNode = null;
        selectedTargetNode = null;
        resetGraphColors();
        updateNodeStyles();
      }
    };
  });
  

document.getElementById('algorithm-select').onchange = function() {
  socket.emit('setAlgorithm', this.value);
};
function populateAlgorithmSelect(current) {
  const select = document.getElementById('algorithm-select');
  select.innerHTML = '';
  ['christian', 'broadcast'].forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.text = name;
    if (name === current) opt.selected = true;
    select.append(opt);
  });
}

function drawGraph() {
    if (simulation) simulation.stop();
  
    linkGroup.selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');
  
    svg.select('defs')?.remove();
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');
  
    const nodeEnter = nodeGroup.selectAll('g')
      .data(nodes)
      .join(enter => {
        const g = enter.append('g')
          .attr('class', 'node')
          .on('click', nodeClicked); // добавляем обработчик клика
  
        g.append('circle').attr('r', 20).attr('fill', 'black');
        g.append('text')
          .attr('dy', 5)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .text(d => d.id);
  
        return g;
      });
  
    nodeEnter.call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );
  
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(250))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))
      .on('tick', ticked);
  }

  function nodeClicked(event, d) {
    if (!selectedSourceNode) {
      selectedSourceNode = d;
    } else if (!selectedTargetNode && d.id !== selectedSourceNode.id) {
      selectedTargetNode = d;
    } else {
      selectedSourceNode = d;
      selectedTargetNode = null;
    }
    updateNodeStyles();
  }
  
  function updateNodeStyles() {
    nodeGroup.selectAll('g').select('circle')
      .attr('stroke', d => {
        if (selectedSourceNode && d.id === selectedSourceNode.id) return 'green';
        if (selectedTargetNode && d.id === selectedTargetNode.id) return 'red';
        return null;
      })
      .attr('stroke-width', d => (selectedSourceNode && d.id === selectedSourceNode.id) || (selectedTargetNode && d.id === selectedTargetNode.id) ? 5 : 0);
  }
  
  document.getElementById('sendMessage').onclick = () => {
    if (!selectedSourceNode || !selectedTargetNode) {
      alert('Выберите отправителя и получателя!');
      return;
    }
  
    const messageType = prompt('Введите текст сообщения (например, CUSTOM_MSG):', 'CUSTOM_MSG');
    if (!messageType) return;
  
    animateCustomMessage(selectedSourceNode.id, selectedTargetNode.id, messageType);
  };
  
  function animateCustomMessage(from, to, type) {
    const directLink = links.find(l => l.source.id === from && l.target.id === to);
  
    if (directLink) {
      animateStep(from, to, type);
    } else {
      const path = findShortestPath(from, to);
      if (!path) {
        alert('Нет пути между выбранными узлами!');
        return;
      }
      animatePath(path, type);
    }
  }
  
  function animatePath(path, type) {
    for (let i = 0; i < path.length - 1; i++) {
      setTimeout(() => {
        animateStep(path[i], path[i + 1], type, i + 1);
      }, i * 1600);
    }
  }
  
  
  function animateStep(from, to, type, stepNumber = 1) {
    const link = links.find(l => l.source.id === from && l.target.id === to);
    if (!link) return;
  
    let color = 'purple';
  
    const linkElement = linkGroup.selectAll('line')
      .filter(d => d.source.id === from && d.target.id === to);
  
    const fromNode = nodeGroup.selectAll('g')
      .filter(d => d.id === from)
      .select('circle');
  
    const toNode = nodeGroup.selectAll('g')
      .filter(d => d.id === to)
      .select('circle');
  
    linkElement
      .transition()
      .duration(300)
      .attr('stroke', 'orange');
  
    fromNode
      .transition()
      .duration(300)
      .attr('fill', 'orange');
  
    toNode
      .transition()
      .duration(300)
      .attr('fill', 'orange');
  
    const marker = svg.append('circle')
      .attr('r', 5)
      .attr('fill', color)
      .attr('cx', link.source.x)
      .attr('cy', link.source.y);
  
    const label = svg.append('text')
      .text(type)
      .attr('font-size', 14)
      .attr('fill', color)
      .attr('text-anchor', 'middle')
      .attr('x', link.source.x)
      .attr('y', link.source.y - 20);
  
    const stepLabel = svg.append('text')
      .text('Шаг ' + stepNumber)
      .attr('font-size', 18)
      .attr('fill', 'orange')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle');
  
    link.stepLabel = stepLabel;
  
    marker.transition()
      .duration(1500)
      .attr('cx', link.target.x)
      .attr('cy', link.target.y)
      .remove();
  
    label.transition()
      .duration(1500)
      .attr('x', link.target.x)
      .attr('y', link.target.y - 20)
      .remove();
  }
  
  
  
  function resetGraphColors() {
    linkGroup.selectAll('line')
      .transition()
      .duration(500)
      .attr('stroke', '#999');
  
    nodeGroup.selectAll('g').select('circle')
      .transition()
      .duration(500)
      .attr('fill', 'black');
  }  

  function ticked() {
    linkGroup.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
  
    nodeGroup.selectAll('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart(); // поднимаем энергию симуляции
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0); // опускаем энергию симуляции
    d.fx = null;
    d.fy = null;
  }
  

  function ticked() {
    linkGroup.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
  
    nodeGroup.selectAll('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  
    // === Обновляем шаги ===
    links.forEach(link => {
      if (link.stepLabel) {
        const midX = (link.source.x + link.target.x) / 2;
        const midY = (link.source.y + link.target.y) / 2;
  
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const angle = Math.atan2(dy, dx);
  
        const offset = 20; // отступ перпендикулярно
        const offsetX = -Math.sin(angle) * offset;
        const offsetY = Math.cos(angle) * offset;
  
        link.stepLabel
          .attr('x', midX + offsetX)
          .attr('y', midY + offsetY);
      }
    });
  }
  
  document.getElementById('startSelected').onclick = () => {
    if (!selectedSourceNode) {
      alert('Выберите отправляющий узел!');
      return;
    }
    console.log('[CLIENT] Отправляем startFromNode для:', selectedSourceNode.id);
    socket.emit('startFromNode', { id: selectedSourceNode.id });
  };
  
  function updateOffsetLabel(id, offset) {
    nodeGroup.selectAll('g').filter(d => d.id === id)
      .select('text')
      .text(`${id}\n${offset}`);
  }
  
  
function animateMessage({ from, to, type }) {
    const link = links.find(l => l.source.id === from && l.target.id === to);
    if (!link) return;
  
    let color = 'blue';
    if (type === 'TIME_REQ') color = 'blue';
    if (type === 'TIME_RESP') color = 'green';
    if (type === 'BROADCAST') color = 'orange';
  
    const marker = svg.append('circle')
      .attr('r', 5)
      .attr('fill', color)
      .attr('cx', link.source.x)
      .attr('cy', link.source.y);
  
    const label = svg.append('text')
      .text(type)
      .attr('font-size', 12)
      .attr('fill', color)
      .attr('text-anchor', 'middle')
      .attr('x', link.source.x)
      .attr('y', link.source.y - 10);
  
    marker.transition()
      .duration(1000)
      .attr('cx', link.target.x)
      .attr('cy', link.target.y)
      .remove();
  
    label.transition()
      .duration(1000)
      .attr('x', link.target.x)
      .attr('y', link.target.y - 10)
      .remove();
  }
  

function highlightNode(id, type) {
  nodeGroup.selectAll('g').filter(d => d.id === id)
    .select('circle')
    .transition()
    .duration(200)
    .attr('stroke', type === 'received' ? 'green' : 'red')
    .attr('stroke-width', 4)
    .transition()
    .duration(400)
    .attr('stroke-width', 0);
}

function updateState(state) {
  console.log('Current State:', state);
}

function findShortestPath(fromId, toId) {
    const queue = [{ id: fromId, path: [fromId] }];
    const visited = new Set();
  
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.id === toId) {
        return current.path;
      }
      visited.add(current.id);
  
      const neighbors = links
        .filter(l => l.source.id === current.id)
        .map(l => l.target.id);
  
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    return null;
  }
  