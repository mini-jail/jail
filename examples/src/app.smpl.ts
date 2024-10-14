import { state } from "space/signal"
import { createApp } from "space/smpl"

createApp({
  count: state(0),
  counter: `<div class="counter">{{ count }}</div>`,
}).mount()
