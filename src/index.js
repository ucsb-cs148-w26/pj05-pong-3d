import express from 'express'

const app = express()

app.get('/', (_req, res) => {
  res.redirect('index.html')
})

app.get('/hello', (req, res) => {
  res.send('hello world from express')
})

export default app
