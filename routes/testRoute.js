const router = require('express').Router()
const verifyAccessToken = require('../middleware/verifyAccessToken')

router.get('/', verifyAccessToken, async (req, res) => {
  setTimeout(() => {res.sendStatus(200)}, 5000)
})

module.exports = router
