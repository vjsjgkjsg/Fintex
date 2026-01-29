// ===== categories.js =====
const Categories = {
  data: [
    {name:"Доход", type:"income", color:"#3b82f6"},
    {name:"Расход", type:"spent", color:"#ef4444"},
    {name:"Долг", type:"debt", color:"#f59e0b"}
  ],

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById("categories");
    container.innerHTML = "";
    this.data.forEach((c,i)=>{
      const div = document.createElement("div");
      div.className="cat";
      div.style.background = c.color;
      div.innerHTML = `<b>${c.name}</b><small>${c.type}</small>`;
      div.onclick = ()=>Categories.openModal(i);
      container.appendChild(div);
    });
  },

  showCreateModal() {
    document.getElementById("createCategoryModal").classList.add("show");
  },

  create() {
    const name = document.getElementById("newCategoryName").value;
    const type = document.getElementById("newCategoryType").value;
    const color = document.getElementById("newCategoryColor").value;
    if(!name) return alert("Введите название категории");
    this.data.push({name,type,color});
    this.render();
    UI.closeCreate();
  },

  openModal(index){
    this.selected = this.data[index];
    document.getElementById("modalTitle").textContent = `Добавить в ${this.selected.name}`;
    document.getElementById("modal").classList.add("show");
  }
};

// Инициализация
document.addEventListener("DOMContentLoaded", ()=>Categories.init());
