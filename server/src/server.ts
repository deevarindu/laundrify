import express from "express"
import mainRoute from "./routes/index.js"

const app = express()
const PORT = 3000

app.use(express.json())
app.use('/api', mainRoute)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})