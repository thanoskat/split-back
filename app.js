const express = require('express')
const app = express()
const mongoose = require('mongoose')
const config = require('dotenv').config().parsed
const cors = require('cors')
// comment added

//Connect To DB
mongoose.connect(
  config.DB_CONNECTION,
  () => console.log('Connected to DB!'))

//Import Routes
const authRoute = require('./routes/authRoute')
const getUsersRoute = require('./routes/getUsersRoute')
const groupsRoutes = require('./routes/groupsRoutes')
const userInfoRoute = require('./routes/userInfoRoute')
const expenseRoute = require('./routes/expenseRoute')

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
app.use('/userinfo', userInfoRoute)
app.use('/groups', groupsRoutes)
app.use('/expense', expenseRoute)

//ROUTES
app.get('/', (req, res) => {
  res.send('We are on home')
})


//Listening
app.listen(4000, () => console.log('Server running'))
