const UI = {
  toggleTheme() {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
    document.getElementById("themeToggle").textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
  },
  closeModal() { document.getElementById("modal").classList.remove("show"); },
  closeCreate() { document.getElementById("createCategoryModal").classList.remove("show"); }
};
