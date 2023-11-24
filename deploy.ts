import { app, PORT, router } from "jail/deploy"
app.use(router.routes())
app.use(router.allowedMethods())
await app.listen({ port: PORT })
