function toggleMenu(){
  document.querySelector('.nav-links').classList.toggle('active');
}

// Scroll fade-in animation
const faders=document.querySelectorAll('.fade');
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('show');}
  });
},{threshold:0.2});
faders.forEach(f=>observer.observe(f));

// Redirect to main page after short delay
if(document.body.classList.contains('loading-body')){
  setTimeout(()=>{ window.location.href="index.html"; }, 3000);
}
