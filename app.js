require('dotenv').config()
const cookieParser = require('cookie-parser')
const express = require('express')
const WsServer = require('ws')
const mongoose = require('mongoose')
const cors = require('cors')

const { createServer } = require('http')
const app = express()
const server = createServer(app)

const { checkExpense } = require('./utility/validators')
const checkExpenseResult = checkExpense({
  split: {
    equal: true,
    contributions: ['a', '']
  },
  splitEqually: false,
  spender: '0123456789abcdef01234567',
  amount: '74.84',
  description: 'train',
  participants: [
    {
      memberId: '0123456789abcdef01234567',
      contributionAmount: 'a'
    }
  ],
  label: '0123456789abcdef01234561'
})
console.log(checkExpenseResult)

// const currency = require('currency.js')

// console.log(currency('12345678908974235793.54', { useVedic: true, separator: ',', decimal: '.', symbol: '€' }).format())
// console.log(currency('', { symbol: '' }).format())

// var twoDecimanRegExp = /^[0-9]*(\.[0-9]{0,2})?$/
// console.log(twoDecimanRegExp.test('00.'))

// const regex = /^[0-9]*\.[0-9]{0,2}$/
// console.log(regex.test('0.'))

const initWs = () => {
  const options = {
    noServer: true
  }
  return newWsServer.Server(options)
}

mongoose.connect(process.env.DB_CONNECTION,() => console.log('Connected to DB!'))

const authRoute = require('./routes/authRoute')
const getUsersRoute = require('./routes/getUsersRoute')
const groupsRoutes = require('./routes/groupsRoutes')
const invitationRoutes = require('./routes/invitationRoute')
const userInfoRoute = require('./routes/userInfoRoute')
const expenseRoute = require('./routes/expenseRoute')

app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  origin: process.env.FRONT_URL
}))
app.use(cookieParser())
app.use(express.json())
app.use('/auth', authRoute)
app.use('/getusers', getUsersRoute)
app.use('/userinfo', userInfoRoute)
app.use('/groups', groupsRoutes)
app.use('/invitation', invitationRoutes)
app.use('/expense', expenseRoute)
app.get('/', (req, res) => {
  res.send('We are on home')
})

app.listen(4000, '0.0.0.0', () => console.log('Server running'))
