const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const generateSignUpConfirmLink = (email, nickname) => {

  const unique = crypto.randomBytes(20).toString('hex')

  const signUpToken = jwt.sign(
    {
      type: 'sign-up',
      email: email,
      nickname: nickname,
      unique: unique
    },
    process.env.MAGICLINK_SECRET,
    { expiresIn: '30m' }
  )

  return(
    {
      link: `${process.env.FRONT_URL}/s/${signUpToken}`,
      unique: unique
    }
  )
}

module.exports = generateSignUpConfirmLink
