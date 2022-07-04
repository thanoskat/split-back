const jwt = require('jsonwebtoken')

const generateMagicLink = (userId) =>
{
  const appUrl = process.env.FRONT_URL
  const magicLinkToken = jwt.sign(
    { userId: userId },
    process.env.MAGICLINK_SECRET,
    { expiresIn: '30m' }
  )
  return `${appUrl}/v/${magicLinkToken}`
}

module.exports = generateMagicLink
