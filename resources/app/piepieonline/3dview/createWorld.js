function createWorld(scene) {
    const idToMesh = {};

    function createWorldObject(entityID, mesh) {
        if (mesh) {
            idToMesh[entityID] = mesh;
            mesh.entityID = entityID;
            scene.add(mesh);
        }

        return mesh;
    }

    /*

    const loader = new THREE.GLTFLoader();

    const rootPath = 'D:\\Game Modding\\Hitman\\H3 Exported Data\\Extracted Whittleton\\006A0ED87A7C1EB1.PRIM\\';
    const fileName = '006A0ED87A7C1EB1.PRIM.glb';
    fetch(rootPath + fileName).then(response => response.blob()).then(blob => {
        const file = new File([blob], fileName);
        const url = URL.createObjectURL(file);
        const assetMap = new Map();
        assetMap.set(fileName, file);

        new Viewer(null, {
            kiosk: false,
            model: '',
            preset: '',
            cameraPosition: null
        }).load(url, '/', assetMap).then(t => {
            console.log(t);
            scene.add(t.scene)
        });
    });

    */

    const worldObjectsByType = {};

    for (const [entityID, entity] of Object.entries(externallyLoadedModel.entities)) {
        let transformedTemplate = convertTemplate(entity);

        if (transformedTemplate.entityTemplate === 'Unknown Template') {
            transformedTemplate = {
                entityTemplate: entity.template,
                type: entity.template
            };
        }

        if(entityID === '710845eac3f6aa0c')
        {
            console.log('debug');
        }

        if (entity.template.indexOf('[assembly:/_pro/environment/templates/kits/') === 0) {
            transformedTemplate = { template: entity.template, type: 'levelkititem' }
        }

        let createdObject;

        switch (transformedTemplate.type) {
            case 'npc':
                createdObject = createWorldObject(entityID, createNPC(entity));
                break;
            case 'action':
                createdObject = createWorldObject(entityID, createAction(entity));
                break;
            case '[modules:/zcoverplane.class].pc_entitytype':
                createdObject = createWorldObject(entityID, createCoverPlane(entity));
                break;
            case '[assembly:/_pro/design/levelflow.template?/herospawn.entitytemplate].pc_entitytype':
                createdObject = createWorldObject(entityID, createPlayerSpawn(entity));
                break;
            case 'levelkititem':
                createdObject = createWorldObject(entityID, createLevelKitItem(entity));
                break;
            case 'boxvolumeentity':
                createdObject = createWorldObject(entityID, createVolumeBox(entity));
                break;
            case 'spatialentity':
                createdObject = createWorldObject(entityID, createSmallGizmo(entity, 0xfffdbe));
                break;
            case 'itemspawner':
                createdObject = createWorldObject(entityID, createSmallGizmo(entity, 0x8cfaa2));
                break;
            case 'setpiece':
            case 'setpieceactivator':
                createdObject = createWorldObject(entityID, createSmallGizmo(entity, 0xb88db3, true));
                break;
        }

        if (createdObject) {
            if (!worldObjectsByType[transformedTemplate.type]) worldObjectsByType[transformedTemplate.type] = [];
            worldObjectsByType[transformedTemplate.type].push(createdObject);
        }
    }

    return {
        idToMesh,
        worldObjectsByType
    };
}
