
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.76.1/+esm";

const cfg = window.MAKEIT_CONFIG || {};
const missing = !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const supabase = missing ? null : createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const app = document.querySelector("#app");

const state = {
  user:null,
  goals:[],
  plan:null,
  allocations:[],
  month:"2026-10-01",
  monthOpen:false,
  purchase:null,
  authMode:"login",
  message:""
};

const months = [
  ["2026-10-01","Octubre 2026"],
  ["2026-11-01","Noviembre 2026"]
];

const fmt = n => "$" + Math.round(Number(n || 0)).toLocaleString("es-AR");
const monthName = v => months.find(x => x[0] === v)?.[1] || v;
const pri = p => ({protected:"Protegida",high:"Alta",medium:"Media",low:"Baja"})[p] || p;
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const route = () => location.hash.replace("#","") || (state.user ? "/home" : "/login");
const nav = p => { location.hash = p; };

function goalStyle(g){
  const n=(g.name||"").toLowerCase();
  if(n.includes("jap")||n.includes("viaj")) return ["✈️","sky"];
  if(n.includes("auto")) return ["🚗","lime"];
  if(g.priority==="protected"||n.includes("reti")||n.includes("jubil")) return ["🌱","violet"];
  return ["🎯","orange"];
}

function currentContrib(g){
  return Number(state.allocations.find(a=>a.goal_id===g.id)?.planned_contribution ?? g.planned_contribution ?? 0);
}

function currentActual(g){
  const a=state.allocations.find(a=>a.goal_id===g.id);
  return a && Number(a.actual_contribution)>0 ? Number(a.actual_contribution) : currentContrib(g);
}

function totals(){
  const available=Number(state.plan?.available_to_distribute || 0);
  const planned=state.goals.reduce((s,g)=>s+currentContrib(g),0);
  return {available,planned,extras:Math.max(0,available-planned)};
}

async function load(){
  if(!state.user) return;
  const uid=state.user.id;

  const [g,p]=await Promise.all([
    supabase.from("goals").select("*").eq("user_id",uid).order("created_at",{ascending:true}),
    supabase.from("monthly_plans").select("*").eq("user_id",uid).eq("month",state.month).maybeSingle()
  ]);

  if(g.error) console.error(g.error);
  if(p.error) console.error(p.error);

  state.goals=g.data || [];
  state.plan=p.data || null;

  if(state.plan){
    const a=await supabase
      .from("monthly_goal_allocations")
      .select("*")
      .eq("user_id",uid)
      .eq("monthly_plan_id",state.plan.id);
    state.allocations=a.data || [];
  } else {
    state.allocations=[];
  }
}

async function init(){
  if(missing) return renderMissing();

  const s=await supabase.auth.getSession();
  state.user=s.data.session?.user || null;

  supabase.auth.onAuthStateChange((_event,session)=>{
    state.user=session?.user || null;
    if(!state.user){
      state.goals=[]; state.plan=null; state.allocations=[];
      nav("/login");
    }
    render();
  });

  if(state.user) await load();

  window.addEventListener("hashchange",async()=>{
    if(state.user) await load();
    render();
  });

  render();
}

function renderMissing(){
  app.innerHTML=`
  <div class="auth">
    <div class="authbox">
      <h1 class="brand">Make It.</h1>
      <div class="authcard stack">
        <h2>Falta conectar Supabase</h2>
        <p class="hint">Abrí <strong>config.js</strong> y pegá tu <strong>Publishable key / anon public key</strong>.</p>
        <p class="error">No uses service_role ni una secret key.</p>
      </div>
    </div>
  </div>`;
}

function render(){
  if(missing) return renderMissing();
  if(!state.user) return auth();

  const r=route();
  if(r==="/home") return home();
  if(r==="/goal/new") return newGoal();
  if(r.startsWith("/goal/")) return goalDetail(r.split("/")[2]);
  if(r==="/purchase") return purchase();
  if(r==="/adjustment") return adjustment();
  if(r==="/impact") return impact();

  nav("/home");
}

function auth(){
  app.innerHTML=`
  <div class="auth">
    <div class="authbox">
      <h1 class="brand">Make It.</h1>
      <p style="font-size:20px;color:var(--muted)">Entendé qué cambia una decisión de hoy en tus planes de mañana.</p>
      <div class="authcard stack">
        <div class="tabs">
          <button id="loginTab" class="${state.authMode==="login"?"active":""}">Ingresar</button>
          <button id="signupTab" class="${state.authMode==="signup"?"active":""}">Crear cuenta</button>
        </div>

        <form id="authForm" class="stack">
          <div class="field">
            <label for="email">Email</label>
            <input class="input" id="email" type="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input class="input" id="password" type="password" minlength="6" required>
          </div>
          ${state.message ? `<p class="${state.message.startsWith("✓")?"success":"error"}">${esc(state.message)}</p>` : ""}
          <button class="primary">${state.authMode==="login"?"Ingresar":"Crear cuenta"}</button>
        </form>
      </div>
    </div>
  </div>`;

  document.querySelector("#loginTab").onclick=()=>{
    state.authMode="login"; state.message=""; auth();
  };
  document.querySelector("#signupTab").onclick=()=>{
    state.authMode="signup"; state.message=""; auth();
  };

  document.querySelector("#authForm").onsubmit=async e=>{
    e.preventDefault();
    const email=document.querySelector("#email").value.trim();
    const password=document.querySelector("#password").value;

    const res=state.authMode==="signup"
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password});

    if(res.error){
      state.message=res.error.message;
      return auth();
    }

    if(state.authMode==="signup" && !res.data.session){
      state.message="✓ Cuenta creada. Confirmá tu email si Supabase lo requiere.";
      return auth();
    }

    state.user=res.data.user || res.data.session?.user;
    await load();
    nav("/home");
  };
}

function allocation(){
  const {available,extras}=totals();
  if(!available) return "";

  const palette=["var(--violet)","var(--sky)","var(--lime)","var(--orange)"];
  const items=[
    ...state.goals.map((g,i)=>({name:g.name,amount:currentContrib(g),color:palette[i%palette.length]})),
    {name:"Ahorro libre",amount:extras,color:"stripes"}
  ];

  return `
    <div class="bar">
      ${items.map(x=>`
        <span class="${x.color==="stripes"?"stripes":""}"
              style="width:${Math.max(.8,(x.amount/available)*100)}%;${x.color!=="stripes"?`background:${x.color}`:""}"></span>
      `).join("")}
    </div>
    <div class="legend">
      ${items.map(x=>`
        <div class="legendrow">
          <span>${esc(x.name)}</span>
          <strong>${fmt(x.amount)}</strong>
        </div>
      `).join("")}
    </div>`;
}

function home(){
  const {available,extras}=totals();

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="ghost" id="monthBtn">${monthName(state.month)} ▾</button>
        <button class="iconbtn" id="logout" aria-label="Cerrar sesión">⎋</button>
      </div>

      <p class="hero">Este mes tenés</p>
      <div class="money">${fmt(available)}</div>
      <p class="hint">disponibles para distribuir</p>

      ${state.plan ? allocation() : ""}

      ${state.plan ? `
        <div class="card summary" style="margin-top:14px">
          <div>
            <strong style="font-size:15px">Ahorro libre</strong>
            <p class="hint">Lo que queda después de tus metas</p>
          </div>
          <strong>${fmt(extras)}</strong>
        </div>` : ""}
    </section>

    <section class="section stack">
      ${!state.plan ? planSetup() : `
        <div class="top">
          <span class="eyebrow">Tus metas</span>
          <button class="ghost" id="newGoal">＋ Nueva meta</button>
        </div>
        ${state.goals.map(goalCard).join("") || `
          <div class="card">
            <h3>Creá tu primera meta</h3>
            <p class="hint">Definí para qué estás ahorrando y cuánto querés aportar.</p>
          </div>`}
      `}
    </section>

    ${state.plan ? `
      <div class="footer">
        <button class="primary" id="purchaseBtn">Evaluar una compra</button>
      </div>` : ""}

    ${state.monthOpen ? monthSheet() : ""}
  </div>`;

  document.querySelector("#logout").onclick=()=>supabase.auth.signOut();
  document.querySelector("#monthBtn").onclick=()=>{state.monthOpen=true;home();};
  document.querySelector("#newGoal")?.addEventListener("click",()=>nav("/goal/new"));
  document.querySelector("#purchaseBtn")?.addEventListener("click",()=>nav("/purchase"));
  document.querySelector("#planForm")?.addEventListener("submit",savePlan);
  document.querySelectorAll("[data-goal]").forEach(x=>x.onclick=()=>nav(`/goal/${x.dataset.goal}`));
  document.querySelectorAll("[data-month]").forEach(x=>x.onclick=()=>changeMonth(x.dataset.month));
  document.querySelector("#closeSheet")?.addEventListener("click",()=>{state.monthOpen=false;home();});
}

function planSetup(){
  return `
  <div class="card">
    <h2>Prepará ${monthName(state.month).toLowerCase()}</h2>
    <p class="hint">Ingresá lo que te queda después de cubrir lo necesario. Lo podés distribuir entre tus metas y gastos extra.</p>

    <form id="planForm" class="stack" style="margin-top:14px">
      <div class="field">
        <label for="available">Disponible para distribuir este mes</label>
        <input class="input" id="available" type="number" min="0" step="1000" required placeholder="900000">
      </div>
      <button class="primary">Guardar mes</button>
    </form>
  </div>`;
}

async function savePlan(e){
  e.preventDefault();

  const amount=Number(document.querySelector("#available").value);

  const res=await supabase
    .from("monthly_plans")
    .insert({
      user_id:state.user.id,
      month:state.month,
      available_to_distribute:amount
    })
    .select()
    .single();

  if(res.error) return alert(res.error.message);

  state.plan=res.data;

  if(state.goals.length){
    await supabase.from("monthly_goal_allocations").insert(
      state.goals.map(g=>({
        user_id:state.user.id,
        monthly_plan_id:state.plan.id,
        goal_id:g.id,
        planned_contribution:Number(g.planned_contribution||0),
        actual_contribution:0
      }))
    );
  }

  await load();
  home();
}

function goalCard(g){
  const [emo,tone]=goalStyle(g);
  const pct=Math.min(100,Math.round(Number(g.saved_amount||0)/Number(g.target_amount||1)*100));

  return `
  <button class="card goal ${tone}" data-goal="${g.id}">
    <div class="goaltop">
      <div class="title">${emo} ${esc(g.name)}</div>
      <span class="tag">${pri(g.priority)}</span>
    </div>

    <div class="progress"><span style="width:${pct}%"></span></div>

    <div class="meta">
      <span>${fmt(g.saved_amount)} de ${fmt(g.target_amount)}</span>
      <strong>${pct}%</strong>
    </div>

    <div class="meta" style="margin-top:8px">
      <span>${fmt(currentContrib(g))}/mes</span>
      <span>${esc(g.target_date)}</span>
    </div>
  </button>`;
}

function monthSheet(){
  return `
  <div class="sheetback">
    <div class="sheet">
      <h2>Elegí el mes</h2>
      ${months.map(m=>`
        <button data-month="${m[0]}">${m[0]===state.month?"✓ ":""}${m[1]}</button>
      `).join("")}
      <button id="closeSheet" style="margin-top:12px;border-radius:18px">Cerrar</button>
    </div>
  </div>`;
}

async function changeMonth(m){
  state.month=m;
  state.monthOpen=false;
  await load();

  if(!state.plan && m==="2026-11-01") return newMonth();
  home();
}

function newMonth(){
  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="backHome">←</button>
        <span class="eyebrow">Noviembre 2026</span>
      </div>
      <h1 class="hero">Todavía no configuraste <strong>noviembre.</strong></h1>
    </section>

    <section class="section stack">
      <div class="notice">
        Podés usar octubre como punto de partida. Se copian los aportes previstos, no las compras ni decisiones anteriores.
      </div>
      <button class="primary" id="copyOct">Usar octubre como base</button>
      <button class="secondary" id="fresh">Configurar desde cero</button>
    </section>
  </div>`;

  document.querySelector("#backHome").onclick=async()=>{
    state.month="2026-10-01";
    await load();
    home();
  };

  document.querySelector("#fresh").onclick=()=>home();
  document.querySelector("#copyOct").onclick=copyOctober;
}

async function copyOctober(){
  const uid=state.user.id;

  const oct=await supabase
    .from("monthly_plans")
    .select("*")
    .eq("user_id",uid)
    .eq("month","2026-10-01")
    .maybeSingle();

  if(!oct.data) return alert("No hay un plan de octubre para copiar.");

  const np=await supabase
    .from("monthly_plans")
    .insert({
      user_id:uid,
      month:"2026-11-01",
      available_to_distribute:oct.data.available_to_distribute
    })
    .select()
    .single();

  if(np.error) return alert(np.error.message);

  const oa=await supabase
    .from("monthly_goal_allocations")
    .select("*")
    .eq("user_id",uid)
    .eq("monthly_plan_id",oct.data.id);

  const map=new Map((oa.data||[]).map(a=>[a.goal_id,a.planned_contribution]));

  if(state.goals.length){
    await supabase.from("monthly_goal_allocations").insert(
      state.goals.map(g=>({
        user_id:uid,
        monthly_plan_id:np.data.id,
        goal_id:g.id,
        planned_contribution:Number(map.get(g.id) ?? g.planned_contribution ?? 0),
        actual_contribution:0
      }))
    );
  }

  await load();
  home();
}

function newGoal(){
  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="closeGoal">×</button>
        <span class="eyebrow">Nueva meta</span>
      </div>
      <h1 class="hero">¿Qué querés <strong>alcanzar?</strong></h1>
    </section>

    <form id="goalForm">
      <section class="section stack">
        <div class="field">
          <label for="gname">Nombre</label>
          <input class="input" id="gname" required placeholder="Viaje a Japón">
        </div>

        <div class="field">
          <label for="gtarget">Objetivo</label>
          <input class="input" id="gtarget" type="number" min="1" step="1000" required>
        </div>

        <div class="field">
          <label for="gdate">Fecha objetivo</label>
          <input class="input" id="gdate" type="date" required>
        </div>

        <div class="field">
          <label for="gsaved">Ya ahorrado</label>
          <input class="input" id="gsaved" type="number" min="0" step="1000" value="0">
        </div>

        <div class="stack" id="priorities">
          ${choice("protected","Protegida","Quiero preservar este aporte todos los meses.")}
          ${choice("high","Alta","Es una de mis metas principales.")}
          ${choice("medium","Media","Quiero seguir avanzando, pero tiene cierta flexibilidad.",true)}
          ${choice("low","Baja","Puede reducirse o pausarse antes que otras metas.")}
        </div>

        <div class="field">
          <label for="gcontrib">Aporte previsto por mes</label>
          <input class="input" id="gcontrib" type="number" min="0" step="1000" required>
        </div>
      </section>

      <div class="footer">
        <button class="primary">Guardar meta</button>
      </div>
    </form>
  </div>`;

  document.querySelector("#closeGoal").onclick=()=>nav("/home");

  document.querySelectorAll("[data-priority]").forEach(x=>{
    x.onclick=()=>{
      document.querySelectorAll("[data-priority]").forEach(y=>y.classList.remove("selected"));
      x.classList.add("selected");
    };
  });

  document.querySelector("#goalForm").onsubmit=saveGoal;
}

function choice(v,t,c,s=false){
  return `
  <button type="button" class="choice ${s?"selected":""}" data-priority="${v}">
    <strong>${t}</strong>
    <div class="hint">${c}</div>
  </button>`;
}

async function saveGoal(e){
  e.preventDefault();

  const p=document.querySelector("[data-priority].selected")?.dataset.priority || "medium";

  const payload={
    user_id:state.user.id,
    name:document.querySelector("#gname").value.trim(),
    target_amount:Number(document.querySelector("#gtarget").value),
    saved_amount:Number(document.querySelector("#gsaved").value || 0),
    target_date:document.querySelector("#gdate").value,
    priority:p,
    planned_contribution:Number(document.querySelector("#gcontrib").value || 0)
  };

  const r=await supabase.from("goals").insert(payload).select().single();
  if(r.error) return alert(r.error.message);

  if(state.plan){
    await supabase.from("monthly_goal_allocations").insert({
      user_id:state.user.id,
      monthly_plan_id:state.plan.id,
      goal_id:r.data.id,
      planned_contribution:payload.planned_contribution,
      actual_contribution:0
    });
  }

  await load();
  nav("/home");
}

function goalDetail(id){
  const g=state.goals.find(x=>x.id===id);
  if(!g) return nav("/home");

  const [emo,tone]=goalStyle(g);
  const pct=Math.min(100,Math.round(Number(g.saved_amount)/Number(g.target_amount||1)*100));

  app.innerHTML=`
  <div class="phone">
    <div class="detail ${tone}">
      <div class="detailbody">
        <div class="top">
          <button class="iconbtn" id="detailBack">←</button>
          <span class="tag">${pri(g.priority)}</span>
        </div>

        <div style="font-size:44px;margin-top:18px">${emo}</div>
        <h1 class="detailname">${esc(g.name)}</h1>

        <p>Ahorrado</p>
        <div class="money">${fmt(g.saved_amount)}</div>
        <p>de ${fmt(g.target_amount)}</p>

        <div class="progress"><span style="width:${pct}%"></span></div>
        <div class="meta">
          <span>${pct}% ahorrado</span>
          <span>te faltan ${fmt(Number(g.target_amount)-Number(g.saved_amount))}</span>
        </div>

        <div style="margin-top:28px">
          <span class="eyebrow">Plan</span>
          <div class="metric">
            <span>Fecha objetivo</span>
            <strong>${esc(g.target_date)}</strong>
          </div>
          <div class="metric">
            <span>Aporte previsto</span>
            <strong>${fmt(currentContrib(g))}/mes</strong>
          </div>
          <div class="metric">
            <span>Aporte de este mes</span>
            <strong>${fmt(currentActual(g))}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  document.querySelector("#detailBack").onclick=()=>nav("/home");
}

function purchase(){
  if(!state.plan) return nav("/home");

  const {extras}=totals();

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="purchaseBack">←</button>
        <span class="eyebrow">Evaluar una compra</span>
      </div>
      <h1 class="hero">¿Qué querés <strong>comprar?</strong></h1>
    </section>

    <form id="purchaseForm">
      <section class="section stack">
        <div class="field">
          <label for="pname">Compra</label>
          <input class="input" id="pname" required placeholder="Carrito de Shein">
        </div>

        <div class="field">
          <label for="pamount">¿Cuánto cuesta?</label>
          <input class="input" id="pamount" type="number" min="1" step="1000" required>
        </div>

        <div class="card summary">
          <span>Ahorro libre</span>
          <strong>${fmt(extras)}</strong>
        </div>

        <p class="hint">Es una simulación. Nada cambia hasta que confirmes.</p>
      </section>

      <div class="footer">
        <button class="primary">Ver ajuste sugerido</button>
      </div>
    </form>
  </div>`;

  document.querySelector("#purchaseBack").onclick=()=>nav("/home");

  document.querySelector("#purchaseForm").onsubmit=e=>{
    e.preventDefault();

    const amount=Number(document.querySelector("#pamount").value);
    const name=document.querySelector("#pname").value.trim();
    const diff=Math.max(0,amount-extras);

    state.purchase={
      name,
      amount,
      extras,
      diff,
      suggestion:suggest(diff)
    };

    nav("/adjustment");
  };
}

function suggest(diff){
  let remaining=diff;
  const rank={low:0,medium:1,high:2,protected:99};
  const reds=[];

  for(const g of state.goals
    .filter(g=>g.priority!=="protected")
    .sort((a,b)=>rank[a.priority]-rank[b.priority])){

    if(remaining<=0) break;

    const planned=currentContrib(g);
    const red=Math.min(planned,remaining);

    if(red>0){
      reds.push({
        goalId:g.id,
        planned,
        reduction:red,
        after:planned-red
      });
      remaining-=red;
    }
  }

  return {reds,uncovered:Math.max(0,remaining)};
}

function adjustment(){
  const p=state.purchase;
  if(!p) return nav("/purchase");
  if(p.diff<=0) return fits();

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="adjBack">←</button>
        <span class="eyebrow">Ajuste sugerido</span>
      </div>
      <h1 class="hero">Hay <strong>${fmt(p.diff)}</strong> por cubrir.</h1>
    </section>

    <section class="section stack">
      <div class="result">
        <div class="metric"><span>${esc(p.name)}</span><strong>${fmt(p.amount)}</strong></div>
        <div class="metric"><span>Ahorro libre</span><strong>${fmt(p.extras)}</strong></div>
        <div class="metric"><span>Diferencia a cubrir</span><strong>${fmt(p.diff)}</strong></div>
      </div>

      <div>
        <span class="eyebrow">Ajuste sugerido según tus prioridades</span>
        <p class="hint" style="margin-top:6px">Primero se ajustan las metas menos prioritarias. Las protegidas nunca participan.</p>
      </div>

      ${state.goals.map(g=>adjRow(g,p)).join("")}

      ${p.suggestion.uncovered ? `
        <div class="notice">
          <strong>No alcanza con las metas flexibles.</strong>
          Quedan ${fmt(p.suggestion.uncovered)} sin cubrir.
        </div>` : ""}

      <p class="hint">Esto es una sugerencia. Nada cambia hasta confirmar.</p>
    </section>

    <div class="footer stack">
      <button class="primary" id="accept" ${p.suggestion.uncovered?"disabled":""}>Aceptar ajuste sugerido</button>
      <button class="secondary" id="noBuy">No comprar ahora</button>
    </div>
  </div>`;

  document.querySelector("#adjBack").onclick=()=>nav("/purchase");
  document.querySelector("#accept").onclick=()=>nav("/impact");
  document.querySelector("#noBuy").onclick=()=>saveDecision("not_now");
}

function adjRow(g,p){
  const r=p.suggestion.reds.find(x=>x.goalId===g.id);
  const planned=currentContrib(g);

  if(g.priority==="protected"){
    return `
    <div class="adjust disabled">
      <div class="adjustmain">
        <div>
          <strong>${esc(g.name)} · Protegida</strong>
          <div class="hint">No participa del ajuste.</div>
        </div>
        <span class="delta">Sin cambios</span>
      </div>
    </div>`;
  }

  if(!r){
    return `
    <div class="adjust">
      <div class="adjustmain">
        <div>
          <strong>${esc(g.name)} · ${pri(g.priority)}</strong>
          <div class="hint">${fmt(planned)} previstos</div>
        </div>
        <span class="delta">Sin cambios</span>
      </div>
    </div>`;
  }

  return `
  <div class="adjust">
    <div class="adjustmain">
      <div>
        <strong>${esc(g.name)} · ${pri(g.priority)}</strong>
        <div class="hint">${fmt(planned)} → ${fmt(r.after)}</div>
      </div>
      <span class="delta">−${fmt(r.reduction)}</span>
    </div>
  </div>`;
}

function fits(){
  const p=state.purchase;

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="fitBack">←</button>
        <span class="eyebrow">Resultado</span>
      </div>
      <h1 class="hero">Esta compra <strong>entra en tu ahorro libre.</strong></h1>
    </section>

    <section class="section">
      <div class="result" style="background:var(--lime)">
        <h2>Tu plan de metas no necesita cambiar.</h2>
        <p>Después te quedarían <strong>${fmt(Math.max(0,p.extras-p.amount))}</strong>.</p>
      </div>
    </section>

    <div class="footer stack">
      <button class="primary" id="fitBuy">Registrar compra</button>
      <button class="secondary" id="fitNo">No comprar ahora</button>
    </div>
  </div>`;

  document.querySelector("#fitBack").onclick=()=>nav("/purchase");
  document.querySelector("#fitBuy").onclick=()=>saveDecision("buy");
  document.querySelector("#fitNo").onclick=()=>saveDecision("not_now");
}

function impact(){
  const p=state.purchase;
  if(!p) return nav("/purchase");

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <div class="top">
        <button class="iconbtn" id="impactBack">←</button>
        <span class="eyebrow">Impacto</span>
      </div>
      <h1 class="hero">Si elegís este ajuste, <strong>esto cambiaría.</strong></h1>
    </section>

    <section class="section stack">
      ${p.suggestion.reds.map(r=>{
        const g=state.goals.find(x=>x.id===r.goalId);
        const days=r.planned ? Math.round(r.reduction/r.planned*30) : 0;

        return `
        <div class="result">
          <h3>${esc(g.name)}</h3>
          <div class="metric"><span>Aporte previsto</span><strong>${fmt(r.planned)}</strong></div>
          <div class="metric"><span>Con este ajuste</span><strong>${fmt(r.after)}</strong></div>
          <div class="metric"><span>Impacto temporal aprox.</span><strong>+${days} días</strong></div>
        </div>`;
      }).join("")}

      <p class="hint">La proyección temporal es estimativa para este MVP.</p>
    </section>

    <div class="footer stack">
      <button class="primary" id="confirmBuy">Comprar con este ajuste</button>
      <button class="secondary" id="impactNo">No comprar ahora</button>
    </div>
  </div>`;

  document.querySelector("#impactBack").onclick=()=>nav("/adjustment");
  document.querySelector("#confirmBuy").onclick=()=>saveDecision("buy");
  document.querySelector("#impactNo").onclick=()=>saveDecision("not_now");
}

async function saveDecision(decision){
  const p=state.purchase;

  const r=await supabase.from("purchase_decisions").insert({
    user_id:state.user.id,
    monthly_plan_id:state.plan?.id || null,
    purchase_name:p.name,
    purchase_amount:p.amount,
    available_extras:p.extras,
    difference_to_cover:p.diff,
    decision
  });

  if(r.error) return alert(r.error.message);

  if(decision==="buy" && state.plan){
    for(const red of p.suggestion?.reds || []){
      const a=state.allocations.find(x=>x.goal_id===red.goalId);
      if(a){
        await supabase
          .from("monthly_goal_allocations")
          .update({actual_contribution:red.after})
          .eq("id",a.id);
      }
    }
  }

  state.purchase=null;
  await load();

  app.innerHTML=`
  <div class="phone">
    <section class="header">
      <h1 class="hero">${decision==="buy"?"Decisión guardada.":"Nada cambió en tus metas."}</h1>
    </section>

    <section class="section">
      <div class="result">
        <p>${decision==="buy"
          ?"Actualizamos el aporte de este mes según el ajuste confirmado."
          :"Tus aportes previstos siguen igual."}</p>
      </div>
    </section>

    <div class="footer">
      <button class="primary" id="backSummary">Volver al inicio</button>
    </div>
  </div>`;

  document.querySelector("#backSummary").onclick=()=>nav("/home");
}

init();
