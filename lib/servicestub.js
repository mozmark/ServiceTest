const {Cu} = require("chrome");
const {jsonPath} = require('./jsonpath');
const {readURI} = require("sdk/net/url");

Cu.import("resource:///modules/devtools/gcli.jsm");

function parameterize(aStr, aParams){
  let re_outer = /(\$\{\w+\})/;
  let re_inner = /\$\{(\w+)\}/;

  let substitute = function(tok) {
    let match = tok.match(re_inner);
    if (match && match[1]) {
      if(aParams[match[1]]){
        return encodeURIComponent(aParams[match[1]]);
      }
    }
    return tok;
  };
  return Array.join([substitute(tok) for each (tok in aStr.split(re_outer))],'');
}

function buildParams(params) {
  console.log('buildParams '+JSON.stringify(params));
  let idx;
  for (idx in params) {
    modifyType(params[idx].type);
  }
  return params;
}

function modifyType(type) {
  if("object" === typeof type) {
    // replace selection 'data' with fetched data if 'fetchData' is set
    if (type.name && "selection" === type.name && type.dataAction) {
      type.data = function fetchData() {
        return readURI(type.dataAction)
            .then(function(d) {
              let obj = JSON.parse(d);
              return obj.results;
            }, function daError(e) {
              deferred.reject(e);
            });
      };
    }
  }
}

/**
 * Create command proxies from a descriptor; give the resulting commands the
 * specified prefix.
 */
var ServiceStub = function (url, prefix, callback) {
  this.prefix = prefix;
  this.url = url;
  this.callback = callback;
  this.manifest = {};
};

/**
  * Take a command object and augment.
  */
ServiceStub.prototype.modCommand = function(command) {
  try {
    var callback = this.callback;
    if (command.name) {
      command.name = this.prefix+' '+command.name;
    } else {
      command.name = this.prefix;
    }
    if (command.params) {
      command.params = buildParams(command.params);
    }
    if (command.execAction && command.execAction.url) {
      command.exec = function ServiceStub_exec(args) {
        let generatedURL = parameterize(command.execAction.url,args);
        return readURI(generatedURL).then(function (data) {
          let result = '';
          let obj = JSON.parse(data);
          if (command.execAction && command.execAction.expression) {
            result = jsonPath(obj,command.execAction.expression);
            // call the callback with the callbackData
          } else {
            result = obj.Result;
          }
          if (callback) {
            // TODO: sort out how to extract response data an substitute into
            // the callbackData.
            callback(command.execAction.callbackData);
          }
          return result;
        },
        function (error) {
          console.log('there was problem reading the command URI');
          return error;
        });
      };
    }
  } catch (e) {
    console.log(e);
  }
};

/**
 * Fetches the available command descriptions from the descriptor, adds the
 * GCLI commands for each.
 */
ServiceStub.prototype.hook = function () {
  readURI(this.url).then(function(data) {
    this.manifest = JSON.parse(data);
    let key;
    let commands = this.manifest.commands;
    let prefix = this.manifest.prefix;

    for(key in commands) {
      let command = commands[key];
      // replace JSON descriptor info with actual parameter objects / functions
      // (where applicable)
      this.modCommand(command);
      gcli.addCommand(command);
    }
  }.bind(this),
  function(error) {
    console.log(error);
  });
};

exports.ServiceStub = ServiceStub;
