const jwt = require('jsonwebtoken')

const generateAccessToken = (userId) =>
{
  const accessToken = jwt.sign(
    { userId: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: `${process.env.ACCESS_TOKEN_TTL_IN_SECONDS}s` }
  )
  return accessToken
}

module.exports  = generateAccessToken