var mongoose = require('mongoose');


var userSchema = mongoose.Schema({
	local: {
		username: String,
		password: String
	},
	facebook: {
		profileId : String,
		displayName : String,
		friends: Array,
		numberPosts: Number
	},
	posts: [
		{
			id: Number,
			html: String,
			css: String,
			js: String,
			likes: Number
		}
	]
});

module.exports = mongoose.model('User', userSchema);
