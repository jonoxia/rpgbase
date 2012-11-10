import persistence_layer
import sqlalchemy

ERR_NOT_LOGGED_IN = """<error>
You are not logged in.  You must log in to use this service.
</error>"""

ERR_MISSING_ARG = """<error>
Required argument %s was not provided.
</error>"""

ERR_NO_MATCH = """<error>
There is no object maching your get request.
</error>"""

class CRUDPlugin(object):
    # A wrapper which handles create, retrieve, update, delete, and list
    # operations on one of the data types defined as an sqlalchemy class;
    # it registers callbacks for URLS and methods as follows:
    # POST /create/urlSuffix
    # GET /list/urlSuffix
    # GET /get/urlSuffix
    # POST /update/urlSuffix

    # It's assumed that this can't be accessed unless user is logged in.
    def __init__(self,
                 sqlAlchemyClass,
                 urlSuffix,
                 requiredFieldNames):
        self._storageClass = sqlAlchemyClass
        self._urlSuffix = urlSuffix
        self._requiredFieldNames = requiredFieldNames

    def _doDefaultQuery( self, session, form, user ):
        # If there is a field called player_id, then only return one if
        # its player_id matches the user_id.
        query = session.query( self._storageClass )
        # TODO disable this in some cases....
        if "player_id" in self._storageClass.__dict__.keys():
            # TODO above is EXTREMELY hacky way of checking
            query = query.filter_by( player_id = user.id )
        # Treat all form fields as filters...
        for fieldName in form.keys():
            filterString = "%s = \"%s\"" % ( fieldName, form[fieldName] )
            query = query.filter(filterString)
        return query

    def list(self, form, user):
        # Often we can list by more than one field.... hm.
        xml = "<%ss>" % self._urlSuffix
        session = persistence_layer.Session()
        query = self._doDefaultQuery( session, form, user )
        for thing in query.all():
            xml += thing.toListXml()
        xml += "</%ss>" % self._urlSuffix
        session.close()
        return xml 

    def retrieve(self, form, user):
        # Gets one object of our sqlalchemy class from the DB, filtering
        # by form fields.
        # Returns XML of the form <urlSuffix>the thing</urlSuffix>
        # where "the thing" is the output of the matching object's toDetailXml().
        # Returns error XML if there's no match.
        session = persistence_layer.Session()
        query = self._doDefaultQuery( session, form, user )
        theThing = query.first()
        if theThing == None:
            xml = ERR_NO_MATCH
        else:
            xml = theThing.toDetailXml()
        session.close()
        return xml

    def create(self, form, user):
        session = persistence_layer.Session()
        initArgs = []
        for field in self._requiredFieldNames.get("create", []):
            # If player_id is required, get it from logged in user:
            if field == "player_id":
                initArgs.append( user.id )
            else:
                initArgs.append( form[field].value )
        thing = self._storageClass( *initArgs )
        session.add(thing)
        session.commit()
        # Return confirmation of what we just created, in case client wants
        # the ID off of it or something.
        xml = thing.toListXml()
        session.close()
        return xml

    def update(self, form, user):
        # "update" really requires two sets of arguments: the ones that
        # select the entity to be updated, and then the ones that set its
        # column values.  How to tell the two apart?  For now, let's assume
        # that there's an "id"...
        session = persistence_layer.Session()
        id = form["id"].value
        query = self._doDefaultQuery( session, {"id": id}, user)
        theThing = query.first()
        if theThing == None:
            session.close()
            return ERR_NO_MATCH
        # Note a potential Gotcha: we're iterating through every field in
        # the supplied form, not through the required_fields for update.
        # So that means we're counting on the form to have the right fields.
        # A form submitted with fields that don't exist in the DB is just
        # going to generate invalid SQL and cause an error.
        for fieldName in form.keys():
            theThing.__setattr__( fieldName, form[fieldName].value )

        session.commit()
        session.close()
        return "<OK/>"

    def handleUrl( self, method, url, form, user ):
        # Check whether this is the right handler for the request:
        urlParts = url.split("/")
        # url must be of form "/create/urlSuffix", "/list/urlSuffix", etc.
        if len(urlParts) != 3:
            # this is not the right handler.
            return None
        if urlParts[2] != self._urlSuffix:
            # this is not the right handler.
            return None

        # Check that user is loggd in and that required form fields are
        # supplied.
        if user == None:
            return ERR_NOT_LOGGED_IN

        functionName = urlParts[1]
        required = self._requiredFieldNames.get( functionName, [] )
        for fieldName in required:
            if not form.has_key(fieldName) and fieldName != "player_id":
                # don't reject input for lacking player_id, as we can fill
                # that in from the logged-in user.
                return ERR_MISSING_ARG % fieldName
        # Note a potential Gotcha here: the "form" that is passed to
        # GET methods is different from the "form" that is passed to
        # POST methods.  They can be treated the same here, but within
        # create and upate (the POST methods), you need to do form[key].value
        # whereas in list and retrieve, you just do form[key].
        if method == "POST" and url == "/create/" + self._urlSuffix:
            return self.create(form, user)
        if method == "GET" and url == "/list/" + self._urlSuffix:
            return self.list(form, user)
        if method == "GET" and url == "/get/" + self._urlSuffix:
            return self.retrieve(form, user)
        if method == "POST" and url == "/update/" + self._urlSuffix:
            return self.update(form, user)
        return None

class FunctionalURLRegistry(object):
    def __init__(self):
        self._urlMap = {"POST": {},
                        "GET": {} }
        self._crudPlugins = []

    def registerFunction( self, method, url, function ):
        # Registers a callback so that an HTTP request using <method>
        # to <url> will result in a call of <function>.
        self._urlMap[method][url] = function

    def handleUrl( self, method, url, form, user ):
        func = self._urlMap[method].get(url, None)
        if func != None:
            return func( form, user )
        for crudPlugin in self._crudPlugins:
            retVal = crudPlugin.handleUrl( method, url, form, user )
            if retVal:
                return retVal
        return None

    def registerCRUDPlugin( self, crudPlugin ):
        self._crudPlugins.append( crudPlugin )
        print "Registered CRUDPlugin for urlSuffix " + crudPlugin._urlSuffix


# Subclass CRUDPlugin for characters to add an extra method for listing
# charas who don't belong to us...
class CharaCRUDPlugin( CRUDPlugin ):

    # Extra method for listing charas who don't belong to us.
    def list_others(self, form):
        # Often we can list by more than one field.... hm.
        xml = "<%ss>" % self._urlSuffix
        session = persistence_layer.Session()
        query = session.query( self._storageClass )
        for fieldName in form.keys():
            filterString = "%s = \"%s\"" % ( fieldName, form[fieldName] )
            query = query.filter(filterString)
        for thing in query.all():
            xml += thing.toListXml()
        xml += "</%ss>" % self._urlSuffix
        session.close()
        return xml 

    def handleUrl( self, method, url, form, user ):
        if method == "GET" and url == "/list/other-charas":
            if user == None:
                return ERR_NOT_LOGGED_IN
            if not form.has_key("domain_id"):
                return ERR_MISSING_ARG % "domain_id"
            return self.list_others( form )
        else:
            return CRUDPlugin.handleUrl( self, method, url, form, user )

class DoorCRUDPlugin(CRUDPlugin):
    def list(self, form, user):
        # When requesting a list of doors for a given domain Id, give us
        # all doors that either go into or come out of that domain.
        domain_id = form["domain_id"]
        xml = "<%ss>" % self._urlSuffix
        session = persistence_layer.Session()
        query = session.query( self._storageClass )
        query = query.filter( sqlalchemy.or_(self._storageClass.domain_foo_id == domain_id,
                                             self._storageClass.domain_bar_id == domain_id) )
        for thing in query.all():
            xml += thing.toListXml()
        xml += "</%ss>" % self._urlSuffix
        session.close()
        return xml 

    def delete(self, form, user):
        id = form["id"].value
        session = persistence_layer.Session()
        obj = session.query( self._storageClass ).filter_by( id = id ).first()
        if (obj):
            session.delete(obj)
            session.commit()
        session.close()
        return "<OK/>"

    def handleUrl( self, method, url, form, user ):
        if method == "POST" and url == "/delete/door":
            if user == None:
                return ERR_NOT_LOGGED_IN
            if not form.has_key("id"):
                return ERR_MISSING_ARG % "id"
            return self.delete( form, user )
        else:
            return CRUDPlugin.handleUrl( self, method, url, form, user )
