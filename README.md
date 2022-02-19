# Piepieonline's QNE extensions

A bridge between Hitman 3 and QuickEntityEditor (QNE)
* Runtime updating of properties (including positions) in QNE, that then change in-game
* Drawing bounding boxes around ingame objects selected in QNE
* Providing a JSON schema of known properties and events in the tree view text editor. This also allows for autocomplete.
* Highlighting pin events as they happen in QNE, to allow for easier debugging

|![Before](resources/app/piepieonline/readme/propInitialState.jpg?raw=true "Before")|![Updating](resources/app/piepieonline/readme/propUpdateContextMenu.png?raw=true "Updating")|![After](resources/app/piepieonline/readme/propAfterState.jpg?raw=true "After")|
| --- | --- | --- |

## Requirements
* Hitman 3
* QuickEntityEditor (aka QNE): https://discord.com/channels/555224628251852811/815577522958893096/909406748140511263
* ZHMModSDK: https://github.com/OrfeasZ/ZHMModSDK/releases

## Caveats
* This will only work on entities that have either fired a pin, or have been referenced by one - see 'Moving random entities' below for deployment-time workaround

## Installation instructions
1. Find your QNE installation, and delete the `temp` folder
2. Copy the entire QNE folder as `PieQNE`, so you should have `QuickEntityEditor` and `PieQNE` next to each other
4. Go to https://github.com/piepieonline/QuickEntityEditorPieMod, click the green "Code" button, "Download Zip"
5. Copy it into the `PieQNE` folder, saying yes to overwriting.
6. Copy `PieQNE\_H3_Retail_mods\LogPins.dll` into `HITMAN3\Retail\mods`

## Updating instructions
1. Go to https://github.com/piepieonline/QuickEntityEditorPieMod, click the green "Code" button, "Download Zip"
2. Copy it into the `PieQNE` folder, saying yes to overwriting.
3. Copy `PieQNE\_H3_Retail_mods\LogPins.dll` into `HITMAN3\Retail\mods`

## Common usage 
1. Launch `PieQNE\QuickEntityEditor.exe`. Load a TEMP, and click 'Connect to Server' in the top right.
2. Launch Hitman
3. Allow it through windows firewall if asked (it's local only, but it's how the game and QNE communicate)
4. In Hitman, press '`' to open the mod console, and enable 'LogPins'

### Updating properties (Including positions)
1. Select the entity in the tree view, change the value you care about in the text view.
2. Select another entity, and select your first entity again.
3. Right click the property name, and click 'Update Property in-game'

*Note*: Only some property types can be updated, and not all will actually reflect in-game (TBD What about loading after changing?)

Properties that currently work are:
* bool
* int32
* enum
* float32
* ZGuid
* SColorRGB
* SMatrix43
* SEntityTemplateReference

### Set the position in QNE to 47's current position
1. Right click the entity in the tree view.
2. Select 'Game Comms' > 'Set transform to hero position'
3. Follow the steps in 'Updating properties'

### Draw bounding box on entity
1. Right click the entity in the tree view.
2. Select 'Game Comms' > 'Highlight'

### Watch pins occur in realtime
1. Click the entity with the event you care about in Tree View
2. Open Pie Graph View
3. In-game, press ` and click 'Enable Pins'

## Uncommon usage
### Moving random entities
If you want to move a random entity (That doesn't have a pin, nor is it referenced by one), there is a workaround:
1. Create a new entity:
```json
{
    "name": "zmultiparentspatialentity",
    "template": "[modules:/zmultiparentspatialentity.class].pc_entitytype",
    "blueprint": "[modules:/zmultiparentspatialentity.class].pc_entityblueprint",
    "properties": {
        "m_aParents": {
            "type": "TArray<SEntityTemplateReference>",
            "value": ["<YOUR ENTITY ID>"]
        }
    }
}
```
2. In a pin that you will trigger:
```json
{
    "onEvent": "OnStart",
    "shouldTrigger": "GetIndex",
    "onEntity": "<zmultiparentspatialentity ID>"
}
```
3. Redeploy and launch the game. Once the pin has triggered, you should be able to interact with the entity as per normal.

## Troubleshooting
### An entity property won't change
* Try highlighting the entity - if this doesn't work, check that the entity is has output pins or is referenced
* Move away and return to the entity - especially for enums, sometimes they need to be retrigger to update correctly

## Source
* This repo
* LogPins.dll: https://github.com/piepieonline/ZHMModSDK/tree/master/Mods/LogPins/Src
