const fs = require("fs")
const path = require("path")
const Decimal = require('decimal.js').Decimal
const udp = require('dgram');
const { WebSocketServer } = require('ws');

const gamePort = 37275;
const qnePort = 47275;

let lastGamePing = 0;

function loadServer(shouldLog, callback) {
    var knownPins = JSON.parse(String(fs.readFileSync("./resources/app/knownPins.json")))

    var requestedPins;

    let currentGameConnectionInfo;

    function onMessageRecieved(msg) {
        if(msg.startsWith('I_') || msg.startsWith('O_'))
            DoPin(msg);
        else if (msg.startsWith('GetHeroPosition'))
        {
            const [ msgType, x, y, z] = msg.split('_');
            requestedPins.mostRecent.send(JSON.stringify({ type: msgType, x, y, z }))
            console.log('sent ' + msgType);
        }
        else if (msg.startsWith('Ping'))
        {
            lastGamePing = Date.now();
            requestedPins.mostRecent.send(JSON.stringify({ type: 'PingGame' }))
        }
    }

    function DoPin(msg) {
        let [pinType, pinId, entityId] = msg.trim().split('_');

        if (!pinType || !pinId || !entityId) return;

        let qeID = new Decimal(entityId).toHex().substring(2);

        if (knownPins[pinId] || knownPins[((-~pinId) - 1) + '']) {
            currentPin = { type: 'Pin', pinId, pinType, pinName: knownPins[pinId] || knownPins[((-~pinId) - 1) + ''], qeID };
        }
        else {
            currentPin = { type: 'Pin', pinId, pinType, tcPinId: (-~pinId) - 1, qeID };
        }

        if (shouldLog)
            logger.write('\r\n' + JSON.stringify(currentPin, null, 4));

        // console.log('pin created')

        if (requestedPins && requestedPins[`${currentPin.qeID}_${currentPin.pinName}`]) {
            requestedPins[`${currentPin.qeID}_${currentPin.pinName}`].send(JSON.stringify(currentPin));
            console.log('sent Pin');
            console.log(currentPin)
        }
    }

    // --------------------creating a udp server --------------------

    // creating a udp server
    const gameServer = udp.createSocket('udp4');
    const flowchartServer = new WebSocketServer({ port: qnePort });

    // emits when any error occurs
    gameServer.on('error', function (error) {
        console.log('Error: ' + error);
        gameServer.close();
    });

    //emits when socket is ready and listening for datagram msgs
    gameServer.on('listening', function () {
        var address = gameServer.address();
        var port = address.port;
        var ipaddr = address.address;
        console.log('gameServer is listening at port: ' + port);
        console.log('gameServer ip:' + ipaddr);
    });

    //emits after the socket is closed using socket.close();
    gameServer.on('close', function () {
        console.log('Socket is closed !');

        if (shouldLog)
            logger.end()
    });

    process.on('exit', (code) => {
        if (gameServer)
            gameServer.close();
        if (flowchartServer)
            flowchartServer.close();
    });


    // emits on new datagram msg
    gameServer.on('message', function (msg, info) {
        onMessageRecieved(msg.toString());
        currentGameConnectionInfo = info;
    });

    flowchartServer.on('connection', function connection(ws) {
        ws.on('message', function message(data) {
            const message = JSON.parse(data.toString());

            if(message.type !== 'ping')
                console.log('received: ', data.toString());

            switch (message.type) {
                case 'register':
                    console.log(message.requestedPins)
                    requestedPins = message.requestedPins.reduce((prev, val) => { prev[val] = ws; return prev; }, {});
                    requestedPins.mostRecent = ws;
                    break;
                case 'ping':
                    if(!currentGameConnectionInfo)
                    {
                        requestedPins.mostRecent.send(JSON.stringify({ type: 'PingIntermediary' }));
                        break;
                    }
                    
                    gameServer.send('Ping', currentGameConnectionInfo.port, currentGameConnectionInfo.address);

                    if(lastGamePing < (Date.now() - 5000))
                    {
                        requestedPins.mostRecent.send(JSON.stringify({ type: 'PingIntermediary' }));
                    }
                    break;
                case 'highlight':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`H|${new Decimal("0x" + message.entityId).toFixed()}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'update_position':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`P|${new Decimal("0x" + message.entityId).toFixed()}|${message.positions.join('|')}|${message.rotations.join('|')}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'cover_plane':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`C|${new Decimal("0x" + message.entityId).toFixed()}|${message.positions.join('|')}|${message.rotations.join('|')}|${message.size.join('|')}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'get_hero_position':
                    if(currentGameConnectionInfo)
                        gameServer.send(`GetHeroPosition`, currentGameConnectionInfo.port, currentGameConnectionInfo.address); 
                    break;
                case 'set_hero_position':
                    if(currentGameConnectionInfo)
                        gameServer.send(`SetHeroPosition|${new Decimal("0x" + message.entityId).toFixed()}|${message.positions.join('|')}|${message.rotations.join('|')}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'update_property':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`UpdateProperty|${new Decimal("0x" + message.entityId).toFixed()}|${message.property}|${message.propertyType}|${message.value}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
            }
        });
    });

    if (shouldLog) {
        fs.writeFileSync('./temp/serverLogPinMapping.json', '');
        var logger = fs.createWriteStream('./temp/serverLogPinMapping.json', { flags: 'a' });
    }

    gameServer.bind(gamePort);

    console.log('Servers booted');
}

loadServer(false, true);

function killServers()
{
    console.log('killed')
    process.exit(0);
}

module.exports = { loadServer, killServers }