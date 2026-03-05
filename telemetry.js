const canvas=document.getElementById("telemetryChart")

if(canvas){

const ctx=canvas.getContext("2d")

let time=0

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height)

drawSignal("#7d8cff",0.8)
drawSignal("#3fd0ff",1.2)
drawSignal("#ff6b6b",1.6)

time+=0.03

requestAnimationFrame(draw)

}

function drawSignal(color,offset){

ctx.beginPath()

for(let x=0;x<canvas.width;x++){

let y=
canvas.height/2+
Math.sin(x*0.01+time*offset)*40+
Math.sin(x*0.03+time)*15

if(x===0){
ctx.moveTo(x,y)
}else{
ctx.lineTo(x,y)
}

}

ctx.strokeStyle=color
ctx.lineWidth=2
ctx.stroke()

}

draw()

}