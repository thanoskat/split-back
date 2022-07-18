const Validator = require('fastest-validator')
const currency = require('currency.js')

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

const objectID = {
  type: 'string',
  length: 24,
  hex: true,
}

const checkExpense = (expense) => {
  const v = new Validator({
    useNewCustomCheckerFunction: true,
    messages: {
      contributionSumNotEqualAmount: 'Member amounts don\'t add up to total.',
      amountPositive: 'Amount must be greater than zero'
    }
  })

  const schema = {
    splitEqually: {
      type: 'boolean',
      custom: (value, errors, schema, name, parent, context) => {
        const sum = context.data.participants.reduce((sum, participant) => currency(sum).add(participant.contributionAmount).value, 0)
        console.log(sum)
        if (!context.data.splitEqually && currency(context.data.amount).value !== sum) {
          errors.push({
            type: 'contributionSumNotEqualAmount',
          })
        }
        return value
      },
    },
    spender: objectID,
    amount: {
      type: 'string',
      empty: false,
      numeric: true,
      custom: (value, errors) => {
        if(currency(value).value <= 0) {
          errors.push({
            type: 'amountPositive',
          })
        }
        return value
      },
      messages: {
        stringEmpty: 'Amount is required',
        stringNumeric: 'Amount must be a number',
        number: 'Amount must be a number',
      }
    },
    description: {
      type: 'string',
      empty: false,
      messages: {
        stringEmpty: 'Description is required'
      }
    },
    participants: {
      type: 'array',
      empty: false,
      items: {
        type: 'object',
        props: {
          memberId: objectID,
          contributionAmount: {
            type: 'string',
            empty: false,
            numeric: true,
            custom: (value, errors) => {
              if(currency(value).value <= 0) {
                errors.push({
                  type: 'amountPositive',
                })
              }
              return value
            },
          }
        }
      },
      messages: {
        arrayEmpty: 'At least one member should be selected'
      }
    },
    label: {
      ...objectID,
      optional: true
    },
    // expense: {
    //   type: 'any',
    //   optional: true,
    // }
  }
  const check = v.compile(schema)
  return check(expense)
}

module.exports = {
  checkSignIn,
  checkSignUp,
  checkExpense,
}
