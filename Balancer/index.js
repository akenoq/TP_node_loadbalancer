"use strict";

const fs = require('fs');

const configFileContent = fs.readFileSync('./config.json', 'utf8');
const configObj = JSON.parse(configFileContent.toString());
const restartTimeSeconds = parseInt(configObj.restartTimeSeconds);
const urlsArray = configObj.urlsArray;

//////////////////////////////////////////////////////////////////
// колич обраб запросов в 1 секунду
let rps = 0;
//////////////////////////////////////////////////////////////////

// библиотека для отправки запросов на бэкэнды
const request = require('request');

/**
 * Функция отправки запроса на бэкэнд
 * @param url - url бэкэнда + path
 * @param body
 * @param callback - функция при получении ответа от бэкэнда
 * @param errorCallback - функция при получениие ошибки
 * @param headers - заголовки из запроса клиента, для перенаправления на бэкэнд
 */
function sendQuery(url, body, callback, errorCallback, headers) {
    // формируем словарь заголовков
    const headersObj = {};
    for(let headerName in headers) {
        // преобразуем кодировки headerName в строку
        // добавление в словарь заголовка
        headersObj[headerName + ""] = headers[headerName + ""] + "";
    }
    // если тело запроса есть, то это POST запрос
    if(body !== null) {
        request.post({
            url: url,
            body: body,
            headers: headersObj,
        }, function (error, response, body) {
            // получен ответ от бэкэнда
            rps++;
            if (!error) {
                // передаем тело ответа и обьект заголовков от бэкэнда
                const result = body.toString();
                callback(result, response.headers);
            } else {
                errorCallback();
            }
        });
    } else {
        // body = null
        request.get({
            url: url,
            body: body,
            headers: headersObj,
        }, function (error, response, body) {
            rps++;
            if (!error) {
                const result = body.toString();
                callback(result, response.headers);
            } else {
                errorCallback();
            }
        });
    }
}

//////////////////////////////////////////////////////////////////

// библиотека для получения http запросов
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

// массив обьектов бэкэндов
// {
//     url
//     queriesArray - массив обьектов
//                  {
//                        response: response - обьект ответа со ссылкой для отправки ответа клиенту
//                        tail: tail,
//                        body: body,
//                        headers: headers,
//                  }
//     killed - статус бэкэнда
// }
const controllers = [];
// формируем массив бэкэндов по массиву urlов
urlsArray.forEach((url) => {
    controllers.push({
        url: url.toString(),
        queriesArray: [],
        killed: false,
    })
});

//////////////////////////////////////////////////////////////////

// Функция для рассылки 502 ошибки всем клиентам бэкэнда
// при отключении всех бэкэндов
function sendAllError() {
    console.log("**************************************");
    console.log("+++ SEND ALL ERROR +++");
    controllers.forEach((controller) => {
        console.log("::: Visit controller :::");
        console.log("%%% Conn length: " + controller.queriesArray.length + " %%%");
        controller.queriesArray.forEach((q) => {
            // установка статуса 502
            q.response.status(502);
            // отправка ответа клиенту и закрытие соединения
            q.response.end("Code: 502");
            console.log("--- Send 502 to client ---");
        });
    });
    console.log("**************************************");
}

//////////////////////////////////////////////////////////////////

/**
 * Функция добавления запроса в queriesArray наиболее свободного бэкэнда
 * @param response - ссылка на соединение с клиентом, для отправки ответа
 * @param tail
 * @param body
 * @param headers
 */
function makeQuery(response, tail, body, headers) {
    let resultController = null;

    // выбираем работающий бэкэнд
    controllers.forEach((controller) => {
        if(controller.killed === false) {
            resultController = controller;
        }
    });

    // ищем среди работающих бэкэндов бэкэнд с наименьшим количеством соединений
    controllers.forEach((controller) => {
        if(controller.killed === false) {
            if (controller.queriesArray.length <= resultController.queriesArray.length) {
                resultController = controller;
            }
        }
    });

    // если работающий бэкэнд найден
    // добавляем параметры запроса в массив
    if(resultController !== null) {
        resultController.queriesArray.push({
            response: response,
            tail: tail,
            body: body,
            headers: headers,
        });

        // отсылаем запрос на выбранный бэкэнд
        sendQuery(resultController.url + tail, body, (answer, responseHeaders) => {
            // получен неошибочный ответ от бэкэнда
            console.log("Answer: " + answer);
            console.log("---------------------------");

            // индекс обьекта response, на который получен ответ от бэкэнда
            let index = -1;

            // ищем в массиве текущих соединений соединение с данным обьектом response
            // и удаляем из массива
            for (let i = 0; i < resultController.queriesArray.length; i++) {
                const q = resultController.queriesArray[i];
                if (q.response === response) {
                    index = i;
                    break;
                }
            }
            resultController.queriesArray.splice(index, 1);

            // пробегаем по заголовкам, чтобы сформировать заголовки для отправки клиенту
            for(let key in responseHeaders) {
                // try .. catch чтобы избежать ошибки при дублированных headerKey
                try {
                    response.setHeader(key + "", responseHeaders[key + ""] + "");
                } catch (err) {
                    // can not set header
                }
            }
            // отправка ответа клиенту
            response.end(answer.toString());
        }, () => {
            // получена ошибка от бэкэнда или ответ долго не приходит

            // normal = true, если есть хотя бы 1 рабочий бэкэнд
            let normal = false;
            controllers.forEach((controller) => {
                if(controller.killed === false) {
                    normal = true;
                }
            });

            // если рабочий бэкэнд есть
            if(normal === true) {
                // буфер запросов для перераспределения с выбранного на рабочие бэкэнды
                const buffer = [];
                resultController.queriesArray.forEach((query) => {
                    buffer.push(query);
                });

                // устанавливаем статус бэкэнда в нерабочий
                resultController.killed = true;

                // рекурсивно перераспределяем запросы по одному
                buffer.forEach((query) => {
                    makeQuery(query.response, query.tail, query.body, query.headers);
                });
            } else {
                // normal = false
                // бэкэнд упал до получения ответа
                sendAllError();
            }
        }, headers);
    }

    // не найден рабочий бэкэнд
    // бэкэнд упал до отправки запроса
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

    // если все бэкэнды нерабочие, сразу отсылаем статус 502 и выходим из обработки
    if(normal === false) {
        response.status(502);
        response.end("Code 502");
        return;
    }

    // получаем headers от клиента
    const headers = request.headers;

    // path запроса
    const tail = request.url;
    const body = null;
    console.log("Tail: " + tail);
    console.log("Body: " + body);

    // распределяем заппрос
    makeQuery(response, tail, body, headers);
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

    // получаем headers от клиента
    const headers = request.headers;

    let body = "";
    request.on('data', (data) => {
        // получаем часть тела запроса
        body += data;
    }).on('end', () => {
        const tail = request.url;
        body = body.toString();
        console.log("Tail: " + tail);
        console.log("Body: " + body);
        // распределяем заппрос
        makeQuery(response, tail, body, headers);
    });
});

//////////////////////////////////////////////////////////////////

let time = 0;
// таймер для оживления бэкэндов
let inter = setInterval(() => {
    time += 1;
    if(time === restartTimeSeconds) {
        time = 0;
        // оживляем бэкэнды
        controllers.forEach((controller) => {
            controller.killed = false;
        });
    }
}, 1000);

//////////////////////////////////////////////////////////////////

// таймер для очистки массива обьектов запросов на нерабочих бэкэндах
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

// отлавливаем ошибку отправки а Datadog,
// чтобы данная программа не перестала работать
client.socket.on('error', function(error) {
    console.error("Error in socket: ", error);
});

// отправляем значение rps, накопленное за 1 секунду
let metricInter = setInterval(() => {
    client.gauge('rps', parseInt(rps));
    rps = 0;
}, 1000);
