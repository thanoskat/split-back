const crypto = require('crypto')

const generateInvitationCode = () => {
  return crypto.randomInt(parseInt('10000000', 36), parseInt('ZZZZZZZZ', 36)).toString(36)
}

module.exports = generateInvitationCode
