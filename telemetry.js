const canvas = document.getElementById("telemetryChart");

if (canvas) {
  const ctx = canvas.getContext("2d");
  let time = 0;

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSignal(color, offset) {
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x++) {
      const y =
        canvas.height / 2 +
        Math.sin(x * 0.01 + time * offset) * 30 +
        Math.sin(x * 0.03 + time) * 10;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawDriftMarker() {
    const x = canvas.width * 0.65;
    const y =
      canvas.height / 2 +
      Math.sin(x * 0.01 + time * 1.2) * 30 +
      Math.sin(x * 0.03 + time) * 10;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff9b3d";
    ctx.fill();

    ctx.strokeStyle = "rgba(255,155,61,0.28)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawSignal("#7d8cff", 0.8);
    drawSignal("#45d7ff", 1.2);
    drawSignal("#ff6b6b", 1.6);
    drawDriftMarker();
    time += 0.03;
    requestAnimationFrame(draw);
  }

  draw();
}