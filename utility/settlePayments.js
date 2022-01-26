

function* permutator(permutation) {
    var length = permutation.length,
        c = Array(length).fill(0),
        i = 1, k, p;

    yield permutation.slice();
    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            yield permutation.slice();
        } else {
            c[i] = 0;
            ++i;
        }
    }
}

const paySettle = (participantArray) => {
    
    //console.log(debtObj)
    let humans = participantArray.map(x => x.debtor._id); //need to call function that will take debtInput here and will return permutated humans.
    let debt = participantArray.map(x => x.debt);
    let stateC = 0;
    let stateD = 0;
    let StateDim = -1;
    let negtracker = -1;
    let postracker = -1;
    let Remainder = 0;
    let storage = 0;
    let State = [];

    for (let i = 0; i < debt.length; i++) {
        if (debt[i] < 0) {
            negtracker = i;
            stateC++;

        }//end if

        for (let j = 0; j < debt.length; j++) {
            if (debt[j] > 0) {
                postracker = j;
                stateC++


            } //end if

            if (stateC > stateD && negtracker !== -1 && postracker !== -1 && debt[negtracker] !== 0 && debt[postracker] !== 0) {

                //stateC updates when a positive or negative balance has been spotted.
                //This is not enough though - it might update StateC without updating the +ve or -ve trackers (thus returnig NaNs)
                //We also don't have to loop when debt[X] is zero as acount balance has been settled.

                StateDim++
                stateD = stateC;
                Remainder = debt[negtracker] + debt[postracker];


                if (Remainder <= 0) {
                    storage = debt[postracker];
                    debt[negtracker] = Remainder;
                    debt[postracker] = 0;
                    // State[StateDim] = humans[postracker] + "--> " + humans[negtracker] + " " + storage;
                    State[StateDim] ={debtor:humans[postracker], owned:humans[negtracker],amount:storage  }


                } else {
                    storage = -debt[negtracker];
                    debt[negtracker] = 0;
                    debt[postracker] = Remainder;
                    // State[StateDim] = humans[postracker] + "--> " + humans[negtracker] + " " + storage;
                    State[StateDim] ={debtor:humans[postracker], owned:humans[negtracker],amount:storage  }


                }
                //end if 
            }//end if
        }//Next j
    }//Next i

    //console.log(State);

    return State;

}

const countPos = (arr) => {
    let poscounter = 0;
    let negcounter = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > 0) { poscounter++ } else {
            if (arr[i] < 0) { negcounter++ }

        }
    }
    return { poscounter, negcounter };
}



const debtCalc = (moneySpent) => {
    let target = moneySpent.reduce(
        (accumulator, a) => accumulator + a
        , 0) / moneySpent.length;
    return moneySpent.map(x => target - x);
}

const debtCalc2 = (participantArray) => {
    let target = participantArray.reduce((acc, obj) => acc + obj.amountSpent, 0)
        / participantArray.length;
    // return target
    return participantArray.map(x => x["debt"] = target - x.amountSpent);
}


const debtCalc3 = (participantArray) => {
    let target = participantArray.reduce((acc, obj) => acc + obj.amount.reduce((a, b) => a + b, 0), 0) //first reducer is to add all amounts in the main array of amounts. Second reducer is to add all individual amounts per user in the amount array of the expenses document
        / participantArray.length;
    // return target
    return participantArray.map(x => x["debt"] = target - x.amount.reduce((a, b) => a + b, 0));
}

const CreateParticipant = (_name, _amount) => {
    myf: {

        if (typeof (_amount) !== "number" || _amount < 0) {
            console.log("Positive Number Required");
            break myf;
        }

        const newParticipant = new Participant(_name, _amount);
        // moneySpent.push(_amount);
        participantArray.push(newParticipant);
        //console.log(participantArray)
        
    }

}

const trackerCalc = (participantArray) => {


    let permutatedInput = [...permutator(participantArray)].slice(0);
    // console.log(permutatedInput[0].slice(0))
    // console.log(permutatedInput[0].slice(0))
    let minL = paySettle(permutatedInput[0].slice(0)).length;
    let maxL = Math.max(countPos(permutatedInput[0].slice(0).map(x => x.debt)).poscounter, countPos(permutatedInput[0].slice(0).map(x => x.debt)).negcounter);
    let result = paySettle(permutatedInput[0].slice(0));
    for (let i = 1; i < permutatedInput.length; i++) {

        if (paySettle(permutatedInput[i].slice(0)).length <= maxL) {
            // result=[];
            result = (paySettle(permutatedInput[i].slice(0)));
            break;
        } else {
            if (paySettle(permutatedInput[i].slice(0)).length <= minL) {
                //result=[];
                minL = paySettle(permutatedInput[i].slice(0)).length;
                result = paySettle(permutatedInput[i].slice(0));
            }
        }
    }

    return result;

}

let Participant = class {

    constructor(nickame, amountSpent) {
        this.nickame = nickame;
        this.amountSpent = amountSpent;
    }
}

let Debt = class {
    constructor(debt) {
        this.debt = debt;
    }
}
//Main 

// let participantArray = [];



//for example to work, need to remove the variable debtor from paySettle map
// CreateParticipant("A", 30);
// CreateParticipant("B", 40);
// CreateParticipant("C", 10);
// CreateParticipant("D", 10);


// debtCalc2(participantArray);
// console.log(participantArray)

// console.log(trackerCalc(participantArray));


module.exports={debtCalc3,trackerCalc}