const mongoose = require("mongoose")
//const Schema = mongoose.Schema;

const addToGroupRequestSchema = mongoose.Schema({
    requester: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: true
    },
    recipient: {
        type: mongoose.Types.ObjectId, ref: 'Users',
        required: true
    },
    status: {
        type: Number,
        required: true
    },
    groupToJoin: { type: mongoose.Types.ObjectId, ref: 'Group' },
    date: {
        type: Date,
        default: Date.now //Date.now because Date.now is a function that will be run when you make objects. Date.now() is the date that your models.js was parsed. Ie, if you use Date.now() all your objects will have the same date, and that will be the date models was parsed
    }
});


const requestsModel = mongoose.model("GroupRequest", addToGroupRequestSchema);

module.exports = requestsModel;

