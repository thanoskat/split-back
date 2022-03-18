const router = require('express').Router()
const jwt = require('jsonwebtoken')
const config = process.env
const cookie = require('cookie')

const verifyAccessToken = (req, res, next) =>{
  if (!req.headers['authorization']) return res.sendStatus(401)
  const authHeader = req.headers['authorization']
  const token = authHeader.split(' ')[1]
  const expInSeconds = jwt.decode(token).exp - Date.now()/1000
  // Dont delete
  // const tokenHash = token.slice(token.length - 10)
  // console.log(`Access token ${tokenHash} ${expInSeconds > 0 ? `expires in ${Math.trunc(expInSeconds)} seconds`: `expired ${Math.trunc(expInSeconds)*-1} seconds ago`}.`)
  try {
    const userId = jwt.verify(token, config.ACCESS_TOKEN_SECRET).userId
    req.accessToken = token
    req.queryUserId = userId
    next()
  }
  catch(error) {
    if(error.name == "TokenExpiredError"){
      res.status(401).send("TokenExpiredError!!")
    }
    else{
      res.status(401).send(error.message)
    }
  }
}

module.exports = verifyAccessToken
