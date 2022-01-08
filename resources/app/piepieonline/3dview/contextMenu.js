let ctxMenu, canvas;

window.addEventListener('DOMContentLoaded', (event) => {
    ctxMenu = document.getElementById('context-menu');
    canvas = document.getElementById('canvas');

    canvas.addEventListener('contextmenu', (event) => {
        ctxMenu.classList.toggle('open');
        ctxMenu.style.left = event.pageX;
        ctxMenu.style.top = event.pageY;
        window.ctxTarget = event.target;
    });
    
    canvas.addEventListener('click', () => {
        closeContextMenu();
    });
});

function closeContextMenu() {
    ctxMenu.classList.remove('open');
}

function createContextMenuItems(idToMesh, worldObjectsByType)
{
    const currentValues = {};

    for (let type of Object.keys(worldObjectsByType))
    {
        currentValues[type] = worldObjectsByType[type][0].visible;
        let ele = document.createElement('button');
        ele.innerText = `Toggle ${type}`;
        ele.togglingValue = type;
        ele.addEventListener('click', () => {
            currentValues[type] = !currentValues[type];
            setVisibleByType(type, currentValues[type]);
            closeContextMenu();
        });

        ctxMenu.appendChild(ele);
    }
}