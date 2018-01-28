const fs = require('fs');
const path = require('path');
const db = require('./dbhandler.js').db.collection('waitlist');
const ObjectId = require('mongodb').ObjectID;

module.exports = function(setup) {
    var module = {};

    module.get = function(cb) {
        db.find({}).toArray(function(err, docs) {
            if (err) console.log(err);
            cb(docs);
        })
    }

    module.addToWaitlist = function(user, cb) {
    	module.checkIfUserIsIn(user.name, function(status) {
    		if (!status) {
                db.insert(user, function(err, doc) {
                    if (err) console.log(err);
                    cb(true);
                })
		   	} else {
		   		cb(true);
		   	}
	   	})
    }

    module.checkIfUserIsIn = function(name, cb) {
            db.findOne({ "name": name}, function(err, doc) {
                if (err) console.log(err);
                if (doc === null) {
                    cb(false)
                } else {
                    cb(true);
                }
            })
    }

    module.remove = function(tableID, cb) {
        console.log("Deleting ID from waitlist: " + tableID);
    	db.deleteOne({ '_id': ObjectId(tableID) }, function(err, result) {
            if (err) console.log(err);
            if (typeof cb === "function") cb();
        })
    }

    //TODO: Broken due to mongo. Do we care about the user knowing their position? We don't use it on the FC side really anyway.
    module.getUserPosition = function(characterID, cb) {
        cb({position: "##", length: "##"}, false)
    }

    return module;

}