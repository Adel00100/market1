import{initializeApp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getFirestore,collection,doc,getDoc,setDoc,addDoc,deleteDoc,updateDoc,onSnapshot,runTransaction,writeBatch,increment}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// 1) PASTE YOUR FIREBASE CONFIG HERE (Firebase console > Project settings > Your apps > Web app)
const firebaseConfig={apiKey:"AIzaSyDOX4W3CFNkFeNvNF5qUraxxPDqyoeaYMc",authDomain:"market-6d7af.firebaseapp.com",projectId:"market-6d7af",storageBucket:"market-6d7af.firebasestorage.app",messagingSenderId:"692556095119",appId:"1:692556095119:web:ff54aacbc73a24c3559afa"};

const app=initializeApp(firebaseConfig),db=getFirestore(app);
const $=s=>document.querySelector(s);
const money=n=>'$'+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cls=n=>n>0?'pos':n<0?'neg':'';
let me=null,P=[],S=[],U=[],tab='dashboard',editing=null,unsubs=[],setupMode=false,settingUp=false;
const fp=id=>P.find(x=>x.id===id);
const isAdmin=()=>me?.role==='admin';
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
const fail=e=>toast('Database error: '+(e.code||e.message));
const nice=e=>({'auth/invalid-credential':'Wrong email or password','auth/email-already-in-use':'That email is already used','auth/weak-password':'Password needs 6+ characters','permission-denied':'Not allowed (setup may already be done — sign in instead)'}[e.code]||e.message||'Error');

// ---------- live data (no login: test version) ----------
me={uid:'test',name:'Admin',role:'admin'};
const live=(c,fn)=>onSnapshot(collection(db,c),q=>{fn(q.docs.map(d=>({...d.data(),id:d.id})));render()},fail);
live('products',a=>P=a);live('sales',a=>S=a.sort((x,y)=>x.date-y.date));

// ---------- views ----------
const tabs=()=>isAdmin()?[['dashboard','Dashboard'],['sell','Sell'],['products','Products'],['sales','Sales']]:[['sell','Sell'],['sales','Sales']];
render();
function render(){
 $('#bar').hidden=!me;
  $('#xl').hidden=!isAdmin();$('#who').textContent=me.name+' ('+me.role+')';
 if(!tabs().some(t=>t[0]===tab))tab=tabs()[0][0];
 $('#nav').innerHTML=tabs().map(([k,l])=>`<button type="button" class="nav-link ${tab===k?'active':''}" data-t="${k}" aria-current="${tab===k?'page':'false'}">${l}</button>`).join('');
 $('#app').innerHTML=({dashboard:vDash,sell:vSell,products:vProd,sales:vSales})[tab]();
 fillPrice();
}
function stats(){
 return P.map(p=>{
  const sales=S.filter(s=>s.pid===p.id),sold=sales.reduce((n,s)=>n+(+s.qty||0),0);
  const rev=sales.reduce((n,s)=>n+(+s.qty||0)*(+s.price||0),0);
  const cogs=sales.reduce((n,s)=>n+(+s.qty||0)*(+s.cost||0),0);
  return {...p,stock:+p.stock||0,cost:+p.cost||0,price:+p.price||0,min:+p.min||0,sold,rev,cogs,profit:rev-cogs};
 });
}
function totals(st){
 return st.reduce((t,p)=>({rev:t.rev+p.rev,cogs:t.cogs+p.cogs,profit:t.profit+p.profit,sold:t.sold+p.sold,left:t.left+p.stock,val:t.val+p.stock*p.cost,pot:t.pot+p.stock*(p.price-p.cost)}),{rev:0,cogs:0,profit:0,sold:0,left:0,val:0,pot:0});
}
function pageHead(title,sub,eyebrow='Market overview'){
 return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2><p>${sub}</p></div></div>`;
}
function vDash(){
 const st=stats(),t=totals(st),low=st.filter(p=>p.stock<=p.min);
 return `${pageHead('Your market, at a glance','A live snapshot of sales, profit and inventory.')}
 <section class="row row-cols-2 row-cols-xl-4 g-3 mb-4" aria-label="Business summary">
  <article class="col"><div class="card metric h-100"><div class="k">Total revenue</div><div class="v">${money(t.rev)}</div></div></article>
  <article class="col"><div class="card metric h-100"><div class="k">Gross profit</div><div class="v ${cls(t.profit)}">${money(t.profit)}</div></div></article>
  <article class="col"><div class="card metric h-100"><div class="k">Units sold</div><div class="v">${t.sold.toLocaleString()}</div></div></article>
  <article class="col"><div class="card metric h-100"><div class="k">Units in stock</div><div class="v">${t.left.toLocaleString()}</div></div></article>
 </section>
 <div class="row g-3"><section class="col-12 col-xl-8"><div class="card h-100"><div class="card-head"><h2>Inventory snapshot</h2><span class="badge">${st.length} products</span></div>
  <div class="tw">${st.length?`<table class="table table-hover align-middle mb-0"><thead><tr><th>Product</th><th class="n">Price</th><th class="n">In stock</th><th class="n">Units sold</th><th>Status</th></tr></thead><tbody>${st.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td class="n">${money(p.price)}</td><td class="n">${p.stock}</td><td class="n">${p.sold}</td><td>${p.stock<=p.min?'<span class="badge warning">Low stock</span>':'<span class="badge">In stock</span>'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Add your first product to get started.</div>'}</div>
 </div></section><aside class="col-12 col-xl-4 stack"><section class="card"><div class="card-head"><h2>Stock check</h2><span class="badge ${low.length?'warning':''}">${low.length} need attention</span></div>
  ${low.length?`<div class="tw"><table class="table table-hover align-middle mb-0"><thead><tr><th>Product</th><th class="n">Left</th><th class="n">Minimum</th></tr></thead><tbody>${low.map(p=>`<tr><td>${esc(p.name)}</td><td class="n low">${p.stock}</td><td class="n">${p.min}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Everything is stocked above its minimum.</div>'}
 </section><section class="card"><div class="k">Inventory at cost</div><div class="v">${money(t.val)}</div><p class="hint">Potential profit on remaining stock: <strong class="${cls(t.pot)}">${money(t.pot)}</strong></p></section></aside></div>`;
}
function vSell(){
 const available=P.filter(p=>(+p.stock||0)>0),first=available[0];
 return `${pageHead('Record a sale','Choose an item and quantity to update your stock instantly.','Point of sale')}
 ${first?`<section class="card"><div class="card-head"><h2>New sale</h2><span class="badge">Live inventory</span></div><form id="sellf" class="row g-3 align-items-end">
  <div class="col-12 col-md-6 col-xl-4"><label class="form-label" for="sp">Product</label><select id="sp" class="form-select" required>${available.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${p.stock} available</option>`).join('')}</select></div>
  <div class="col-12 col-md-6 col-xl-3"><label class="form-label" for="sq">Quantity</label><input id="sq" class="form-control" type="number" min="1" max="${first.stock}" value="1" step="1" required><span id="sell-stock" class="hint">${first.stock} units available</span></div>
  <div class="col-12 col-md-6 col-xl-3"><label class="form-label" for="spr">Unit price</label><input id="spr" class="form-control" type="number" min="0.01" step="0.01" value="${first.price}" required></div>
  <div class="col-12 col-md-6 col-xl-2"><button class="btn btn-success w-100" type="submit">Complete sale</button></div>
 </form></section>`:'<section class="card"><h2>Nothing to sell just yet</h2><p class="hint">Add products and make sure they have stock before recording a sale.</p></section>'}`;
}
function vProd(){
 const p=editing?fp(editing):null,rows=P;
 return `${pageHead('Products & inventory','Add items, update prices and keep an eye on stock.','Inventory')}
 <section class="card product-editor"><div class="card-head"><h2>${p?'Edit product':'Add a product'}</h2>${p?'<button id="cx" class="btn btn-outline-secondary" type="button">Cancel</button>':''}</div>
 <form id="pf" class="row g-3 align-items-end">
  <div class="col-12 col-md-6 col-xl-4"><label class="form-label" for="pn">Product name</label><input id="pn" class="form-control" type="text" value="${esc(p?.name||'')}" placeholder="e.g. Fresh apples" required maxlength="100"></div>
  <div class="col-12 col-md-6 col-xl-2"><label class="form-label" for="pc">Cost per unit</label><input id="pc" class="form-control" type="number" min="0" step="0.01" value="${p?.cost??''}" placeholder="0.00" required></div>
  <div class="col-12 col-md-6 col-xl-2"><label class="form-label" for="pp">Selling price</label><input id="pp" class="form-control" type="number" min="0" step="0.01" value="${p?.price??''}" placeholder="0.00" required></div>
  <div class="col-12 col-md-6 col-xl-2"><label class="form-label" for="ps">Units in stock</label><input id="ps" class="form-control" type="number" min="0" step="1" value="${p?.stock??0}" required></div>
  <div class="col-12 col-md-6 col-xl-2"><label class="form-label" for="pm">Low-stock threshold</label><input id="pm" class="form-control" type="number" min="0" step="1" value="${p?.min??0}" required></div>
  <div class="col-12 col-md-6 col-xl-3"><button class="btn btn-success w-100" type="submit">${p?'Save changes':'Add product'}</button></div>
 </form></section>
 <section class="card"><div class="card-head"><h2>All products</h2><span class="badge">${rows.length} products</span></div>
  <div class="tw">${rows.length?`<table class="table table-hover align-middle mb-0"><thead><tr><th>Product</th><th class="n">Cost</th><th class="n">Price</th><th class="n">In stock</th><th class="n">Min. stock</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td class="n">${money(x.cost)}</td><td class="n">${money(x.price)}</td><td class="n ${(+x.stock||0)<=(+x.min||0)?'low':''}">${+x.stock||0}</td><td class="n">${+x.min||0}</td><td><div class="inline-actions"><button class="btn btn-sm btn-outline-secondary" type="button" data-a="ed" data-id="${esc(x.id)}">Edit</button><button class="btn btn-sm btn-outline-success" type="button" data-a="re" data-id="${esc(x.id)}">Restock</button><button class="btn btn-sm btn-outline-danger" type="button" data-a="dp" data-id="${esc(x.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Your inventory is empty. Add a product above to begin.</div>'}</div>
 </section>`;
}
function vSales(){
 const r=[...S].reverse(),a=isAdmin();
 return `${pageHead('Sales history','Review completed transactions and track how your market is doing.','Transactions')}
 <section class="card"><div class="card-head"><h2>All sales</h2><span class="badge">${r.length} transactions</span></div>
 <div class="tw">${r.length?`<table class="table table-hover align-middle mb-0"><thead><tr><th>Date</th><th>Product</th><th>By</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th>${a?'<th class="n">Profit</th><th>Action</th>':''}</tr></thead><tbody>${r.map(s=>`<tr><td>${new Date(s.date).toLocaleString()}</td><td><strong>${esc(s.name)}</strong></td><td>${esc(s.by)}</td><td class="n">${s.qty}</td><td class="n">${money(s.price)}</td><td class="n">${money(s.qty*s.price)}</td>${a?`<td class="n ${cls(s.qty*(s.price-s.cost))}">${money(s.qty*(s.price-s.cost))}</td><td><button class="btn btn-sm btn-outline-danger" type="button" data-a="us" data-id="${esc(s.id)}">Undo</button></td>`:''}</tr>`).join('')}</tbody></table>`:'<div class="empty">No sales yet. Completed sales will appear here.</div>'}</div></section>`;
}
// ---------- actions ----------
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 try{
  if(b.id==='xl')return exportXlsx();
 if(b.dataset.t){tab=b.dataset.t;editing=null;return render()}
 if(b.id==='cx'){editing=null;return render()}
 const id=b.dataset.id,a=b.dataset.a;
 if(a==='ed'){editing=id;return render()}
 if(a==='dp'&&confirm('Delete this product? Past sales stay in history.')){await deleteDoc(doc(db,'products',id));toast('Deleted')}
 if(a==='re'){const n=parseInt(prompt('How many units to add?','10'));if(n>0){await updateDoc(doc(db,'products',id),{stock:increment(n)});toast('Restocked')}}
 if(a==='us'&&confirm('Undo this sale and return the stock?')){const s=S.find(x=>x.id===id),w=writeBatch(db);
  if(fp(s.pid))w.update(doc(db,'products',s.pid),{stock:increment(s.qty)});w.delete(doc(db,'sales',id));await w.commit();toast('Sale undone')}
 }catch(err){fail(err)}
});
document.addEventListener('change',e=>{if(e.target.id==='sp')fillPrice()});
function fillPrice(){
 const p=fp($('#sp')?.value),quantity=$('#sq'),stock=$('#sell-stock');
 if(p&&$('#spr'))$('#spr').value=p.price;
 if(p&&quantity){quantity.max=p.stock;quantity.value=Math.min(+quantity.value||1,+p.stock||1)}
 if(p&&stock)stock.textContent=`${p.stock} units available`;
}
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(!(form instanceof HTMLFormElement)||!['pf','sellf'].includes(form.id))return;
 e.preventDefault();
 if(form.dataset.submitting==='true')return;
 form.dataset.submitting='true';
 const submitButton=form.querySelector('[type="submit"]');
 if(submitButton)submitButton.disabled=true;
 document.activeElement?.blur?.();
 try{
  if(form.id==='pf'){
   const o={name:$('#pn').value.trim(),cost:+$('#pc').value,price:+$('#pp').value,stock:Number($('#ps').value),min:Number($('#pm').value)||0};
   if(!o.name||![o.cost,o.price,o.stock,o.min].every(Number.isFinite)||o.cost<0||o.price<0||o.stock<0||o.min<0||!Number.isInteger(o.stock)||!Number.isInteger(o.min))throw new Error('Enter a valid product name, prices and whole-number stock amounts.');
   if(editing)await setDoc(doc(db,'products',editing),o);else await addDoc(collection(db,'products'),o);
   editing=null;toast('Saved');
  }else{
   const pid=$('#sp').value,q=Number($('#sq').value),price=Number($('#spr').value);
   if(!Number.isInteger(q)||q<1)throw new Error('Enter a whole-number quantity greater than zero.');
   if(!Number.isFinite(price)||price<0.01)throw new Error('Enter a valid sale price.');
   await runTransaction(db,async t=>{
    const r=doc(db,'products',pid),s=await t.get(r);
    if(!s.exists())throw new Error('This product is no longer available.');
    const p=s.data(),stock=Number(p.stock)||0;
    if(q>stock)throw new Error('Only '+stock+' left!');
    t.update(r,{stock:increment(-q)});
    t.set(doc(collection(db,'sales')),{pid,name:p.name,qty:q,price,cost:p.cost,date:Date.now(),uid:me.uid,by:me.name});
   });
   toast('Sold '+q+' ✔');
  }
 }catch(err){toast(nice(err))}
 finally{
  delete form.dataset.submitting;
  if(submitButton?.isConnected)submitButton.disabled=false;
 }
});

// ---------- Excel export (admin) ----------
function exportXlsx(){
 const st=stats(),t=totals(st),wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Metric','Value'],['Revenue',t.rev],['Cost of goods sold',t.cogs],['Profit',t.profit],['Units sold',t.sold],['Units left',t.left],['Stock value (cost)',t.val],['Potential profit left',t.pot]]),'Summary');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(st.map(p=>({Product:p.name,'Cost price':p.cost,'Sell price':p.price,'Units sold':p.sold,'Units left':p.stock,Revenue:p.rev,'Cost of sold':p.cogs,Profit:p.profit,'Stock value':p.stock*p.cost}))),'Inventory');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.map(s=>({Date:new Date(s.date).toLocaleString(),Product:s.name,'Sold by':s.by,Quantity:s.qty,'Unit price':s.price,'Unit cost':s.cost,Total:s.qty*s.price,Profit:s.qty*(s.price-s.cost)}))),'Sales');
 XLSX.writeFile(wb,'market-report-'+new Date().toISOString().slice(0,10)+'.xlsx')}
