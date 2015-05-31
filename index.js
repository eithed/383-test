/* index.js - this is the entry point of the application
 * in here we create routing schema and perform operations per given url
 * if given url actions become extensive, it will become sensible to assign modules
 * to them (/images/ = ImagesCollection object, that will have functions import called within /images/import/, etc)
 *
 * schema:
 * - all classes should be capitalized
 * - all variables should follow camelcase
 * - all urls should follow slug scheme
 * - for object calls /object/action/[id]/ should be used
 * - within classes all "private" methods/vars should use __var__ notation
 *
 * for templating system:
 * - area urls that have no object representation should be placed within /content/area/ folder, translated to file system,
 *   grouped by functionality
 * ie: /admin/images/import/ translates to /content/area/admin/images/import/index.hbs,
 *     /admin/images/import/thank-you/ translates to /content/area/admin/import/thank-you.hbs
 *
 * - object urls should be placed within /content/object/[method].hbs (not applied in this app, however if /image/accept/
 *   would require an outputted template, it would exist as /content/object/image/accept.hbs)
 */

var Router = require("./lib/router.js"),
	Database = require("./lib/database.js"),
	Image = require("./lib/content/image.js"),
	Fs = require("fs"),
	Http = require('http'),
	Https = require('https'),
	Async = require('async'),
	Crypto = require('crypto'),
	ReadChunk = require('read-chunk'),
	FileType = require('file-type'),
	db = new Database({name: "local"});

// for router logic please see /lib/router.js
var router = new Router({
	// frontend images json output
	"/images/": {
		// access only via get
		get: {
			callback: function (request, response, next, params) {
				try {
					// retrieve all images from the database and apply filtering
					// - r,g,b - are coma separated ranges for each of the colours
					// display only approved images

					var image = new Image();
					var get = request.query;

					if (get.r)
						get.r = String(get.r).split(",").map(function (value, index) {
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.r = [0, 255];

					if (get.g)
						get.g = String(get.g).split(",").map(function (value, index) {
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.g = [0, 255];

					if (get.b)
						get.b = String(get.b).split(",").map(function (value, index) {
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.b = [0, 255];

					image.find({
						where: {
							$and: [{
								isApproved: 1
							},
								{
									$or: [
										{colour: null},
										{
											"colour.r": {
												$gt: get.r[0],
												$lt: get.r[1]
											},
											"colour.g": {
												$gt: get.g[0],
												$lt: get.g[1]
											},
											"colour.b": {
												$gt: get.b[0],
												$lt: get.b[1]
											}
										}
									]
								}]
						},
						callback: function (objects) {
							// after we've retrieved all objects from database that meet these criteria,
							// let's pass them as a json to user
							var output = {
								success: true,
								length: objects.length,
								images: []
							}

							for (var i = 0; i < objects.length; i++)
								output.images.push(objects[i].toArray());

							response.setHeader('Content-Type', 'application/json');
							response.send(JSON.stringify(output));

							response.end();
						}
					});
				}
				catch (err) {
					response.redirect("/error/database-connection/");
					response.end();
				}

				return false;
			}
		}
	},
	// frontend error handling
	"/error/:errorType/": {
		template: "/area/error.hbs",
		callback: function(request, response){
			return {error: request.params.errorType}
		}
	},
	// backend images handling
	"/admin/images/": {
		// access only via get
		get: {
			template: "/area/admin/images/index.hbs",
			callback: function (request, response, next, params) {
				try {
					var image = new Image();
					var get = request.query;

					// retrieve all images from the database and apply filtering
					// - r,g,b - are coma separated ranges for each of the colours
					// - approved - display only approved images

					if (get.r)
						get.r = String(get.r).split(",").map(function(value, index){
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.r = [0,255];

					if (get.g)
						get.g = String(get.g).split(",").map(function(value, index){
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.g = [0,255];

					if (get.b)
						get.b = String(get.b).split(",").map(function(value, index){
							var number = Number(value);
							if (isNaN(number))
								number = index == 0 ? 0 : 255;

							return number;
						});
					else
						get.b = [0,255];

					var where;
					if (get.approved)
						where = {
							$and: [{
								isApproved: 1
							},
							{
								$or: [
									{colour: null},
									{
										"colour.r": {
											$gt: get.r[0],
											$lt: get.r[1]
										},
										"colour.g": {
											$gt: get.g[0],
											$lt: get.g[1]
										},
										"colour.b": {
											$gt: get.b[0],
											$lt: get.b[1]
										}
									}
								]
							}]
						};
					else
						where = {
							$or:[{
									colour: null
								},
								{
									"colour.r": {
										$gt: get.r[0],
										$lt: get.r[1]
									},
									"colour.g": {
										$gt: get.g[0],
										$lt: get.g[1]
									},
									"colour.b": {
										$gt: get.b[0],
										$lt: get.b[1]
									}
								}
							]
						};

					image.find({
						where: where,
						callback: function(objects){
							params.callback(request, response, next, {
								vars: {
									images: objects,
									get: get
								}
							});
						}
					});
				}
				catch (err) {
					response.redirect("/admin/error/database-connection/");
					response.end();
				}

				return false;
			}
		}
	},
	// backend image accept
	"/admin/images/accept/:id": {
		// only put method is allowed
		put: {
			callback: function (request, response) {
				var image = new Image();
				image.load(request.params.id, {
					callback: function () {
						// if trying to edit image that doesn't exist, output error json
						if (!this._id) {
							var output = {error: "Image " + request.params.id + " was not found in the db"};

							response.setHeader('Content-Type', 'application/json');
							response.send(JSON.stringify(output));

							response.end();
						}
						// on successful edit, output json with response
						else
							image.edit({
								data: {isApproved: 1},
								callback: function() {
									var output = {success: "Image was accepted"};

									response.setHeader('Content-Type', 'application/json');
									response.send(JSON.stringify(output));

									response.end();
								}
							});
					}
				});

				return false;
			}
		}
	},
	// backend image reject
	"/admin/images/reject/:id": {
		// only put method is allowed
		put: {
			callback: function (request, response) {
				var image = new Image();
				image.load(request.params.id, {
					callback: function () {
						// if trying to edit image that doesn't exist, output error json
						if (!this._id) {
							var output = {error: "Image " + request.params.id + " was not found in the db"};

							response.setHeader('Content-Type', 'application/json');
							response.send(JSON.stringify(output));

							response.end();
						}
						// on successful edit, output json with response
						else
							image.edit({
								data: {isApproved: 0},
								callback: function() {
									var output = {success: "Image was rejected"};

									response.setHeader('Content-Type', 'application/json');
									response.send(JSON.stringify(output));

									response.end();
								}
							});
					}
				});

				return false;
			}
		}
	},
	// backend image set colour
	"/admin/images/set-colour/:id": {
		// only put method is allowed
		put: {
			callback: function (request, response) {
				var image = new Image();
				image.load(request.params.id, {
					callback: function () {
						// if trying to edit image that doesn't exist, output error json
						if (!this._id) {
							var output = {error: "Image " + request.params.id + " was not found in the db"};

							response.setHeader('Content-Type', 'application/json');
							response.send(JSON.stringify(output));

							response.end();
						}
						// on successful edit, output json with response
						else {
							// values are sent as strings, we need to change them back to numbers
							for(var i in request.body.value)
								request.body.value[i] = Number(request.body.value[i]);

							image.edit({
								data: {colour: request.body.value},
								callback: function () {
									var output = {success: "Image colour value was set"};

									response.setHeader('Content-Type', 'application/json');
									response.send(JSON.stringify(output));

									response.end();
								}
							});
						}
					}
				});

				return false;
			}
		}
	},
	// backend import of images
	"/admin/images/import/": {
		// on get - display initial upload form
		get: {
			template: "/area/admin/images/import/index.hbs"
		},
		// on post - display template with results
		post: {
			template: "/area/admin/images/import/thank-you.hbs",
			callback: function(request, response, next, params)
			{
				// if no file was uploaded display appropriate error
				if (!request.files.data)
				{
					response.redirect("/admin/error/empty-file/");
					response.end();

					return false;
				}

				// if the given file wasn't JSON stream display appropriate error
				if (request.files.data.mimetype != "application/octet-stream")
				{
					response.redirect("/admin/error/invalid-mime-type/");
					response.end();

					return false;
				}

				// if uploading of file wasn't succesful display appropriate error
				var inputJsonFilepath = request.files.data.path;
				if (!Fs.existsSync(inputJsonFilepath))
				{
					response.redirect("/admin/error/file-not-exists/");
					response.end();

					return false;
				}

				// if uploaded file is malformed display appropriate error
				try{
					var data = JSON.parse(Fs.readFileSync(inputJsonFilepath));
				}
				catch(err)
				{
					Fs.unlink(inputJsonFilepath);

					response.redirect("/admin/error/malformed-json/");
					response.end();

					return false;
				}

				// go through the file
				if (data.status == "success" && data.data && data.data.items && data.data.items.length !== undefined)
				{
					Fs.unlink(inputJsonFilepath);

					// we use Async here to retrieve all the files from their servers, download them, check if they're
					// image files and finally save them as objects
					Async.map(data.data.items, function(entry, callback){
						// go through JSON - instagram contains entry.image_standard which is an image
						// twitter contains urls that can or can not be images, most often they're urls
						var filename;
						if (entry.image_standard)
							filename = entry.image_standard;
						else
							if (entry.urls)
								for (var i in entry.urls) {
									filename = entry.urls[i];
									break;
								}

						// if no image was found in the given entry, finish
						if(filename === undefined)
							return callback(null, null);

						// check file extension first - we're interested in these file extension only
						var extension = filename.split(".").pop();
						if (["png", "jpeg", "jpg", "gif"].indexOf(extension) == -1)
							return callback(null, null);

						// create a non-collision file name (md5 should do)
						var relativePath = router.__params__.uploadDir + Crypto.createHash('md5').update(filename).digest('hex')+ "." +extension;
						var absolutePath = router.__path__ + router.__params__.publicDir + relativePath;

						// check if given file already exists within database
						var dummy = new Image();
						dummy.count({
							where: {"resource": relativePath},
							callback: function(result){
								// given file already exists, finish
								if (result > 0)
									return callback(null, null);

								// save given file to uploaded folder, using required protocol
								var file = Fs.createWriteStream(absolutePath);
								var request = (filename.indexOf("https") === 0 ? Https : Http).get(filename, function (response) {
									response.pipe(file);
									file.on('finish', function () {
										file.close();

										// now we can check what kind of file we have downloaded
										var buffer = ReadChunk.sync(absolutePath, 0, 262);
										var fileBuffer = FileType(buffer);

										// it's not an image - delete it, finish
										// file might have not been uploaded at this point
										if (fileBuffer ? ["image/png", "image/jpeg", "image/pjpeg", "image/gif"].indexOf(fileBuffer.mime) == -1 : true) {
											if (fileBuffer)
												Fs.unlink(absolutePath);
											return callback(null, null);
										}

										// now we can save the entry into db, and create object
										var image = new Image();
										image.save({
											data: {
												importedDate: (new Date()).getTime(),
												modifiedDate: (new Date()).getTime(),
												source: entry.service,
												userId: entry.user_id,
												username: entry.username,
												resource: relativePath,
												colour: null,
												isApproved: null,
												order: null
											},
											callback: function(result)
											{
												callback(null, result);
											}
										});
									});

									// delete part of the file that we tried to download
									file.on('error', function (err) {
										fs.unlink(absolutePath);

										callback(null, null);
									});
								});
							}
						});
					}, function(err, results)
					{
						// use the template with amount of records that were created
						var results = results.filter(function(e){ return e});
						params.callback(request, response, next, {
							vars: {
								"records-no": results.length
							}
						});
					});

					return false;
				}
				else
				{
					response.redirect("/admin/error/malformed-json-data/");
					response.end();
				}

				return false;
			}
		}
	},
	// backend upload of JSON file
	"/admin/images/import/upload/:file": {
		callback: function(request, response) {

			var name = request.params.file;
			var file = Fs.readFileSync(router.__path__ + router.__params__.uploadDir + name);
			response.writeHead(200);
			response.end(file, 'binary');

			return false;
		}
	},
	// backend error handling
	"/admin/error/:errorType/": {
		template: "/area/admin/error.hbs",
		callback: function(request, response){
			return {error: request.params.errorType}
		}
	},
	// 404 handling
	"*": {
		template: "/area/404.hbs"
	}
});

router.listen(8080);