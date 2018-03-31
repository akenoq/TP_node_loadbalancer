"use strict";

const portNumber = 5010;

///////////////////////////////////////////////////////

let express = require("express");
let app = express();

let port = process.env.PORT || portNumber;
app.listen(port);
console.log("Server works on port " + port);
console.log("-----------------------------------");

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

///////////////////////////////////////////////////////

function findCube(n) {
    let count = 0;
    for(let i = 0; i < n; i++)
        for(let j = 0; j < n; j++)
            for(let k = 0; k < n; k++)
                count += 1;
    return count;
}

///////////////////////////////////////////////////////

app.post('/*', (request, response) => {
    let body = "";
    request.on('data', (data) => {
        body += data;
    }).on('end', () => {
        body = body.toString();
        console.log("POST url: " + request.url);
        console.log("Body: " + body);
        const data = body;
        console.log("Data: " + data);
        const n = parseInt(data);
        const cube = findCube(n);
        console.log("Answer: " + cube);
        console.log("------------------------------");
        response.end(cube.toString());
    });
});

app.get('/*', (request, response) => {
    const url = request.url;
    console.log("GET url: " + url);
    let data = url.toString().split("/")[2];
    console.log("Data: " + data);
    const n = parseInt(data);
    const cube = findCube(n);
    console.log("Answer: " + cube);
    console.log("------------------------------");
    response.end(cube.toString());
});
