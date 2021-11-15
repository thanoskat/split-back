const jwt = require('jsonwebtoken')
const config = process.env

const generateMagicLink = (userId) =>
{
  const appUrl = config.FRONT_URL
  const magicLinkToken = jwt.sign(
    { userId: userId },
    config.MAGICLINK_SECRET,
    { expiresIn: "10m" }
  )
  return `${appUrl}/v/${magicLinkToken}`
}

module.exports = generateMagicLink