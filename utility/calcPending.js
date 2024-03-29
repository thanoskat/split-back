const currency = require("currency.js");

const calcPending = (transactions, members) => {

  // Initialize spenders array with 0 balances
  const spenders = []
  members.map(member => {
    spenders.push({
      id: member,
      balance: currency(0, { symbol: '' })
    })
  })

  // Initialize total amount spent outside of group
  let totalSpent = currency(0, { symbol: '' })

  // Loop through transactions
  transactions.map(transaction => {
    // If receiver is outside of group (null) add the expense to total
    if(transaction.receiver == null) {
      totalSpent = totalSpent.add(transaction.amount)
    }
    // Loop spenders and adjust balances for each transaction
    spenders.map(spender => {
      if(transaction.sender.toString() == spender.id.toString()) {
        spender.balance = spender.balance.subtract(transaction.amount)
      }
      if(transaction.receiver != null && transaction.receiver.toString() == spender.id.toString()) {
        spender.balance = spender.balance.add(transaction.amount)
      }
    })
  })

  // Separate spenders in debtors and creditors
  const debtors = []
  const creditors = []
  const moneyArray = currency(totalSpent).distribute(spenders.length)

  spenders.map((spender, index) => {
    debtOrCredit = currency(spender.balance).add(moneyArray[index])
    // if debt
    if(debtOrCredit.value > 0) {
      debtors.push({
        id: spender.id,
        balance: debtOrCredit
      })
    }
    // if credit
    else if(debtOrCredit.value < 0) {
      creditors.push({
        id: spender.id,
        balance: debtOrCredit
      })
    }
  })

  const pendingTransactions = []

  while(debtors.length > 0 && creditors.length > 0) {
    // Pop last element of each array
    const poppedDebtor = debtors.pop()
    const poppedCreditor = creditors.pop()
    const diff = poppedDebtor.balance.add(poppedCreditor.balance)
    let amountPaid

    // if credit is bigger than debt
    if(diff.value < 0) {
      creditors.push({
        id: poppedCreditor.id,
        balance: diff
      })
      amountPaid = Math.abs(poppedDebtor.balance.value)
    }
    // if credit is equal to debt
    else if(diff.value == 0) {
      amountPaid = Math.abs(poppedDebtor.balance.value)
    }
    // if debt is bigger than credit
    else if(diff.value > 0) {
      debtors.push({
        id: poppedDebtor.id,
        balance: diff
      })
      amountPaid = Math.abs(poppedCreditor.balance.value)
    }

    pendingTransactions.push({
      sender: poppedDebtor.id,
      receiver: poppedCreditor.id,
      amount: amountPaid
    })
  }

  return({
    pendingTransactions: pendingTransactions,
    totalSpent: totalSpent.value
  })
}

module.exports = calcPending
