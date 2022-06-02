const mongoose = require('mongoose')

const invitationSchema = mongoose.Schema({
  inviter: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  group: {
    type: mongoose.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  }
})

module.exports = mongoose.model('Invitations', invitationSchema)
