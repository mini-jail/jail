import { app, PORT } from "jail/deploy"

await app.listen({ port: PORT })
