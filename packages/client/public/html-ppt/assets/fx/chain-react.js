// chain-react — 节点链式激活
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var nodes = [];
  var cols = 8, rows = 5;
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      nodes.push({
        x: (c + 1) * canvas.width / (cols + 1),
        y: (r + 1) * canvas.height / (rows + 1),
        active: 0,
        phase: (r + c) * 0.5
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.03;
    // connections
    ctx.strokeStyle = 'rgba(100,255,200,0.08)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        if (Math.sqrt(dx*dx + dy*dy) < canvas.width / cols * 1.5) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.active = Math.sin(t + n.phase) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,255,200,' + n.active * 0.6 + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,255,200,' + n.active * 0.1 + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
