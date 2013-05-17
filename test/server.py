import BaseHTTPServer
import os.path
import json
from string import Template

def run(server_class=BaseHTTPServer.HTTPServer,
    handler_class=BaseHTTPServer.BaseHTTPRequestHandler):
  server_address = ('', 3000)
  httpd = server_class(server_address, handler_class)
  httpd.serve_forever()

class TestTemplate(Template):
  delimiter = '%'

staticPrefix = './static/'
templatePrefix = './templates/'

def handle(s, path, prefix, template):
  filepath = os.path.abspath(os.path.join(prefix, path))
  if filepath.startswith(os.path.abspath(prefix)):
    try:
      f = open(filepath,'r')
      s.send_response(200)
      s.end_headers()
      data = f.read()
      if template:
        t = TestTemplate(data)
        data = t.substitute({'host':s.headers['host']})
      s.wfile.write(data)
      return
    except IOError as e:
      print('something went wrong '+e)
      pass
  # file is not there (or not within root)
  s.send_response(404)
  s.end_headers()
  s.wfile.write('not found')

def makeHandler(prefix, template):
  def handler(s, path):
    return handle(s, path, prefix, template)
  return handler

def handleCall(s, path):
  s.send_response(200)
  s.send_header('Content-type','application/json');
  s.end_headers()
  headers = {}
  for header in s.headers:
    headers[header] = s.headers[header]
  dic = {'path':s.path,'headers':headers,'Result':'Seems to work: '+s.path}
  data = json.dumps(dic)
  s.wfile.write(data)

routes = {'/static/':makeHandler(prefix = staticPrefix, template = False),
    '/templates/':makeHandler(prefix = templatePrefix, template = True),
    '/call/':handleCall}

class MyHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  def do_GET(s):
    """Respond to a GET request"""
    for route in routes.keys():
      if s.path.startswith(route):
        return routes[route](s,s.path[len(route):])
    s.send_response(200)
    s.send_header('Content-type','text/html')
    s.end_headers()
    s.wfile.write('<html>hello, world!</html>')

run(handler_class = MyHandler)
