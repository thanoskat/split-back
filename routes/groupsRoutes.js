const express=require("express");
const router=express.Router();
const groupModel = require("../models/groupModel")
const userModel = require('../models/userModel')
const mongoose=require("mongoose");
const toId = mongoose.Types.ObjectId; //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
const jwt = require('jsonwebtoken')
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


//ADD USER TO GROUP. ASSESS IF USER ALREADY EXISTS AND EXIT, OTHERWISE ADD
router.post("/addUserToGroup", verifyAccessToken, async (req, res)=>{
    //takes a group id and adds a person to group
    const userID = toId(req.body.userID);          //(toId(req.params.userID));
    const groupID = toId(req.body.groupID);       //(toId(req.params.groupID));

    try{
        addUserToGroup(groupID, userID)
        res.json(addUserToGroup.obj)
    }catch(err){
        res.json({message:err})
    }
})

//DELETES GROUP AND REMOVES IT FROM USER'S ARRAY
router.delete("/deletegroup/:groupID", async (req, res)=>{
    const groupID = (toId(req.params.groupID));
    try{
        const removeGroup = await groupModel.deleteOne({_id:groupID}) //deletes group
        const userGroupRemoval = await userModel.updateMany({/*_id:userID for specific document in collection*/},{$pull:{groups:groupID}}) //deletes group from groups of Person collection when group is deleted
        res.json({removeGroup, userGroupRemoval})
    }catch(err){
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

router.get("/mygroups", verifyAccessToken, async (req, res) => {
  const userID = toId(jwt.verify(req.accessToken,config.ACCESS_TOKEN_SECRET).userId)
  const groups = await userModel.findById(userID).populate("groups", "title").exec()
  // console.log(JSON.stringify(groups.groups, null, 2))
  res.send(groups.groups)
})

router.get("/group/:groupID", verifyAccessToken, async (req, res) => {
  const group = await groupModel.findById(req.params.groupID)
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

module.exports=router;