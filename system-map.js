const mapCanvas = document.getElementById("systemMap");

if(mapCanvas){

const ctx = mapCanvas.getContext("2d");

let nodes = [];
const NODE_COUNT = 25;

function resize(){
mapCanvas.width = mapCanvas.offsetWidth;
mapCanvas.height = mapCanvas.offsetHeight;
}

window.addEventListener("resize",resize);
resize();

for(let i=0;i<NODE_COUNT;i++){

nodes.push({
x:Math.random()*mapCanvas.width,
y:Math.random()*mapCanvas.height,
vx:(Math.random()-.5)*0.3,
vy:(Math.random()-.5)*0.3,
alert: Math.random() < 0.08
});
}

function draw(){

ctx.clearRect(0,0,mapCanvas.width,mapCanvas.height);

for(let i=0;i<nodes.length;i++){

let n = nodes[i];

n.x += n.vx;
n.y += n.vy;

if(n.x<0||n.x>mapCanvas.width) n.vx *= -1;
if(n.y<0||n.y>mapCanvas.height) n.vy *= -1;

for(let j=i+1;j<nodes.length;j++){

let m = nodes[j];

let dx = n.x-m.x;
let dy = n.y-m.y;
let dist = Math.sqrt(dx*dx+dy*dy);

if(dist<140){

ctx.beginPath();
ctx.moveTo(n.x,n.y);
ctx.lineTo(m.x,m.y);
ctx.strokeStyle="rgba(69,215,255,"+(1-dist/140)*.25+")";
ctx.lineWidth=1;
ctx.stroke();

}

}

ctx.beginPath();
ctx.arc(n.x,n.y,2.2,0,Math.PI*2);
ctx.fillStyle="#7da2ff";
ctx.fill();

}

requestAnimationFrame(draw);

}

draw();

}