// knowledge-graph — 力导向图节点动画
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var nodes = [];
  var edges = [];
  var count = 15;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0, vy: 0,
      r: Math.random() * 4 + 3
    });
  }
  for (var i = 0; i < count * 1.5; i++) {
    edges.push([Math.floor(Math.random() * count), Math.floor(Math.random() * count)]);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // edges
    ctx.strokeStyle = 'rgba(100,200,255,0.15)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i < edges.length; i++) {
      var a = nodes[edges[i][0]], b = nodes[edges[i][1]];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // nodes — gentle drift
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.vx += (Math.random() - 0.5) * 0.1;
      n.vy += (Math.random() - 0.5) * 0.1;
      n.vx *= 0.95; n.vy *= 0.95;
      n.x += n.vx; n.y += n.vy;
      if (n.x < 50 || n.x > canvas.width - 50) n.vx *= -1;
      if (n.y < 50 || n.y > canvas.height - 50) n.vy *= -1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,200,255,0.4)';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
