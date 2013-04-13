#!/usr/bin/python
import persistence_layer
import crud_service_layer

import cgi
import urlparse
import os
import re

# import SimpleHTTPServer
import BaseHTTPServer
import SocketServer

PORT = 8000
            

# This is a global variable and not a member of MyHandler because
# MyHandler is re-instantiated for every request and so can't be used to
# hold state.
gFunctionHandlerUrls = crud_service_layer.FunctionalURLRegistry()
charaRequiredFields = {"get": ["id"],
                       "list": ["player_id"],
                       "create": ["name", "player_id", "icon_id", "domain_id"],
                       "update": ["id"]}
charaPlugin = crud_service_layer.CharaCRUDPlugin( persistence_layer.PlayerCharacter,
                                             "chara", charaRequiredFields )
domainRequiredFields = {"get": ["id"],
                        "list": [],
                        "create": ["domain_name", "width", "height", "data_grid"],
                        "update": ["id"]}
domainPlugin = crud_service_layer.CRUDPlugin( persistence_layer.Domain,
                                             "domain", domainRequiredFields)

doorRequiredFields = {"get": ["id"],
                      "list": ["domain_id"],
                      "create": ["domain_foo_id", "foo_x", "foo_y",
                                 "domain_bar_id", "bar_x", "bar_y", "two_way"],
                      "update": ["id"],
                      "delete": ["id"]}
doorPlugin = crud_service_layer.DoorCRUDPlugin( persistence_layer.DomainDoors,
                                                "door", doorRequiredFields )
                                             
gFunctionHandlerUrls.registerCRUDPlugin( charaPlugin )
gFunctionHandlerUrls.registerCRUDPlugin( domainPlugin )
gFunctionHandlerUrls.registerCRUDPlugin( doorPlugin )



def whoAmIService( form, user ):
    # whoami XML service lets javascript check what username (if any) they are
    # logged in as.
   if user != None:
       return "<username>" + user.username + "</username>"
   else:
       return "<username/>"

gFunctionHandlerUrls.registerFunction( "GET", "/whoami", whoAmIService )

# based on examples from http://www.doughellmann.com/PyMOTW/BaseHTTPServer/index.html
class MyHandler( BaseHTTPServer.BaseHTTPRequestHandler ):
    def _doZeError(self, msg):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(msg)

    def redirect(self, newUrl, err = None, setSession = None, charaId = None):
        # TODO probably make redirect take a dictionary of optional
        # substitutions same as serverSideInclude takes.
        if newUrl.startswith("/client/"):
            filename = newUrl[1:] # remove leading /
        else:
            # will this ever happen??
            filename = "client/login.html"
        rootfile = open( filename, "r" )
        contents = rootfile.read()
        rootfile.close()

        substitutions = {}
        if err:
            substitutions["<!--ERR_MSG-->"] = err
        if charaId:
            substitutions["<!--CHARA_ID-->"] = charaId

        contents = self.serverSideInclude(contents, **substitutions)

        self.send_response(200)
        if setSession:
            self.send_header("Set-Cookie", "session=\"%s\"" % setSession)
        self.end_headers()
        self.wfile.write(contents)

    def serverSideInclude(self, pageContents, **kwargs):
        # Pass in a dictionary of keys = patterns to match in html page,
        # values = either filename or string.
        # contant substitutions in addition to those passed in:
        kwargs["<!--CHAT_PANE-->"] = "client/chat_pane.html"
        for key in kwargs.keys():
            regexp = re.compile(key)
            if regexp.search(pageContents) != None:
                # Pattern was found.  Is the substitution a filename or
                # string?
                if os.path.exists( kwargs[key] ):
                    includeFile = open( kwargs[key], "r")
                    includeContents = includeFile.read()
                    includeFile.close()
                else:
                    includeContents = kwargs[key]
                pageContents = regexp.sub( includeContents, pageContents )
        return pageContents

    def getSessionIdFromCookie(self):
        if not self.headers.has_key("cookie"):
            return None
        cookie = self.headers["cookie"]
        regexp = re.compile(r'session="([^"]+)"')
        matches = regexp.search(cookie)
        if matches == None:
            return None
        return matches.groups()[0]

    def getUserFromSessionCookie(self):
        sessionId = self.getSessionIdFromCookie()
        if sessionId:
            user = persistence_layer.get_user_for_session(sessionId)
            return user
        else:
            return None

    def argsDictFromQueryString(self, query):
         # There's probably a library function to do this...
         queryBits = query.split("&")
         dict = {}
         if len(queryBits) > 0:
             for qb in queryBits:
                 if len(qb) > 0:
                     parts = qb.split("=")
                     dict[parts[0]] = parts[1]
         return dict

        
    def do_GET(self):
        parsed_path = urlparse.urlparse(self.path)

        # Get user, if logged in.  This will be None if not logged in.
        user = self.getUserFromSessionCookie()

        # Parse args out of url query:
        argsDict = self.argsDictFromQueryString(parsed_path.query)

        # See if there's a function or plugin registered for this URL:
        retVal = gFunctionHandlerUrls.handleUrl("GET",
                                                parsed_path.path,
                                                argsDict,
                                                user)
        if retVal != None:
            # Execute ye function, return results as XML document.
            # TODO: retVal can be one of the error constants 
            xml = """<?xml version="1.0" ?>""" + retVal
            self.send_response(200)
            self.end_headers()
            self.wfile.write(xml)
            
        # Default: when user comes to root URL, send them to main.html page
        # if logged in, or login page if not.
        elif parsed_path.path == "/":
            if user:
                self.redirect("/client/main.html")
            else:
                self.redirect("/client/login.html")

        # Any file that's in client directory can be served up straight.
        # (But redirect to login page if you're not logged in.)
        elif parsed_path.path.startswith("/client/"):
            if not user:
                self.redirect("/client/login.html")
                return
            if os.path.exists(parsed_path.path[1:]):
                file = open( parsed_path.path[1:], "r" )
                contents = file.read()
                file.close()
                # Process server-side includes in the client html...
                if parsed_path.path.endswith(".html"):
                    contents = self.serverSideInclude(contents)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(contents)
            else:
                # file not found
                self.send_response(404)
                self.end_headers()

        # service to get images by icon ID from a fake URL /icons/id
        elif parsed_path.path.startswith("/icons/"):
            id = parsed_path.path[7:]
            filename = persistence_layer.get_icon_file_from_id(id)
            file = open( os.path.join("client/pics",filename), "rb" )
            contents = file.read()
            file.close()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(contents)

        # This logs you out; the logout link can point to this URL.
        elif parsed_path.path == "/logout":
            sessionId = self.getSessionIdFromCookie()
            if (sessionId):
                persistence_layer.logout(sessionId)
            self.redirect("/client/login.html")

        elif parsed_path.path == "/startplay":
            if not argsDict.has_key("charid"):
                self._doZeError("No ID specified.")
                return
            # TODO better way of parsing args out of get params
            id = argsDict["charid"]
            self.redirect("/client/play.html", charaId = id )

        # XML service, usable only if logged in: get chat channel contents
        elif parsed_path.path == "/chat/get":
            if not user:
                self.send_response(403)
                return
            self.send_response(200)
            self.end_headers()
            list = persistence_layer.list_chat_channel("default") 
            self.wfile.write("""<?xml version="1.0" ?>""" + list )

        elif parsed_path.path == "/icon-library":
            htmlBody = persistence_layer.list_all_icons()
            self.send_response(200)
            self.end_headers()
            self.wfile.write("<html><head><title>All Icons</title></head><body>")
            self.wfile.write(htmlBody)
            self.wfile.write("</body></html>")

        else:
            self._doZeError("Path " + self.path + " not valid.");

    def do_POST(self):
        form = cgi.FieldStorage(
            fp = self.rfile,
            headers = self.headers,
            environ = {'REQUEST_METHOD':'POST',
                       'CONTENT_TYPE':self.headers['Content-Type']
                       })


        user = self.getUserFromSessionCookie()

        retVal = gFunctionHandlerUrls.handleUrl("POST",
                                                self.path,
                                                form,
                                                user)
        if retVal != None:
            # Execute ye function, return results as XML document.
            xml = """<?xml version="1.0" ?>""" + retVal
            # TODO some way for Func to return errors!!! (e.g. not logged in,
            # or wrong arguments supplied.)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(xml)

        # POST to /login (action of the login form)
        elif self.path == "/login":
            if not form.has_key("username") or not form.has_key("password"):
                self.redirect("/client/login.html", err="A required field was left blank.")
                return
            username = form["username"].value
            password = form["password"].value
            sessionId = persistence_layer.login(username, password)
            if not sessionId:
                self.redirect("/client/login.html", err="Username or password is wrong.")
                return
            self.redirect("/client/main.html", err = None, setSession = sessionId)

        # POST to /create/account (action of the create account form)
        elif self.path == "/create/account":
            if not form.has_key("username") or not form.has_key("password") or not form.has_key("password2"):
                self.redirect("/client/login.html", err="A required field was left blank.")
                return
            username = form["username"].value
            password = form["password"].value
            password2 = form["password2"].value
            if persistence_layer.user_exists(username):
                self.redirect("client/login.html", err="That user already exists.")
                return
            if password != password2:
                self.redirect("client/login.html", err="Your two passwords did not match.")
                return
            persistence_layer.create_user(username, password)
            sessionId = persistence_layer.login(username, password)
            self.redirect("/client/main.html", err = None, setSession = sessionId)

        # POST to /chat/send (send a new line to the chat)
        elif self.path == "/chat/send":
            if not user:
                self.send_response(403)
                return
            if not form.has_key("input"): # Ignore empty input.
                return
            # "default" is an arbitrary chat channel ID
            persistence_layer.add_chat_line(user, 
                                            "default",
                                            form["input"].value)
            # Send some kind of success value?
            self.send_response(200)
            self.end_headers()
            xml = """<?xml version="1.0" ?><document>Ack.</document>""";
            self.wfile.write(xml)



# use mixin class for threading
class ThreadedHTTPServer(SocketServer.ThreadingMixIn, BaseHTTPServer.HTTPServer):
    pass

# was SimpleHTTPServer.SimpleHTTPRequestHandler
# was: SocketServer.TCPServer(("", PORT), MyHandler)
httpd = ThreadedHTTPServer(("", PORT), MyHandler)

print "Serving red-hot rpg xml at http://localhost:%d" % PORT

httpd.serve_forever()

