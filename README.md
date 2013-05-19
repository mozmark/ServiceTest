Service Calls From GCLI
====

What?
---
Make calls to a REST web service using the Firefox command line.

Why?
---
I'm [experimenting](https://github.com/mozmark/Mitm-Tool) with driving security tools with Firefox. One problem I have is that different security tools expose different functionality. I wanted to expose the power of different tools without implementing specifics.  It occurs to me some of these techniques might be useful elswhere, thus the repo.

How?
---
If you're already familiar with [GCLI](https://github.com/mozilla/gcli) this will be fairly easy to understand. Here's a run down:
* The tool allows you to load commands with a specified prefix from a specified URL. E.g. you might want to add an 'example' command from the URL 'http://localhost:3000/templates/service.json'.
* The specified URL must contain a descriptor. The descriptor looks kind of like a JSON object containing some [gcli commands](https://github.com/joewalker/gcli/blob/master/docs/writing-commands.md). You can see an example [here](https://github.com/mozmark/ServiceTest/blob/master/test/templates/service.json).
  * The command descriptions in the descriptor can specify what parameters the command can have, how they map to the URI that is requested when the command is executed and (optionally) how the response maps to the message the user sees.
* I'm going to write more docs but, for now, the example descriptor and server should be enough for you to get the idea.
  * you can run the example server in the 'test' directory by running 'python server.py' - this will create a webserver on port 3000.
  * You can use the example command by installing the addon and entering 'wscmd load example http://localhost:3000/templates/service.json' - this will add commands called 'example' and 'example command'. The latter will fetch suggestions from the webservice and make calls to the service on execution.

