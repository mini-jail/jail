import { template } from "signal/dom"

export default () => {
  return template`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <pre>
        just look at my examples like <a href="#/counter">counter</a>.
        have fun!

        i tend to create examples like <a href="#/sierpinski">sierpinski</a>
        because i want to test out the performance of my libraries ^^"
        also try out some parameter values for that one!
        > #/sierpinski/:target/:size <
        <a href="#/sierpinski/2000/50">sierpinski/2000/50</a> 
        <a href="#/sierpinski/250">sierpinski/250</a>

        btw. this whole page is just an example, lol.
      </pre>
    </article>
  `
}
