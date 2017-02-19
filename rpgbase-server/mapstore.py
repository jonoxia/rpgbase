#!/usr/bin/python
import cgi
import datetime
from database_tables import MapData
import cgitb
import simplejson

if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()
    
    action = q.getfirst("action", "")

    if action == "list":
        msg = []
        query = MapData.select()
        for m in query:
            msg.append(m.mapName)
        msg = simplejson.dumps(msg)
        
    elif action == "save":
        mapName = q.getfirst("mapName", "")
        width = int(q.getfirst("width", 0))
        height = int(q.getfirst("height", 0))
        mapData = q.getfirst("data", "")
        imageFile = q.getfirst("image", "")
        isOverworld = (q.getfirst("overworld", "false") == "true")
        isTileset = (q.getfirst("tileset", "false") == "true")

        query = MapData.selectBy(mapName = mapName)
        if query.count() > 0:
            oldMap = query[0]
            #oldMap.mapName = mapName
            oldMap.mapDataCSV = mapData
            oldMap.width = width
            oldMap.height = height
            oldMap.imageFile = imageFile
            oldMap.isOverworld = isOverworld
            oldMap.isTileset = isTileset
        else:
            MapData(mapName = mapName,
                    mapDataCSV = mapData,
                    width = width,
                    height = height,
                    imageFile = imageFile,
                    isOverworld = isOverworld,
                    isTileset = isTileset)
                   
        msg = "Saved"

    elif action == "load":
        mapName = q.getfirst("mapName", "")
        query= MapData.selectBy(mapName = mapName)
        if query.count() > 0:
            mp = query[0]
            mapData = {"mapName": mp.mapName,
                       "mapDataCSV": mp.mapDataCSV,
                       "width": mp.width,
                       "height": mp.height,
                       "imageFile": mp.imageFile,
                       "isOverworld": mp.isOverworld,
                       "isTileset": mp.isTileset}
            msg = simplejson.dumps(mapData)
        else:
            msg = "No matching save file"
    else:
        msg = "No action specified."
    print "Content-type: text/html"
    print ""
    print msg
