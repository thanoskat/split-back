const router = require('express').Router()
const jwt = require('jsonwebtoken')
const Users = require('../models/userModel')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const config = process.env

router.get('/', verifyAccessToken, async (req, res) => {
  try{
    users = await Users.find()
    res.json(users)
  }
  catch(error){
    res.send(error.message)
  }
})

module.exports = router