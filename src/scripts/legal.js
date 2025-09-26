import '../styles/legal.css'

const app = document.querySelector('#terms-app') || document.querySelector('#privacy-app')

if (app) {
  app.innerHTML = `
    <main>
      <h1>Conteúdo em preparação</h1>
      <p>O texto legal desta página será adicionado conforme as diretrizes da LGPD.</p>
    </main>
  `
}
