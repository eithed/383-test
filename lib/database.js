/* database.js - this is a db wrapper of the application that creates Mongodb connection */

var extend = require("extend"),
	Mongodb = require("mongodb"),
	Db = require("mongodb").Db,
	Connection = require("mongodb").Connection,
	Server = require("mongodb").Server;

var Database = function() {
	this.collections = {};
	this.__client__ = null;

	this.__constructor__.apply(this, arguments);
}

Database.prototype.__constructor__ = function(params){
	var self = this;

	params = extend({
		host: process.env['MONGO_NODE_DRIVER_HOST'] || 'localhost',
		port: process.env['MONGO_NODE_DRIVER_PORT'] || Connection.DEFAULT_PORT,
		autoReconnect: true,
		poolSize: 20
	}, params);

	if (!params.name)
		throw new Error("Database name needs to be defined");

	this.__db__ = new Db(params.name,
		new Server(params.host, params.port, {
			auto_reconnect: params.autoReconnect,
			poolSize: params.poolSize
		}),
		{
			w: 1
		});

	this.__db__.open(function(err, client) {
		self.__client__ = client;

		if (client)
		client.on('close', function(){
			self.__client__ = null;
			this.collections = {};
		})
	});
};

/* collection is a wrapper for the mongodb collection object */
Database.prototype.collection = function(params){
	if (!params.name)
		throw new Error("Collection name needs to be defined");

	if (this.collections[params.name])
		return this.collections[params.name];

	var collection = new Mongodb.Collection(this.__client__, params.name);
	this.collections[params.name] = collection;

	return collection;
}

module.exports = Database;