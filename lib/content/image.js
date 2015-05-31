/* image.js - this is a representation of single image that was uploaded
*  it inherits from content.js, gaining all querying methods
*/

var Util = require('util');
var Content = require('./content.js');

function Image(data, params){
	var self = this;
	this.__collectionName__ = "images";

	if (!params)
		params = {};

	// for every object that was loaded, we want to set colourHex as a property - unfortunately we cannot use getter here
	var callback = params.callback;
	params.callback = function(){
		if (self.colour)
			self.colourHex = "#"+Number(self.colour.r).toString(16)+Number(self.colour.g).toString(16)+Number(self.colour.b).toString(16);

		if (callback)
			callback.apply(self);
	}

	// run the inheritance
	Image.super_.apply(this, [data, params]);
}

Util.inherits(Image, Content);

// turn given object to array
Image.prototype.toArray = function(){
	return {
		importedDate: this.importedDate,
		modifiedDate: this.modifiedDate,
		source: this.source,
		userId: this.userId,
		username: this.username,
		resource: this.resource,
		colour: this.colour
	}
}

// turn given object to string
Image.prototype.toString = function(){

	var data = { _id: this._id};

	if (this.colourHex)
		data.colourHex = this.colourHex;

	if (this.colour)
		data.colourDec = [this.colour.r, this.colour.g, this.colour.b];

	return JSON.stringify(data);
}

Image.prototype.edit = function(params){

	if (!params)
		params = {};

	if (!params)
		params.data = {};

	// on every edit, we want to track the modification time
	params.data.modifiedDate = (new Date()).getTime();

	Image.super_.prototype.edit.apply(this, [params]);
}

global.__inheritance__['Image'] = module.exports = Image;