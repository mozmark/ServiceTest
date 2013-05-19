"use strict";
/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Cu} = require("chrome");
const {readURI} = require("sdk/net/url");
var Promise = require('sdk/core/promise');
const {setTimeout} = require('sdk/timers');
const {jsonPath} = require('./jsonpath');

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
var ServiceStub = function (url, prefix) {
  this.prefix = prefix;
  this.url = url;
  this.manifest = {};
};

/**
  * Take a command object and augment.
  */
ServiceStub.prototype.modCommand = function(command) {
  try {
    if (command.name) {
      command.name = this.prefix+' '+command.name;
    } else {
      command.name = this.prefix;
    }
    if (command.params) {
      command.params = buildParams(command.params);
    }
    if (command.url) {
      command.exec = function ServiceStub_exec(args) {
        let generatedURL = parameterize(command.url,args);
        return readURI(generatedURL).then(function (data) {
          let result = '';
          let obj = JSON.parse(data);
          if (command.expression) {
            result = jsonPath(obj,command.expression);
          } else {
            result = obj.Result;
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

/**
 * 'wscmd' command.
 */
gcli.addCommand({
  name: "wscmd",
  description: 'Creates commands from REST web services'
});

/**
 * 'wscmd load' command.
 */
gcli.addCommand({
  name: 'wscmd load',
  description: 'Load commands from a descriptor URL',
  params: [{
    name:'prefix',
    type:'string',
    description:'the prefix to give the loaded commands'
  },
  {
    name:'url',
    type:'string',
    description:'the URL to load the descriptor from'
  }],
  returnType: 'string',
  exec: function(args, context) {
    try{
      let stub = new ServiceStub(args.url, args.prefix);
      stub.hook();
    } catch (e) {
      console.log(e);
    }
  }
});
