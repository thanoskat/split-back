const express=require("express");
const router=express.Router();
const groupModel = require("../models/groupModel")
const userModel = require('../models/userModel')
const requestsModel =require("../models/requestsModel")
const mongoose=require("mongoose");
const toId = mongoose.Types.ObjectId; //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
const jwt = require('jsonwebtoken');
const { findById, deleteOne } = require("../models/groupModel");
const config = process.env
//1423qrwe

//CREATE GROUP WITH USER'S ID. DON'T HAVE TO WORRY ABOUT MULTIPLE GROUPS
//creators are automatically members of group they create

router.post("/creategroup", verifyAccessToken, async (req, res) => {
  try{
    const creatorID = toId(jwt.verify(req.accessToken,config.ACCESS_TOKEN_SECRET).userId)
    const group = new groupModel({
      creator: creatorID,
      title: req.body.title
    })
    const savedGroup = await group.save();
    addUserToGroup(group._id,creatorID) //creators are automatically members of group they create
    // console.dir("savedgroup")
    // res.json(savedgroup);
    res.sendStatus(200)
  }catch(err){
    console.dir(err)
    res.json({message:err})
  }
})

//CREATES NEW GROUP REQUEST
router.post("/creategrouprequest", verifyAccessToken, async(req,res)=>{

  try{
    //tests if request has already been sent
    const requestsFound = await requestsModel.countDocuments({
      requester:toId (req.queryUserId),
      recipient:req.body.recipient,
      status:0,
      groupToJoin:req.body.groupToJoin }).exec()
    //need to test if user has previously accepted similar request hence already member of group request is
    //about to be sent
    // const membersFounder =  await groupModel.find({_id:req.body.groupToJoin})
    // const foundOne = membersFounder[0].members.find(e=>e==req.body.recipient) //is there a better way to do this?
    const foundOne = await groupModel.countDocuments(
      {
        _id: req.body.groupToJoin,
        members: req.body.recipient
      }).exec()
    console.log(foundOne)

    if(requestsFound) {
      console.log(`request to join group with ID ${req.body.groupToJoin} already sent and is pending with status ${0}`)
      return res.sendStatus(200)
    }
    if(foundOne){
      console.log(`Already member of group with ID ${req.body.groupToJoin}`)
    }
    else{
      //if request is new, creates this request
      const newGroupRequest = new requestsModel({
      requester: toId (req.queryUserId), //current user who's sending invitation
      recipient:req.body.recipient,
      status:0, //0 pending, 1 accepted, 2 declined. For new requests that should be set to 0,
      groupToJoin:req.body.groupToJoin

    })
      const newReq = await newGroupRequest.save();
      await userModel.findByIdAndUpdate(req.body.recipient, { $push: { requests: newReq } }).exec()
      return res.sendStatus(200)
    }


    }catch(err){
      console.dir(err)
      res.json({message:err})
  }
})

router.get('/getgrouprequests', verifyAccessToken, async (req, res) =>{
    const userID = toId(req.queryUserId)
    const requests = await userModel.findById(userID).populate("requests", "requester recipient groupToJoin status").exec()
    res.send(requests)
})


router.get("/deletegroups", async (req, res) => {
  try {
    await groupModel.deleteMany({})
    console.log("Model collection cleared.")
    res.sendStatus(200)
  }
  catch(error) {
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
  catch(error) {
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
  if(await groupModel.countDocuments({creator:creatorID,_id:groupID}).exec()){
    try {
      //need to test if user has accepted request
      if(await addUserToGroup(groupID, userID)) {
        res.sendStatus(200)
      }
    }
    catch(error) {
      console.dir(error)
      res.sendStatus(400)
    }
  }else{
    console.log("Can't add user to not owned group")
    res.sendStatus(400)
  }
  //look into request schema for userID to see if request is pending
})

//DELETES GROUP AND REMOVES IT FROM USER'S ARRAY
router.delete("/deletegroup/:groupID", async (req, res) => {
  const groupID = (toId(req.params.groupID));
  try {
    const removeGroup = await groupModel.deleteOne({_id:groupID}) //deletes group
    const userGroupRemoval = await userModel.updateMany({/*_id:userID for specific document in collection*/},{$pull:{groups:groupID}}) //deletes group from groups of Person collection when group is deleted
    res.json({removeGroup, userGroupRemoval})
  }
  catch(err) {
    res.json({message:err});
  }
})

//Works for id in schema
// router.delete("/del/:groupID", async (req,res)=>{
//     const groupID=toId(req.params.groupID)
//     const userID=toId("61927bbfa5dd5fe206f4571c")
//     try {
//         removal  = await userModel.updateOne({_id:userID},{$pull:{groups:{_id:groupID}}})
//         console.log(removal)
//         res.json(removal)
//     }catch(err){
//         res.json({message:err});
//     }
// })

// FINDS GROUP CREATED BY USER
router.get("/groupsbycreator",verifyAccessToken, async (req, res)=>{
  const creatorID = toId(jwt.verify(req.accessToken,config.ACCESS_TOKEN_SECRET).userId)
  const groups = await groupModel.find({creator:creatorID}).exec()
  res.send(groups)
})


router.get("/mygroups", verifyAccessToken, async (req, res) => {
  const userID = toId(jwt.verify(req.accessToken,config.ACCESS_TOKEN_SECRET).userId)
  const groups = await userModel.findById(userID).populate("groups", "title").exec()
  // console.log(JSON.stringify(groups.groups, null, 2))
  res.send(groups.groups)
})

router.get("/group/:groupID", verifyAccessToken, async (req, res) => {
  const group = await groupModel.findById(req.params.groupID).populate("members", "nickname")
  // console.log(JSON.stringify(group, null, 2))
  res.send(group)
})

//GIVEN USER ID GET GROUPS THEY BELONG TO
router.get("/groupsinuserID/:userID", async (req, res)=>{
    const userID = toId(req.params.userID)
    const groups = await userModel.findById({_id:userID}).populate("groups","title")
    res.json(groups)
})

//GIVEN GROUP ID GET USERS IN THAT PARTICULAR GROUP
router.get("/usersingroupID/:groupID", async(req,res)=>{
    const groupID=toId(req.params.groupID)
    const users = await groupModel.findById({_id:groupID}).populate("members","name amount")
    res.json(users)
})

//FUNCTION - GIVEN GROUP AND USER ID ADDS USER TO GROUP
const addUserToGroup = async (groupID, userID) => {
  try{
    userFoundInGroup = await groupModel.countDocuments({_id: groupID, members: userID}).exec()
    // Check if user is already in the group
    if(userFoundInGroup) {
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
  catch(error) {
    console.dir(error)
    return false
  }
}

/////////////////////////////////Testing/////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

// router.post("/updatestatus", verifyAccessToken, async(req, res)=>{
//   const status=req.body.status
//   const request = await requestsModel.findByIdAndUpdate(req.body._id, {status})
//   console.log(request.status)
//   res.sendStatus(200)
// })

//DELETES REQUEST AFTER USER HAS DECLINED IT
router.post('/deleterequest', verifyAccessToken, async(req, res)=>{
  try{
    await requestsModel.deleteOne({_id:req.body._id})
    console.log("deleted request with id", req.body._id )
    res.sendStatus(200)
  }
    catch(err){
    res.sendStatus(400)
    }
})


router.post("/addUserToGroup2", verifyAccessToken, async (req, res) => {
  //takes a group id and adds a person to group
  const userID = toId(req.queryUserId);  //ID of user to be added (current account that will accept request)
  const groupID = toId(req.body.groupID);  //ID of group that user will be added to
  const requestID=toId(req.body._id);
  const getRquestByID = await requestsModel.findById({_id:requestID}) //id of request
  const creatorID=getRquestByID.requester
  const status=req.body.status;
  await requestsModel.findByIdAndUpdate(req.body._id, {status})

  //tests if user is owner of group and whether status is pending
  if(await groupModel.countDocuments({creator:creatorID,_id:groupID}).exec() && getRquestByID.status===0){
    try {
      //need to test if user has accepted request
      if(await addUserToGroup(groupID, userID)) {
         await requestsModel.deleteOne({_id:requestID}) //deletes request from requests schema
         await userModel.updateMany({},{$pull:{requests:requestID}})//deletes request from user's schema
         res.sendStatus(200)
      }
    }
    catch(error) {
      console.dir(error)
      res.sendStatus(400)
    }
  }else{
    console.log("Can't add user to not owned group")
    res.sendStatus(400)
  }
})

/////////////////////////////////End of Testing/////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
module.exports=router;