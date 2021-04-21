const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require('url');

/**
 * settings
 */
const mcServerAddress = "xx.xx.xx.xx"
const mcServerPort = "25565"
const refreshCycle = 10

const filePath = __dirname + "/data.json"

const nodeServerPort = 8083

/**
 * init
 * first run is x o' clock exactly
 */
setTimeout(()=> {
    setInterval(checkusers, 1000 * 60 * refreshCycle);
    checkusers();
}, msToNextHour())
console.log("waiting " + (msToNextHour() / 1000 / 60) + " minutes until first pull");

/**
 * @returns {number} the ms until the next full hour
 */
function msToNextHour() {
    return 3600000 - new Date().getTime() % 3600000;
}

/**
 * Endpoint
 */
http.createServer((req, res) => {
    const queryObject = url.parse(req.url,true).query;
    if(queryObject.json=="true") {
        //send json data
        fs.readFile(filePath, (err, fileContent)=> {
            res.writeHead(200, {
                'Content-Type': "application/json; charset=utf-8",
                "Cache-Control": "max-age=0",
                "x-content-type-options": "nosniff",
            })
            if(err) res.end("[]");
            else res.end(fileContent);
        })
    } else {
        //normal endpoint
        if(req.url.endsWith("favicon.png")) {
            //send favicon
            fs.readFile(__dirname + "/http/favicon.png", function(err, data) {
                if(err) {
                    res.writeHead(500, {
                        'Content-Type': "text/plain; charset=utf-8",
                        "Cache-Control": "max-age=0",
                        "x-content-type-options": "nosniff",
                    })
                    res.end("An error occured, try again later<br>" + err);
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': "image/png",
                    "Cache-Control": "max-age=31536000, immutable",
                    "x-content-type-options": "nosniff",
                })
                res.end(data);
            });
        } else if (req.url.endsWith("style.css")) {
            fs.readFile(__dirname + "/http/style.css", (err, data) => {
                if(err) {
                    req.end("An error occured, try again later");
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': "text/css; charset=utf-8",
                    "Cache-Control": "max-age=31536000, immutable",
                    "x-content-type-options": "nosniff",
                });
                res.end(data);
            })
        } else if (req.url.endsWith("app.js")) {
            fs.readFile(__dirname + "/http/app.js", (err, data) => {
                if(err) {
                    req.end("An error occured, try again later");
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': "application/javascript; charset=utf-8",
                    "Cache-Control": "max-age=31536000, immutable",
                    "x-content-type-options": "nosniff",
                });
                res.end(data);
            })
        } else {
            //send index.html
            fs.readFile(__dirname + "/http/index.html", (err, data)=> {
                if(err) {
                    res.writeHead(500, {
                        'Content-Type': "text/plain; charset=utf-8",
                        "Cache-Control": "max-age=0",
                        "x-content-type-options": "nosniff",
                    })
                    res.end("backend Error");
                    console.log(err);
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': "text/html; charset=utf-8",
                    "Cache-Control": "max-age=180",
                    "x-content-type-options": "nosniff",
                })
                res.end(data);
            })
        }
    }

}).listen(nodeServerPort)

/**
 * sends a get request to minetools api to get the users on the server
 */
function checkusers() {
    https.get(`https://api.minetools.eu/ping/${mcServerAddress}/${mcServerPort}`, (res) => {
        let response = '';

        // called when a data chunk is received.
        res.on('data', (chunk) => {
            response += chunk;
        });

        // called when the complete response is received.
        res.on('end', () => {
            response = JSON.parse(response);
            fs.readFile(filePath, (err, fileContent)=> {
                //if file doesn't already exist, create empty array
                if(err) fileContent = []
                else fileContent = JSON.parse(fileContent)

                //map object into array
                //original data is sample: {uuid: x, name: y}
                var playersNames = response.players.sample.map((e)=>{return e.name});

                //object to store
                var saveData = {
                    timestamp: new Date().getTime(),
                    playersOnline: response.players.online,
                    playersMax: response.players.max,
                    playersNames: playersNames,
                }

                //add new dataset to list
                fileContent.push(saveData)
                
                //save data again
                fs.writeFile(filePath, JSON.stringify(fileContent), (err2)=>{
                    if(err2) console.log(err2);
                });
            })
        });
    });
}