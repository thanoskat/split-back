const { isEmail } = require('validator')
const mongoose = require('mongoose')

const emailUnique = async (email) => {
  const emailCount = await mongoose.models.Users.countDocuments({ email: email })
  return !emailCount
}

const userSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: [true, "Name is required"],
    minLength: [1, "{VALUE} is a short nickname"]
  },
  guest: {
    type: Boolean,
    required: true
  },
  email: {
    type: String,
    required: [function() { return this.guest === false; }, "Email is required"],
    maxLength: 255,
    validate: [

      { validator: emailUnique, message: "{VALUE} already exists" },
      { validator: isEmail, message: "{VALUE} is not valid" }
    ]
  },
  
  date: {
    type: Date,
    default: Date.now
  },
  groups: [{ type: mongoose.Types.ObjectId, ref: 'Group' }],
})

// userSchema.path('email').validate(async (email) => {
//   const emailCount = await mongoose.models.User.countDocuments({ email: email })
//   return !emailCount
// }, "Email already exists")

const userModel = mongoose.model('Users', userSchema)

module.exports = userModel
