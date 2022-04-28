const express = require("express");
const router = express.Router();
const groupModel = require("../models/groupModel")
const userModel = require('../models/userModel')
const expenseModel = require('../models/expenseModel')
const mongoose = require("mongoose");
const toId = mongoose.Types.ObjectId; //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
const jwt = require('jsonwebtoken');
const config = process.env
const settlepay = require("../utility/settlePayments")
const calcPending2 = require('../utility/calcPending2')

const updatePendingTransactions = async (groupId) => {
  const group = await groupModel.findById(groupId).exec()
  const result = calcPending2(group.expenses, group.transfers, group.members)
  const updatedGroup = await groupModel.findByIdAndUpdate(groupId, { $set: { pendingTransactions: result.pendingTransactions, totalSpent: result.totalSpent } }, { upsert: true, returnDocument: "after" })
    .populate({ path: "pendingTransactions", populate: { path: "sender receiver", model: "Users" } })
    .populate({ path: "members", model: "Users" })
    .populate({ path: "expenses", populate: { path: "sender", model: "Users" } })
    .populate({ path: "transfers", populate: { path: "sender receiver", model: "Users" } }).exec()

  return (updatedGroup)
}

//CREATES EXPENSE REQUEST AND UPDATES EXPENSE AND DESCRIPTION ARRAYS WHEN NEW DATA IS AVAILABLE (deprecated)
router.post('/addexpense1', verifyAccessToken, async (req, res) => {

  const groupID = toId(req.body.groupID);
  const amount = req.body.amount;
  const userID = toId(req.body.userID);
  const description = req.body.description

  if (isNaN(amount) || amount < 0) { //this can be also checked at front end
    // console.log("amount not a number or amount is negative")
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
      expense.save();

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

router.post('/addexpense2', verifyAccessToken, async (req, res) => {
  const groupID = toId(req.body.groupID);
  const amount = req.body.amount;
  // const spenderID = toId(req.body.spenderID);
  const spenderID = jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId
  const description = req.body.description

  if (isNaN(amount) || amount < 0) {
    // console.log("amount not a number or amount is negative")
    res.sendStatus(403)
    return false
  }
  const isDebtorOrOwned = (value) => {
    if (String(value.debtorID) === spenderID || String(value.ownedID) === spenderID) {
      return value;
    }
  }

  let foundExpense = await groupModel.countDocuments({ _id: groupID, "expenses.spender": spenderID }).exec()
  // console.log("found", foundExpense)

  //https://docs.mongodb.com/manual/reference/operator/update/positional/?fbclid=IwAR36T5C8vItm0PQoqg2XS3PPXUmadtiS9aiZJegrWmQaRqrE_Ry3IJeXEcA
  if (foundExpense) {//if spender has already created expense subdoc, update that one.
    try {
      await groupModel.updateOne({ _id: groupID, "expenses.spender": spenderID }, { $push: { "expenses.$.amount": amount, "expenses.$.description": description } }).exec()
      const currentGroup = await groupModel.findOne({ _id: groupID }).exec();
      const groupExpenses = currentGroup.expenses;
      const groupTotal = groupExpenses.reduce((prevValue, currValue) => prevValue + currValue.amount.reduce((prevValue, currValue) => prevValue + currValue, 0), 0);
      await groupModel.updateOne({ _id: groupID }, { $set: { total: groupTotal } }).exec()
      currentGroup.save()
      //once expense is imported, calculate transactions
      const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: "expenses", populate: { path: "spender", model: "Users" } })
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
      await groupModel.updateOne({ _id: groupID, "expenses.spender": spenderID }, { $push: { "expenses.$.amount": amount, "expenses.$.description": description } }).exec()
      const currentGroup = await groupModel.findOne({ _id: groupID }).exec();
      const groupExpenses = currentGroup.expenses;
      const groupTotal = groupExpenses.reduce((prevValue, currValue) => prevValue + currValue.amount.reduce((prevValue, currValue) => prevValue + currValue, 0), 0);
      await groupModel.updateOne({ _id: groupID }, { $set: { total: groupTotal } }).exec()
      currentGroup.save()
      //once expense is imported, calculate transactions
      const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: "expenses", populate: { path: "spender", model: "Users" } })
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
  // const user = jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId
  //console.log(req.body.groupId)
  const groupId = toId(req.body.groupId)
  const groupTag = req.body.groupTag
  const group = await groupModel.findByIdAndUpdate(groupId, { $push: { groupTags: groupTag } }, { returnDocument: "after" })
    .populate({ path: "pendingTransactions", populate: { path: "sender receiver", model: "Users" } })
    .populate({ path: "members", model: "Users" })
    .populate({ path: "expenses", populate: { path: "sender", model: "Users" } })
    .populate({ path: "transfers", populate: { path: "sender receiver", model: "Users" } }).exec()

  return res.send(group)
})

router.post('/deletetag', verifyAccessToken, async (req, res) => {
  const groupId = toId(req.body.groupId)
  const groupTag = req.body.groupTag
  const group = await groupModel.findByIdAndUpdate(groupId, { $pull: { groupTags: groupTag } }, { returnDocument: "after" })
    .populate({ path: "pendingTransactions", populate: { path: "sender receiver", model: "Users" } })
    .populate({ path: "members", model: "Users" })
    .populate({ path: "expenses", populate: { path: "sender", model: "Users" } })
    .populate({ path: "transfers", populate: { path: "sender receiver", model: "Users" } }).exec()

  return res.send(group)

})

router.post('/addexpense', verifyAccessToken, async (req, res) => {
  // const user = jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId
  const groupId = toId(req.body.groupId)
  const sender = toId(req.body.sender)
  const amount = req.body.amount
  const description = req.body.description
  const tobeSharedWith = req.body.tobeSharedWith.map(id => toId(id))
  const expenseTags = req.body.expenseTags

  const newExpense = {
    sender: sender,
    amount: amount,
    description: description,
    tobeSharedWith: tobeSharedWith,
    expenseTags: expenseTags
  }

  await groupModel.findByIdAndUpdate(groupId, { $push: { expenses: newExpense } }).exec()
  const group = await updatePendingTransactions(groupId)
  return res.send(group)
})

router.post('/addtransfer', verifyAccessToken, async (req, res) => {
  // const user = jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId
  const groupId = toId(req.body.groupId)
  // TODO check if user belongs to group
  const sender = toId(req.body.sender)
  // not null anymore
  const receiver = toId(req.body.receiver)

  // TODO check if receiver belongs to group
  const amount = req.body.amount
  // TODO check if amount has correct format
  const description = req.body.description

  //console.log("shareWith",shareWith)

  const newTransfer = {
    sender: sender,
    receiver: receiver,
    amount: amount,
    description: description
  }

  await groupModel.findByIdAndUpdate(groupId, { $push: { transfers: newTransfer } }).exec()
  const group =await updatePendingTransactions(groupId)
  return res.send(group)
})


//Gets all expenses on a specific group ID and calculates settlements
//check settlePayments functions one by one and update variables and you're set.
router.get("/getgroupexpenses/:groupID", verifyAccessToken, async (req, res) => {
  const groupID = req.params.groupID;
  const userID = jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId
  const isDebtorOrOwned = (value) => {
    if (String(value.debtorID) === userID || String(value.ownedID) === userID) {
      return value;
    }
  }

  //console.log("groupID", group)
  try {
    const expenseArr = await groupModel.findOne({ _id: groupID }).populate({ path: "expenses", populate: { path: "sender", model: "Users" } })
    const participantArray = expenseArr.expenses

    settlepay.debtCalc3(participantArray)
    const result = settlepay.trackerCalc(participantArray)
    //console.log("result",result)
    const filteredResult = result.filter(isDebtorOrOwned)
    //console.log(filteredResult)
    res.json(filteredResult)
  } catch (err) {
    res.sendStatus(500)
  }
})
module.exports = router
