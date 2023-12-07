import html from "jail/dom"

export default function Component() {
  return html`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <div>
        <p>just look at my examples like <a href="/counter">counter</a>.</p>
        <p>
          i tend to create examples like <a href="/sierpinski">sierpinski</a> 
          because i want to test out the performance of my libraries ^^"
        </p>
        <p>also try out some parameter values for that one!</p>
        <p>> /sierpinski/:target/:size <</p>
        <p><a href="/sierpinski/2000/50">sierpinski/2000/50</a></p>
        <p><a href="/sierpinski/250">sierpinski/250</a></p>
        <p>btw. this whole page is just an example, lol.</p>
      </div>
    </article>
  `
}
