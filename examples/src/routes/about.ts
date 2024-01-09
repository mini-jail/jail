import html from "space/dom"

export default function About() {
  return html`
    <Portal selector="header nav">
      <a href="/error">hehe</a>
    </Portal>
    <article>
      <h4>
        about
        <sub>(signal? me? idk...)</sub>
      </h4>
      <h5>special thx to:</h5>
      <div>
        <div>inspiration:</div>
        <div>
          <a href="https://github.com/terkelg/facon" target="_blank">facon</a> 
          by <a href="https://github.com/terkelg" target="_blank">Terkel</a>
        </div>
        <div>
          <a href="https://github.com/solidjs/solid" target="_blank">solid</a> 
          by <a href="https://github.com/ryansolid" target="_blank">Ryan Carniato</a>
        </div>
        <div>
          <a href="https://github.com/vuejs" target="_blank">vue</a> 
          by <a href="https://github.com/yyx990803" target="_blank">Evan You</a>
        </div>
        <div>assets:</div>
        <div>
          <a href="https://github.com/TakWolf/ark-pixel-font" target="_blank">ark-pixel-font</a> 
          by <a href="https://github.com/TakWolf" target="_blank">狼人小林 / TakWolf</a>
        </div>
      </div>
    </article>
  `
}
