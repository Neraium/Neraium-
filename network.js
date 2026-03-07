const canvas = document.getElementById("networkCanvas")

if(canvas){

const ctx = canvas.getContext("2d")

let width
let height

function resize(){
width = canvas.width = window.innerWidth
height = canvas.height = canvas.offsetHeight
}

window.addEventListener("resize", resize)
resize()

const nodes = []
const NODE_COUNT = 40

for(let i=0;i<NODE_COUNT;i++){
nodes.push({
x:Math.random()*width,
y:Math.random()*height,
vx:(Math.random()-0.5)*0.3,
vy:(Math.random()-0.5)*0.3
})
}

function draw(){

ctx.clearRect(0,0,width,height)

for(let i=0;i<nodes.length;i++){

let n = nodes[i]

n.x += n.vx
n.y += n.vy

if(n.x<0||n.x>width) n.vx*=-1
if(n.y<0||n.y>height) n.vy*=-1

ctx.beginPath()
ctx.arc(n.x,n.y,2,0,Math.PI*2)
ctx.fillStyle="#6f8fff"
ctx.fill()

for(let j=i+1;j<nodes.length;j++){

let n2 = nodes[j]

let dx = n.x-n2.x
let dy = n.y-n2.y
let dist = Math.sqrt(dx*dx+dy*dy)

if(dist<140){

ctx.strokeStyle="rgba(111,143,255,"+(1-dist/140)+")"
ctx.lineWidth=.5

ctx.beginPath()
ctx.moveTo(n.x,n.y)
ctx.lineTo(n2.x,n2.y)
ctx.stroke()

}

}

}

requestAnimationFrame(draw)

}

draw()

}