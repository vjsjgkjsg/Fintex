const Records = {
  data: [],
  selectedCategory: null,

  add() {
    const amount = +document.getElementById("amount").value;
    const comment = document.getElementById("comment").value;
    if(!amount) return alert("Введите сумму");
    const category = Categories.selected || {name:"Без категории", type:"spent"};
    this.data.push({amount, comment, category});
    this.render();
    this.updateBalance();
    document.getElementById("amount").value="";
    document.getElementById("comment").value="";
    UI.closeModal();
  },

  quickAdd(value) {
    document.getElementById("amount").value = value;
  },

  render() {
    const ul = document.getElementById("recordsList");
    ul.innerHTML="";
    this.data.forEach((r,i)=>{
      const li = document.createElement("li");
      li.innerHTML = `<span>${r.comment} (${r.amount} ₸) [${r.category.name}]</span> <span class="trash" onclick="Records.delete(${i})">🗑️</span>`;
      ul.appendChild(li);
    });
  },

  delete(i){
    if(confirm("Удалить запись?")){
      this.data.splice(i,1);
      this.render();
      this.updateBalance();
    }
  },

  updateBalance(){
    let income = 0, spent=0, debt=0;
    this.data.forEach(r=>{
      if(r.category.type=="income") income+=r.amount;
      else if(r.category.type=="spent") spent+=r.amount;
      else if(r.category.type=="debt") debt+=r.amount;
    });
    const balance = income - spent - debt;
    document.getElementById("balanceAmount").textContent = balance + " ₸";
  }
};
