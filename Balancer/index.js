"use strict";

const fs = require('fs');

const configFileContent = fs.readFileSync('./config.json', 'utf8');
const configObj = JSON.parse(configFileContent.toString());
const restartTimeSeconds = parseInt(configObj.restartTimeSeconds);
const urlsArray = configObj.urlsArray;

//////////////////////////////////////////////////////////////////
let rps = 0;
//////////////////////////////////////////////////////////////////

const request = require('request');

function sendQuery(url, body, callback, errorCallback) {
    if(body !== null) {
        request.post({
            url: url,
            body: body,
        }, function (error, response, body) {
            rps++;
            if (!error) {
                const result = body.toString();
                callback(result);
            } else {
                errorCallback();
            }
        });
    } else {
        request.get({
            url: url,
            body: body,
        }, function (error, response, body) {
            rps++;
            if (!error) {
                const result = body.toString();
                callback(result);
            } else {
                errorCallback();
            }
        });
    }
}

//////////////////////////////////////////////////////////////////

let express = require("express");
let app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let port = 80;
app.listen(port);
console.log("Server works on port " + port);
console.log("-----------------------------------");

//////////////////////////////////////////////////////////////////

const controllers = [];

urlsArray.forEach((url) => {
    controllers.push({
        url: url.toString(),
        queriesArray: [],
        killed: false,
    })
});

//////////////////////////////////////////////////////////////////

function sendAllError() {
    console.log("**************************************");
    console.log("+++ SEND ALL ERROR +++");
    controllers.forEach((controller) => {
        console.log("::: Visit controller :::");
        console.log("%%% Queue length: " + controller.queriesArray.length + " %%%");
        controller.queriesArray.forEach((q) => {
            q.response.status(502);
            q.response.end("Code: 502");
            console.log("--- Send 502 to client ---");
        });
    });
    console.log("**************************************");
}

//////////////////////////////////////////////////////////////////

function makeQuery(response, tail, body) {
    let resultController = null;

    controllers.forEach((controller) => {
        if(controller.killed === false) {
            resultController = controller;
        }
    });

    controllers.forEach((controller) => {
        if(controller.killed === false) {
            if (controller.queriesArray.length <= resultController.queriesArray.length) {
                resultController = controller;
            }
        }
    });

    if(resultController !== null) {
        resultController.queriesArray.push({
            response: response,
            tail: tail,
            body: body,
        });

        sendQuery(resultController.url + tail, body, (answer) => {
            console.log("Answer: " + answer);
            console.log("---------------------------");

            let index = -1;
            for (let i = 0; i < resultController.queriesArray.length; i++) {
                const q = resultController.queriesArray[i];
                if (q.response === response) {
                    index = i;
                    break;
                }
            }

            resultController.queriesArray.splice(index, 1);
            response.end(answer.toString());
        }, () => {
            let normal = false;
            controllers.forEach((controller) => {
                if(controller.killed === false) {
                    normal = true;
                }
            });

            if(normal === true) {
                const buffer = [];
                resultController.queriesArray.forEach((query) => {
                    buffer.push(query);
                });

                resultController.killed = true;

                buffer.forEach((query) => {
                    makeQuery(query.response, query.tail, query.body);
                });
            } else {
                sendAllError();
            }
        });
    }


    if(resultController === null) {
        sendAllError();
    }
}

//////////////////////////////////////////////////////////////////

let getCount = 0;

app.get("/*", (request, response) => {
    getCount++;
    console.log("new Get query: " + getCount);

    controllers.forEach((controler) => {
        console.log("Q_len: " + controler.queriesArray.length);
    });

    let normal = false;
    controllers.forEach((controller) => {
        if(controller.killed === false) {
            normal = true;
        }
    });

    if(normal === false) {
        response.status(502);
        response.end("Code 502");
        return;
    }

    const tail = request.url;
    const body = null;
    console.log("Tail: " + tail);
    console.log("Body: " + body);
    makeQuery(response, tail, body);
});

let postCount = 0;

app.post('/*', (request, response) => {
    postCount++;
    console.log("new POST query: " + postCount);

    controllers.forEach((controler) => {
        console.log("Q_len: " + controler.queriesArray.length);
    });

    let normal = false;
    controllers.forEach((controller) => {
        if(controller.killed === false) {
            normal = true;
        }
    });

    if(normal === false) {
        response.status(502);
        response.end("Code 502");
        return;
    }

    let body = "";
    request.on('data', (data) => {
        body += data;
    }).on('end', () => {
        const tail = request.url;
        body = body.toString();
        console.log("Tail: " + tail);
        console.log("Body: " + body);
        makeQuery(response, tail, body);
    });
});

//////////////////////////////////////////////////////////////////

let time = 0;

let inter = setInterval(() => {
    time += 1;
    if(time === restartTimeSeconds) {
        time = 0;
        controllers.forEach((controller) => {
            controller.killed = false;
        });
    }
}, 1000);

//////////////////////////////////////////////////////////////////

let clearQueueInter = setInterval(() => {
    controllers.forEach((controller) => {
        if(controller.killed === true) {
            controller.queriesArray = [];
        }
    });
}, 1);

//////////////////////////////////////////////////////////////////

// datadog

let StatsD = require('hot-shots'),
    client = new StatsD();

// Catch socket errors so they don't go unhandled, as explained
// in the Errors section below
client.socket.on('error', function(error) {
    console.error("Error in socket: ", error);
});

let metricInter = setInterval(() => {
    // Gauge: Gauge a stat by a specified amount
    client.gauge('my_rps', parseInt(rps));
    rps = 0;
}, 1000);
