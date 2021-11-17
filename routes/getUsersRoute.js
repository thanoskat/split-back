const router = require('express').Router()
const mongoose=require("mongoose");
const jwt = require('jsonwebtoken')
const Users = require('../models/userModel')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const config = process.env
const toId = mongoose.Types.ObjectId;

router.get('/', verifyAccessToken, async (req, res) => {
  try{
   const users = await Users.find()
    res.json(users)
  }
  catch(error){
    res.send(error.message)
  }
})

router.get('/profile', verifyAccessToken, async (req, res) => {

  const authHeader = req.headers['authorization']
  const token = authHeader.split(' ')[1]
  const decodeID = toId(jwt.verify(token,config.ACCESS_TOKEN_SECRET).userId)

  try{
   const user = await Users.findById({_id:decodeID})
   console.log(user)
    res.json(user)
  }
  catch(error){
    res.send(error.message)
  }
})


module.exports = router