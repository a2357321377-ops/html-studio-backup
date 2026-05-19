// typewriter-multi — 多行打字机效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var lines = [
    'function innovate(data) {',
    '  const model = train(data);',
    '  return predict(model);',
    '}',
    '// AI-powered insights'
  ];
  var currentLine = 0;
  var charIndex = 0;
  var displayLines = [''];
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;
    if (t % 3 === 0) {
      if (currentLine < lines.length) {
        if (charIndex < lines[currentLine].length) {
          displayLines[currentLine] = lines[currentLine].substring(0, charIndex + 1);
          charIndex++;
        } else {
          currentLine++;
          charIndex = 0;
          if (currentLine < lines.length) displayLines.push('');
        }
      } else {
        // reset
        if (t % 300 === 0) {
          currentLine = 0; charIndex = 0;
          displayLines = [''];
        }
      }
    }
    ctx.font = '14px monospace';
    for (var i = 0; i < displayLines.length; i++) {
      ctx.fillStyle = 'rgba(100,255,200,0.3)';
      ctx.fillText(displayLines[i], 30, 30 + i * 22);
    }
    // cursor blink
    if (Math.sin(t * 0.1) > 0 && currentLine < lines.length) {
      var lastLine = displayLines[displayLines.length - 1] || '';
      var cursorX = 30 + ctx.measureText(lastLine).width;
      ctx.fillStyle = 'rgba(100,255,200,0.5)';
      ctx.fillRect(cursorX, 30 + (displayLines.length - 1) * 22 - 12, 8, 14);
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
