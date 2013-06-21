Service Commands
================

Introduction
------------
Service Commands are a way of creating commands (e.g. GCLI commands) from a web service.

Commands are defined in a JSON descriptor (which looks a little like a GCLI [command definition](https://github.com/mozilla/gcli/blob/master/docs/writing-commands.md))

The Descriptor:
---------------
The descriptor is a JSON document containing a list of commands:
```json
{
  "commands":[]
}
```

A command is created for each item in the list. The first command should be empty with the exception of a description: This gives your users information on what your tool does. e.g:

if you load a command with the prefix 'test' and the following descriptor:

```json
{
  "commands":[{"description":"this is an example"}]
}
```

then typing 'test' at the command line will give you "this is an example command".

You probably want commands to be a bit more interesting than this, though. Here's a slightly more interesting example:

```json
{
  "commands":[
  {"description":"this is an example command for use as an example"},
  {
    "name": "command",
    "description": "do something",
    "returnType": "string",
    "execAction": {
      "url": "http://localhost:3000/do/something"
    }
  }
  ]
}
```

In this case, we have a sub-command called 'command' that the user can invoke with 'test command'. The command, when executed, results in a (GET) request being made to the url specified in execAction.

This still isn't very interesting, though. What if we want to be able to supply a parameter? And what if we want to actually see something from the response?  Let's continue by looking at a real world example; a command to create a new session in the ZAP intercepting proxy:

```json
{
  "name": "newsession",
  "description": "create a new session",
  "returnType": "string",
  "params": [{
    "name": "name",
    "type": "string",
    "description": "the name of the new session to create"
  }],
  "execAction": {
    "url": "http://localhost:8080/JSON/core/action/newSession/?zapapiformat=JSON&name=${name}",
    "expression": "$.Result"
  }
}
```

The first thing to notice here is that we are able to specify parameters. Here we have a single parameter called 'name'. String parameters can have any value but it's possible to limit the possible values (and even have default). This will be covered later on.

The second is that we're using the parameter in the url of the execAction - notice '${name}' on the end of the URL? This will be substituted with the value the user enters as a command parameter.

Finally, notice "expression" there in execAction - you can specify a JSONPath expression (the tool supports a safe subset of JSONPath) to extract data from the response to give to the user (as the output for the command).


More on Parameters:
-------------------

You can limit the possible values for a parameter by using providing an object (rather than 'string') to as the type. For example:

```json
{
  "name": "param1",
  "type": {
    "name": "selection",
    "data": ["name1", "name2", "name3"]
  },
  "description": "you may only name it name1, name2 or name3",
  "defaultValue": "name2"
}
```
Here we have a parameter called param1 which can take the values name1, name2 or name3 - if the user does not specify a value it will default to name2.


Callback Data:
--------------
Sometimes it's useful to get information from parameters (or a response) into the addon.

To do this, a callbackData object is added to execAction. Once the action has been completed, a callback is invoked with a callbackData object based on one specified in the descriptor. e.g:
```json
"execAction": {
  "url": "http://mdgmbp3.local:3000/call/${arg}",
  "expression": "$.Result",
  "callbackData": {
    "foo": "bar", 
    "wibble": {
      "type": "expression",
      "expression": "$.response.Result",
      "extract": true
    }
  }
}
```

In this case, the callbackData object has an attribte, "wibble" which will be replaced with the result of the expression specified. Notice this expression refers to 'response'; there are two attributes added to the object the JSONPath expression is evaluated against: 'response' (containing the response object from the execAction call) and 'args' - the arguments supplied to the command. "extract" specifies whether or not the resulting value should be extracted from the array (JSONPath expression results are always returned in an array - if you know your expression only matches a single value you may wish to extract this).
