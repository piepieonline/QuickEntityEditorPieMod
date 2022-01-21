const fs = require("fs")
const path = require("path")
const Decimal = require('decimal.js').Decimal
const udp = require('dgram');
const { WebSocketServer } = require('ws');

function loadServer(shouldLog, callback) {
    var knownPins = JSON.parse(String(fs.readFileSync("./resources/app/knownPins.json")))

    var requestedPins;

    let currentGameConnectionInfo;

    function onMessageRecieved(msg) {
        let [pinType, pinId, entityId] = msg.trim().split('_');

        if (!pinType || !pinId || !entityId) return;

        let qeID = new Decimal(entityId).toHex().substring(2);

        if (knownPins[pinId] || knownPins[((-~pinId) - 1) + '']) {
            currentPin = { pinId, pinType, pinName: knownPins[pinId] || knownPins[((-~pinId) - 1) + ''], qeID };
        }
        else {
            currentPin = { pinId, pinType, tcPinId: (-~pinId) - 1, qeID };
        }

        if (shouldLog)
            logger.write('\r\n' + JSON.stringify(currentPin, null, 4));

        // console.log('pin created')

        if (requestedPins && requestedPins[`${currentPin.qeID}_${currentPin.pinName}`]) {
            requestedPins[`${currentPin.qeID}_${currentPin.pinName}`].send(JSON.stringify(currentPin));
            console.log('sent');
            console.log(currentPin)
        }
    }

    // --------------------creating a udp server --------------------

    // creating a udp server
    const gameServer = udp.createSocket('udp4');
    const flowchartServer = new WebSocketServer({ port: 27016 });

    // emits when any error occurs
    gameServer.on('error', function (error) {
        console.log('Error: ' + error);
        gameServer.close();
    });

    //emits when socket is ready and listening for datagram msgs
    gameServer.on('listening', function () {
        var address = gameServer.address();
        var port = address.port;
        var family = address.family;
        var ipaddr = address.address;
        console.log('gameServer is listening at port' + port);
        console.log('gameServer ip :' + ipaddr);
        console.log('gameServer is IP4/IP6 : ' + family);
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
            console.log('received: ', data.toString());

            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'register':
                    console.log(message.requestedPins)
                    requestedPins = message.requestedPins.reduce((prev, val) => { prev[val] = ws; return prev; }, {});
                    break;
                case 'highlight':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`H_${new Decimal("0x" + message.entityId).toFixed()}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'update_position':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`P_${new Decimal("0x" + message.entityId).toFixed()}_${message.positions.join('_')}_${message.rotations.join('_')}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
                case 'cover_plane':
                    console.log(message.entityId)
                    if(currentGameConnectionInfo)
                        gameServer.send(`C_${new Decimal("0x" + message.entityId).toFixed()}_${message.positions.join('_')}_${message.rotations.join('_')}_${message.size.join('_')}`, currentGameConnectionInfo.port, currentGameConnectionInfo.address);
                    break;
            }
        });
    });

    if (shouldLog) {
        fs.writeFileSync('./temp/serverLogPinMapping.json', '');
        var logger = fs.createWriteStream('./temp/serverLogPinMapping.json', { flags: 'a' });
    }

    gameServer.bind(27015);

    console.log('Servers booted');
}

loadServer(false, true);

function killServers()
{
    console.log('killed')
    process.exit(0);
}

module.exports = { loadServer, killServers }