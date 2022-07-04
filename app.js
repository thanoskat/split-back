require('dotenv').config()
const express = require('express')
const WsServer = require('ws')
const mongoose = require('mongoose')
const cors = require('cors')

const { createServer } = require('http')
const app = express()
const server = createServer(app)

const initWs = () => {
  const options = {
    noServer: true
  }
  return newWsServer.Server(options)
}
//Connect To DB
mongoose.connect(
  'mongodb+srv://dbSplitUser:1423qrwe@cluster0.mqehg.mongodb.net/db1?retryWrites=true&w=majority',
  () => console.log('Connected to DB!'))

//Import Routes
const authRoute = require('./routes/authRoute')
const getUsersRoute = require('./routes/getUsersRoute')
const groupsRoutes = require('./routes/groupsRoutes')
const invitationRoutes = require('./routes/invitationRoute')
const userInfoRoute = require('./routes/userInfoRoute')
const expenseRoute = require('./routes/expenseRoute')


//Middleware
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  origin: process.env.FRONT_URL
}))
app.use(express.json())
app.use('/auth', authRoute)
app.use('/getusers', getUsersRoute)
app.use('/userinfo', userInfoRoute)
app.use('/groups', groupsRoutes)
app.use('/invitation', invitationRoutes)
app.use('/expense', expenseRoute)

//ROUTES
app.get('/', (req, res) => {
  res.send('We are on home')
})

app.listen(4000, () => console.log('Server running'))
