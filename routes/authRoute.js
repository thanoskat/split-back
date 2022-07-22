const router = require('express').Router()
const mongoose = require('mongoose')
const userModel = require('../models/userModel')
const sessionModel = require('../models/sessionModel')
const jwt = require('jsonwebtoken')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const generateRefreshToken = require('../utility/generateRefreshToken')
const emailHandler = require('../utility/emailHandler')
const generateMagicLink = require('../utility/generateMagicLink')
const generateSignInConfirmLink = require('../utility/generateSignInConfirmLink')
const generateSignUpConfirmLink = require('../utility/generateSignUpConfirmLink')
const { checkSignIn, checkSignUp } = require('../utility/validators')
const generateAccessToken = require('../utility/generateAccessToken')
const cookie = require('cookie')


router.post('/verify-token', async (req, res) => {

  jwt.verify(req.body.token, process.env.MAGICLINK_SECRET, async (error, decoded) => {
    if (error) {
      if (error.message === 'jwt expired') {
        return res.status(400).send({ message: 'Verification link has expired.' })
      }
      else if (error.message === 'jwt malformed') {
        return res.status(400).send({ message: 'Verification link is invalid. #001' })
      }
      else if (error.message === 'invalid signature') {
        return res.status(400).send({ message: 'Verification link is invalid. #002' })
      }
      else {
        console.log(error.message)
        return res.status(500).send({ message: error.message })
      }
    }

    if (decoded.type === undefined) {
      return res.status(400).send({ message: 'Verification link is invalid. #003' })
    }
    else if (decoded.type === 'sign-in') {
      try {
        if (await sessionModel.countDocuments({ unique: decoded.unique })) {
          return res.status(400).send({ message: 'This link has already been used.' })
        }
        const refreshToken = generateRefreshToken()
        const newSession = new sessionModel({
          refreshToken: refreshToken,
          userId: decoded.userId,
          unique: decoded.unique,
          createdAt: Date.now()
        })
        newSession.save((error, savedSession) => {
          if (error) {
            return res.status(500).send({ message: error._message })
          }
          else {
            return res.status(200).send({ type: 'sign-in' })
          }
        })
      }
      catch (error) {
        return res.status(500).send(error.message)
      }
    }
    else if (decoded.type === 'sign-up') {
      try {
        if (await userModel.countDocuments({ email: decoded.email })) {
          return res.status(400).send({ message: 'There is already an account associated with this email address.' })
        }

        const newUser = new userModel({
          email: decoded.email,
          nickname: decoded.nickname,
          guest: false
        })
        newUser.save((error, savedUser) => {
          if (error) {
            return res.status(400).send({ message: error._message })
          }
          else {
            const refreshToken = generateRefreshToken()
            const newSession = new sessionModel({
              refreshToken: refreshToken,
              userId: savedUser._id,
              unique: decoded.unique,
              createdAt: Date.now()
            })
            newSession.save((error, savedSession) => {
              if (error) {
                return res.status(500).send({ message: error._message })
              }
              else {
                return res.status(200).send({ type: 'sign-up' })
              }
            })
          }
        })
      }
      catch (error) {
        return res.status(500).send({ message: error.message })
      }
    }
    else {
      return res.status(400).send({ message: 'Verification link is invalid. #004' })
    }
  })
})

router.post('/request-sign-up', async (req, res) => {

  try {
    const checkSignUpResult = checkSignUp({
      nickname: req.body.nickname,
      email: req.body.email
    })
    if (Array.isArray(checkSignUpResult)) {
      return res.status(400).send(checkSignUpResult)
    }

    if (await userModel.countDocuments({ email: req.body.email })) {
      return res.status(400).send([
        {
          field: 'email',
          message: 'There is already an account associated with this email address'
        }
      ])
    }

    const { link, unique } = generateSignUpConfirmLink(req.body.email, req.body.nickname)
    emailHandler.sendSignUpVerification(req.body.email, link)

    res.setHeader('Set-Cookie', cookie.serialize(
      'unique',
      unique,
      {
        sameSite: 'Lax',
        httpOnly: true,
        path: '/auth/sign-in',
        expires: new Date(Date.now() + (30 * 24 * 3600000)),
        maxAge: 10 * 24 * 60 * 60 * 1000
      }
    ))
    return res.status(200).send({ message: `A sign up confirmation email has been sent to ${req.body.email}` })
  }
  catch (error) {
    return res.status(500).send({ message: error.message })
  }
})



// router.post('/sendlink', async (req, res) => {
//   try {
//     const userFound = await userModel.findOne({ email: req.body.email }).exec()
//     const magicLink = generateMagicLink(userFound._id.toString())
//     console.log(magicLink)
//     res.send({
//       link: magicLink,
//       message: `An email containing a link has been sent to : ${req.body.email}`
//     })
//   }
//   catch (error) {
//     console.log(error.message)
//     res.send(error.message)
//   }
// })

// router.get('/verifysignin/:token', async (req, res) => {
//   try {
//     const decoded = jwt.verify(req.params.token, process.env.MAGICLINK_SECRET)
//     const refreshToken = generateRefreshToken()

//     const session = new sessionModel({
//       refreshToken: refreshToken,
//       userId: decoded.userId,
//       unique: decoded.unique,
//       createdAt: Date.now()
//     })
//     await session.save()
//   }
//   catch(error) {
//     console.log(error.message)
//   }
// })

router.post('/request-sign-in', async (req, res) => {

  const checkSignInResult = checkSignIn({
    email: req.body.email
  })

  if (Array.isArray(checkSignInResult)) {
    return res.status(400).send(checkSignInResult)
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  const userAgent = req.headers["user-agent"]
  userModel.findOne({ email: req.body.email }, (error, userFound) => {
    if (error) {
      console.log(error._message)
      return res.status(500).send({ message: error._message })
    }
    if (userFound) {
      try {
        const { link, unique } = generateSignInConfirmLink(userFound._id.toString())
        emailHandler.sendSignInLink(req.body.email, link, ip, userAgent)

        res.setHeader('Set-Cookie', cookie.serialize(
          'unique',
          unique,
          {
            sameSite: 'Lax',
            httpOnly: true,
            path: '/auth/sign-in',
            expires: new Date(Date.now() + (30 * 24 * 3600000)),
            maxAge: 10 * 24 * 60 * 60 * 1000
          }
        ))
        return res.sendStatus(200)
      }
      catch (error) {
        return res.status(500).send({ message: error.message })
      }
    }
    else {
      return res.status(401).send({ message: 'No account found associated with this email address.' })
    }
  })

  // try {
  //   const { link, unique } = generateSignInConfirmLink(userFound._id.toString())
  //   emailHandler.sendSignInLink(req.body.email, link, ip, userAgent)

  //   res.setHeader('Set-Cookie', cookie.serialize(
  //     'unique',
  //     unique,
  //     {
  //       sameSite: 'Lax',
  //       httpOnly: true,
  //       path: '/auth/sign-in',
  //       expires: new Date(Date.now() + (30 * 24 * 3600000)),
  //       maxAge: 10 * 24 * 60 * 60 * 1000
  //     }
  //   ))
  //   return res.status(200).send({ link: link })
  // }
  // catch(error) {
  //   console.log(error.message)
  //   return res.status(400).send(error.message)
  // }
})

// router.post('/verify-sign-in-token', async (req, res) => {
//   try {
//     const decoded = jwt.verify(req.body.token, process.env.MAGICLINK_SECRET)

//     const refreshToken = generateRefreshToken()
//     const session = new sessionModel({
//       refreshToken: refreshToken,
//       userId: decoded.userId,
//       unique: decoded.unique,
//       createdAt: Date.now()
//     })
//     await session.save()
//     return res.status(200).send('OK')
//   }
//   catch(error) {
//     return res.status(500).send(error.message)
//   }
// })

router.post('/sign-in', async (req, res) => {
  try {
    if (req.cookies?.unique === undefined) return res.status(400).send({ message: 'Cookie not found. Please try again.' })
    const unique = req.cookies.unique

    //  DO NOT DELETE
    // const session = await sessionModel.findOneAndUpdate({ unique: unique }, { $unset: { unique: unique }}).exec()
    const session = await sessionModel.findOne({ unique: unique }).exec()
    if (!session) return res.status(401).send({ message: 'Click the link in your email before you continue.' })

    const accessToken = generateAccessToken(session.userId)
    const user = await userModel.findById(session.userId).exec()
    if (!user) return res.status(500).send({ message: 'User not found. Authentication failed.' })

    res.setHeader('Set-Cookie', cookie.serialize(
      'refreshToken',
      session.refreshToken,
      {
        sameSite: 'Lax',
        httpOnly: true,
        path: '/auth/refreshtoken',
        expires: new Date(Date.now() + (30 * 24 * 3600000)),
        maxAge: 10 * 24 * 60 * 60 * 1000
      }
    ))

    res.clearCookie('unique', {
      sameSite: 'Lax',
      httpOnly: true,
      path: '/auth/sign-in',
    })

    res.send({
      accessToken: accessToken,
      sessionData: {
        id: session._id,
        userId: user._id,
        userEmail: user.email,
        userNickname: user.nickname
      }
    })
  }
  catch (error) {
    return res.status(500).send({ message: error.message })
  }
})

// router.get('/v/:token', async (req, res) => {
//   try {
//     // Extract user ID from magic link
//     const decoded = jwt.verify(req.params.token, process.env.MAGICLINK_SECRET)

//     // Generate a refresh token
//     const refreshToken = generateRefreshToken()

//     // Create a session and save to DB
//     const session = new sessionModel({
//       refreshToken: refreshToken,
//       userId: decoded.userId,
//       createdAt: Date.now()
//     })
//     await session.save()

//     // Get user info with user id
//     const user = await userModel.findById(decoded.userId)

//     // Generate the short access token
//     const accessToken = generateAccessToken(decoded.userId)

//     // Put refresh token in cookie
//     res.setHeader('Set-Cookie', cookie.serialize(
//       'refreshToken',
//       refreshToken,
//       {
//         sameSite: 'Lax',
//         httpOnly: true,
//         path: '/auth/refreshtoken',
//         expires: new Date(Date.now() + (30 * 24 * 3600000)),
//         maxAge: 10 * 24 * 60 * 60 * 1000
//       }
//     ))

//     console.log(res.header)

//     // Respond with session data and the first access token
//     res.send({
//       accessToken: accessToken,
//       sessionData: {
//         id: session._id.toString(),
//         userId: decoded.userId,
//         userEmail: user.email,
//         userNickname: user.nickname
//       }
//     })
//   }
//   catch (error) {
//     console.log(error.message)
//     res.send(error.message)
//   }
// })

router.get('/refreshtoken', async (req, res) => { //generates new access token
  try {
    // Getting refresh token from httponly cookie.
    const refreshToken = cookie.parse(req.headers.cookie).refreshToken
    if (!refreshToken) return res.status(400).send('Refresh cookie not found.')
    console.log('Refresh token', refreshToken.slice(refreshToken.length - 10))

    // Checking if session exists in db.
    const sessionFound = await sessionModel.findOne({ refreshToken: refreshToken }).exec()
    if (!sessionFound) return res.status(401).send('Session not found.')

    // Checking if session is expired.
    const expInSeconds = (sessionFound.toObject().createdAt.getTime() + process.env.SESSION_TTL_IN_SECONDS * 1000 - Date.now()) / 1000
    console.log(expInSeconds > 0 ? `Session expires in ${Math.trunc(expInSeconds)} seconds` : `Session expired ${Math.trunc(expInSeconds * -1)} seconds ago`)
    if ((sessionFound.toObject().createdAt.getTime() + process.env.SESSION_TTL_IN_SECONDS * 1000) < Date.now()) {
      await sessionModel.findByIdAndDelete(sessionFound.toObject()._id).exec()
      return res.status(401).send('Session is expired.')
    }

    res.setHeader('Set-Cookie', cookie.serialize(
      'refreshToken',
      refreshToken,
      {
        sameSite: 'Lax',
        httpOnly: true,
        path: '/auth/refreshtoken',
        expires: new Date(Date.now() + (30 * 24 * 3600000)),
        maxAge: 10 * 24 * 60 * 60 * 1000
      }
    ))

    // Sending a response with a new access token.
    const newAccessToken = generateAccessToken(sessionFound.userId) //generates new access token
    console.log(`New access token ${newAccessToken.slice(newAccessToken.length - 10)}.`)
    // setTimeout(() => res.send({ newAccessToken: newAccessToken }), 5000)
    // return 200
    return res.send({ newAccessToken: newAccessToken })
  }
  catch (error) {
    // Sending 500 internal error for any other error catched.
    console.log(error.message)
    return res.sendStatus(500)
  }
})

// router.get('/refreshtoken_with_rotation', async (req, res) => { //generates new access token
//   try {
//     // Getting refresh token from httponly cookie.
//     const refreshToken = cookie.parse(req.headers.cookie).refreshToken
//     if (!refreshToken) return res.status(400).send('Refresh cookie not found.')
//     console.log('Old refresh token', refreshToken.slice(refreshToken.length - 10))

//     // Checking if session exists in db.
//     const sessionFound = await sessionModel.findOne({ $or: [{ refreshToken: refreshToken }, { previousRefreshToken: refreshToken }] }).exec()
//     if (!sessionFound) return res.status(401).send('Session not found.')

//     // Checking if refresh token has been used before. 419
//     if (sessionFound.toObject().previousRefreshToken == refreshToken) return res.status(401).send('Refresh token has been used before.')

//     // Checking if refresh token has been revoked.
//     if (sessionFound.toObject().revoked == true) return res.status(401).send('Refresh token has been revoked.')

//     // Checking if session is expired.
//     const expInSeconds = (sessionFound.toObject().createdAt.getTime() + 1440 * 60 * 1000 - Date.now()) / 1000
//     console.log(expInSeconds > 0 ? `Session expires in ${Math.trunc(expInSeconds)} seconds` : `Session expired ${Math.trunc(expInSeconds * -1)} seconds ago`)
//     if ((sessionFound.toObject().createdAt.getTime() + 1440 * 60 * 1000) < Date.now()) {
//       await sessionModel.findByIdAndUpdate(sessionFound.toObject()._id, { revoked: true }).exec()
//       return res.status(401).send('Session is expired.')
//     }

//     const newRefreshToken = generateRefreshToken()
//     await sessionModel.findByIdAndUpdate(sessionFound.toObject()._id, { refreshToken: newRefreshToken, previousRefreshToken: refreshToken }).exec()

//     // Sending a response with a new access token.
//     res.setHeader('Set-Cookie', cookie.serialize(
//       'refreshToken',
//       refreshToken,
//       {
//         sameSite: 'Lax',
//         httpOnly: true,
//         path: '/auth/refreshtoken',
//         expires: new Date(Date.now() + (30 * 24 * 3600000)),
//         maxAge: 10 * 24 * 60 * 60 * 1000
//       }
//     ))

//     const newAccessToken = generateAccessToken(sessionFound.userId) //generates new access token
//     console.log(`\nNew refresh token ${newRefreshToken.slice(newRefreshToken.length - 10)}. New access token ${newAccessToken.slice(newAccessToken.length - 10)}.`)
//     // setTimeout(() => res.send({ newAccessToken: newAccessToken }), 5000)
//     // return 200
//     return res.send({ newAccessToken: newAccessToken })
//   }
//   catch (error) {
//     // Sending 500 internal error for any other error catched.
//     console.log(error.message)
//     return res.sendStatus(500)
//   }
// })

router.post('/signout', verifyAccessToken, async (req, res) => {
  try {
    // TODO check if userid is correct
    // Revoke token instead of deleting
    // await sessionModel.findByIdAndUpdate(mongoose.Types.ObjectId(req.body.sessionID), { revoked: true }).exec()
    await sessionModel.findByIdAndDelete(mongoose.Types.ObjectId(req.body.sessionID)).exec()

    res.clearCookie('refreshToken', {
      sameSite: 'Lax',
      httpOnly: true,
      path: '/auth/refreshtoken',
    })
    res.send('Signed out')
  }
  catch (error) {
    console.log('/signout', error.message)
    res.send('/signout', error.message)
  }
})

router.get('/clearsessions', async (req, res) => {
  try {
    await sessionModel.deleteMany({})
    console.log('Session collection cleared.')
    res.sendStatus(200)
  }
  catch (error) {
    res.send(error)
  }
})

router.get('/clearusers', async (req, res) => {
  try {
    await userModel.deleteMany({})
    console.log('User collection cleared.')
    res.sendStatus(200)
  }
  catch (error) {
    res.send(error)
  }
})

router.get('/getuserinfo', verifyAccessToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.queryUserId)
    res.send({
      nickname: user.nickname,
      id: user._id
    })
  }
  catch (error) {
    console.log(error.message)
  }
})

module.exports = router
