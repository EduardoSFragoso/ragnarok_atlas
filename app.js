/* ===== Ragnarök Atlas — app.js (ponto de entrada) =====
   Aplicação de página única em JavaScript puro (sem build): carrega os JSONs da
   pasta data/ via fetch, renderiza as views como strings (padrão *View) e
   injeta o HTML em #content com innerHTML, além de ligar os eventos por
   delegação/onclick após cada render. O tema claro/escuro é salvo no
   localStorage ("ro-atlas-theme") e aplicado como atributo data-theme em
   <html>/<body> (tokens do tema vivem no styles.css).    Os demais scripts ficam em js/ e são carregados antes, na ordem de index.html. */

loadData()
    .then(() => {
        setView("inicio");
    })
    .catch((err) => {
        $("#content").innerHTML =
            `<div class="error-box"><b>Não consegui carregar a biblioteca.</b><br>${esc(err.message)}` +
            `<br>Abra o site por um servidor local ou publique a pasta inteira no GitHub Pages; os arquivos de dados ` +
            `precisam ficar ao lado do site em <code>data/</code>.</div>`;
    });
