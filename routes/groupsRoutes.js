const express = require("express");
const router = express.Router();
const groupModel = require("../models/groupModel")
const userModel = require('../models/userModel')
const requestsModel = require("../models/requestsModel")
const mongoose = require("mongoose");
const toId = mongoose.Types.ObjectId; //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
const jwt = require('jsonwebtoken');
const { findById, deleteOne } = require("../models/groupModel");
const config = process.env
const calcPending = require('../utility/calcPending')

const updatePendingTransactions = async (groupId) => {
  group = await groupModel.findById(groupId).exec()
  const result = calcPending(group.transactions, group.members)
  await groupModel.findByIdAndUpdate(groupId, { $set: { pendingTransactions: result.pendingTransactions, totalSpent: result.totalSpent } }, { upsert: true }).exec()
}

//CREATE GROUP WITH USER'S ID. DON'T HAVE TO WORRY ABOUT MULTIPLE GROUPS
//creators are automatically members of group they create
router.post("/creategroup", verifyAccessToken, async (req, res) => {
  try {
    const creatorID = toId(jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId)
    const group = new groupModel({
      creator: creatorID,
      title: req.body.title
    })
    const savedGroup = await group.save();
    await addUserToGroup(group._id, creatorID) //creators are automatically members of group they create

    res.send(savedGroup._id) //sending group ID as response to client instead of OK status
  } catch (error) {
    console.dir(error)
    res.json({ message: error })
  }
})

//CREATES NEW GROUP REQUEST
router.post("/creategrouprequest", verifyAccessToken, async (req, res) => {
  try {
    // Tests if request has already been sent

    const requestsFound = await requestsModel.countDocuments({
      requester: toId(req.queryUserId),
      recipient: req.body.recipient,
      status: 0,
      groupToJoin: req.body.groupToJoin
    }).exec()
    const foundOne = await groupModel.countDocuments({
      _id: req.body.groupToJoin,
      members: req.body.recipient
    }).exec()

    if (requestsFound) {
      console.log(`request to join group with ID ${req.body.groupToJoin} already sent and is pending with status ${0}`)
      return res.sendStatus(200)
    }
    if (foundOne) {
      console.log(`Already member of group with ID ${req.body.groupToJoin}`)
      return res.sendStatus(200)
    }
    else {
      // If request is new, creates this request
      const newGroupRequest = new requestsModel({
        requester: toId(req.queryUserId), //current user who's sending invitation
        recipient: req.body.recipient,
        status: 0, //0 pending, 1 accepted, 2 declined. For new requests that should be set to 0,
        groupToJoin: req.body.groupToJoin
      })
      const newReq = await newGroupRequest.save();
      await userModel.findByIdAndUpdate(req.body.recipient, { $push: { requests: newReq } }).exec()
      return res.sendStatus(200)
    }
  }
  catch (error) {
    console.dir(error)
    res.send(error.message)
  }
})

//SENDS MULTIPLE GROUP REQUESTS TO USERS
router.post("/createmultigrouprequests", verifyAccessToken, async (req, res) => {
  try {
    // Tests if request has already been sent
    //this test might be reduntant.It's good to exist as a safety measure
    //but could be delaying process of sending request

    req.body.recipient.forEach(async (recipient) => {

      let requestsFound = await requestsModel.countDocuments({
        requester: toId(req.queryUserId),
        recipient: recipient,
        status: 0,
        groupToJoin: req.body.groupToJoin
      }).exec()

      let foundOne = await groupModel.countDocuments({
        _id: req.body.groupToJoin,
        members: recipient
      }).exec()

      if (requestsFound) {
        console.log(`request to join group with ID ${req.body.groupToJoin} for user ${recipient} already sent and is pending with status ${0}`)
        // return res.sendStatus(200)
      }
      if (foundOne) {
        console.log(`${recipient} is already member of group with ID ${req.body.groupToJoin}`)
        // return res.sendStatus(200)
      }
      else {
        // If request is new, creates this request
        let newGroupRequest = new requestsModel({
          requester: toId(req.queryUserId), //current user who's sending invitation
          recipient: recipient,
          status: 0, //0 pending, 1 accepted, 2 declined. For new requests that should be set to 0,
          groupToJoin: req.body.groupToJoin
        })
        let newReq = await newGroupRequest.save();
        await userModel.findByIdAndUpdate(recipient, { $push: { requests: newReq } }).exec()

      }
    }
    )
    return res.sendStatus(200)
  }
  catch (error) {
    console.dir("Multi req error", error)
    res.send(error.message)
  }
})

/// 1000/60/60/24
router.get('/getgrouprequests', verifyAccessToken, async (req, res) => {
  const userId = toId(req.queryUserId)
  const getTimeSince = (timestamp) => {
    const currDate = new Date()
    const currDatems = currDate.getTime()
    const stamp = (currDatems - timestamp)
    let secs, mins, hours, days
    secs = stamp / 1000
    mins = secs / 60
    hours = mins / 60
    days = hours / 24
    weeks = days / 7


    // console.log("secs", Math.trunc(secs))
    // console.log("mins", Math.trunc(mins))
    // console.log("hours", Math.trunc(hours))
    // console.log("days", Math.trunc(days))
    // console.log("weeks", Math.trunc(weeks))


    if (Math.trunc(weeks) == 0 && Math.trunc(days) == 0 && Math.trunc(hours) == 0 && Math.trunc(mins) == 0) return { timeago: Math.trunc(secs), format: "sec" }
    if (Math.trunc(weeks) == 0 && Math.trunc(days) == 0 && Math.trunc(hours) == 0 && Math.trunc(mins) !== 0) return { timeago: Math.trunc(mins), format: "min" }
    if (Math.trunc(weeks) == 0 && Math.trunc(days) == 0 && Math.trunc(hours) !== 0 && Math.trunc(hours) == 1) return { timeago: Math.trunc(hours), format: "hour" }
    if (Math.trunc(weeks) == 0 && Math.trunc(days) == 0 && Math.trunc(hours) !== 0) return { timeago: Math.trunc(hours), format: "hours" }
    if (Math.trunc(weeks) == 0 && Math.trunc(days) !== 0 && Math.trunc(days) == 1) return { timeago: Math.trunc(days), format: "day" }
    if (Math.trunc(weeks) == 0 && Math.trunc(days) !== 0) return { timeago: Math.trunc(days), format: "days" }
    if (Math.trunc(weeks) !== 0 && Math.trunc(weeks) == 1) return { timeago: Math.trunc(weeks), format: "week" }
    if (Math.trunc(weeks) !== 0) return { timeago: Math.trunc(weeks), format: "weeks" }

  }

  // const requests = await userModel.findById(userId).populate("requests", "requester recipient groupToJoin status").exec()
  const requests = await requestsModel.find({ recipient: userId }).populate('requester', 'nickname').populate('groupToJoin', 'title').exec()
  const dateFormatRequests = requests.map(item => {
    const container = {}
    container["_id"] = item._id,
    container["requester"] = item.requester,
    container["recipient"] = item.recipient
    container["status"] = item.status,
    container["groupToJoin"] = item.groupToJoin,
    container["date"] = getTimeSince(new Date(item.date).getTime())
    return container;
  })



  // console.log(dateFormatRequests)
  res.send(dateFormatRequests)
})

router.get("/deletegroups", async (req, res) => {
  try {
    await groupModel.deleteMany({})
    console.log("Model collection cleared.")
    res.sendStatus(200)
  }
  catch (error) {
    res.send(error)
  }
})

router.post("/removeuserfromgroup", verifyAccessToken, async (req, res) => {
  const userID = toId(req.body.userID);
  const groupID = toId(req.body.groupID);

  try {
    await groupModel.findByIdAndUpdate(groupID, { $pull: { members: userID } }).exec()
    await userModel.findByIdAndUpdate(userID, { $pull: { groups: groupID } }).exec()
    console.log(`User ${userID} removed from group ${groupID} !`)
    res.sendStatus(200)
  }
  catch (error) {
    console.dir(error)
    res.sendStatus(400)
  }
})


//ADD USER TO GROUP. ASSESS IF USER ALREADY EXISTS AND EXIT, OTHERWISE ADD
router.post("/addUserToGroup", verifyAccessToken, async (req, res) => {
  //takes a group id and adds a person to group
  const userID = toId(req.body.userID);  //ID of user to be added
  const groupID = toId(req.body.groupID);  //ID of group that user will be added to
  const creatorID = toId(req.queryUserId) //id of user who;s adding someone to group
  //const ownGroups = await groupModel.find({creator:creatorID}).exec(); //groups created by person who's adding to group
  //tests if user is owner of group
  if (await groupModel.countDocuments({ creator: creatorID, _id: groupID }).exec()) {
    try {
      //need to test if user has accepted request
      if (await addUserToGroup(groupID, userID)) {
        await updatePendingTransactions(groupID) //recalculate when new user enters
        res.sendStatus(200)
      }
    }
    catch (error) {
      console.dir(error)
      res.sendStatus(400)
    }
  }
  else {
    console.log("Can't add user to not owned group")
    res.sendStatus(400)
  }
  //look into request schema for userID to see if request is pending
})

//DELETES GROUP AND REMOVES IT FROM USER'S ARRAY
router.delete("/deletegroup/:groupID", async (req, res) => {
  const groupID = (toId(req.params.groupID));
  try {
    const removeGroup = await groupModel.deleteOne({ _id: groupID }) //deletes group
    const userGroupRemoval = await userModel.updateMany({/*_id:userID for specific document in collection*/ }, { $pull: { groups: groupID } }) //deletes group from groups of Person collection when group is deleted
    res.json({ removeGroup, userGroupRemoval })
  }
  catch (err) {
    res.json({ message: err });
  }
})

router.post("/deletegroup", verifyAccessToken, async (req, res) => {
  const groupId = (toId(req.body.groupId));
  try {
    await userModel.updateMany(
      { /*_id:userID for specific document in collection*/ },
      { $pull: { groups: groupId } }
    ).exec() //deletes group from groups of Person collection when group is deleted

    await groupModel.deleteOne({ _id: groupId }).exec() //deletes group
    console.log(`Group ${req.body.groupId} deleted successfully !`)
    res.sendStatus(200)
  }
  catch (error) {
    console.dir(error)
    res.sendStatus(500)
  }
})

// FINDS GROUP CREATED BY USER
router.get("/groupsbycreator", verifyAccessToken, async (req, res) => {
  const creatorID = toId(jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId)
  const groups = await groupModel.find({ creator: creatorID }).exec()
  res.send(groups)
})


router.get("/mygroups", verifyAccessToken, async (req, res) => {
  const userID = toId(jwt.verify(req.accessToken, config.ACCESS_TOKEN_SECRET).userId)
  const groups = await userModel.findById(userID).populate("groups", "title").exec()
  // console.log(JSON.stringify(groups.groups, null, 2))
  setTimeout(() => {res.send(groups.groups)}, 0)
  // res.send(groups.groups)
})

router.get("/:groupId", verifyAccessToken, async (req, res) => {
  const group = await groupModel.findById(req.params.groupId).populate({ path: "pendingTransactions", populate: {path: "sender receiver", model: "Users" }})
  .populate({ path: "members", model:"Users"})
  .populate({ path: "transactions", populate: {path: "sender receiver", model: "Users" }})
  // console.log("group",group)
  res.send(group)
})

router.get("/group/:groupID", verifyAccessToken, async (req, res) => {
  const group = await groupModel.findById(req.params.groupID).populate("members", "nickname")
  // console.log(JSON.stringify(group, null, 2))
  res.send(group)
})

//GIVEN USER ID GET GROUPS THEY BELONG TO
router.get("/groupsinuserID/:userID", async (req, res) => {
  const userID = toId(req.params.userID)
  const groups = await userModel.findById({ _id: userID }).populate("groups", "title members")
  res.json(groups)
})

//GIVEN GROUP ID GET USERS IN THAT PARTICULAR GROUP
router.get("/usersingroupID/:groupID", async (req, res) => {
  const groupID = toId(req.params.groupID)
  const users = await groupModel.findById({ _id: groupID }).populate("members", "name amount")
  res.json(users)
})

//FUNCTION - GIVEN GROUP AND USER ID ADDS USER TO GROUP
const addUserToGroup = async (groupID, userID) => {
  try {
    userFoundInGroup = await groupModel.countDocuments({ _id: groupID, members: userID }).exec()
    // Check if user is already in the group
    if (userFoundInGroup) {
      console.log(`User ${userID} already exists in group ${groupID}`)
      return false
    }
    else {
      // Add user to group and vice versa
      await groupModel.findByIdAndUpdate(groupID, { $push: { members: userID } }).exec()
      await userModel.findByIdAndUpdate(userID, { $push: { groups: groupID } }).exec()
      console.log(`User ${userID} added in group ${groupID} !`)
    }
    return true
  }
  catch (error) {
    console.dir(error)
    return false
  }
}

/////////////////////////////////Testing/////////////////////////////////////

// HANDLES ACCEPT OR DECLINE
router.post("/requesthandler", verifyAccessToken, async (req, res) => {
  const status = req.body.status;
  if (status === 2) { //if user declined request - delete request from model
    try {
      await requestsModel.deleteOne({ _id: req.body._id })
      console.log("deleted request with id", req.body._id)
      res.sendStatus(200)
    }
    catch (error) {
      res.sendStatus(400)
    }
  }
  else { //else if user accepts add user to group
    const userID = toId(req.queryUserId);  //ID of user to be added (current account that will accept request)
    const requestID = toId(req.body._id); //request ID
    const getRequestModelByID = await requestsModel.findById({ _id: requestID })
    const groupID = getRequestModelByID.groupToJoin;  //ID of group that user will be added to
    const creatorID = getRequestModelByID.requester

    //await requestsModel.findByIdAndUpdate(req.body._id, {status}) Updates requests schema model - not needed at the moment - could be useful if we want to keep actions in the future

    //tests if user is owner of group and whether status is pending
    if (!await groupModel.countDocuments({ creator: creatorID, _id: groupID }).exec()) {
      console.log("Can't add user to not owned group")
      return res.sendStatus(400)
    }
    if (!getRequestModelByID.status === 0) {
      console.log("Status is not pending")
      return res.sendStatus(400)
    }
    else {
      try {
        //need to test if user has accepted request
        if (await addUserToGroup(groupID, userID)) {
          await requestsModel.deleteOne({ _id: requestID }) //deletes request from requests schema
          await userModel.updateMany({}, { $pull: { requests: requestID } })//deletes request from user's schema
          return res.sendStatus(200)
        }
      }
      catch (error) {
        console.dir(error)
        return res.sendStatus(400)
      }
    }
  }
})
/////////////////////////////////End of Testing/////////////////////////////////////



module.exports = router;