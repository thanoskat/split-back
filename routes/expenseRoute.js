const express = require('express')
const router = express.Router()
const groupModel = require('../models/groupModel')
const userModel = require('../models/userModel')
const mongoose = require('mongoose')
const toId = mongoose.Types.ObjectId //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
const jwt = require('jsonwebtoken')
const settlepay = require('../utility/settlePayments')
const calcPending3 = require('../utility/calcPending3')
const { checkExpense, checkTransfer } = require('../utility/validators')
const currency = require('currency.js')
const { checkGuest } = require('../utility/validators')
const { text } = require('body-parser')

const updatePendingTransactions = async (groupId) => {
  //console.log(groupId)
  const group = await groupModel.findById(groupId).exec()
  const result = calcPending3(group.expenses, group.transfers, group.members)
  const updatedGroup = await groupModel.findByIdAndUpdate(groupId, { $set: { pendingTransactions: result.pendingTransactions } }, { upsert: true, returnDocument: 'after' })
    .populate({ path: 'pendingTransactions', populate: { path: 'sender receiver', model: 'Users' } })
    .populate({ path: 'members', model: 'Users' })
    .populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } }) //to be replaced
    .populate({ path: 'expenses', populate: { path: 'spenders', model: 'Users' } })
    .populate({ path: 'transfers', populate: { path: 'sender receiver', model: 'Users' } }).exec()

  return (updatedGroup)
}

//create a route where you will be adding member in expense which will be flagged as sharedEqually and its participants length will be equal to members length. Then run update pending transactions

router.post('/updateExpenses', verifyAccessToken, async (req, res) => {

  const groupId = toId(req.body.groupId)
  const toBeupdatedExpenses = req.body.toBeupdatedExpenses
  const userId = toId(jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId)
  const toBeUpdatedGroup = await groupModel.findById(groupId)

  const bulk = []
  //we need a check to avoid duplicate entrance just in case
  toBeupdatedExpenses.map((toBeupdatedExpense) => {
    toBeUpdatedGroup.expenses.map((toBeUpdatedGroupExpense) => {
      if (toId(toBeupdatedExpense._id).equals(toBeUpdatedGroupExpense._id)) {

        const distributedAmountArray = currency(toBeupdatedExpense.amount)
          .distribute(toBeupdatedExpense.participants.length + 1).map(e => e.value)
        const newParticipantArr = toBeupdatedExpense.participants.map((participant, index) => (
          { ...participant, contributionAmount: distributedAmountArray[index] }
        ))
        newParticipantArr.push({ memberId: userId.toString(), contributionAmount: distributedAmountArray[distributedAmountArray.length - 1] })
        bulk.push({
          updateOne: {
            'filter': {
              '_id': groupId,
            },
            // 'update': { $push: { 'expenses.$[elem].participants': { memberId: userId } } },
            'update': { $set: { 'expenses.$[elem].participants': newParticipantArr } },
            'arrayFilters': [{ 'elem._id': toBeUpdatedGroupExpense._id }],
            'upsert': true
          },
        })
      }
    })
  })

  console.log("bulk", bulk)
  const result = await groupModel.bulkWrite(bulk)
    .then(bulkWriteOpResult => {
      console.log('BULK update OK')
      // console.log(JSON.stringify(bulkWriteOpResult, null, 2))
    })
    .catch(err => {
      console.log('BULK update error')
      // console.log(JSON.stringify(err, null, 2))
    })

  return res.send(await updatePendingTransactions(groupId))

})

router.post('/addguest', async (req, res) => {

  const checkSignUpResult = checkGuest({
    nickname: req.body.nickname,
    // email: req.body.email
  })

  if (Array.isArray(checkSignUpResult)) {
    return res.status(400).send(checkSignUpResult)
  }

  // const emailCount = await userModel.countDocuments({ email: req.body.email })
  // if (emailCount) {
  //   return res.status(400).json({ message: 'This email already exists' })
  // }

  try {
    const user = new userModel({
      nickname: req.body.nickname,
      // email: req.body.email,
      guest: true
    })
    await user.save()
    //console.log(user)

    const groupDoc = await groupModel.findOneAndUpdate(
      { _id: req.body.groupID, 'members': { $ne: user._id } },
      { $addToSet: { members: user._id } }
    )

    if (!groupDoc) return res.status(409).send('Member already exists in group')
    //res.status(200).send(groupDoc)

    const userDoc = await userModel.findOneAndUpdate(
      { _id: user._id, 'groups': { $ne: req.body.groupID } },
      { $addToSet: { groups: req.body.groupID } }
    )
    if (!userDoc) return res.status(409).send('Group already exists in user')


    //updateExpenses logic goes here

    const toBeupdatedExpenses = req.body.toBeupdatedExpenses
    const toBeUpdatedGroup = await groupModel.findById(req.body.groupID)
    const bulk = []
    //we need a check to avoid duplicate entrance just in case
    toBeupdatedExpenses.map((toBeupdatedExpense) => {
      toBeUpdatedGroup.expenses.map((toBeUpdatedGroupExpense) => {
        if (toId(toBeupdatedExpense._id).equals(toBeUpdatedGroupExpense._id)) {
          const distributedAmountArray = currency(toBeupdatedExpense.amount)
            .distribute(toBeupdatedExpense.participants.length + 1).map(e => e.value)
          const newParticipantArr = toBeupdatedExpense.participants.map((participant, index) => (
            { ...participant, contributionAmount: distributedAmountArray[index] }
          ))
          newParticipantArr.push({ memberId: user._id.toString(), contributionAmount: distributedAmountArray[distributedAmountArray.length - 1] })

          bulk.push({
            updateOne: {
              'filter': {
                '_id': req.body.groupID,
              },
              //'update': { $set: { 'expenses.$[elem].participants': { memberId: user._id } } },
              'update': { $set: { 'expenses.$[elem].participants': newParticipantArr } },
              'arrayFilters': [{ 'elem._id': toBeUpdatedGroupExpense._id }],
              'upsert': true
            },
          })
        }
      })
    })

    console.log("bulk", bulk)

    await groupModel.bulkWrite(bulk)
    return res.send(await updatePendingTransactions(req.body.groupID))
  }
  catch (error) {
    console.log(error.message)
    res.send(error.message)
  }
  //return res.status(200).send(groupDoc)
})


//CREATES EXPENSE REQUEST AND UPDATES EXPENSE AND DESCRIPTION ARRAYS WHEN NEW DATA IS AVAILABLE (deprecated)
router.post('/addexpense1', verifyAccessToken, async (req, res) => {

  const groupID = toId(req.body.groupID)
  const amount = req.body.amount
  const userID = toId(req.body.userID)
  const description = req.body.description

  if (isNaN(amount) || amount < 0) { //this can be also checked at front end
    // console.log('amount not a number or amount is negative')
    res.sendStatus(403)
    return false
  }

  //test if expense document exists for current user.
  let foundOne = await expenseModel.countDocuments({
    debtor: userID,
    group: groupID
  }).exec()

  if (!foundOne) { //if such expense doc doesn't exist, create a new one
    try {
      const expense = new expenseModel({
        debtor: userID,
        group: groupID,
        amount: amount,
        description: description
      })
      expense.save()

    } catch (err) {
      console.dir(err)
      res.json({ message: err })
    }
  } else { //else get ID of current expense document and add the new expense to the expense array.
    const findExpense = await expenseModel.findOne({ debtor: userID, group: groupID }) //is this right? can we have more than one?
    const expenseID = findExpense._id
    await expenseModel.findByIdAndUpdate(expenseID, { $push: { amount: amount, description: description } }).exec()
    res.sendStatus(200)
  }
})


router.post('/txhistory', verifyAccessToken, async (req, res) => {
  const userId = toId(req.queryUserId)
  const groupID = req.body.groupID

  try {
    const group = await groupModel.findOne({ _id: groupID })
    let history = []
    if (group.expenses.length === 0) { res.send(history) } else {
      group.expenses.map((expense) => {
        if (expense.spenders.map(spender => spender.spenderId.toString()).includes(userId.toString())) {//if user is in spenders array
          const spender = expense.spenders.map(spender => spender).find(spender => spender.spenderId.toString() === userId.toString()) //spender is the spender with userId
          const index = expense.participants.findIndex(participant => participant.memberId.equals(userId))//index of user as participant 
          if (index !== -1) {//if user participates, subtract lent amount from total he paid
            history.push({ id: expense._id, date: expense.createdAt, description: expense.description, lent: currency(spender.spenderAmount).subtract(expense.participants[index].contributionAmount), borrowed: currency(0), userPaid: spender.spenderAmount, userShare: expense.participants[index].contributionAmount, isTransfer: false }) //participates hence subtract user's amount from total to get lent
          } else { //else user lent the whole amount
            history.push({ id: expense._id, date: expense.createdAt, description: expense.description, lent: currency(spender.spenderAmount), borrowed: currency(0), userPaid: spender.spenderAmount, userShare: 0, isTransfer: false }) //doesn't participate (paid for someone else) hence lent the whole amount
          }
        }
        else { //if not a spender then assess if is a borrower
          //borrowed logic
          const index = expense.participants.findIndex(participant => participant.memberId.equals(userId))
          if (index !== -1) { //if found in participants is a borrower
            history.push({ id: expense._id, date: expense.createdAt, description: expense.description, lent: currency(0), borrowed: expense.participants[index].contributionAmount, userPaid: null, userShare: null, isTransfer: false })
          } //if not, do nothing
        }
      })

      group.transfers.map(transfer => {
        if (transfer.sender.equals(userId)) {
          history.push({ id: transfer._id, date: transfer.createdAt, description: transfer.description, lent: currency(transfer.amount), borrowed: currency(0), userPaid: null, userShare: null, isTransfer: true })
        } else if (transfer.receiver.equals(userId)) {
          history.push({ id: transfer._id, date: transfer.createdAt, description: transfer.description, lent: currency(0), borrowed: currency(transfer.amount), userPaid: null, userShare: null, isTransfer: true })
        } else {
          return
        }
      })

      history.sort((a, b) => {
        return a.date - b.date
      })


      if (history.length === 1) {
        history[0].totalLent = history[0].lent
        history[0].totalBorrowed = history[0].borrowed
        history[0].balance = currency(history[0].lent).subtract(history[0].borrowed)

      } else {
        history[0].totalLent = history[0].lent
        history[0].totalBorrowed = history[0].borrowed
        history[0].balance = currency(history[0].lent).subtract(history[0].borrowed)

        history[1].totalLent = currency(history[0].lent).add(history[1].lent)
        history[1].totalBorrowed = currency(history[0].borrowed).add(history[1].borrowed)
        history[1].balance = currency(history[1].totalLent).subtract(history[1].totalBorrowed)

        for (let i = 2; i < history.length; i++) {
          history[i].totalLent = currency(history[i - 1].totalLent).add(history[i].lent)
          history[i].totalBorrowed = currency(history[i - 1].totalBorrowed).add(history[i].borrowed)
          history[i].balance = currency(history[i].totalLent).subtract(history[i].totalBorrowed)
        }
      }
      res.send(history)
    }
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
})

router.post('/add', verifyAccessToken, async (req, res) => {
  //can we avoid sending paidByMany in DB?
  //try fix row 274 from front
  try {
    req.body.newExpense.spenders = req.body.newExpense.spenders
    if (req.body.newExpense.spenders.length === 1) {
      req.body.newExpense.spenders[0].spenderAmount = req.body.newExpense.amount
      req.body.newExpense.paidByMany = false
    } else if (req.body.newExpense.spenders.length > 1) {
      req.body.newExpense.paidByMany = true
    }

    const checkExpenseResult = checkExpense(req.body.newExpense)
    console.log(checkExpenseResult)
    if (Array.isArray(checkExpenseResult)) return res.status(200).send({ validationArray: checkExpenseResult })
    req.body.newExpense.amount = currency(req.body.newExpense.amount).value

    if (req.body.newExpense.splitEqually === false) {
      req.body.newExpense.participants = req.body.newExpense.participants.map(participant => ({ ...participant, contributionAmount: currency(participant.contributionAmount).value }))
    } else {
      const distributedAmountArray = currency(req.body.newExpense.amount)
        .distribute(req.body.newExpense.participants.length).map(e => e.value)
      req.body.newExpense.participants = req.body.newExpense.participants.map((participant, index) => ({ ...participant, contributionAmount: distributedAmountArray[index] }))
    }

    await groupModel.findByIdAndUpdate(req.body.newExpense.groupId, { $push: { expenses: req.body.newExpense } }).exec()
    const updatedGroup = await updatePendingTransactions(req.body.newExpense.groupId)
    res.send(updatedGroup)
  }
  catch (error) {
    console.log(error.message)
    res.status(500).send(error.message)
  }
})

router.post('/edit', verifyAccessToken, async (req, res) => {
  try {
    req.body.newExpense.spenders = req.body.newExpense.spenders
    if (req.body.newExpense.spenders.length === 1) {
      req.body.newExpense.spenders[0].spenderAmount = req.body.newExpense.amount
      req.body.newExpense.paidByMany = false
    } else if (req.body.newExpense.spenders.length > 1) {
      req.body.newExpense.paidByMany = true
    }

    const checkExpenseResult = checkExpense(req.body.newExpense)
    console.log(checkExpenseResult)
    if (Array.isArray(checkExpenseResult)) return res.status(200).send({ validationArray: checkExpenseResult })
    req.body.newExpense.amount = currency(req.body.newExpense.amount).value

    if (req.body.newExpense.splitEqually === false) {
      req.body.newExpense.participants = req.body.newExpense.participants.map(participant => ({ ...participant, contributionAmount: currency(participant.contributionAmount).value }))
    } else {
      const distributedAmountArray = currency(req.body.newExpense.amount)
        .distribute(req.body.newExpense.participants.length).map(e => e.value)
      req.body.newExpense.participants = req.body.newExpense.participants.map((participant, index) => ({ ...participant, contributionAmount: distributedAmountArray[index] }))
    }

    await groupModel.findOneAndUpdate(
      { _id: req.body.newExpense.groupId, expenses: { $elemMatch: { _id: req.body.newExpense._id } } },
      { 'expenses.$': req.body.newExpense },
      {}).exec()
    const updatedGroup = await updatePendingTransactions(req.body.newExpense.groupId)
    res.send(updatedGroup)
  }
  catch (error) {
    console.log(error.message)
    res.status(500).send(error.message)
  }
})

router.post('/addtransfer', verifyAccessToken, async (req, res) => {
  // const user = jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId
  const groupId = toId(req.body.groupId)
  // TODO check if user belongs to group
  const sender = (req.body.sender)
  // not null anymore
  const receiver = (req.body.receiver)

  // TODO check if receiver belongs to group
  const amount = req.body.amount
  // TODO check if amount has correct format
  const description = req.body.description

  //console.log('shareWith',shareWith)

  const newTransfer = {
    sender: sender,
    receiver: receiver,
    amount: amount,
    description: description
  }

  console.log(newTransfer)
  const checkTransferResult = checkTransfer(newTransfer)
  console.log(checkTransferResult)
  if (Array.isArray(checkTransferResult)) return res.status(200).send({ validationArray: checkTransferResult })
  newTransfer.receiver = toId(newTransfer.receiver)
  newTransfer.sender = toId(newTransfer.sender)
  newTransfer.amount = currency(newTransfer.amount).value

  await groupModel.findByIdAndUpdate(groupId, { $push: { transfers: newTransfer } }).exec()
  const group = await updatePendingTransactions(groupId)
  return res.send(group)
})


router.post('/add2', verifyAccessToken, async (req, res) => {
  const groupId = toId(req.body.groupId)
  const newExpense = {
    splitEqually: req.body.splitEqually,
    spender: req.body.spender,
    amount: req.body.amount,
    description: req.body.description,
    participants: req.body.participants,
    label: req.body.label
  }
  await groupModel.findByIdAndUpdate(groupId, { $push: { expenses: newExpense } }).exec()

  return res.send(await updatePendingTransactions(groupId))
})

router.post('/remove', verifyAccessToken, async (req, res) => {
  const groupId = toId(req.body.groupId)
  await groupModel.findByIdAndUpdate(groupId, { $pull: { expenses: { _id: toId(req.body.expenseId) } } }).exec()
  return res.send(await updatePendingTransactions(groupId))
})

router.post('/removetransfer', verifyAccessToken, async (req, res) => {
  const groupId = toId(req.body.groupId)
  await groupModel.findByIdAndUpdate(groupId, { $pull: { transfers: { _id: toId(req.body.transferId) } } }).exec()
  return res.send(await updatePendingTransactions(groupId))
})

router.post('/addexpense2', verifyAccessToken, async (req, res) => {
  const groupID = toId(req.body.groupID)
  const amount = req.body.amount
  // const spenderID = toId(req.body.spenderID)
  const spenderID = jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId
  const description = req.body.description

  if (isNaN(amount) || amount < 0) {
    // console.log('amount not a number or amount is negative')
    res.sendStatus(403)
    return false
  }
  const isDebtorOrOwned = (value) => {
    if (String(value.debtorID) === spenderID || String(value.ownedID) === spenderID) {
      return value
    }
  }

  let foundExpense = await groupModel.countDocuments({ _id: groupID, 'expenses.spender': spenderID }).exec()
  // console.log('found', foundExpense)

  //https://docs.mongodb.com/manual/reference/operator/update/positional/?fbclid=IwAR36T5C8vItm0PQoqg2XS3PPXUmadtiS9aiZJegrWmQaRqrE_Ry3IJeXEcA
  if (foundExpense) {//if spender has already created expense subdoc, update that one.
    try {
      await groupModel.updateOne({ _id: groupID, 'expenses.spender': spenderID }, { $push: { 'expenses.$.amount': amount, 'expenses.$.description': description } }).exec()
      const currentGroup = await groupModel.findOne({ _id: groupID }).exec()
      const groupExpenses = currentGroup.expenses
      const groupTotal = groupExpenses.reduce((prevValue, currValue) => prevValue + currValue.amount.reduce((prevValue, currValue) => prevValue + currValue, 0), 0)
      await groupModel.updateOne({ _id: groupID }, { $set: { total: groupTotal } }).exec()
      currentGroup.save()
      //once expense is imported, calculate transactions
      const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } })
      const participantArray = expenseArr.expenses
      settlepay.debtCalc3(participantArray)
      const result = settlepay.trackerCalc(participantArray)
      const filteredResult = result.filter(isDebtorOrOwned)
      //create schema to keep transaction here
      //end of calc
      res.json(filteredResult)
    } catch (err) {
      console.dir(err)
    }

  } else { //create expense object in array and push amount and description
    try {
      await groupModel.findByIdAndUpdate(groupID, { $push: { expenses: { spender: spenderID } } }).exec()
      await groupModel.updateOne({ _id: groupID, 'expenses.spender': spenderID }, { $push: { 'expenses.$.amount': amount, 'expenses.$.description': description } }).exec()
      const currentGroup = await groupModel.findOne({ _id: groupID }).exec()
      const groupExpenses = currentGroup.expenses
      const groupTotal = groupExpenses.reduce((prevValue, currValue) => prevValue + currValue.amount.reduce((prevValue, currValue) => prevValue + currValue, 0), 0)
      await groupModel.updateOne({ _id: groupID }, { $set: { total: groupTotal } }).exec()
      currentGroup.save()
      //once expense is imported, calculate transactions
      const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } })
      const participantArray = expenseArr.expenses
      settlepay.debtCalc3(participantArray)
      const result = settlepay.trackerCalc(participantArray)
      const filteredResult = result.filter(isDebtorOrOwned)
      //create schema to keep transaction here
      //end of calc
      res.json(filteredResult)
    } catch (err) {
      console.dir(err)
      res.sendStatus(400)
    }
  }
})

router.post('/addtag', verifyAccessToken, async (req, res) => {
  // const user = jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId
  //console.log(req.body.groupId)
  const groupId = toId(req.body.groupId)
  const groupTag = req.body.groupTag
  const group = await groupModel.findByIdAndUpdate(groupId, { $push: { groupLabels: groupTag } }, { returnDocument: 'after' })
    .populate({ path: 'pendingTransactions', populate: { path: 'sender receiver', model: 'Users' } })
    .populate({ path: 'members', model: 'Users' })
    .populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } })
    .populate({ path: 'transfers', populate: { path: 'sender receiver', model: 'Users' } }).exec()

  return res.send(group)
})

router.post('/deletetag', verifyAccessToken, async (req, res) => {
  const groupId = toId(req.body.groupId)
  const groupTag = req.body.groupTag
  const group = await groupModel
    .findByIdAndUpdate(groupId, { $pull: { groupLabels: groupTag } }, { returnDocument: 'after' })
    .populate({ path: 'pendingTransactions', populate: { path: 'sender receiver', model: 'Users' } })
    .populate({ path: 'members', model: 'Users' })
    .populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } })
    .populate({ path: 'transfers', populate: { path: 'sender receiver', model: 'Users' } }).exec()

  return res.send(group)
})

router.post('/addexpense', verifyAccessToken, async (req, res) => {
  // const user = jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId
  const groupId = toId(req.body.groupId)
  const spender = toId(req.body.spender)
  const amount = req.body.amount
  const description = req.body.description
  const participants = req.body.participants.map(id => toId(id))
  const label = req.body.label.map(id => toId(id))

  const newExpense = {
    spender: spender,
    amount: amount,
    description: description,
    participants: participants,
    label: label
  }

  // console.log(newExpense)

  await groupModel.findByIdAndUpdate(groupId, { $push: { expenses: newExpense } }).exec()
  const group = await updatePendingTransactions(groupId)
  return res.send(group)
})



//Gets all expenses on a specific group ID and calculates settlements
//check settlePayments functions one by one and update variables and you're set.
router.get('/getgroupexpenses/:groupID', verifyAccessToken, async (req, res) => {
  const groupID = req.params.groupID
  const userID = jwt.verify(req.accessToken, process.env.ACCESS_TOKEN_SECRET).userId
  const isDebtorOrOwned = (value) => {
    if (String(value.debtorID) === userID || String(value.ownedID) === userID) {
      return value
    }
  }

  //console.log('groupID', group)
  try {
    const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: 'expenses', populate: { path: 'spender', model: 'Users' } })
    const participantArray = expenseArr.expenses

    settlepay.debtCalc3(participantArray)
    const result = settlepay.trackerCalc(participantArray)
    //console.log('result',result)
    const filteredResult = result.filter(isDebtorOrOwned)
    //console.log(filteredResult)
    res.json(filteredResult)
  } catch (err) {
    res.sendStatus(500)
  }
})
module.exports = router
