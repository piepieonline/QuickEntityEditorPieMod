function createWorld(scene, threeMeshList) {
    function createWorldObject(entityID, mesh) {
        if (mesh) {
            threeMeshList[entityID] = mesh;
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



    for (const [entityID, entity] of Object.entries(externallyLoadedModel.entities)) {

        let transformedTemplate = convertTemplate(entity);

        if(transformedTemplate.entityTemplate === 'Unknown Template') {
            transformedTemplate = {
                entityTemplate: entity.template,
                type: entity.template
            };
        }
            

        if (entity.template.indexOf('[assembly:/_pro/environment/templates/kits/') === 0) {
            transformedTemplate = { template: entity.template, type: 'levelkititem' }
        }

        switch (transformedTemplate.type) {
            case 'npc':
                createWorldObject(entityID, createNPC(entity));
                break;
            case 'action':
                createWorldObject(entityID, createAction(entity));
                break;
            case '[modules:/zcoverplane.class].pc_entitytype':
                createWorldObject(entityID, createCoverPlane(entity));
                break;
            case '[assembly:/_pro/design/levelflow.template?/herospawn.entitytemplate].pc_entitytype':
                createWorldObject(entityID, createPlayerSpawn(entity));
                break;
            case 'levelkititem':
                createWorldObject(entityID, createLevelKitItem(entity));
                break;
        }

    }
}
