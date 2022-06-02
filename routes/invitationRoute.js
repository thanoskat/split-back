const express = require('express')
const router = express.Router()
const mongoose = require("mongoose");
const userModel = require('../models/userModel')
const groupModel = require("../models/groupModel")
const invitationModel = require('../models/invitationModel')
const verifyAccessToken = require('../middleware/verifyAccessToken')
const generateInvitationCode = require('../utility/generateInvitationCode')

router.post('/create', verifyAccessToken, async (req, res) => {
  const invitationFound = await invitationModel.findOne({ inviter: req.queryUserId, group: req.body.group })
  if(invitationFound) return res.send(invitationFound)

  const invitation = new invitationModel ({
    inviter: req.queryUserId,
    code: generateInvitationCode(),
    group: req.body.group,
    createdAt: Date.now()
  })
  const savedInvitation = await invitation.save()
  return res.send(savedInvitation)
})

router.post('/regenerate', verifyAccessToken, async (req, res) => {
  const invitationFound = await invitationModel.deleteMany({ inviter: req.queryUserId, group: req.body.group })

  const invitation = new invitationModel ({
    inviter: req.queryUserId,
    code: generateInvitationCode(),
    group: req.body.group,
    createdAt: Date.now()
  })
  const savedInvitation = await invitation.save()
  return res.send(savedInvitation)
})

router.post('/verify', verifyAccessToken, async (req, res) => {
  try {
    const invitation = await invitationModel.findOne({ code: req.body.code })
    .populate('inviter', 'nickname')
    .populate('group', 'title')
    if(!invitation) return res.status(404).send('Invitation not found')

    const groupDoc = await groupModel.findOne(
      { _id: invitation.group, 'members': { $ne: req.queryUserId } }
    )
    if(!groupDoc) return res.status(409).send('Member already exists in group')

    const userDoc = await userModel.findOne(
      { _id: req.queryUserId, 'groups': { $ne: invitation.group }}
    )
    if(!userDoc) return res.status(409).send('Group already exists in user')

    res.status(200).send(
      {
        message: 'Invitation is valid',
        inviterNickname: invitation.inviter.nickname,
        groupTitle: invitation.group.title
      }
    )
  }
  catch(error) {
    console.log('500', error.message)
    res.status(500).send(error.message)
  }
})

router.post('/accept', verifyAccessToken, async (req, res) => {
  try {
    const invitation = await invitationModel.findOne({ code: req.body.code })
    .populate('group', 'title')
    if(!invitation) return res.status(404).send('Invitation has not been found')

    const groupDoc = await groupModel.findOneAndUpdate(
      { _id: invitation.group, 'members': { $ne: req.queryUserId } },
      { $addToSet: { members: req.queryUserId } }
    )
    if(!groupDoc) return res.status(409).send('Member already exists in group')

    const userDoc = await userModel.findOneAndUpdate(
      { _id: req.queryUserId, 'groups': { $ne: invitation.group }},
      { $addToSet: { groups: invitation.group }}
    )
    if(!userDoc) return res.status(409).send('Group already exists in user')

    res.status(200).send(
      {
        message: 'User joined group',
        groupTitle: invitation.group.title
      }
    )
  }
  catch(error) {
    console.log('500', error.message)
    res.status(500).send(error.message)
  }
})

module.exports = router;
