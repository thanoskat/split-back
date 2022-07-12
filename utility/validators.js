const Validator = require('fastest-validator')

const nicknameField = {
  type: 'string',
  min: 3,
  empty: false,
  max: 20,
  messages: {
    stringEmpty: 'Nickname is required',
    stringMin: 'Nickname is too short',
    stringMax: 'Nickname is too long',
  }
}

const emailField = {
  type: 'email',
  max: 255,
  messages: {
    emailEmpty: 'Email is required',
    emailMax: 'Email is too long'
  }
}

const checkSignUp = (signUpForm) => {
  const v = new Validator()
  const schema = {
    nickname: nicknameField,
    email: emailField,
  }
  const check = v.compile(schema)
  return check({
    nickname: signUpForm.nickname,
    email: signUpForm.email
  })
}

const checkSignIn = (signInForm) => {
  const v = new Validator()
  const schema = {
    email: emailField,
  }
  const check = v.compile(schema)
  return check({
    email: signInForm.email
  })
}

module.exports = {
  checkSignIn,
  checkSignUp,
}
