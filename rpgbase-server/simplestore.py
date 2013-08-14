#!/usr/bin/python
import cgi
import datetime
from database_tables import SavedGame
import cgitb
import simplejson
# from server_utils import verify_id

if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()

    player = q.getfirst("player", "")
    slot = q.getfirst("slot", "")
    
    action = q.getfirst("action", "")
    if action == "save":
        gameData = q.getfirst("gamedata", "")
        query= SavedGame.selectBy(playerName = player,
                                  saveSlot = slot)
        if query.count() > 0:
            savedGame = query[0]
            savedGame.gameData = gameData
        else:
            SavedGame(playerName = player,
                      saveSlot = slot,
                      gameData = gameData)
        msg = "Saved"

    if action == "load":
        query= SavedGame.selectBy(playerName = player,
                                  saveSlot = slot)
        if query.count() > 0:
            savedGame = query[0]
            msg = savedGame.gameData
        else:
            msg = "No matching save file"

    print "Content-type: text/html"
    print ""
    print msg
