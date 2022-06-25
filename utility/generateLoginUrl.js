const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const generateLoginUrl = (userId) => {

  const unique = crypto.randomBytes(20).toString('hex')

  const loginUrlToken = jwt.sign(
    {
      userId: userId,
      unique: unique
    },
    process.env.MAGICLINK_SECRET,
    { expiresIn: '30m' }
  )
  return(
    {
      link: `${process.env.FRONT_URL}/s/${loginUrlToken}`,
      unique: unique
    }
  )
}

module.exports = generateLoginUrl
