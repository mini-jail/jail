import { template } from "jail/dom"

export default () => {
  return template`
    <article>
      <h4>
        about
        <sub>(signal? me? idk...)</sub>
      </h4>
      <h5>special thx to:</h5>
      <pre>
        inspiration:
        <a href="https://github.com/terkelg/facon" target="_blank">facon</a> by <a href="https://github.com/terkelg" target="_blank">Terkel</a>
        <a href="https://github.com/solidjs/solid" target="_blank">solid</a> by <a href="https://github.com/ryansolid" target="_blank">Ryan Carniato</a>
        <a href="https://github.com/vuejs" target="_blank">vue</a> by <a href="https://github.com/yyx990803" target="_blank">Evan You</a>
        assets:
        <a href="https://github.com/TakWolf/ark-pixel-font" target="_blank">ark-pixel-font</a> by <a href="https://github.com/TakWolf" target="_blank">狼人小林 / TakWolf</a>
      </pre>
    </article>
  `
}
