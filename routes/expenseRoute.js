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

//CREATES EXPENSE REQUEST AND UPDATES EXPENSE AND DESCRIPTION ARRAYS WHEN NEW DATA IS AVAILABLE
router.post('/addexpense', verifyAccessToken, async (req, res) => {

  const groupID = toId(req.body.groupID);
  const amount = req.body.amount;
  const userID = toId(req.body.userID);
  const description = req.body.description

  if (isNaN(amount) || amount < 0) { //this can be also checked at front end
    console.log("amount not a number or amount is negative")
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

//Gets all expenses on a specific group ID and calculate settlements

router.get("/getgroupexpenses/:groupID", async (req, res) => {
  const groupID = req.params.groupID;
  const participantArray = await expenseModel.find({ group: groupID }).populate("debtor", "nickname")
  //console.log(participantArray)
  settlepay.debtCalc3(participantArray)
  console.log(settlepay.trackerCalc(participantArray))
  res.sendStatus(200)
})

module.exports = router