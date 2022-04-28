const mongoose = require("mongoose")
const Schema = mongoose.Schema;

// const personSchema = mongoose.Schema({
//     //_id     : mongoose.Types.ObjectId,
//      name   : String,
//      amount : Number,
//      groups :[{type:mongoose.Types.ObjectId, ref: 'Group' }]
// });

const groupSchema = mongoose.Schema({
  creator: { type: mongoose.Types.ObjectId, ref: 'Users' },
  title: String,
  groupTags: [{
    name: String,
    color: String,
    required: false
  }],
  members: [{ type: mongoose.Types.ObjectId, ref: 'Users' }],
  expenses: [{
    sender: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: false,

    },
    tobeSharedWith: [{
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: false
    }],
    expenseTags: [{
      type: mongoose.Types.ObjectId,
      // name: String,
      // color: String,
      // required: false
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
  }],
  transfers: [{
    sender: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    receiver: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: false
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  //Transactions to be removed
  transactions: [{
    sender: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    receiver: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: false
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    tobeSharedWith: [{
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: false
    }]
  }],
  pendingTransactions: [{
    sender: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    receiver: {
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  totalSpent: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now //Date.now because Date.now is a function that will be run when you make objects. Date.now() is the date that your models.js was parsed. Ie, if you use Date.now() all your objects will have the same date, and that will be the date models was parsed
  },
})

//https://stackoverflow.com/questions/20009122/removing-many-to-many-reference-in-mongoose

const Group = mongoose.model("Group", groupSchema);
// const GroupTags = mongoose.model("GroupTags", groupSchema.groupTags)

module.exports = Group;
