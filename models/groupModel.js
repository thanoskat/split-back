const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const personSchema = mongoose.Schema({
    //_id     : mongoose.Types.ObjectId,
     name   : String,
     amount : Number,
     groups :[{type:mongoose.Types.ObjectId, ref: 'Group' }]
});

const groupSchema = mongoose.Schema({
    _creator : {type:mongoose.Types.ObjectId, ref: 'Person' },
    title    : String,
    members  : [{ type:mongoose.Types.ObjectId, ref: 'Person' }]
})

//https://stackoverflow.com/questions/20009122/removing-many-to-many-reference-in-mongoose


const Person = mongoose.model("Person", personSchema);
const Group = mongoose.model("Group", groupSchema);

 module.exports={Person,Group};

