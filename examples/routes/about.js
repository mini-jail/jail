import { template } from "signal/dom"

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
        <a href="https://github.com/terkelg/facon">facon</a> by <a href="https://github.com/terkelg">Terkel</a>
        <a href="https://github.com/solidjs/solid">solid</a> by <a href="https://github.com/ryansolid">Ryan Carniato</a>
        <a href="https://github.com/vuejs">vue</a> by <a href="https://github.com/yyx990803">Evan You</a>

        assets:
        <a href="https://github.com/TakWolf/ark-pixel-font">ark-pixel-font</a> by <a href="https://github.com/TakWolf">狼人小林 / TakWolf</a>
      </pre>
    </article>
  `
}
