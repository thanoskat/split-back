const express = require('express')
const app = express()
const mongoose = require('mongoose')
const config = require('dotenv').config().parsed
// require('dotenv').config()
// const config = process.env
const cors = require('cors')

//Connect To DB
mongoose.connect(
  config.DB_CONNECTION,
  () => console.log('Connected to DB!'))

//Import Routes
const postsRoute = require('./routes/postsRoute')
const authRoute = require('./routes/authRoute')
const getUsersRoute = require('./routes/getUsersRoute')

//Middleware
app.use(cors(
  {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    origin: 'http://localhost:3000'
  }
  ))
app.use(express.json())
app.use('/auth', authRoute)
app.use('/getusers', getUsersRoute)
app.use('/posts', postsRoute)

//ROUTES
app.get('/', (req, res) => {
  res.send('We are on home')
})


//Listening
app.listen(4000, () => console.log('Server running'))
