const toggleBtn = document.getElementById("menu-toggle");
const closeBtn = document.getElementById("close-sidebar");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function openSidebar() {
  sidebar.classList.remove("-translate-x-full");
  overlay.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
}

toggleBtn.addEventListener("click", openSidebar);
closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// 🚀 Bonus: Close sidebar when clicking a link
document.querySelectorAll("#sidebar a").forEach(link => {
  link.addEventListener("click", () => {
    closeSidebar();
  });
});