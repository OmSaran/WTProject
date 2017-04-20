// requires - 3rd party
var app = require('express')();
const Wreck = require('wreck')
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var FacebookStrategy = require('passport-facebook').Strategy;

// requires - custom
var configDB = require('./config/database.js');
var configFbAuth = require('./config/facebook.js');
var User = require('./models/user');

// middlewares

passport.serializeUser(function(user, done) {
	// console.log("SERIALIZING");
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
	// console.log("obj = " + JSON.stringify(obj));
  done(null, obj);
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({ secret: 'keyboard cat', key: 'sid'}));
app.use(passport.initialize());
app.use(passport.session());


passport.use(new FacebookStrategy({
    clientID: configFbAuth.appId,
    clientSecret: configFbAuth.appSecret,
    callbackURL: configFbAuth.callBackURL
  },
  function(accessToken, refreshToken, profile, cb) {

  	// req.session.passport.accessToken = accessToken;
    User.findOrCreate(profile, function(err, result){
    	if(err)
    		return cb(err, null);
    	profile.accessToken = accessToken;
	    return cb(null, profile);
    });
    // cb(null, profile);
  }));

app.use('/api', function(req, res, next){
	if(req == null || req.user == null || req.user.accessToken == null)
		return res.send(401, {session: false});
	Wreck.get('https://graph.facebook.com/v2.8/me?access_token='+ 
		req.user.accessToken +
		'bla&debug=all&fields=id&format=json&method=get&pretty=0&suppress_http_code=1', 
		function(err, response, payload){
			var resp = JSON.parse(payload.toString());
			// console.log("response = " + JSON.stringify(resp));
			// console.log("Req.user.id = " + req.user.id);
			// console.log("Response ID = " + resp.id);
			if(resp.error || resp.id != req.user.id)
				return res.send(401, {session: false});
			next();
		})
})


// plugins - custom
User.findOrCreate = function(profile, cb){
	User.findOne({'facebook.profileId' : profile.id}, function(err, result){
		// console.log('result = ' + result);
		// console.log('profile = ' + JSON.stringify(profile));
		if(err)
			return cb(err, null);
		if(result==null) //creating
		{
			// console.log('FB PROFILE = ' + JSON.stringify(profile.friends));
			var newUser = new User();
			newUser.facebook.profileId = profile.id;
			newUser.facebook.displayName = profile.displayName;
			// newUser.facebook.friends = profile.friends.data;
			newUser.save();
			return cb(null, profile);
		}
		return cb(null, profile); // logging in
	});
}
User.findByPid = function(id, cb){
	User.findOne({'facebook.profileId' : id}, function(err, result){
		if(err || result == null)
			return cb(err, null);
		return cb(null, result);
	})
}


// routes

app.get('/api/fb/friends', function(req, res){
	if(req.user== null || req.user.accessToken == null )
		return res.send(401, "Unauthorized");
	Wreck.get('https://graph.facebook.com/v2.8/me?access_token=' + req.user.accessToken + "&debug=all&fields=friends&format=json&pretty=1", function(err, response, payload){
		// console.log("Error = " + tyerr);
		var friends = JSON.parse(payload.toString());
		res.send(friends.friends.data);
	});
});


app.post('/api/fb/post',function(req,res){
	response = {
		HTML:req.body.HTML,
		CSS:req.body.CSS,
		JS:req.body.JS,
		LIKES:req.body.LIKES
	}
	var c_posts = 0;
	User.find({'facebook.profileId':req.user.id},function(err,doc){
			c_posts = doc.number_posts;
	});
	User.update({'facebook.profileId':req.user.id },
	{$push:
		{
			posts:
			{
				html:req.body.HTML,
				css:req.body.CSS,
				js:req.body.JS,
			}
		}});


	res.send("POST Success!!");

})
app.get('/api/fb/post',function(req,res){

	User.find({'facebook.profileId':req.user.id},callback);
	var callback = function(err,data){
		if(err){console.log(error);
			res.send("Error is fetching data");}
		else
		{
			res.send(data);
		}
	}
});


app.get('/api/test');

app.get('/api/sess', function(req, res){
	if(req == null || req.user == null || req.user.accessToken == null)
		return res.send(401, {session: false});
	res.send({session: true});
})

app.get('/auth/fb',passport.authenticate('facebook', { scope: 'user_friends' }));

app.get('/auth/fb/callback',
  passport.authenticate('facebook', { successRedirect: '/login/success',
                                      failureRedirect: '/login/failure' }));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/', function(req, res){
	res.send('Hello World!');
})

app.get('/login/success', function(req, res){
	res.send("Successfully logged in " + JSON.stringify(req.session.passport.user.displayName));

})
app.get('/login/failure', function(req, res){
	res.send('Failed to log in');
})

app.get('/:username/:password', function(req, res){
		var newUser = new User();
		newUser.local.username = req.params.username;
		newUser.local.password = req.params.password;
		console.log(newUser.local.username + " " + newUser.local.password);
		newUser.save(function(err){
			if(err)
				throw err;
		});
		res.send("Success!");
	});


// server inits

mongoose.connect(configDB.url);

app.listen(3000, function(){
	console.log("Server is running on port 3000");
});