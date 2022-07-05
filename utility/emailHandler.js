const nodemailer = require('nodemailer')
const inLineCss = require('nodemailer-juice')
const fs = require('fs')
const handlebars = require('handlebars')
console.log(process.env.ACCOUNT_EMAIL_ADDRESS, process.env.ACCOUNT_EMAIL_PASS)
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  secure: true,
  port: 465,
  auth: {
    user: process.env.ACCOUNT_EMAIL_ADDRESS,
    pass: process.env.ACCOUNT_EMAIL_PASS
  },
  // debug: true,
  // logger: true
})

const sendSignInLink = (recipient, link, ip, userAgent) => {

  const template = handlebars.compile(fs.readFileSync(`${__dirname}/email-templates/sign-in.html`, 'utf8'))
  const replacements = {
    ip: ip,
    userAgent: userAgent,
    link: link
  }

  const emailOptions = {
    from: process.env.ACCOUNT_EMAIL_ADDRESS,
    to: recipient,
    subject: 'Sign-in alphaSplit',
    html: template(replacements)
  }

  transporter.use('compile', inLineCss())
  transporter.sendMail(emailOptions, (error, info) => {
    if(error) {
      console.log(error)
    }
    else {
      console.log(info)
    }
  })
}

const sendSignUpVerification = (recipient, link) => {

  const template = handlebars.compile(fs.readFileSync(`${__dirname}/email-templates/sign-up.html`, 'utf8'))
  const replacements = {
    link: link
  }

  const emailOptions = {
    from: process.env.ACCOUNT_EMAIL_ADDRESS,
    to: recipient,
    subject: 'Sign-up alphaSplit',
    html: template(replacements)
  }

  transporter.use('compile', inLineCss())
  transporter.sendMail(emailOptions, (error, info) => {
    if(error) {
      console.log(error)
    }
    else {
      console.log(info)
    }
  })
}

module.exports = { sendSignInLink, sendSignUpVerification }
