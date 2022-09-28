const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const groupSchema = mongoose.Schema({
  creator: { type: mongoose.Types.ObjectId, ref: 'Users' },
  title: String,
  groupLabels: [{
    name: String,
    color: String,
    required: false
  }],
  members: [{ type: mongoose.Types.ObjectId, ref: 'Users' }],
  expenses: [{
    splitEqually: {
      type: Boolean,
      required: true
    },
    paidByMany: {
      type: Boolean,
      required: true
    },
    spender:{
      type: mongoose.Types.ObjectId, ref: 'Users',
      required: true
    },
    spenders: [{
      spenderId: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: false
      },
      spenderAmount: {
        type: Number,
        required: true
      }
    }],
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true,
    },
    participants: [{
      memberId: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: false
      },
      contributionAmount: {
        type: Number,
        required: false
      }
    }],
    label: {
      type: mongoose.Types.ObjectId,
      required: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    includeNewMemberToThisExpense: {
      type: Boolean,
      required: false
    }
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
  createdAt: {
    type: Date,
    default: Date.now
  },
})

const Group = mongoose.model("Group", groupSchema)

module.exports = Group
