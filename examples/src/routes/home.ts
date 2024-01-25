import html from "space/dom"

export default function Home() {
  return html`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <p>just look at my examples like <a href="/counter">counter</a>.</p>
      <p>
        i tend to create examples like <a href="/sierpinski">sierpinski </a> 
        because i want to test out the performance of my libraries ^^"
      </p>
      <p>btw. this whole page is just an example, lol.</p>
    </article>
  `
}
