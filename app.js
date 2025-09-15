if (!navigator.onLine) {
  document.body.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#111;color:#fff;text-align:center;padding:20px;'><h1>Please connect to the internet</h1><p>This page needs internet to load styles and scripts from GitHub.</p></div>";
} else {
  // After 3 seconds, go to home page file
  setTimeout(function () {
    window.location.href = 'home.html';
  }, 3000);
}
