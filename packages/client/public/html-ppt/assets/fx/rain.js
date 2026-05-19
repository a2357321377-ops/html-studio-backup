// rain — 数字雨效果
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
    columns = [];
    for (var i = 0; i < colCount; i++) {
      columns[i] = Math.random() * canvas.height / fontSize;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,255,100,0.4)';
    ctx.font = fontSize + 'px monospace';
    for (var i = 0; i < columns.length; i++) {
      var char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, columns[i] * fontSize);
      if (columns[i] * fontSize > canvas.height && Math.random() > 0.975) {
        columns[i] = 0;
      }
      columns[i]++;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
