const reveals=document.querySelectorAll(".reveal")

window.addEventListener("scroll",()=>{

for(let i=0;i<reveals.length;i++){

let windowHeight=window.innerHeight
let elementTop=reveals[i].getBoundingClientRect().top
let revealPoint=120

if(elementTop<windowHeight-revealPoint){
reveals[i].classList.add("active")
}

}

})