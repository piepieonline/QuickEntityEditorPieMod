const Decimal = require('decimal.js').Decimal

const config = require('./settings.json');

function Initialise() {
    const actionList = document.querySelector('div[x-show=viewsOpen]');
    const views = document.querySelector('#tree').closest('.col-span-7');

    if(config.reorderGraph)
        actionList.insertBefore(actionList.children[3], actionList.children[2]);

    function addNewAction(id, text, icon, src)
    {
        const actionEle = document.createElement('div');
        actionEle.id = id + 'Tab';
        actionEle.className = 'p-4 my-1 bg-gray-700 cursor-pointer grid grid-cols-8 gap-2 items-center';
        actionEle.innerHTML = `<i class="fas ${icon} col-span-1"></i><span class="col-span-7">${text}</span>`;
        actionEle.onclick = () => ChangeView(id);

        actionList.insertBefore(actionEle, actionList.children[actionList.children.length - 1]);

        const viewEle = document.createElement('div');
        viewEle.id = id;
        viewEle.style.cssText = 'display: none; height: calc(100vh - 128px); width: 100%';
        viewEle.innerHTML = `<iframe style="height: 100%; width: 100%;" id="${id}Frame" src="${src}"></iframe>`;

        views.append(viewEle);
    }

    if(config.addPieGraph)
        addNewAction('pieGraph', 'Pie Graph View', 'fa-project-diagram', './piepieonline/graph/index.html');
    if(config.addPie3DView)
        addNewAction('pie3DView', 'Pie 3D View', 'fa-cubes', './piepieonline/3dview/index.html');
}

function ChangeView(view) {
    console.log('changing to ' + view);

    changeView(view);

    switch(view)
    {
        case "pieGraph":
			if (currentView === view) {
				document.getElementById('pieGraphFrame').contentWindow.location.reload();
			}

			setTimeout(() => {
				document.getElementById('pieGraphFrame').contentWindow.externallyLoadedModel = entity;
				document.getElementById('pieGraphFrame').contentWindow.externallyLoadedReferences = reverseReferences;
				document.getElementById('pieGraphFrame').contentWindow.externalEditorTree = editorTree;
				document.getElementById('pieGraphFrame').contentWindow.hashList = hashListAsObject;
				document.getElementById('pieGraphFrame').contentWindow.allEnums = allEnums;
				
				document.getElementById('pieGraphFrame').contentWindow.Decimal = Decimal;
				document.getElementById('pieGraphFrame').contentWindow.displayEntityInSnippetEditor = displayEntityInSnippetEditor;
				document.getElementById('pieGraphFrame').contentWindow.PieServerExtensions = pieServerExtensions;

				document.getElementById('pieGraphFrame').contentWindow.load(currentlySelected);
			}, 1000);

			break;
		case "pie3DView":
			//if(currentView === view) {
			document.getElementById('pie3DViewFrame').contentWindow.location.reload();
			// }

			setTimeout(() => {
				document.getElementById('pie3DViewFrame').contentWindow.externallyLoadedModel = entity;
				document.getElementById('pie3DViewFrame').contentWindow.hashList = hashListAsObject;
				document.getElementById('pie3DViewFrame').contentWindow.load(currentlySelected);
			}, 1000);

			break;
    }
}

module.exports = {
    Initialise,
    ChangeView
};
