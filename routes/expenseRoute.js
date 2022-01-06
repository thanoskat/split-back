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

router.post('/addexpense', verifyAccessToken, async (req, res) => {
    
    const groupID = toId(req.body.groupID);
    const amount = req.body.amount;
    const userID = toId(req.body.userID);
    const description = req.body.description
    console.log(groupID, amount, userID, description)

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




})

module.exports = router