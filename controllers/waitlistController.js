const setup = require('../setup.js');
const banner = require('../models/waitlistBanner.js')(setup);
const broadcast = require('./broadcastController.js');
const fleets = require('../models/fleets')(setup);
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const waitlist = require('../models/waitlist.js')(setup);
const wlog = require('../models/wlog.js');

/*
* Render login page OR waitlist page
* @params req{}
* @return res{}
*/
exports.index = function(req, res){
    if(!req.isAuthenticated()){
        res.render('statics/login.html');
        return;
    }

    banner.getLast(function(banner){
        waitlist.getQueue((!!req.user.waitlistMain)? req.user.waitlistMain.characterID : 0, function(queueInfo) {
            waitlist.checkCharsOnWaitlist(req.user.account.pilots, function(charsOnWl) {                   
                var userProfile = req.user;
                var sideBarSelected = 1;
                res.render('waitlist.njk', {userProfile, sideBarSelected, banner, charsOnWl, queueInfo});
            })
        })        
    })
}

/*
* Adds pilot to the waitlist
* @params req{}
* @return res{}
*/
exports.signup = function(req, res){
    if(!req.isAuthenticated()){
        res.render('statics/login.html');
        return;
    }
    //TODO: Add check is pilot whitelisted
    users.findAndReturnUser(Number(req.body.pilot), function(pilot){
        if(req.params.type == "main"){
            var waitlistMain = {
                "characterID": pilot.characterID,
                "name": pilot.name
            }//Sets the waitlist main for the users session
            let accountMainID = (req.user.account.main)? req.user.characterID : req.user.account.mainID;
            user.setWaitlistMain(accountMainID, waitlistMain, function(err){
                if(err){
                    req.flash("content", {"class": "error", "title": "Woops!", "message": "We were unable to set your waitlist main."});
                }
            })
        } else {
            var waitlistMain = {
                "characterID": req.user.waitlistMain.characterID,
                "name": req.user.waitlistMain.name
            }
        }

        var contact = {
            "xmpp": (!!req.user.settings) ? req.user.settings.xmpp : null,
            "pingTarget": req.user.characterID
        }
        
        waitlist.add(waitlistMain, pilot, req.body.ship, contact, req.user.newbee, function(result){
            wlog.joinWl(pilot);
            req.flash("content", {"class": result.class, "title": result.title, "message": result.message});
            res.redirect(`/`);
        });
    })
}

/*
* Removes pilot, triggered by the pilot
* @params req{}
* @return res{}
*/
exports.selfRemove = function(req, res){
    if(!req.isAuthenticated()){
        res.render('statics/login.html');
        return;
    }

    waitlist.remove(req.params.type, req.params.characterID, function(result){
        wlog.selfRemove(req.params.characterID);
        req.flash("content", result);
        res.redirect("/");
    })
}

/*
* Admin removal of a pilot
* @params req{}
* @return res{}
*/
exports.removePilot = function(req, res){
    if(!users.isRoleNumeric(req.user, 1)){
        res.status(403).send("Not Authorized");
    }

    waitlist.adminRemove(req.params.characterID, function(cb){
        wlog.removed(req.params.characterID, req.user.characterID);
        res.status(cb).send();
    })
}

/*
* Alarms a pilot
* @params req{}
* @return res{}
*/
exports.alarm = function(req, res){
    if(!users.isRoleNumeric(req.user, 1)){
        res.status(403).send("Not Authorised");
        return;
    }
    broadcast.alarm(req.params.characterID, req.params.fleetID, req.user, "alarm");
    wlog.alarm(req.params.characterID, req.user.characterID);
    res.status(200).send();
}


/*
* Removes all pilots on the waitlist
* @params req{}
* @return res{}
*/
exports.clearWaitlist = function(req, res) {
    if(!users.isRoleNumeric(req.user, 1)){
        res.status(403).send("Not Authorised");
        return;
    }
    

    waitlist.get(function(pilotsOnWaitlist) {
        for (var i = 0; i < pilotsOnWaitlist.length; i++) {
            let charID = pilotsOnWaitlist[i].characterID;
            waitlist.remove("character", pilotsOnWaitlist[i].characterID, function(result){
                wlog.removed(charID, req.user.characterID);
            });
        }
        res.status(200).send();
    })        
}

/*
* Removes the pilot position on the waitlist
* @params req{}
* @return res{}
*/
exports.getPilotPosJson = function(req, res){
    if(!users.isRoleNumeric(req.user, 0)){
        res.status(401).send("Not Authorised");
        return;
    }

    waitlist.getQueue(req.user.characterID, function(queueObject){
        res.send(queueObject);
    });
}

/*
* Returns an object of a users known alts (On waitlist or fleet or else)
* @params req{ pilotID (int) }
* @return res{}
*/
exports.pilotStatus = function(req, res){
    if(!users.isRoleNumeric(req.user, 0)){
        res.status(401).send("Not Authorised");
        return;
    }

    var pilotStates = {
        "main": {},
        "other": []

    }

    //Get main
    users.getAlts(Number(req.params.characterID), function(knownPilots){
        for(let i = 0; i < knownPilots.length; i++) 
        {
            pilotStates.other.push(knownPilots[i]);
        }
        
        //Flag pilots that are on the wl with their timestamp
        var onWaitlistPromise = [];
        for(let i = 0; i < pilotStates.other.length; i++){
            var promise = new Promise(function(resolve, reject) {
                waitlist.isUserPresent(pilotStates.other[i].characterID, function(timestamp){
                    if(timestamp){
                        resolve(pilotStates.other[i] = {
                            "characterID": pilotStates.other[i].characterID,
                            "name": pilotStates.other[i].name,
                            "onWaitlist": true,
                            "timestamp": timestamp
                        });
                    } else {
                        resolve(pilotStates.other[i] = {
                            "characterID": pilotStates.other[i].characterID,
                            "name": pilotStates.other[i].name,
                            "onWaitlist": false
                        });
                    }
                })
            });
            onWaitlistPromise.push(promise);
        }
        
        
        Promise.all(onWaitlistPromise).then(function(members) {      
            var inFleetPromise = [];
            for(let i = 0; i < pilotStates.other.length; i++){
                var promise = new Promise(function(resolve, reject){
                    if(!pilotStates.other[i].onWaitlist){
                        fleets.inFleet(pilotStates.other[i].characterID, function(inFleet){
                            if(inFleet){
                                resolve(pilotStates.other[i].timestamp = inFleet);
                            } else {
                                resolve();
                            }
                        })
                    } else {
                        resolve();
                    }
                });

                inFleetPromise.push(promise);
            }
            Promise.all(inFleetPromise).then(function(members) {               
                //Sort in order of signup
                pilotStates.other.sort(function(a,b) {
                    if(!!a.timestamp) return 1;
                    if(a.timestamp < b.timestamp) return 1;
                    return -1;
                })
                
                pilotStates.main = pilotStates.other.pop();
                
                //Remove timestamps before passing back the json value.
                pilotStates.other.forEach(function(v){ 
                    delete v.timestamp 
                });

                //Sort by name
                pilotStates.other.sort(function(a,b) {
                    if(a.name > b.name) return 1;
                    return -1;
                })
                
                res.send(pilotStates);
            })
        });
    })
}