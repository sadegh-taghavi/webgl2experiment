const express = require('express')
const app = express()
const port = 3000

app.use(express.static('./'))

app.get('/', (req, res) => {
  res.send('Test OK')
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})