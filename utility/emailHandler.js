const nodemailer = require('nodemailer')
const inLineCss = require('nodemailer-juice')

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  secure: true,
  port: 465,
  auth: {
    user: 'email@splita.xyz',
    pass: '1423qrwe!$@#QRWE'
  }
})

const sendSignInLink = (recipient, link, ip, userAgent) => {
  const emailOptions = {
    from: 'email@splita.xyz',
    to: recipient,
    subject: 'Nodemailer test',
    html: `
      <table cellpadding="10" cellspacing="0" width="100%">
        <tr>
          <td>
            <div class="t1">alphaSplit</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="t2"><b>Sign in</b> has been requested from ${ip}</div>
            <div class="t2">${userAgent}</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="t2">Please confirm this action</div>
          </td>
        </tr>
        <tr>
          <td>
            <div>
              <a href=${link}>Confirm</a>
            </div>
          </td>
        </tr>
      </table>

      <style>
        div {
          text-align: center;
          word-wrap: break-word;
          font-weight: normal;
          font-family: arial,helvetica,sans-serif;
        }
        .t1 {
          font-size: 28px;
        }
        .t2 {
          font-size: 22;
        }
        a {
          font-size: 22px;
          font-weight: 500;
          padding: 5px 10px;
          border-style: solid;
          border-radius: 6px;
          border-color: #8594E0;
          color: #26272B;
          background-color: #8594E0;
          text-decoration: none;
        }
      </style>
    `
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

module.exports = { sendSignInLink }
