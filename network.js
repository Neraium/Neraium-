const canvas = document.getElementById("networkCanvas");

if(canvas){

const ctx = canvas.getContext("2d");

let nodes = [];
const NODE_COUNT = 60;

function resize(){
canvas.width = window.innerWidth;
canvas.height = canvas.parentElement.offsetHeight;
}

window.addEventListener("resize",resize);
resize();

for(let i=0;i<NODE_COUNT;i++){
nodes.push({
x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
vx:(Math.random()-.5)*0.4,
vy:(Math.random()-.5)*0.4
});
}

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

for(let i=0;i<nodes.length;i++){

let n = nodes[i];

n.x += n.vx;
n.y += n.vy;

if(n.x<0||n.x>canvas.width) n.vx *= -1;
if(n.y<0||n.y>canvas.height) n.vy *= -1;

for(let j=i+1;j<nodes.length;j++){

let m = nodes[j];

let dx = n.x-m.x;
let dy = n.y-m.y;

let dist = Math.sqrt(dx*dx+dy*dy);

if(dist<120){

ctx.beginPath();
ctx.moveTo(n.x,n.y);
ctx.lineTo(m.x,m.y);
ctx.strokeStyle="rgba(125,162,255,"+(1-dist/120)*.25+")";
ctx.lineWidth=1;
ctx.stroke();

}

}

ctx.beginPath();
ctx.arc(n.x,n.y,1.6,0,Math.PI*2);
ctx.fillStyle="#7da2ff";
ctx.fill();

}

requestAnimationFrame(draw);

}

draw();

}