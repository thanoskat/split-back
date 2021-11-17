const express=require("express");
const router=express.Router();
const Group = require("../models/groupModel")
const Users = require('../models/userModel')
const mongoose=require("mongoose");
const toId = mongoose.Types.ObjectId; //builds object from string ID
const verifyAccessToken = require('../middleware/verifyAccessToken')
//1423qrwe

//CREATE GROUP WITH USER'S ID. DON'T HAVE TO WORRY ABOUT MULTIPLE GROUPS
//creators are automatically members of group they create

router.post("/creategroup", verifyAccessToken, async (req, res)=>{ 
    //takes a person id and creates group
    const authHeader = req.headers['authorization']
    const token = authHeader.split(' ')[1]
    const creatorID = toId(jwt.verify(token,config.ACCESS_TOKEN_SECRET).userId)
    const group = new Group({
        creator:creatorID,
        title:req.body.title
    })

    try{
        const savedgroup = await group.save();
        addusertogroup(group._id,creatorID) //creators are automatically members of group they create
        res.json(savedgroup);
    }catch(err){
        res.json({message:err})
    }
})


//ADD USER TO GROUP. ASSESS IF USER ALREADY EXISTS AND EXIT, OTHERWISE ADD
router.post("/addusertogroup/:groupID/:personID", async (req, res)=>{  
    //takes a group id and adds a person to group
    const personID = (toId(req.params.personID));
    const groupID = (toId(req.params.groupID));
      
    try{
        addusertogroup(groupID, personID)
        res.json(addusertogroup.obj)
    }catch(err){
        res.json({message:err})
    }   
})

//DELETES GROUP AND REMOVES IT FROM USER'S ARRAY 
router.delete("/deletegroup/:groupID", async (req, res)=>{
    const groupID = (toId(req.params.groupID));
    try{
        const removeGroup = await Group.deleteOne({_id:groupID}) //deletes group
        const userGroupRemoval = await Users.updateMany({/*_id:personID for specific document in collection*/},{$pull:{groups:groupID}}) //deletes group from groups of Person collection when group is deleted
        res.json({removeGroup, userGroupRemoval})
    }catch(err){
        res.json({message:err});
    }
})

//Works for id in schema
router.delete("/del/:groupID", async (req,res)=>{
    const groupID=toId(req.params.groupID)
    const personID=toId("61927bbfa5dd5fe206f4571c")
    try {
        removal  = await Users.updateOne({_id:personID},{$pull:{groups:{_id:groupID}}})
        console.log(removal)
        res.json(removal)
    }catch(err){
        res.json({message:err});
    }
})

//GIVEN USER ID GET GROUPS THEY BELONG TO
router.get("/groupsinuserID/:userID", async (req, res)=>{
    const userID = toId(req.params.userID)  
    const groups = await Users.findById({_id:userID}).populate("groups","title")
    res.json(groups)
})

//GIVEN GROUP ID GET USERS IN THAT PARTICULAR GROUP
router.get("/usersingroupID/:groupID", async(req,res)=>{
    const groupID=toId(req.params.groupID)
    const users = await Group.findById({_id:groupID}).populate("members","name amount")
    res.json(users)
})

//FUNCTION - GIVEN GROUP AND USER ID ADDS USER TO GROUP
const addusertogroup = async (groupID, personID)=>{

    const group  = await Group.findById(groupID);
    const person = await Users.findById(personID);
    console.log(group.creator);
    const finder = group.members.some((member)=>{
     //checks if user already is member of group
        return member._id.equals(personID)
    })
    
    if(finder){
        console.log("Already exists")

    }else{
        console.log("User added!")
        person.groups.push(groupID);
        group.members.push(personID);
    }
    
    //try{

        const savedgroup = await group.save();
        const savedperson= await person.save();
        const obj={savedgroup, savedperson}
        // res.json(obj);
        return obj

    //}catch(err){
        //res.json({message:err})
       // console.log(err)
    //}
}


module.exports=router;