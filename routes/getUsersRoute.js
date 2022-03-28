const router = require('express').Router()
const mongoose=require("mongoose");
const jwt = require('jsonwebtoken')
const Users = require('../models/userModel')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const config = process.env
const toId = mongoose.Types.ObjectId;

router.get('/', verifyAccessToken, async (req, res) => {
  try{
   const users = await Users.find().exec()
    res.json(users)
  }
  catch(error){
    res.send(error.message)
  }
})

router.get('/profile', verifyAccessToken, async (req, res) => {
  const decodeID = toId(jwt.verify(req.accessToken ,config.ACCESS_TOKEN_SECRET).userId) //this is a userID
  try{
   const user = await Users.findById({_id:decodeID}).populate({path:"groups",populate:{path:"pendingTransactions",populate:{path:"sender receiver", model:"Users"}}})
    .populate({path:"groups",populate:{path:"members", model:"Users"}})
    .populate({path:"groups",populate:{path:"transfers",populate:{path:"sender receiver", model:"Users"}}})
    .populate({path:"groups",populate:{path:"expenses",populate:{path:"sender ", model:"Users"}}})
    res.json(user)
    //console.log(user)
  }
  
  catch(error){
    res.send(error.message)
  }
})


module.exports = router