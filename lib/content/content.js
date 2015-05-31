/* content.js - this is a base model from which all content objects should be inherited from
*  base methods include:
*  - load: load given object from database, or imbue it with given parameters (not checked within database)
*  - save: save given data to database, and imbue this object with the data that was saved
*  - edit: edit given data in database, and imbue this object with the data that was edited
*  - remove: remove given data from database
*  - find: find all objects of given type, that meet given criteria
*  - count: count all object of given type, that meet given criteria
*
*  prerequisites:
*  - all content objects need to know about their DB collection (via __collectionName__ field)
*/

var	Database = require("../database.js"),
	Mongodb = require('mongodb'),
	db = new Database({name: "local"});

function Content(){
	this.__constructor__.apply(this, arguments);
}

Content.prototype.__constructor__ = function(data, params)
{
	if (!this.__collectionName__)
		throw new Error("Collection for class "+this.constructor.name+" not found");

	// assign the collection in which this object will reside
	this.__collection__ = db.collection({
		name: this.__collectionName__
	});

	// assign the name of the given object
	this.__name__ = this.constructor.name;

	if (data)
		this.load(data, params);
}

// load object from database
Content.prototype.load = function(data, params)
{
	if (!params)
		params = {};

	// if data is provided, imbue given object with it
	var self = this;
	if (data instanceof Object) {
		for (var i in data)
			self[i] = data[i];

		if (params.callback)
			params.callback.apply(self);

		// __string__ contains current toString representation of the object - unfortunately we can't rely on getters
		self.__string__ = self.toString.apply(self);
	}
	else {
		this.__collection__.find({_id: new Mongodb.ObjectID(data)}).toArray(function (err, results) {
			if (err)
				throw new Error(err);

			// retrieve data from the database and imbue this object with it
			// bear in mind if no object exists you have to check the _id of it
			if (results[0]) {
				for (var i in results[0])
					self[i] = results[0][i];

				if (params.callback)
					params.callback.apply(self);
			}
			else if (params.callback)
				params.callback.apply(self);

			self.__string__ = self.toString.apply(self);
		});
	}
}

// save object to database
Content.prototype.save = function(params)
{
	var self = this;
	this.__collection__.insert(params.data, {safe: true}, function(err, result){
		if (err)
			throw new Error(err);

		for (var i in params.data)
			self[i] = params.data[i];

		if (params.callback)
			params.callback.apply(self, [result]);

		self.__string__ = self.toString.apply(self);
	});
}

// edit object in database
Content.prototype.edit = function(params)
{
	var self = this;

	if (!this._id)
		throw new Error("Trying to edit an unloaded object");

	this.__collection__.update({_id: new Mongodb.ObjectID(this._id)}, {$set: params.data}, {safe: true}, function(err, result){
		if (err)
			throw new Error(err);

		for (var i in params.data)
			self[i] = params.data[i];

		if (params.callback)
			params.callback.apply(self, [result]);

		self.__string__ = self.toString.apply(self);
	});
}

// remove object from database
Content.prototype.remove = function(params)
{
	var self = this;

	if (!this._id)
		throw new Error("Trying to remove an unloaded object");

	this.__collection__.remove({_id: new Mongodb.ObjectID(this._id)}, {safe: true}, function(err, result){
		if (err)
			throw new Error(err);

		if (params.callback)
			params.callback.apply(self, [result]);
	});
}

// find all objects within database
Content.prototype.find = function(params)
{
	var self = this;

	var self = this;
	this.__collection__.find(params.where).toArray(function (err, results) {
		if (err)
			throw new Error(err);

		var objects = [];

		// as inherited objects don't exist within this module scope, we need
		// to trick global to include all inherited classes in separate object
		// as such we will have to set __inheritance__ for all objects we want
		// to have access to
		for (var i=0; i<results.length; i++)
			objects.push(new global.__inheritance__[self.__name__](results[i]));

		if (params.callback)
			params.callback.apply(self, [objects]);
	});
}

// count all objects within database
Content.prototype.count = function(params)
{
	var self = this;

	this.__collection__.find(params.where).toArray(function (err, results) {
		if (err)
			throw new Error(err);

		if (params.callback)
			params.callback.apply(self, [results.length]);
	});
}

// output this object as a string
Content.prototype.toString = function()
{
	return "";
}

global.__inheritance__ = {};
global.__inheritance__['Content'] = module.exports = Content;