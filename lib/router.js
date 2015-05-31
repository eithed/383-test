/* router.js - this is the router wrapper of the application which transforms to Express routing functions
 * in the constructor we pass along routing object, with a series of parameters, either:
 * url: {method: {template: "/path/to/template/file/", callback: Function()}}}, or
 * url: {template: "/path/to/template/file/", callback: Function()}}
 * if method is not defined, it defaults to "all"
 * either callback or template are required
 * - if template is provided, it will be rendered using handlebars
 * - if callback is provided, and returns not false, then the output of the callback will be used
 * as global variables within rendered template
 * - if callback is provided, and returns false, then no output will be sent
 * callback can be used synchronously or asynchronously
 */

var Express = require("express"),
	ExpressHandlebars = require("express-handlebars"),
	Fs = require("fs"),
	Path = require("path"),
	Multer = require("multer"),
	BodyParser = require("body-parser");

var Router = function(routes, params) {
	// defined folder paths
	if (!params)
		params = {};

	if (!params.viewsDir)
		params.viewsDir = "/views/";

	if (!params.partialsDir)
		params.partialsDir = "/views/partials/";

	if (!params.layoutsDir)
		params.layoutsDir = "/views/layouts/";

	if (!params.contentDir)
		params.contentDir = "/views/content/";

	if (!params.uploadDir)
		params.uploadDir = "/upload/";

	if (!params.publicDir)
		params.publicDir = "/public/";

	var self = this;
	// define main folder of the application so all elements know where there's root
	this.__path__ = Path.dirname(require.main.filename);
	this.__routes__ = routes;
	this.__params__ = params;

	// define Express
	this.__express__ = Express();
	this.__express__.use(Express.static(params.publicDir.replace(/^\/+|\/+$/g, "")));
	// use Multer for file uploads
	this.__express__.use(Multer({
		dest: this.__path__ + params.publicDir + params.uploadDir
	}));
	// use BodyParser for post data parsing
	this.__express__.use(BodyParser.urlencoded({
		extended: true
	}));
	// define Handlebars as templating engine
	this.__express__.set('view engine', 'hbs');
	this.__express__.set('views', this.__path__ + params.viewsDir);
	this.__express__.set('layoutsDir', this.__path__ + params.layoutsDir);
	this.__express__.set('partialsDir', this.__path__ + params.partialsDir);

	// create helper function for comparison purposes within the template
	var handlebars = ExpressHandlebars.create({
		// Specify helpers which are only registered on this instance.
		extname: 'hbs',
		defaultLayout: 'main.hbs',
		helpers: {
			compare: function(lvalue, rvalue, options) {

				if (arguments.length < 3)
					throw new Error("Handlebars helper 'compare' needs 2 parameters");

				var operator = options.hash.operator || "==";

				var operators = {
					'==':       function(l,r) { return l == r; },
					'===':      function(l,r) { return l === r; },
					'!=':       function(l,r) { return l != r; },
					'<':        function(l,r) { return l < r; },
					'>':        function(l,r) { return l > r; },
					'<=':       function(l,r) { return l <= r; },
					'>=':       function(l,r) { return l >= r; },
					'typeof':   function(l,r) { return typeof l == r; }
				}

				if (!operators[operator])
					throw new Error("Handlebars helper 'compare' doesn't know the operator "+operator);

				var result = operators[operator](lvalue,rvalue);

				if( result ) {
					return options.fn(this);
				} else {
					return options.inverse(this);
				}
			}
		}
	});

	this.__express__.engine('hbs', handlebars.engine);

	// we need to check if uploadDir exists and is writable
	// if it doesn't exist try to create it
	var stat = null;
	try {
		stat = Fs.statSync(this.__path__ + params.publicDir + params.uploadDir);
	} catch (err) {
		Fs.mkdirSync(this.__path__ + params.publicDir + params.uploadDir);
	}
	if (stat && !stat.isDirectory())
		throw new Error('Upload directory cannot be created');

	// translate the constructor object into routing functions
	for(var map in routes)
	{
		var route = routes[map];

		// if there's a template or callback within the given route, then the method wasn't defined
		// encapsulate the route within "all" method
		if (route.template || route.callback)
			route = {all: route};

		// use express to run __route__ function
		for (var method in route) {
			this.__express__[method](map, function () {
				self.__route__.apply(self, arguments);
			});
		}
	}
}

// routing function that handles outputting rendered template to the browser
// or running callback function
Router.prototype.__route__ = function(request, response, next){
	var self = this;
	var params = this.__routes__[request.route.path];
	var method = request.route.stack[0].method;

	if (params[method])
		params = params[method];

	var vars = {};
	var route = function(request, response, next, i_params)
	{
		if (params.auth)

		if (!params.template)
			throw new Error("Empty template value");

		var path = self.__path__ + self.__params__.contentDir + params.template;

		// if template file doesn't exist display 404
		if (!Fs.existsSync(path))
			return next();

		// render the template with obtained parameters
		response.render(path, i_params.vars);
	}

	// if callback is defined and doesn't output false, run route with the results,
	// pass route to callback function if it's required to do something first before outputting the template
	if (params.callback ? (vars = params.callback.apply(this, [request, response, next, {callback: route}])) !== false : true)
		route(request, response, next, {vars: vars});
}

// expose Express listen function
Router.prototype.listen = function(){
	return this.__express__.listen.apply(this.__express__, arguments);
}

module.exports = Router;