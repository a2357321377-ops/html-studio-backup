// mesh — 网格效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var t = 0;
  var spacing = 40;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(100,200,255,0.12)';
    ctx.lineWidth = 0.5;
    var cols = Math.ceil(canvas.width / spacing) + 1;
    var rows = Math.ceil(canvas.height / spacing) + 1;
    // horizontal lines
    for (var r = 0; r < rows; r++) {
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) {
        var x = c * spacing;
        var y = r * spacing + Math.sin(c * 0.3 + t + r * 0.5) * 5;
        if (c === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // vertical lines
    for (var c = 0; c < cols; c++) {
      ctx.beginPath();
      for (var r = 0; r <= rows; r++) {
        var x = c * spacing + Math.sin(r * 0.3 + t + c * 0.5) * 5;
        var y = r * spacing;
        if (r === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    t += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();
