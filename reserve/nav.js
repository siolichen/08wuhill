(function(){
  "use strict";
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");
  if (!menuToggle || !mainNav) return;
  menuToggle.addEventListener("click", function(){
    var open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  mainNav.addEventListener("click", function(e){
    if (e.target.tagName === "A"){
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
})();
