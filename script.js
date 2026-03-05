const reveals = document.querySelectorAll(".reveal")

window.addEventListener("scroll", ()=>{

for(let i=0;i<reveals.length;i++){

let windowHeight = window.innerHeight
let revealTop = reveals[i].getBoundingClientRect().top
let revealPoint = 120

if(revealTop < windowHeight - revealPoint){
reveals[i].classList.add("active")
}

}

})