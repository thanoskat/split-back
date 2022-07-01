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
  unique: {
    type: String,
    required: false
  },
  // DONT DELETE
  // previousRefreshToken: {
  //   type: String,
  //   default: null
  // },
  // revoked: {
  //   type: Boolean,
  //   default: false
  // },
  // timestamps: true,
  createdAt: {
    type: Date,
    required: true
  }
})

module.exports = mongoose.model('Sessions', sessionSchema)
