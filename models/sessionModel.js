const mongoose = require('mongoose')

const sessionSchema = mongoose.Schema({
  refreshToken: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  previousRefreshToken: {
    type: String,
    default: null
  },
  revoked: {
    type: Boolean,
    default: false
  },
  // timestamps: true,
  createdAt: {
    type: Date,
    // expires: 1200,
    required: true
  }
})

module.exports = mongoose.model('Sessions', sessionSchema)
