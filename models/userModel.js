const { isEmail } = require('validator')
const mongoose = require('mongoose')


// const emailUnique = async (email) => {
//   const emailCount = await mongoose.models.Users.countDocuments({ email: email })
//   return !emailCount
// }

const userSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: [ true, "Nickname is required"],
    minLength: [6, "{VALUE} is a short nickname"]
  },
  email: {
    type: String,
    required: [ true, "Email is required"],
    maxLength: 255,
    validate: [

      // { validator: emailUnique, message: "{VALUE} already exists" },
      { validator: isEmail, message: "{VALUE} is not valid" }
    ]
  },
  // password: {
  //   type: String,
  //   required: [ true, "Password is required"],
  //   max: 1024,
  //   minLength: [6, "Password too short"]
  // },
  date: {
    type: Date,
    default: Date.now
  },

  groups :[{type:mongoose.Types.ObjectId, ref: 'Group' }],
  requests:[{type:mongoose.Types.ObjectId, ref: 'GroupRequest' }],
  expenses:[{type:mongoose.Types.ObjectId, ref: 'Expense' }]
})

// userSchema.path('email').validate(async (email) => {
//   const emailCount = await mongoose.models.User.countDocuments({ email: email })
//   return !emailCount
// }, "Email already exists")

const userModel = mongoose.model('Users', userSchema)

module.exports = userModel
