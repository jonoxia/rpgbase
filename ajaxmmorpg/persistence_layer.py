from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy import ForeignKey, Column, String, Boolean, DateTime, Integer
from sqlalchemy import Text
from sqlalchemy.orm import relation, backref, sessionmaker
import datetime
import hashlib
import base64
import os

mysql_db = create_engine("mysql://root:soylentgnome9@localhost/rpg")
Base = declarative_base()

class Player(Base):
    __tablename__ = 'players'
    id = Column(Integer, primary_key=True)
    username = Column(String(64))
    realname = Column(String(64))
    password = Column(String(64))
    logged_in = Column(Boolean)
    last_login = Column(DateTime)
    session_cookie = Column(String(128))
    def __init__(self, name, fullname, password):
        self.username = name
        self.realname = fullname
        self.password = password
    def __repr__(self):
       return "<User('%s','%s', '%s')>" % (self.username, self.realname, self.password)

class PlayerCharacter(Base):
    __tablename__ = 'player_characters'
    id = Column(Integer, primary_key=True)
    name = Column(String(64))
    player_id = Column(Integer, ForeignKey('players.id'))
    domain_id = Column(Integer, ForeignKey('domains.id'))
    icon_id = Column(Integer, ForeignKey('icons.id'))
    x = Column(Integer)
    y = Column(Integer)
    # TODO of course player character stats will need to be added here
    # once we have actual game mechanics.
    def __init__(self, name, player_id, icon_id, domain_id):
        self.name = name
        self.player_id = player_id
        self.icon_id = icon_id
        self.domain_id = domain_id

        # Use domain ID to look up starting x, y position
        session = Session()
        domain = session.query(Domain).filter_by( id = domain_id).first()
        print "Creating character in a domain that has start pos x = ", domain.start_position_x,
        print " y = ", domain.start_position_y
        self.x = domain.start_position_x
        self.y = domain.start_position_y
        session.close()
    def __repr__(self):
       return "<PlayerCharacter('%s','%s', '%s')>" % (self.name, self.player_id, self.icon_id)
    def toDetailXml(self):
        return """<chara id="%s" name="%s" x="%s" y="%s" icon_id="%s" domain_id="%s"/>""" \
            % ( self.id, self.name, self.x, self.y, self.icon_id, self.domain_id )
    def toListXml(self):
        return self.toDetailXml()

# TODO make a table of hero_archetypes or hero_templates or character classes --
# something that you copy from into PlayerCharacter when a player chooses one to create.

# TODO start LandType instead of hard-coded list of land icon ids.
class Icon(Base):
    __tablename__ = 'icons'
    id = Column(Integer, primary_key=True)
    file_path = Column(String(128)) # maybe BLOB instead...?
    def __init__(self, file_path):
        self.file_path = file_path
    def __repr__(self):
       return "<Icon('%s')>" % (self.file_path)

class LandType(Base):
    __tablename__ = 'land_types'
    id = Column(Integer, primary_key=True)
    icon_id = Column(Integer, ForeignKey('icons.id'))
    def __init__(self, icon_id):
        self.icon_id = icon_id
    def __repr__(self):
       return "<LandType('%s')>" % (self.icon_id)


# TODO make a certain Player own a Domain; you can only edit the domain if you
# own it.
# Maybe Map would be a better word for this than Domain?
class Domain(Base):
    __tablename__ = 'domains'
    id = Column(Integer, primary_key=True)
    domain_name = Column(String(64))   # should be unique??
    width = Column(Integer)
    height = Column(Integer)
    data_grid = Column(Text)
    new_character_can_start_here = Column(Boolean)
    start_position_x = Column(Integer)
    start_position_y = Column(Integer)
    def __init__(self, domain_name, width, height, data_grid,
                 can_start_here = False, start_x = 0, start_y = 0):
        self.domain_name = domain_name
        self.width = width
        self.height = height
        self.data_grid = data_grid
        self.new_character_can_start_here = can_start_here
        self.start_position_x = start_x
        self.start_position_y = start_y
    def __repr__(self):
        return "<Domain('%s')>" % (self.domain_name)
    def toDetailXml(self):
        return """<domain domain_name="%s" width="%s" height="%s" new_character_can_start_here="%s" start_position_x="%s" start_position_y="%s"><![CDATA[%s]]></domain>""" \
            % ( self.domain_name, self.width, self.height, self.new_character_can_start_here, self.start_position_x, self.start_position_y, self.data_grid )
    def toListXml(self):
        return """<domain name="%s" id="%s"/>""" % ( self.domain_name, self.id )

class DomainDoors(Base):
    __tablename__ = 'domain_doors'
    id = Column(Integer, primary_key=True)
    domain_foo_id = Column(Integer, ForeignKey('domains.id'))
    domain_bar_id = Column(Integer, ForeignKey('domains.id'))
    foo_x = Column(Integer)
    foo_y = Column(Integer)
    bar_x = Column(Integer)
    bar_y = Column(Integer)
    two_way = Column(Boolean)
    def __init__(self, domain_foo_id, foo_x, foo_y, domain_bar_id, bar_x, bar_y, two_way):
        self.domain_foo_id = domain_foo_id
        self.domain_bar_id = domain_bar_id
        self.foo_x = foo_x
        self.bar_x = bar_x
        self.foo_y = foo_y
        self.bar_y = bar_y
        self.two_way = two_way
    def __repr__(self):
        return "<Door from domain %s to domain %s>" % (self.domain_foo_id, self.domain_bar_id)
    def toListXml(self):
        end1 = "<foo domain_id=\"%s\" x=\"%s\" y=\"%s\"/>" % (self.domain_foo_id,
                                                       self.foo_x,
                                                       self.foo_y)
        end2 = "<bar domain_id=\"%s\" x=\"%s\" y=\"%s\"/>" % (self.domain_bar_id,
                                                       self.bar_x,
                                                       self.bar_y)
        return "<door id=\"%s\" two_way=\"%s\">%s%s</door>" % (self.id, self.two_way, end1, end2)

    def toDetailXml(self):
        return self.toListXml()


class ItemPrototypes(Base):
    __tablename__ = 'item_prototypes'
    id = Column(Integer, primary_key=True)
    icon_id = Column(Integer, ForeignKey('icons.id'))
    item_name = Column(String(64))   # should be unique??
    # TODO of course this will need a detailed description, plus some way to specify
    # what the item actually does when used...
    def __init__(self, icon_id, item_name):
 	# TODO wish there was some way to automate these constructors, too...!!
        self.icon_id = icon_id

class Inventory(Base):
    __tablename__ = 'inventory'
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey('player_characters.id'))
    item_id = Column(Integer, ForeignKey('item_prototypes.id'))
    quantity = Column(Integer)
    # This represents the fact that a character owns X copies of an item.
    # To get a character's inventory, just select everything from this table that
    # has the right character_id.
    # If there are items called e.g. "money", "wood", "metal", "food", then
    # it's trivial to use this table to keep track of quantities of resources as well.

class TreasureLocations(Base):
    __tablename__ = 'treasure_locations'
    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey('item_prototypes.id'))
    quantity = Column(Integer)
    domain_id = Column(Integer, ForeignKey('domains.id'))
    x = Column(Integer)
    y = Column(Integer)
    one_for_everybody = Column(Boolean)
    

class TreasuresGotten(Base):
    __tablename__ = 'treasures_gotten'
    id = Column(Integer, primary_key=True)
    character_id = Column(Integer, ForeignKey('player_characters.id'))
    treasure_id =  Column(Integer, ForeignKey('treasure_locations.id'))
    # maybe a timestamp?

class ChatChannel(Base):
    # whispering to someone creates a new chat channel including you and that person,
    # for instance.
    __tablename__ = 'chat_channels'
    id = Column(Integer, primary_key=True)
    channel_name = Column(String(64))
    def __init__(self, channel_name):
        self.channel_name = channel_name
    def __repr__(self):
        return "<ChatChannel %s>" % self.channel_name
    
class ChatLine(Base):
    __tablename__ = 'chat_lines'
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey('players.id'))
    # TODO should it show up as player or as character who is speaking?? maybe an option?
    text = Column(String(256))
    channel_id = Column(Integer, ForeignKey('chat_channels.id'))
    # Use timestamp to order by when selecting the set of all lines in a channel.
    # Also use timestamp to tell which chat lines are new since a player last checked in,
    # so that those lines can be sent back to that player to keep everyone up-to-date.
    # Use player_id to identify who said what.
    # Finally, chatLines older than a certain date can be auto-deleted to keep the
    # DB size under control.
    timestamp = Column(DateTime)
    def __init__(self, player_id, channel_id, text):
        self.player_id = player_id
        self.channel_id = channel_id
        self.text = text
        self.timestamp = datetime.datetime.now()
    def __repr__(self):
        return "<ChatLine %s>" % self.text

class PlayersInChannels(Base):
    # many-to-many, because a player can be in many channels and a channel can have
    # many players.  This keeps track of who is listening to each channel, so that
    # a ChatLine that is added to the channel by any player will be broadcast back
    # out to all players in that channel.
    __tablename__ = 'players_in_channels'
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey('players.id'))
    channel_id = Column(Integer, ForeignKey('chat_channels.id'))
    last_updated = Column(DateTime)
    # the timestamp shows the last time this player got updated about this channel.
    # So when that player next checks in, they should get back all chatLines newer
    # than that.

Session = sessionmaker(bind=mysql_db)
Base.metadata.create_all(mysql_db)


#######################################################################        
#   User stuff: login/logout, new user creation, etc.
#######################################################################        
def user_exists(username):
    session = Session()
    user = session.query(Player).filter_by(username = username).first()
    session.close()
    return ( user != None )

def create_user(username, password):
    session = Session()
    newUser = Player(username, "realname", password)
    session.add(newUser)
    session.commit()
    session.close()

def generateSessionCookie(username, password):
    m = hashlib.md5()
    m.update(username)
    m.update(password)
    m.update(str(datetime.datetime.now()))
    return base64.b64encode(m.digest())

def login(username, password):
    # Returns session cookie if you log in, False if username or password is wrong.
    session = Session()
    user = session.query(Player).filter_by(username = username).first()
    if user == None:
        return False
    if user.password != password:
        return False
    user.logged_in = True
    user.last_login = datetime.datetime.now()
    cookie = generateSessionCookie(username, password)
    user.session_cookie = cookie
    session.commit() # i think this saves the updates?
    session.close()
    return cookie

def logout(sessionId):
    session = Session()
    user = session.query(Player).filter_by(session_cookie = sessionId).first()
    if user == None:
        return
    user.logged_in = False
    user.session_cookie = ""
    session.commit()
    session.close()

def get_user_for_session(sessionId):
    session = Session()
    user = session.query(Player).filter_by(session_cookie = sessionId).first()
    # TODO should also filter by user.logged_in = True !!!!
    session.close()
    return user

#######################################################################        
#   Chat-related functions
#######################################################################        

def _getChannelIdFromName(channelName):
    # Create requested channel if it doesn't already exist.
    session = Session()
    query = session.query(ChatChannel).filter_by(channel_name = channelName)
    channel = query.first()
    if channel == None:
        channel = ChatChannel(channelName)
        session.add(channel)
        session.commit()
    id = channel.id
    session.close()
    return id

def list_chat_channel(channelName):
    session = Session()
    channelId = _getChannelIdFromName(channelName)
    query = session.query(Player, ChatLine).filter(Player.id==ChatLine.player_id).\
        filter(ChatLine.channel_id==channelId).order_by(ChatLine.timestamp)
    # Limit to last 15:
    query = query.all()[-15:]
    xml = "<chat channel=\"%s\">" % channelName
    for user, chatLine in query:
        xml += "<chatline user=\"%s\">%s</chatline>" % (user.username, chatLine.text)
    xml += "</chat>"
    session.close()
    return xml

def add_chat_line(user, channelName, text):
    session = Session()
    channelId = _getChannelIdFromName(channelName)
    newline = ChatLine(user.id, channelId, text)
    session.add(newline)
    session.commit()
    session.close()


#######################################################################        
#   Icon-related: get icon files into the db and serve them up
#######################################################################        

def init_icon_db():
    THE_LAND_TILES = ["grass_tile.png", "tree_tile.png", "sand_tile.png",
                      "bad_mountain_tile.png", "ocean_tile.png", "crossroads.png",
                      "road_ew_tile.png", "road_ns_tile.png", "road_nw_tile.png",
                      "road_ne_tile.png", "road_sw_tile.png", "road_se_tile.png",
                      "north_shore.png", "east_shore.png", "west_shore.png",
                      "south_shore.png", "nw_land_corner.png", "ne_land_corner.png",
                      "sw_land_corner.png", "se_land_corner.png",
                      "nw_water_corner.png", "ne_water_corner.png",
                      "sw_water_corner.png", "se_water_corner.png",
                      "snow_tile.png", "cave_tile.png", "good_volcano_tile.png",
                      "pretty_good_palm_tree.png", "bridge_ew_tile.png",
                      "bridge_ns_tile.png", "icy_west_coast.png", "icy_north_coast.png",
                      "icy_east_coast.png", "icy_south_coast.png",
                      "blue_house_tile.png", "orange_house_tile.png",
                      "magenta_house_tile.png", "inn_tile.png", "food_store_tile.png",
                      "item_store_tile.png", "hint_shop_tile.png",
                      "treasure_chest_tile.png", "bad_brick_wall_tile.png"];
    session = Session()
    for pic in THE_LAND_TILES:
        icon = Icon(pic)
        session.add(icon)
    session.commit()
    session.close()

def list_all_icons():
    # This one should look in the Pics directory and load anything it finds
    # there that's not already in the DB into the DB, then create a page
    # listing everything.
    # this is generating an html page, not xml
    
    # Uncomment this only when initializing...
    # init_icon_db()

    html = "<ul>"
    picPath = "client/pics"
    allPics = os.listdir(picPath)
    session = Session()
    icons = session.query(Icon).order_by(Icon.id)
    for icon in icons:
        fullPath = "/" + os.path.join(picPath, icon.file_path)
        html += "<li>%d <img src=\"%s\"></li>" % (int(icon.id), fullPath)

    for pic in allPics:
        fullPath = "/" + os.path.join(picPath, pic)
        icon = session.query(Icon).filter_by(file_path = pic).first()
        if icon == None:
            icon = Icon(pic)
            session.add(icon)
            html += "<li>New: <img src=\"%s\"></li>" % fullPath
    html += "</ul>"
    session.commit()
    session.close()
    return html

def get_icon_file_from_id( iconId ):
    session = Session()
    icon = session.query(Icon).filter_by(id = iconId).first()
    path = icon.file_path
    session.close()
    return path
