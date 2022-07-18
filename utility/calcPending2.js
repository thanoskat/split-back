const currency = require('currency.js')

const calcPending2 = (expenses, transfers, members) => {

  // Initialize spenders array with 0 balances and 0 for the personalized array of money to equilibrium
  const spenders = []
  members.map(member => {
    spenders.push({
      id: member,
      balance: currency(0, { symbol: '' }),
      moneySummedAndDistributed: currency(0, { symbol: '' })
    })
  })

  //console.log(spenders)
  // Initialize total amount spent outside of group
  let totalSpent = currency(0, { symbol: '' })

  // Loop through expenses
  expenses.map(expense => {

    totalSpent = totalSpent.add(expense.amount)

    if (expense.splitEqually) {
      //divide expense over the number of people who will share
      const distributedAmountArray = currency(expense.amount)
      .distribute(expense.participants.length)

      expense.participants.map((shareObject, index) => {
        spenders.map(spender => {
          if (spender.id.toString() === shareObject.memberId.toString()) {
            spender.moneySummedAndDistributed = currency(spender.moneySummedAndDistributed)
              .add(distributedAmountArray[index])
          }
        })
      })

    } else {
      //check if expense amount is equal to add of contribution amounts
      let totalAmountCheck
       expense.participants.map((shareObject)=>{
        totalAmountCheck=currency(totalAmountCheck).add(shareObject.contributionAmount)
      })
      if (expense.amount!==totalAmountCheck.value) return console.log(totalAmountCheck,'expense amount does not match individual contribution for unequal split')

      expense.participants.map((shareObject) => {
        spenders.map(spender => {
          if (spender.id.toString() === shareObject.memberId.toString()) {
            spender.moneySummedAndDistributed = currency(spender.moneySummedAndDistributed)
              .add(shareObject.contributionAmount)
          }
        })
      })
    }

    // Loop spenders and adjust balances for each expense
    spenders.map(spender => {
      if (expense.spender.toString() === spender.id.toString()) {
        spender.balance = spender.balance.subtract(expense.amount)
      }
    })
  })
  // Loop through transfers
  transfers.map(transfer => {
    // Loop spenders and adjust balances for each transfer
    spenders.map(spender => {
      if (transfer.sender.toString() === spender.id.toString()) {
        spender.balance = spender.balance.subtract(transfer.amount)
      }
      if (transfer.receiver.toString() === spender.id.toString()) {
        spender.balance = spender.balance.add(transfer.amount)
      }
    })
  })

  // Separate spenders in debtors and creditors
  const debtors = []
  const creditors = []

    //console.log('START') to debug, ucomment all console.logs
  spenders.map((spender) => {
    debtOrCredit = currency(spender.balance).add(spender.moneySummedAndDistributed.value)
    // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
     //console.log('moneyArr',spender.moneySummedAndDistributed.value)
     //console.log('debtOrCredit',debtOrCredit)//check against excel
     //console.log('balance',spender.balance)
    // if debt
    if (debtOrCredit.value > 0) {
      debtors.push({
        id: spender.id,
        balance: debtOrCredit
      })
    }
    // if credit
    else if (debtOrCredit.value < 0) {
      creditors.push({
        id: spender.id,
        balance: debtOrCredit
      })
    }
  })

  const pendingTransactions = []

  while (debtors.length > 0 && creditors.length > 0) {
    // Pop last element of each array
    const poppedDebtor = debtors.pop()
    const poppedCreditor = creditors.pop()
    const diff = poppedDebtor.balance.add(poppedCreditor.balance)
    let amountPaid

    // if credit is bigger than debt
    if (diff.value < 0) {
      creditors.push({
        id: poppedCreditor.id,
        balance: diff
      })
      amountPaid = Math.abs(poppedDebtor.balance.value)
    }
    // if credit is equal to debt
    else if (diff.value == 0) {
      amountPaid = Math.abs(poppedDebtor.balance.value)
    }
    // if debt is bigger than credit
    else if (diff.value > 0) {
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

  return ({
    pendingTransactions: pendingTransactions
  })
}

module.exports = calcPending2