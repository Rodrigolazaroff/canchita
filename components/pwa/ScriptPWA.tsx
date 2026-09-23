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

// next-pwa genera public/sw.js pero solo inyecta el registro en Pages Router:
// con App Router nunca se registra, y sin service worker Chrome no considera
// instalable la app. Se registra a mano.
const REGISTRO = `
if("serviceWorker" in navigator){
  addEventListener("load",function(){
    navigator.serviceWorker.register("/sw.js").catch(function(){});
  });
}`

// En desarrollo no se registra: el service worker cachea los bundles y pelea
// con el recargado en caliente.
export function ScriptPWA() {
  const codigo = process.env.NODE_ENV === 'production' ? CAPTURA + REGISTRO : CAPTURA
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />
}
