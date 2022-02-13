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

  // Loop through transactions
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

  // Separate spenders in debtors and creditors
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
        amount: debtOrCredit*(-1)
      })
    }
  })

  console.log('totalSpent: ', totalSpent)

  const pendingTransactions = []

  while(debtors.length > 0 && creditors.length > 0) {
    // Pop last element of each array
    const poppedDeptor = debtors.pop()
    const poppedCreditor = creditors.pop()
    const difference = Math.abs(poppedDeptor.amount - poppedCreditor.amount)

    if(poppedDeptor.amount < poppedCreditor.amount){
      creditors.push({
        id: poppedCreditor.id,
        amount: difference
      })
    }
    else if(poppedDeptor.amount > poppedCreditor.amount) {
      debtors.push({
        id: poppedDeptor.id,
        amount: difference
      })
    }
    const pendingTransaction = {
      sender: poppedDeptor.id,
      receiver: poppedCreditor.id,
      amount: Math.min(poppedDeptor.amount, poppedCreditor.amount)
    }
    pendingTransactions.push(pendingTransaction)
  }

  console.log("\nPENDING TRANSACTIONS")
  console.log(pendingTransactions)

  return(pendingTransactions)
}

module.exports = calculatePendingTransactions
