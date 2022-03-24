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
  tags: [{
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
    }]
  }],
  transfers:[{
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
  }
})

//https://stackoverflow.com/questions/20009122/removing-many-to-many-reference-in-mongoose

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;

