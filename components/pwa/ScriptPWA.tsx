// El navegador tira `beforeinstallprompt` apenas carga la página, casi siempre
// antes de que React hidrate. Si nadie lo agarra en ese momento se pierde y el
// botón de instalar nunca aparece. Por eso va como script inline, no en un
// useEffect: guarda el evento en window hasta que Perfil lo necesite.
const CAPTURA = `
window.__canchitaPWA={evento:null,instalada:false};
addEventListener("beforeinstallprompt",function(e){
  e.preventDefault();
  window.__canchitaPWA.evento=e;
  dispatchEvent(new Event("canchita:pwa"));
});
addEventListener("appinstalled",function(){
  window.__canchitaPWA.evento=null;
  window.__canchitaPWA.instalada=true;
  dispatchEvent(new Event("canchita:pwa"));
});`

// El service worker lo registra next-pwa, así que acá solo va la captura.
export function ScriptPWA() {
  return <script dangerouslySetInnerHTML={{ __html: CAPTURA }} />
}
