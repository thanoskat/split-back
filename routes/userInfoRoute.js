const router = require('express').Router()
const mongoose=require("mongoose");
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const toId = mongoose.Types.ObjectId;

router.get('/:userid', verifyAccessToken, async (req, res) => {
  try {
    const user = await userModel.findById(toId(req.params.userid))
    // console.log(user)
    res.json(user)
  }
  catch(error) {
    res.send(error)
  }
})

module.exports = router
