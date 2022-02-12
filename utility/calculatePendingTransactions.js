const calculatePendingTransactions = (transactions, members) => {

  // Initialize spenders array with 0 balances
  const spenders = []
  members.map(member => {
    spenders.push({
      id: member,
      balance: 0
    })
  })

  // Initialize total amount spent outside of group
  let totalSpent = 0

  transactions.map(transaction => {
    // If receiver is outside of group (null) add the expense to total
    if(transaction.receiver == null) {
      totalSpent += transaction.amount
    }
    // Loop spenders and adjust balances for each transaction
    spenders.map(spender => {
      if(transaction.sender.toString() == spender.id.toString()) {
        spender.balance -= transaction.amount
      }
      if(transaction.receiver != null && transaction.receiver.toString() == spender.id.toString()) {
        spender.balance += transaction.amount
      }
    })
  })

  console.log(spenders)
  console.log('totalSpent: ', totalSpent)

  const debtors = []
  const creditors = []

  spenders.map(spender => {
    debtOrCredit = spender.balance + (totalSpent/spenders.length)
    if( debtOrCredit > 0) {
      debtors.push({
        id: spender.id,
        amount: debtOrCredit
      })
    }
    else {
      creditors.push({
        id: spender.id,
        amount: debtOrCredit
      })
    }
  })

  console.log("Debtors:")
  console.log(debtors)
  console.log("Creditors:")
  console.log(creditors)
}

module.exports = calculatePendingTransactions
