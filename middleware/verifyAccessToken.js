const router = require('express').Router()
const jwt = require('jsonwebtoken')
const config = process.env

const verifyAccessToken = (req, res, next) =>{
  if (!req.headers['authorization']) return res.sendStatus(401)
  const authHeader = req.headers['authorization']
  const token = authHeader.split(' ')[1]
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
