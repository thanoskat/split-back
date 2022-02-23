const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const transactionSchema = mongoose.Shchema({
    
    currentTransactions: [{
        debtorID: mongoose.Types.ObjectId,
        ownedID: mongoose.Types.ObjectId,
        debtorName: String,
        ownedName: String
      }]
})

const Transactions = mongoose.model("Transactions", transactionSchema);

module.exports = Transactions;
