// network.js
(function () {
  const mount = document.getElementById('networkPulse');
  if (!mount) return;

  const total = 18;
  const nodes = [];
  for (let i = 0; i < total; i += 1) {
    const node = document.createElement('div');
    node.className = 'pulse-node';
    mount.appendChild(node);
    nodes.push(node);
  }

  function tick() {
    nodes.forEach((node, index) => {
      const active = Math.random() > 0.72 || index === Math.floor(Math.random() * total);
      node.classList.toggle('active', active);
    });
  }

  tick();
  setInterval(tick, 900);
})();