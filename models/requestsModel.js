const mongoose = require("mongoose")
//const Schema = mongoose.Schema;

const addToGroupRequestSchema = mongoose.Schema({
    requester: {
        type:mongoose.Types.ObjectId, ref: 'Users' ,
        required: true
    },
    recipient: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: true
    },
    status:{
        type: Number,
        required: true
    } 
     });


const requestsModel = mongoose.model("GroupRequest", addToGroupRequestSchema);

module.exports = requestsModel;

