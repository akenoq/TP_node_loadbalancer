"use strict";

const portNumber = 80;

///////////////////////////////////////////////////////

// фреймворк для получения http запросов от клиентов
let express = require("express");
let app = express();

// запускаем приложение на порте portNumber
let port = portNumber;
app.listen(port);
console.log("Server works on port " + port);
console.log("-----------------------------------");

///////////////////////////////////////////////////////
// переменная, которая увеличивается
// при отправке ответа клиенту
let rps = 0;
///////////////////////////////////////////////////////

// срабатывает на каждый новый запрос
app.use(function(req, res, next) {
    // число для проверки успешной пересылки заголовков к клиенту от бэкэнда
    const randMessage = "Rand-Value-" + (parseInt(Math.random() * 10000) % 1000).toString();
    // заголовки, отправляются клиенту
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Backend-My-Own-Type", "Backend-For-Counting-Cube-Of-Number");
    res.header("Cache-Control", "no-cache");
    res.header("Rand-Value", randMessage);
    next();
});

///////////////////////////////////////////////////////

// функция вычисленния куба полученного от клиента числа
function findCube(n) {
    let count = 0;
    for(let i = 0; i < n; i++)
        for(let j = 0; j < n; j++)
            for(let k = 0; k < n; k++)
                count += 1;
    return count;
}

///////////////////////////////////////////////////////

// функция для получения числа kkk из заголовка клиента
function getKKKheaderValue(request) {
    // kkk = 1, если такой заголовок не получен
    let kkk = 1;
    // получаем заначение kkk из заголовка
    for(let headerName in request.headers) {
        if(headerName + "" === "kkk") {
            kkk = parseInt(request.headers[headerName + ""]);
            console.log("kkk: " + kkk);
        }
    }
    return kkk;
}

///////////////////////////////////////////////////////

app.post('/*', (request, response) => {
    // извлекаем число kkk из заголовка
    const kkk = getKKKheaderValue(request);

    let body = "";
    request.on('data', (data) => {
        // получаем часть тела запроса
        body += data;
    }).on('end', () => {
        // когда получили все тело запроса
        body = body.toString();
        console.log("POST url: " + request.url);
        console.log("Body: " + body);
        const data = body;
        console.log("Data: " + data);
        // получаем число от клиента
        const n = parseInt(data);
        // вычисляем куб поолученного числа
        const cube = findCube(n);
        // и домножаем на kkk, полученное из заголовка
        const answer = cube * kkk;
        console.log("Answer: " + answer);
        console.log("------------------------------");
        // отправляем ответ клиенту
        response.end(answer.toString());
        rps++;
    });
});

app.get('/*', (request, response) => {
    const kkk = getKKKheaderValue(request);

    const url = request.url;
    console.log("GET url: " + url);
    // берем число n из GET запроса формата /rndstr/333
    let data = url.toString().split("/")[2];
    console.log("Data: " + data);
    // вычисляем n^3 * kkk
    const n = parseInt(data);
    const cube = findCube(n);
    const answer = cube * kkk;
    console.log("Answer: " + answer);
    console.log("------------------------------");
    response.end(answer.toString());
    rps++;
});

///////////////////////////////////////////////////////

// datadog

let StatsD = require('hot-shots'),
    client = new StatsD();

// отлавливаем ошибку отправки а Datadog,
// чтобы данная программа не перестала работать
client.socket.on('error', function(error) {
    console.error("Error in socket: ", error);
});

// отправляем значение rps, накопленное за 1 секунду
let metricInter = setInterval(() => {
    client.gauge('rps_1', parseInt(rps));
    rps = 0;
}, 1000);
