function createTemplateVariant(newNodes, newLinks)
{
    return new Promise((resolve, reject) => {
        /*
        fetch(`./GameEntities/Defaults/${window.level}.entity.json`)
            .then(response => response.json())
            .then(entityListResponse => {
                entityListResponse.entities;

                resolve(entityListResponse);
            });
        */

        const nodeLinks = {};

        newLinks.forEach(link => {
            nodeLinks[link.from] = link
        });

        const patchJSON = {
            tempHash: 'REPLACE_ME',
            tbluHash: 'REPLACE_ME',
            patch: [

            ]
        };
        
        var pathCounter = 0;
        newNodes.forEach(node => {
            patchJSON.patch.push({
                op: 'add',
                path: `REPLACE_ME_PATH_${pathCounter++}`,
                value: createValue(node, newLinks[node.id])
            })
        })

        resolve(patchJSON);
    });

    function createValue(node, links)
    {
        const base = {
            parent: 'REPLACE_ME_PARENT',
            name: node.name,

        }

        return base;
    }
}