const jwt = require('jsonwebtoken')
const config = process.env

const generateAccessToken = (userId) =>
{
  const accessToken = jwt.sign(
    { userId: userId },
    config.ACCESS_TOKEN_SECRET,
    { expiresIn: "1m" }
  )
  return accessToken
}

module.exports  = generateAccessToken