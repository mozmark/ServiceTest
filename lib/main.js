"use strict";
/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Cu} = require("chrome");
Cu.import("resource:///modules/devtools/gcli.jsm");

const{ServiceStub} = require('./servicestub');

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
      var cb = function(data) {
        console.log('callback: '+JSON.stringify(data));
      };
      let stub = new ServiceStub(args.url, args.prefix, cb);
      stub.hook();
    } catch (e) {
      console.log(e);
    }
  }
});
