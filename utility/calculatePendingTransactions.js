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
    // If receiver is outside of group
    if(transaction.receiver == null) {
      totalSpent += transaction.amount
    }
    spenders.map(spender => {
      if(transaction.sender.toString() == spender.id.toString()) {
        spender.balance -= transaction.amount
      }
      if(transaction.receiver != null && transaction.receiver.toString() == spender.id.toString()) {
        spender.balance += transaction.amount
      }
    })
    // console.log(transaction)
  })

  console.log(spenders)
  console.log('totalSpent: ', totalSpent)

}

module.exports = calculatePendingTransactions
