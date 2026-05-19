// matrix-rain — Matrix 数字雨
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var columns = [];
  var fontSize = 14;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    var colCount = Math.floor(canvas.width / fontSize);
    while (columns.length < colCount) columns.push(Math.random() * canvas.height / fontSize);
  }
  resize();
  window.addEventListener('resize', resize);

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px monospace';
    for (var i = 0; i < columns.length; i++) {
      var char = chars[Math.floor(Math.random() * chars.length)];
      var x = i * fontSize;
      var y = columns[i] * fontSize;
      ctx.fillStyle = 'rgba(0,255,70,0.5)';
      ctx.fillText(char, x, y);
      if (y > canvas.height && Math.random() > 0.975) columns[i] = 0;
      columns[i]++;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
