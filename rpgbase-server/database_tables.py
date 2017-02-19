#!/usr/bin/python

from sqlobject import *
import datetime
from rpgbase_config import DB_URL

connection = connectionForURI( DB_URL )
sqlhub.processConnection = connection

class SavedGame(SQLObject):
    playerName = StringCol()
    saveSlot = StringCol()
    gameData = StringCol()

class MapData(SQLObject):
    mapName = StringCol()
    width = IntCol()
    height = IntCol()
    mapDataCSV = StringCol()
    imageFile = StringCol()
    isOverworld = BoolCol()
    isTileset = BoolCol()
    

if __name__ == "__main__":
    SavedGame.createTable()
    MapData.createTable()
