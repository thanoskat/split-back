const mongoose = require("mongoose")

const expenseSchema = mongoose.Schema({
    debtor: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: true
    },
    group: {
        type: mongoose.Types.ObjectId, ref: 'Group'
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    }
})

const expenseModel = mongoose.model("Expense", expenseSchema);

module.exports = expenseModel;