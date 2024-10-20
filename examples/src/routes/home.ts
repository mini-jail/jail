import { Anchor, Page, Paragraph } from "../components/mod.ts"

export default function Home() {
  return Page({ title: "welcome home!", description: "(sucker)" })
    .add(
      Paragraph`
        just look at my examples like ${Anchor("/counter", "counter")}.
      `,
      Paragraph`
        i tend to create examples like ${Anchor("/sierpinski", "sierpinski")}
        because i want to test out the performance of my libraries ^^"
      `,
      Paragraph`btw. this whole page is just an example, lol.`,
    )
}
