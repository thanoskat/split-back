const router = require('express').Router()
const mongoose = require('mongoose')
const userModel = require('../models/userModel')
const sessionModel = require('../models/sessionModel')
const jwt = require('jsonwebtoken')
const config = process.env
const verifyAccessToken = require('../middleware/verifyAccessToken')
const generateRefreshToken = require('../utility/generateRefreshToken')
const generateMagicLink = require('../utility/generateMagicLink')
const generateAccessToken = require('../utility/generateAccessToken')
const cookie = require('cookie')

router.post('/signup', async (req, res) => {
  const user = new userModel({
    nickname: req.body.nickname,
    email: req.body.email
  })

  try {
    const savedUser = await user.save()
    console.log(savedUser)
    res.send(savedUser)
  }
  catch(saveError) {
    jsonError = {}
    for ([k, v] of Object.entries(saveError.errors)){
      jsonError[k] = v.properties.message
    }
    res.status(400).json(jsonError)
  }
})

router.get('/v/:token', async (req, res) => {
  //router is ran when magic link that is sent to user is clicked
  //decodes magic link that was sent, creates session,refresh and access tokens
  //and adds them to user's local storage.
  //access token and refresh token are required for sign in function in AuthenticationContext
  //with this get and post on line 59 verification is over.
  try {
    const decoded = jwt.verify(req.params.token, config.MAGICLINK_SECRET)
    const refreshToken = generateRefreshToken()
    const session = new sessionModel({
      refreshToken: refreshToken,
      userId: decoded.userId,
      createdAt: Date.now()
    })
    await session.save()
    const accessToken = generateAccessToken(decoded.userId)
    res.setHeader('Set-Cookie', cookie.serialize('refreshToken', refreshToken, { httpOnly: true, path: '/auth/refreshtoken' }))
    res.send({ accessToken: accessToken, sessionID: session.toObject()._id.toString() })
    // SAVE IT IN FRONTEND LOCALSTORAGE
  }
  catch(error)
  {
    res.send(error.message)
  }
})

router.post('/sendlink', async (req, res) => {
  try{
    const userFound = await userModel.findOne({ email: req.body.email }).exec()
    const magicLink = generateMagicLink(userFound._id.toString())
    console.log(magicLink)
    res.send("Magic link email sent")
  }
  catch(error){
    console.log(error)
    res.send(error.message)
  }
})

router.get('/refreshtoken', async (req, res) => { //generates new access token
  try{
    // Getting refresh token from httponly cookie.
    const refreshToken = cookie.parse(req.headers.cookie).refreshToken
    if(!refreshToken) return res.status(400).send("Refresh cookie not found.")
    // Checking if session exists in db.
    const sessionFound = await sessionModel.findOne({ refreshToken: refreshToken })
    if(!sessionFound) return res.status(401).send("Session not found.")
    // Checking if refresh token has been revoked.
    if(sessionFound.toObject().revoked == true) return res.status(401).send("Refresh token has been revoked.")
    // Cheching if refresh token has been used before.
    if(sessionFound.toObject().previousRefreshToken == refreshToken) {
      await sessionModel.findByIdAndUpdate(sessionFound.toObject()._id, { revoked: true }).exec()
      return res.status(401).send("Refresh token used twice. Revoking token.")
    }
    // Checking if session is expired.
    if((sessionFound.toObject().createdAt.getTime() + 60 * 60 * 1000) < Date.now()) {
      await sessionModel.findByIdAndUpdate(sessionFound.toObject()._id, { revoked: true }).exec()
      return res.status(401).send("Session is expired.")
    }
    // Sending a response with a new access token.
    const newRefreshToken = generateRefreshToken()
    await sessionModel.findByIdAndUpdate(sessionFound.toObject()._id, { refreshToken: newRefreshToken, previousRefreshToken: refreshToken }).exec()
    res.setHeader('Set-Cookie', cookie.serialize('refreshToken', newRefreshToken, { httpOnly: true, path: '/auth/refreshtoken' }))
    const newAccessToken = generateAccessToken(sessionFound.userId) //generates new access token
    res.send({ accessToken: newAccessToken })
  }
  catch(error){
    // Sending 500 internal error for any other error catched.
    console.dir(error)
    res.sendStatus(500)
  }
})

router.post('/signout', verifyAccessToken, async (req, res) => {
  try {
    // TODO check if userid is correct
    await sessionModel.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.sessionID), { revoked: true }).exec()
    res.setHeader('Set-Cookie', cookie.serialize('refreshToken', ' ', { httpOnly: true, path: '/auth/refreshtoken' }))
    res.send("Signed out")
  }
  catch(error) {
    console.dir(error)
    res.send("Error while signing out")
  }
})

router.get('/clearsessions', async (req, res) => {
  try {
    await sessionModel.deleteMany({})
    console.log("Session collection cleared.")
    res.sendStatus(200)
  }
  catch(error) {
    res.send(error)
  }
})

router.get('/clearusers', async (req, res) => {
  try {
    await userModel.deleteMany({})
    console.log("User collection cleared.")
    res.sendStatus(200)
  }
  catch(error) {
    res.send(error)
  }
})

module.exports = router
