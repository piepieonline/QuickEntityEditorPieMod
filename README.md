# Piepieonline's QNE extensions

A runtime bridge between Hitman 3 and QuickEntityEditor (QNE):
* Runtime updating of most properties (including positions) in QNE, that then change in-game
* Triggering pin events in game from QNE
* Drawing bounding boxes around ingame objects selected in QNE
* Highlighting pin events as they happen in QNE, to allow for easier debugging

Plus:
* Providing a JSON schema of known properties and events in the tree view text editor. This also allows for autocomplete.
* A 'Show Help' context menu item, to show all known properties, inputs and outputs for a given TEMP

|![Before updating property](resources/app/piepieonline/readme/propInitialState.jpg?raw=true "Before updating property")|![Updating property](resources/app/piepieonline/readme/propUpdateContextMenu.png?raw=true&v2 "Updating property")|![After updating property](resources/app/piepieonline/readme/propAfterState.jpg?raw=true "After updating property")|
| --- | --- | --- |
|![Before triggering event](resources/app/piepieonline/readme/eventBeforeState.png?raw=true "Before triggering event")|![Triggering event](resources/app/piepieonline/readme/eventRunMenu.png?raw=true "Triggering event")|![After triggering event](resources/app/piepieonline/readme/eventAfterState.png?raw=true "After triggering event")|

## Requirements
* Hitman 3
* QuickEntityEditor (aka QNE): [Download](https://www.dropbox.com/s/p1mkwm3ji0uyr8n/QuickEntityEditor.7z?dl=1) - [Instructions](https://discord.com/channels/555224628251852811/815577522958893096/909406748140511263)
* ZHMModSDK: https://github.com/OrfeasZ/ZHMModSDK/releases
* Node (You may already have this, but if you get a message that reads "'node' is not recognized as an internal or external command", copy it to `PieQNE\PieGraphHelper\`): https://nodejs.org/dist/v16.14.0/win-x64/node.exe

## Caveats
* This will cause more crashes! If you are using the mod, make sure that QNE is connected to the server first. If you are not, disable LogPins in the SDK!
* This will only work on entities that have either fired a pin, have been referenced by one, or are an NPC - see 'Moving random entities' below for deployment-time workaround
* New properties can be added at runtime, but new entities cannot

## Installation instructions
1. Find your QNE installation, and delete the `temp` folder
2. Copy the entire QNE folder as `PieQNE`, so you should have `QuickEntityEditor` and `PieQNE` next to each other
4. Go to https://github.com/piepieonline/QuickEntityEditorPieMod/releases/latest, download `QuickEntityEditorPieMod-v*.*.*.zip`
5. Copy it into the `PieQNE` folder, saying yes to overwriting.
6. Copy `PieQNE\_H3_Retail_mods\LogPins.dll` into `HITMAN3\Retail\mods`

## Updating instructions
1. Go to https://github.com/piepieonline/QuickEntityEditorPieMod/releases/latest, download `QuickEntityEditorPieMod-v*.*.*.zip`
2. Copy it into the `PieQNE` folder, saying yes to overwriting.
3. Copy `PieQNE\_H3_Retail_mods\LogPins.dll` into `HITMAN3\Retail\mods`

## Common usage 
1. Launch `PieQNE\QuickEntityEditor.exe`. Load a TEMP, and click 'Connect to Server' in the top right.
2. Launch Hitman
3. Allow it through windows firewall if asked (it's local only, but it's how the game and QNE communicate)
4. In Hitman, press '`' to open the mod console, and enable 'LogPins'

### Updating properties (Including positions)
1. Select the entity in the tree view.
2. Change the value you care about in the text view.
3. Right click the property name, and click 'Update Property in-game'

*Note*: Only some property types can be updated, and not all will actually reflect in-game (TBD What about loading after changing?)

Properties that currently work are:
* bool
* int32
* enum
* float32
* ZGuid
* SColorRGB
* SVector3
* SMatrix43
* SEntityTemplateReference

### Set the position in QNE to 47's current position
1. Right click the entity in the tree view.
2. Select 'Game Comms' > 'Set transform to hero position'
3. Follow the steps in 'Updating properties'

### Draw bounding box on entity
1. Right click the entity in the tree view.
2. Select 'Game Comms' > 'Highlight'

### Fire a pin (Event) in game from QNE
1. Select the entity in the tree view.
2. Right click the event name and click "Run event in-game"
Example:
```
{
		"onEvent": "OnTrue",
		"shouldTrigger": "Activate",
		"onEntity": "abcdc38640d82521"
	}
```
Right click `OnTrue` to send the `OnTrue` output event of your current entity. Right click `Activate` to cause only the `Activate` input event to happen on `abcdc38640d82521`.

### Getting entity information
Included in the extension is a list of all default TEMPs, with their known properties and pins (both inputs and outputs).
There are a few ways that this information is exposed in the extension:
* Right click the entity in the tree, and select 'Show Help'. The dialog that appears will show a WIP list of all properties and pins.
* When editing a template instance in the text editor:
  * Pressing Ctrl-Space after `"template":` and `"blueprint":` will list all available modules
  * Unknown properties will be have an orange underline
  * After an existing property, add a comma and press Ctrl-Space. If there are more properties that aren't set, a list of valid options will appear.
  * When adding a new event, after '"onEvent": ' press Ctrl-Space. This will list known events.

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
* Try highlighting the entity (See 'Draw bounding box on entity' above) - if this doesn't work, check that the entity is has output pins or is referenced
* Move away and return to the entity - especially for enums, sometimes they need to be retrigger to update correctly

### When trying to launch the server, "'node' is not recognized as an internal or external command, operable program or batch file."
* Download Node from https://nodejs.org/dist/v16.14.0/win-x64/node.exe
* Copy the `node.exe` file into `PieQNE\PieGraphHelper\`

## Extra settings
In `resources/app/piepieonline/settings.json`. For most people, the only useful option right now is 'autoConnectToServer'.

## Known bugs/things to work on
* Only known entities can be highlighted. This is stuck unless/until we get an SDK update with a OnEntity event
* Many more game crashes
* Not all property types can be updated, or update instantly
* The 'Show Help' dialog is terrible

## Source
* This repo
* LogPins.dll: https://github.com/piepieonline/ZHMModSDK/tree/master/Mods/LogPins/Src
