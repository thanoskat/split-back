const currency = require("currency.js");

const calcPending2 = (expenses,transfers, members) => {

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

      //divide expense over the number of people who will share 
      const distributedAmountArray = currency(expense.amount)
      .distribute(expense.tobeSharedWith.length) //for unequal split, we would have to make changes here. Personalized array will be taking the splitAmount rather than the distributed amount
      //for every tx and every spender, update their personalized array of money to equilibrium
     
      //[{ id: member._id, splitAmount: "" },
      //{ id: member._id, splitAmount: "" },
      //{ id: member._id, splitAmount: "" }]
      // expense.tobeSharedWith.map((shareObject) => {
      //   spenders.map(spender => {
      //     if (spender.id.toString() === shareObject.id.toString()) {          
      //      spender.moneySummedAndDistributed=currency(spender.moneySummedAndDistributed)
      //      .add(shareObject.splitAmount)   
      //     }
      //   })
      // })

      expense.tobeSharedWith.map((shareID, index) => {
        spenders.map(spender => {
          if (spender.id.toString() === shareID.toString()) {          
           spender.moneySummedAndDistributed=currency(spender.moneySummedAndDistributed)
           .add(distributedAmountArray[index])   
          }
        })
      })

    // Loop spenders and adjust balances for each expense
    spenders.map(spender => {
      if (expense.sender.toString() == spender.id.toString()) {
        spender.balance = spender.balance.subtract(expense.amount)
      }
    })
  })

  // Loop through transfers
  transfers.map(transfer=>{
     // Loop spenders and adjust balances for each transfer
    spenders.map(spender => {
    if (transfer.sender.toString() == spender.id.toString()) {
      spender.balance = spender.balance.subtract(transfer.amount)
    }
    if ( transfer.receiver.toString() == spender.id.toString()) {
      spender.balance = spender.balance.add(transfer.amount)
    }})
  })

  //console.log("spenders", spenders)

  // Separate spenders in debtors and creditors
  const debtors = []
  const creditors = []
  //const moneyArray = currency(totalSpent).distribute(spenders.length)
  //console.log(moneyArray)
  //console.log("START")
  spenders.map((spender) => {
    //debtOrCredit = currency(spender.balance).add(moneyArray[index])
    debtOrCredit = currency(spender.balance).add(spender.moneySummedAndDistributed.value)
    // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    // console.log("moneyArr",spender.moneySummedAndDistributed.value)
    // console.log("debtOrCredit",debtOrCredit)//check against excel
    // console.log("balance",spender.balance)
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
    pendingTransactions: pendingTransactions,
    totalSpent: totalSpent.value
  })
}

module.exports = calcPending2