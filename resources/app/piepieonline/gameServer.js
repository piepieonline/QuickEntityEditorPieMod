const Decimal = require('decimal.js').Decimal;

const msBetweenKeepAlive = 1500;

let socket;
let socketIsOpen;

let eleServerStatus;

let entities;
let enumList;

let pinListener;

function ConnectServer()
{
    // Set references to QNE variables
    entities = entity.entities;
    enumList = allEnums;

    socket = new WebSocket('ws://localhost:27016');

    // Connection opened
    socket.addEventListener('open', function (event) {
        socketIsOpen = true;
        updateServerStatus(true, false);
        RegisterPinListener([], null);

        let pingInterval = setInterval(() => {
            if(!socketIsOpen) {
                clearInterval(pingInterval);
            }

            try
            {
                socket.send(JSON.stringify({ type: 'ping' }));
            } catch {}
        }, msBetweenKeepAlive);
    });

    socket.addEventListener('close', function (event) {
        socketIsOpen = false;
        updateServerStatus(false, false);
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        
        const message = JSON.parse(event.data);

        if(!message.type.startsWith('Ping'))
            console.log('Message from server ', event.data);

        if (message.type === 'Pin') {
            if(pinListener) pinListener(message);
        }
        else if (message.type === 'GetHeroPosition') {
            console.log(message);

            if (transformToUpdateOnReturnMessage && entities[transformToUpdateOnReturnMessage]?.properties?.m_mTransform) {
                entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.x.value = message.x;
                entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.y.value = message.y;
                entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.z.value = message.z;

                displayEntityInSnippetEditor(entities[transformToUpdateOnReturnMessage]);
            }
        }
        else if (message.type.startsWith('Ping')) {
            updateServerStatus(true, message.type === 'PingGame');
        }
    });
}

function RegisterPinListener(requestedPins, pinListenerCallback)
{
    socket.send(JSON.stringify({ type: 'register', requestedPins }));
    pinListener = pinListenerCallback;
}

function HighlightInGame(id) {
    const entity = entities[id];

    if (entity) {
        socket.send(JSON.stringify({ type: 'highlight', entityId: id }));
    }
}

function UpdateInGame(property, id) {
    const entity = entities[id];

    if (entity) {
        if (property.split('_')[0] === 'property') {
            const propName = property.substring(9);
            socket.send(JSON.stringify({
                type: 'update_property',
                entityId: id,
                property: propName,
                ...convertToSocketProperty(entity.properties[propName] || entity.postInitProperties[propName])
            }));
        } else if (property === 'position') {
            socket.send(JSON.stringify({
                type: 'update_position', entityId: id, positions: [
                    entity.properties.m_mTransform.value.position.x.value,
                    entity.properties.m_mTransform.value.position.y.value,
                    entity.properties.m_mTransform.value.position.z.value
                ], rotations: [
                    entity.properties.m_mTransform.value.rotation.x.value,
                    entity.properties.m_mTransform.value.rotation.y.value,
                    entity.properties.m_mTransform.value.rotation.z.value
                ]
            }));
        } else if (property === 'draw_volume') {
            let size = [.1, .1, .1];

            if (entity.template === '[modules:/zcoverplane.class].pc_entitytype') {
                size = [
                    entity.properties.m_fCoverLength.value.value,
                    entity.properties.m_fCoverDepth.value.value,
                    entity.properties.m_eCoverSize.value === 'eLowCover' ? 1 : 2
                ];
            }
            else if (!!entity.properties.m_vGlobalSize) {
                size = [
                    entity.properties.m_vGlobalSize.value.x.value,
                    entity.properties.m_vGlobalSize.value.y.value,
                    entity.properties.m_vGlobalSize.value.z.value
                ];
            }

            socket.send(JSON.stringify({
                type: 'cover_plane', entityId: id, positions: [
                    entity.properties.m_mTransform.value.position.x.value,
                    entity.properties.m_mTransform.value.position.y.value,
                    entity.properties.m_mTransform.value.position.z.value
                ], rotations: [
                    entity.properties.m_mTransform.value.rotation.x.value,
                    entity.properties.m_mTransform.value.rotation.y.value,
                    entity.properties.m_mTransform.value.rotation.z.value
                ], size
            }));
        } else if (property === 'set_hero_position') {
            socket.send(JSON.stringify({
                type: 'set_hero_position', entityId: id, positions: [
                    entity.properties.m_mTransform.value.position.x.value,
                    entity.properties.m_mTransform.value.position.y.value,
                    entity.properties.m_mTransform.value.position.z.value
                ], rotations: [
                    entity.properties.m_mTransform.value.rotation.x.value,
                    entity.properties.m_mTransform.value.rotation.y.value,
                    entity.properties.m_mTransform.value.rotation.z.value
                ]
            }));
        }
    }
}

function RequestPosition(idToChange) {
    socket.send(JSON.stringify({ type: 'get_hero_position' }));
    transformToUpdateOnReturnMessage = idToChange;
}

function updateServerStatus(serverConnected, gameConnected)
{
    if(!eleServerStatus)
    {
        eleServerStatus = document.createElement('div');
        eleServerStatus.style.position = 'absolute';
        eleServerStatus.style.top = '5px';
        eleServerStatus.style.right = '10px';
        eleServerStatus.style['font-size'] = '20px';
        eleServerStatus.style['text-align'] = 'right';
        eleServerStatus.onclick = () => {
            if(!socketIsOpen) ConnectServer();
        }

        document.body.appendChild(eleServerStatus);
    }

    eleServerStatus.innerHTML = `Server: ${serverConnected ? '<span style="color: green; font-weight: bold;">✓</span>' : '<span style="color: red; font-weight: bold;">☓</span>'}<br />Game: ${gameConnected ? '<span style="color: green; font-weight: bold;">✓</span>' : '<span style="color: red; font-weight: bold;">☓</span>'}${serverConnected ? '' : '<br />Click to connect'}`;
}

function convertToSocketProperty(property)
{
    if(enumList[property.type])
    {
        return {
            propertyType: 'enum',
            value: enumList[property.type].indexOf(property.value)
        };
    }

    const socketProperty = {
        propertyType: property.type
    };

    switch(property.type)
    {
        case 'SMatrix43':
            const positions = [
                property.value.position.x.value,
                property.value.position.y.value,
                property.value.position.z.value
            ];
            const rotations = [
                property.value.rotation.x.value,
                property.value.rotation.y.value,
                property.value.rotation.z.value
            ];
            socketProperty.value = `${positions.join('|')}|${rotations.join('|')}`;
            break;
        case 'Guid':
            socketProperty.value = (property.value.value || property.value).toUpperCase();
            break;
        case 'SEntityTemplateReference':
            socketProperty.value = new Decimal("0x" + property.value).toFixed();
            break;
        case 'TArray<SEntityTemplateReference>':
            socketProperty.value = `${property.value.length}|${property.value.map(ref => new Decimal("0x" + ref).toFixed()).join('|')}`;
            break;
        default:
            socketProperty.value = property.value.value || property.value;
    }

    return socketProperty;
}

module.exports = {
    ConnectServer,
    RegisterPinListener,
    HighlightInGame,
    UpdateInGame,
    RequestPosition
};