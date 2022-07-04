const jwt = require('jsonwebtoken')

const generateMagicLink = (userId) =>
{
  const appUrl = process.envFRONT_URL
  const magicLinkToken = jwt.sign(
    { userId: userId },
    process.envMAGICLINK_SECRET,
    { expiresIn: '30m' }
  )
  return `${appUrl}/v/${magicLinkToken}`
}

module.exports = generateMagicLink
