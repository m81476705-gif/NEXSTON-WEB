async function serverStatus(){
  try{
    const r=await fetch("/api/server",{cache:"no-store"});
    const s=await r.json();
    const online=!!s.online;
    document.getElementById("statusDot").className="dot "+(online?"on":"off");
    document.getElementById("statusText").textContent=online?"SERVER ONLINE":"SERVER OFFLINE";
    document.getElementById("players").textContent=online?s.players:"0";
    document.getElementById("maxPlayers").textContent=online?s.maxplayers:"--";
    document.getElementById("serverStatus").textContent=online?"ONLINE":"OFFLINE";
    document.getElementById("checked").textContent=online?`${s.hostname || "NEXSTON"} • ${s.gamemode || "ROLEPLAY"}`:"No response from server";
  }catch(e){}
}
serverStatus(); setInterval(serverStatus,5000);

function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function post(url,data){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  return {ok:r.ok,data:await r.json()};
}
document.getElementById("registerForm").onsubmit=async e=>{
  e.preventDefault(); const x=await post("/api/register",formData(e.target));
  document.getElementById("registerMsg").textContent=x.data.error||"Account created!";
  if(x.ok) loadMe();
};
document.getElementById("loginForm").onsubmit=async e=>{
  e.preventDefault(); const x=await post("/api/login",formData(e.target));
  document.getElementById("loginMsg").textContent=x.data.error||"Logged in!";
  if(x.ok) loadMe();
};
document.getElementById("whitelistForm").onsubmit=async e=>{
  e.preventDefault(); const x=await post("/api/whitelist",formData(e.target));
  document.getElementById("wlMsg").textContent=x.data.error||"Application submitted!";
  if(x.ok)e.target.reset();
};
async function loadMe(){
  const r=await fetch("/api/me"); const x=await r.json();
  const a=document.getElementById("account");
  if(!x.loggedIn){a.classList.add("hidden");return}
  a.classList.remove("hidden");
  a.innerHTML=`<h3>Welcome, ${escapeHtml(x.user.username)}</h3>
    <p>${escapeHtml(x.user.email)}</p>
    <p>Whitelist applications: ${x.applications.length}</p>
    <button class="btn" onclick="logout()">LOGOUT</button>`;
}
async function logout(){await fetch("/api/logout",{method:"POST"});loadMe()}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
loadMe();
    
