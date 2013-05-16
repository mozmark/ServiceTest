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

Cu.import("resource://gre/modules/devtools/gcli.jsm");

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

var ServiceStub = function (url, prefix) {
  this.prefix = prefix;
  this.url = url;
  this.commands = {};
};

ServiceStub.prototype.hook = function () {
  readURI(this.url).then(function(data) {
    this.commands = JSON.parse(data);
    let key;
    for(key in this.commands) {
      let command = this.commands[key];
      gcli.addCommand({
        name: this.prefix+' '+key,
          description: command.description,
          params: buildParams(command.params),
          exec: function ServiceStub_exec(args) {
            let generatedURL = parameterize(command.url,args);
            return readURI(generatedURL).then(function (data) {
              // TODO: add some JSONPath / similar magic to extract an actual
              // result
              console.log('data is '+data);
              return JSON.parse(data).Result;
            },
            function (error) {
              console.log('there was probem reading the command URI');
              return error;
            });
          },
      });
    }
  }.bind(this),
  function(error) {
    console.log(error);
  });
};

var serviceStub = new ServiceStub('http://localhost:8083/service.json','test');
serviceStub.hook();

/**
 * 'proxy' command.
 */
gcli.addCommand({
  name: "test",
  description: 'Do test stuff'
});

gcli.addCommand({
  name: 'test refresh',
  description: 'refresh this command',
  params: [],
  returnType: 'string',
  exec: function(args, context) {
    serviceStub.hook();
  }
});
