const canvas=document.querySelector(".network")
const ctx=canvas.getContext("2d")

canvas.width=window.innerWidth
canvas.height=window.innerHeight

let particles=[]

for(let i=0;i<80;i++){

particles.push({
x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
vx:(Math.random()-.5)*0.6,
vy:(Math.random()-.5)*0.6
})

}

function animate(){

ctx.clearRect(0,0,canvas.width,canvas.height)

particles.forEach(p=>{

p.x+=p.vx
p.y+=p.vy

if(p.x<0||p.x>canvas.width)p.vx*=-1
if(p.y<0||p.y>canvas.height)p.vy*=-1

ctx.beginPath()
ctx.arc(p.x,p.y,2,0,Math.PI*2)
ctx.fillStyle="#7d8cff"
ctx.fill()

})

for(let i=0;i<particles.length;i++){

for(let j=i+1;j<particles.length;j++){

let dx=particles[i].x-particles[j].x
let dy=particles[i].y-particles[j].y
let dist=Math.sqrt(dx*dx+dy*dy)

if(dist<120){

ctx.beginPath()
ctx.moveTo(particles[i].x,particles[i].y)
ctx.lineTo(particles[j].x,particles[j].y)
ctx.strokeStyle="rgba(125,140,255,.15)"
ctx.stroke()

}

}

}

requestAnimationFrame(animate)

}

animate()