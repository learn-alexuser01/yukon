// add yukon default config to nodulejs default config

var _ = require('lodash');
var nodulejs = require('nodulejs');

module.exports = function(app, config) {
  var yukonConfig = _.merge(defaultConfig, config);

  var debug = yukonConfig.customDebug('yukon->index');
  debug('initializing');
  
  // array of middleware functions to be executed on each request
  // splicing app-defined middleware in-between yukon system middlware
  yukonConfig.noduleDefaults.middlewares = [
    
    config.middlewares.start, // app-defined
    
    require('./middlewares/preProcessor')(app, yukonConfig), // preprocessing logic before APIs are called

    config.middlewares.preData, // app-defined
    
    // user can specify a different kind of data gathering
    // TODO use doApi by default until that is split off into a plugin
    config.middlewares.getData || require('./middlewares/doApi')(app, yukonConfig), 
    
    config.middlewares.postData, // app-defined

    require('./middlewares/postProcessor')(app, yukonConfig), // common post-processing logic after all APIs return

    config.middlewares.finish, // app-defined
    
    require('./middlewares/finish')(app, yukonConfig), // finish with json or html
  ];

  console.log(yukonConfig.noduleDefaults.middlewares);
  
  // nodulejs finds and loads nodules based on config below, registers routes with express based on nodule route and other properties
  nodulejs(app, yukonConfig); 
};

function passThrough(req, res, next) {
  next();
}

var defaultConfig =  {
  ///////////////////////////////////////////////////////////////// 
  /// APP-DEFINED EXPRESS MIDDLEWARE FUNCTIONS INVOKED BY YUKON ///
  /////////////////////////////////////////////////////////////////  
  middlewares: {
    // called before nodule.preProcessor
    start:  passThrough,
 
    // called after nodule.preProcessor, before API call(s)
    preData: passThrough,

    // middleware that gets all data (default = doApi, but can be replaced with app-defined data gathering)
    // TODO: split this off as a plugin for calling apis in parallel
    getData: null,
 
    // called after API call(s), before nodule.postProcessor
    postData: passThrough,
 
    // called after nodule.postProcessor, before res.send or res.render
    finish: passThrough,
  },

  /////////////////////////////////////////////////// 
  /// FUNCTIONS INVOKED PRE AND POST API BY YUKON ///
  ///////////////////////////////////////////////////  
  
  // (OPTIONAL) synchronous function called at the start of every api call
  apiCallBefore: function(callArgs, req, res) { },

  // (OPTIONAL) asynchronous function called after every api call
  // NOTE: must execute next() if defined
  apiCallback: function(callArgs, req, res, next) { next(callArgs.apiError); },


  // default debug function
  customDebug: function(identifier) {   
    return function(msg) {
      if (defaultConfig.debugToConsole) console.log(identifier+': '+msg);
    };
  },

  noduleDefaults: {
    // Properties inherited from nodule.js (see nodule conf (TODO:link here) as these may get out of date):
    // route (REQUIRED) - needs to be defined in each nodule, and be unique
    // routeVerb - (default:get)
    // routeIndex - (default:0)
    // middlewares - array of middleware functions (or function that returns array of middleware functions)
    //             - to be executed on each request, defined above module init

    // NOTE: the params below call be mutated in the preProcessor using this.myParam notation
    //       they can also be mutated in the postProcessor if the API calls are not dependent on them (IE - templateName)

    // MAGIC ALERT: if template name is null, the framework looks for [nodule name].templateExt 
    //              first in the nodule folder, then in the shared template folder
    templateName: null,

    // the framework looks for templates with the template name + this extension
    templateExt: '.jade',

    // 'html', 'json' only current values - use this to force any nodule to behave like a json or html call regardless of naming conventions or directory conventions
    contentType: null,

    // use to manipulate query params or other business logic before api call(s)
    preProcessor: function(req, res) { },

    // use to process data returned from the API before calling template or sending back to client as JSON
    postProcessor: function(req, res) { },
    // NOTE: one important property you usually need to set in the postProcessor is res.yukon.renderData 
    //       this is the data sent to the jade template or back to the client as JSON
    // MAGIC ALERT: if you don't specify res.yukon.renderData the framework sets res.yukon.renderData = res.yukon.data1

    // set this.error to an Error() instance to call next(error) inside the preProcessor or postProcessor
    error: null,

    // array of apiCalls to call in parallel
    // NOTE: global or semi-global calls like getProfile, getGlobalNav, etc. can be added to this array in the preData middleware
    apiCalls: [],
  },

  /// API CALL PROPERTIES ////////////////////////////////////////////////////////////////
  /// there can be multiple api calls per nodule, all called in parallel
  apiDefaults: {
    // path to server, can be used to over-ride default 
    host: null, 

    // MAGIC ALERT: if api path ends with a slash(/), the framework automatically tries to append req.params.id from the express :id wildcard 
    //              as this is a very common REST paradigm
    path: null,

    // params to send to API server
    // if verb is 'post', this can be a deep json object (bodyType=json) or a shallow object of name value pairs (bodyType=form)
    params: {},

    // valid values: get, post, put, del (express uses 'del' since delete is a reserved word)
    verb: 'get',

    // valid values: json, form
    bodyType: 'json',

    // custom headers to sent to API
    customHeaders: [],

    // (numeric) - max API return time in ms
    timeout: null,

    // set true to force api to use stub (IE - if API isn't ready yet)
    useStub: false,

    // can contain path or just name if in same folder
    // MAGIC ALERT: if not specified, app looks for [nodule name].stub.json in nodule folder
    stubPath: null,
  },
};
