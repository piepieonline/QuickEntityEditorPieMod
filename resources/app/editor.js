const requirejs = require('requirejs')
const path = require("path")

requirejs.config({
	baseUrl: path.join(__dirname, 'node_modules/monaco-editor/min'),
	nodeRequire: require
})

const electron = require("electron")
const fs = require("fs")
const { promisify } = require("util")
const LosslessJSON = require("lossless-json")
const { create } = require("domain")
const beautify = require('js-beautify').js
const Swal = require("sweetalert2")
const { spawn, execSync } = require("child_process")
const isEqual = require('lodash.isequal')
const seedrandom = require('seedrandom')
const { toast } = require('tailwind-toast')
const autosize = require('autosize')

const { Graph } = require("graphology")
const { Sigma } = require("sigma")
const forceAtlas2 = require("graphology-layout-forceatlas2");
const FA2Layout = require("graphology-layout-forceatlas2/worker")
const chroma = require("chroma-js")

const ExpectedQuickEntityVersion = 2.1

const defaultRPKGLoadPath = 'G:\\EpicGames\\HITMAN3\\Runtime';
let defaultEntitySavePath = 'D:\\Game Modding\\Hitman\\2021 Tools\\SimpleModFramework\\Mods\\AIActionChanger\\content\\chunk27';
const SimpleModFrameworkPath = 'D:\\Game Modding\\Hitman\\2021 Tools\\SimpleModFramework\\';
const RunGamePath = 'G:\\EpicGames\\HITMAN3\\';

shouldSort = true
editorGraphDisplay = ["pins"]
editorGraphFilter = ""
editorGraphEdgeFilter = ""
editorGraphMousedOverNode = ""
editorGraphDraggedNode = false

currentlyOpenedEntity = false

selectedInfo = "properties"

originalEntityJSON = "{}"

hasChildren = {}

editorGraphForceLayout = { kill: () => { } } // good programming

var hashList = String(fs.readFileSync("hash_list.txt")).split("\n").map(a => { return { path: a.split(",")[1], hash: a.split(",")[0] } }).slice(3)
var hashListAsObject = Object.fromEntries(hashList.map(a => [a.hash, a.path]))

var knownProps = JSON.parse(String(fs.readFileSync("resources\\app\\piepieonline\\propExtract\\temp\\knownProps.json")))

const XMLParser = new DOMParser()

const allModules = fs.existsSync("modules") ? fs.readdirSync("modules").map(a => XMLParser.parseFromString(String(fs.readFileSync("modules/" + a)), "text/xml").querySelector("moduleinfo")) : []

autosize(document.querySelector("#commentEditorText"))

function searchHash(query) {
	var result = hashList.find(a => a.path == query)
	return result ? result.hash : query
}

function getReferencedLocalEntity(ref) {
	if (ref !== null && ref.externalScene) {
		return false
	} else {
		return ref !== null && ref.hasOwnProperty("ref") ? ref.ref : ref
	}
}

function changeReferenceToLocalEntity(ref, ent) {
	if (typeof ref == "string") {
		return ent
	} else {
		return {
			ref: ent,
			externalScene: null,
			exposedEntity: ref.exposedEntity
		}
	}
}

function traverseEntityTree(startingPoint) {
	let copiedEntity = []

	try {
		copiedEntity.push(...Object.values(entity.entities).filter(a => a.type != "comment").filter(a => getReferencedLocalEntity(a.parent) == startingPoint))

		for (let newEntity of copiedEntity) {
			copiedEntity.push(...traverseEntityTree(newEntity.entityID))
		}
	} catch { }

	return copiedEntity.filter((thing, index, self) =>
		index === self.findIndex((t) => (
			t.entityID == thing.entityID
		))
	)
}

function copyNode(b) {
	let d = editorTree.get_node(b.reference);
	let copiedEntity = {}

	if (entity.entities[d.id].type == "comment") return

	copiedEntity[d.id] = LosslessJSON.parse(LosslessJSON.stringify(entity.entities[d.id]))
	Object.assign(copiedEntity, LosslessJSON.parse(LosslessJSON.stringify(Object.fromEntries(traverseEntityTree(d.id).map(a => [a.entityID, a])))))

	copiedEntity = Object.fromEntries(Object.values(copiedEntity).map(a => [a.entityID, a]))

	copiedEntity.origin = entity.tempHash

	electron.clipboard.writeText(LosslessJSON.stringify(copiedEntity))
}

function pasteNode(b) {
	let d = editorTree.get_node(b.reference);
	let pastedEntity = LosslessJSON.parse(electron.clipboard.readText())

	let changedEntityIDs = {}
	for (let ent of Object.entries(pastedEntity)) {
		changedEntityIDs[ent[1].entityID] = "abcd" + genRandHex(12)

		ent[1].entityID = changedEntityIDs[ent[1].entityID]
	}

	let removeExternalRefs = pastedEntity.origin != entity.tempHash
	delete pastedEntity.origin

	pastedEntity = Object.fromEntries(Object.values(pastedEntity).map(a => [a.entityID, a]))

	for (let ent of Object.entries(pastedEntity)) {
		ent[1].parent = getReferencedLocalEntity(ent[1].parent) && changedEntityIDs[getReferencedLocalEntity(ent[1].parent)] ? changeReferenceToLocalEntity(ent[1].parent, changedEntityIDs[getReferencedLocalEntity(ent[1].parent)]) : ent[1].parent

		for (var property of Object.entries(ent[1].properties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (!changedEntityIDs[getReferencedLocalEntity(property[1].value)] && removeExternalRefs) {
					delete pastedEntity[ent[0]].properties[property[0]]
				} else if (changedEntityIDs[getReferencedLocalEntity(property[1].value)]) {
					property[1].value = changeReferenceToLocalEntity(property[1].value, changedEntityIDs[getReferencedLocalEntity(property[1].value)])
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value = property[1].value.length - 1; value >= 0; value--) {
					if (!changedEntityIDs[getReferencedLocalEntity(property[1].value[value])] && removeExternalRefs) { // No changed entity ID for referenced entity and should remove bad refs
						pastedEntity[ent[0]].properties[property[0]].value.splice(value, 1)
					} else if (changedEntityIDs[getReferencedLocalEntity(property[1].value[value])]) { // Changed entity ID for referenced entity
						property[1].value[value] = changeReferenceToLocalEntity(property[1].value[value], changedEntityIDs[getReferencedLocalEntity(property[1].value[value])])
					}
				}
			}
		}

		for (var property of Object.entries(ent[1].postInitProperties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (!changedEntityIDs[getReferencedLocalEntity(property[1].value)] && removeExternalRefs) {
					delete pastedEntity[ent[0]].postInitProperties[property[0]]
				} else if (changedEntityIDs[getReferencedLocalEntity(property[1].value)]) {
					property[1].value = changeReferenceToLocalEntity(property[1].value, changedEntityIDs[getReferencedLocalEntity(property[1].value)])
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value = property[1].value.length - 1; value >= 0; value--) {
					if (!changedEntityIDs[getReferencedLocalEntity(property[1].value[value])] && removeExternalRefs) { // No changed entity ID for referenced entity and should remove bad refs
						pastedEntity[ent[0]].postInitProperties[property[0]].value.splice(value, 1)
					} else if (changedEntityIDs[getReferencedLocalEntity(property[1].value[value])]) { // Changed entity ID for referenced entity
						property[1].value[value] = changeReferenceToLocalEntity(property[1].value[value], changedEntityIDs[getReferencedLocalEntity(property[1].value[value])])
					}
				}
			}
		}

		if (ent[1].entitySubsets) {
			for (var subset in ent[1].entitySubsets) {
				for (let subent = ent[1].entitySubsets[subset][1].entities.length - 1; subent >= 0; subent--) {
					if (!changedEntityIDs[ent[1].entitySubsets[subset][1].entities[subent]] && removeExternalRefs) {
						ent[1].entitySubsets[subset][1].entities.splice(subent, 1)
					} else {
						ent[1].entitySubsets[subset][1].entities[subent] = changedEntityIDs[ent[1].entitySubsets[subset][1].entities[subent]] || ent[1].entitySubsets[subset][1].entities[subent]
					}
				}
			}
		}

		if (ent[1].events) {
			for (let pin = ent[1].events.length - 1; pin >= 0; pin--) {
				if (!changedEntityIDs[ent[1].events[pin].onEntity] && removeExternalRefs) {
					ent[1].events.splice(pin, 1)
				} else {
					ent[1].events[pin].onEntity = changedEntityIDs[ent[1].events[pin].onEntity] || ent[1].events[pin].onEntity
				}
			}
		}

		if (ent[1].inputCopying) {
			for (let pin = ent[1].inputCopying.length - 1; pin >= 0; pin--) {
				if (!changedEntityIDs[ent[1].inputCopying[pin].onEntity] && removeExternalRefs) {
					ent[1].inputCopying.splice(pin, 1)
				} else {
					ent[1].inputCopying[pin].onEntity = changedEntityIDs[ent[1].inputCopying[pin].onEntity] || ent[1].inputCopying[pin].onEntity
				}
			}
		}

		if (ent[1].outputCopying) {
			for (let pin = ent[1].outputCopying.length - 1; pin >= 0; pin--) {
				if (!changedEntityIDs[ent[1].outputCopying[pin].onEntity] && removeExternalRefs) {
					ent[1].outputCopying.splice(pin, 1)
				} else {
					ent[1].outputCopying[pin].onEntity = changedEntityIDs[ent[1].outputCopying[pin].onEntity] || ent[1].outputCopying[pin].onEntity
				}
			}
		}
	}

	Object.assign(entity.entities, pastedEntity)

	entity.entities[Object.keys(pastedEntity)[0]].parent = changeReferenceToLocalEntity(entity.entities[Object.keys(pastedEntity)[0]].parent, d.id)

	refreshEditor()
}

function contextMenu(b, c) {
	function createGameCommsMenu() {
		const commsItems = {};

		const selectedEntity = entity.entities[b.id];

		if (!selectedEntity) return commsItems;

		const hasTransform = !!selectedEntity.properties.m_mTransform;
		const isCoverplane = selectedEntity.template === '[modules:/zcoverplane.class].pc_entitytype';
		const hasVolumeBox = !!selectedEntity.properties.m_vGlobalSize;

		if (hasTransform || isCoverplane || hasVolumeBox) {
			let label = 'Highlight';
			if (isCoverplane) label = 'Show cover plane';
			if (hasVolumeBox) label = 'Show volume box';

			commsItems.highlight = {
				separator_before: !1,
				icon: !1,
				separator_after: !1,
				label,
				action: function (b) {
					let d = editorTree.get_node(b.reference);

					try {
						if (isCoverplane || hasVolumeBox)
							document.getElementById('pieGraphFrame').contentWindow.updateInGame('draw_volume', d.id);
						else
							document.getElementById('pieGraphFrame').contentWindow.highlightInGame(d.id);
					}
					catch { }
				}
			};
		}

		if (hasTransform)
			commsItems.updatePosition = {
				separator_before: !1,
				icon: !1,
				_disabled: !1,
				separator_after: !1,
				label: "Update Position",
				action: function (b) {
					let d = editorTree.get_node(b.reference);

					try {
						document.getElementById('pieGraphFrame').contentWindow.updateInGame('position', d.id);
					}
					catch { }
				}
			};

		if (hasTransform)
			commsItems.setToHeroPosition = {
				separator_before: !1,
				icon: !1,
				_disabled: !1,
				separator_after: !1,
				label: "Set transform to hero position",
				action: function (b) {
					let d = editorTree.get_node(b.reference);

					try {
						document.getElementById('pieGraphFrame').contentWindow.requestPosition(d.id);
					}
					catch { }
				}
			};

		if (hasTransform)
			commsItems.setHeroToPosition = {
				separator_before: !1,
				icon: !1,
				_disabled: !1,
				separator_after: !1,
				label: "Set hero to transform position",
				action: function (b) {
					let d = editorTree.get_node(b.reference);

					try {
						document.getElementById('pieGraphFrame').contentWindow.updateInGame('set_hero_position', d.id);
					}
					catch { }
				}
			};

		return commsItems;
	}

	return {
		create: {
			separator_before: !1,
			separator_after: !0,
			_disabled: !1,
			label: "Create",
			action: function (b) {
				var c = $.jstree.reference(b.reference),
					d = c.get_node(b.reference);
				c.create_node(d, {}, "last", function (a) {
					try {
						c.edit(a)
					} catch (b) {
						setTimeout(function () {
							c.edit(a)
						}, 0)
					}
				})
			}
		},
		createComment: {
			separator_before: !1,
			separator_after: !0,
			_disabled: !1,
			label: "Add Comment",
			action: function (b) {
				let entityID = "comment" + genRandHex(9)

				justCreatedNode = true
				createdNode = entityID

				entity.entities[entityID] = {
					"parent": $.jstree.reference(b.reference).get_node(b.reference).id,
					"type": "comment",
					"name": "New Comment",
					"text": ""
				}

				refreshEditor()
			}
		},
		rename: {
			separator_before: !1,
			separator_after: !1,
			_disabled: !1,
			label: "Rename",
			action: function (b) {
				var c = $.jstree.reference(b.reference),
					d = c.get_node(b.reference);
				c.edit(d)
			}
		},
		remove: {
			separator_before: !1,
			icon: !1,
			separator_after: !1,
			_disabled: !1,
			label: "Delete",
			action: function (b) {
				var c = $.jstree.reference(b.reference),
					d = c.get_node(b.reference);
				c.is_selected(d) ? c.delete_node(c.get_selected()) : c.delete_node(d)
			}
		},
		ccp: {
			separator_before: !0,
			icon: !1,
			separator_after: !1,
			label: "Edit",
			action: !1,
			submenu: {
				copy: {
					separator_before: !1,
					icon: !1,
					separator_after: !1,
					label: "Copy",
					action: copyNode
				},
				paste: {
					separator_before: !1,
					icon: !1,
					_disabled: !1,
					separator_after: !1,
					label: "Paste",
					action: pasteNode
				}
			}
		},
		copyID: {
			separator_before: !1,
			icon: !1,
			separator_after: !1,
			_disabled: !1,
			label: "Copy ID",
			action: function (b) {
				let d = editorTree.get_node(b.reference);

				electron.clipboard.writeText(d.id)
			}
		},
		gameComms: {
			separator_before: !0,
			icon: !1,
			separator_after: !1,
			label: "Game Comms",
			action: !1,
			submenu: createGameCommsMenu()
		},
		showHelp: {
			separator_before: !1,
			icon: !1,
			separator_after: !1,
			_disabled: !1,
			label: "Show help",
			action: function (b) {
				let d = editorTree.get_node(b.reference);
				const template = hashListAsObject[entity.entities[d.id].template] || entity.entities[d.id].template;
				console.log(knownProps[template]);

				let messageText = '<span style="text-align: left"><b>Properties:</b><br />';
				for(prop in knownProps[template].p)
					messageText += `&nbsp;&nbsp;${prop}: ${knownProps[template].p[prop]}<br />`;

				messageText += '<b>Input Pins:</b><br />';
				for(pin in knownProps[template].i)
					messageText += `&nbsp;&nbsp;${pin}<br />`;

				messageText += '<b>Output Pins:</b><br />';
				for(pin in knownProps[template].o)
					messageText += `&nbsp;&nbsp;${pin}<br />`;

				messageText += '</span>'

				Swal.fire({
					showConfirmButton: true,
					allowEnterKey: true,
					title: `${template} Properties`,
					html: messageText,
					grow: 'row'
				});
			}
		},
	}
}

async function inspectBrick() {
	if (window.sessionStorage.brickToInspect) {
		var rpkgPath = electron.remote.dialog.showOpenDialogSync({
			title: "Select the RPKG to extract the TEMP from",
			buttonLabel: "Select",
			filters: [{ name: 'RPKG files', extensions: ['rpkg'] }],
			properties: ["openFile", "dontAddToRecent"],
			defaultPath: defaultRPKGLoadPath
		})[0]

		var rpkgPath2 = electron.remote.dialog.showOpenDialogSync({
			title: "Select the RPKG to extract the TBLU from",
			buttonLabel: "Select",
			filters: [{ name: 'RPKG files', extensions: ['rpkg'] }],
			properties: ["openFile", "dontAddToRecent"],
			defaultPath: rpkgPath
		})[0]

		execSync(`rpkg-cli.exe -extract_from_rpkg "${rpkgPath}" -filter "${window.sessionStorage.brickToInspect.split(".")[0]}" -output_path temp\\`)

		var tempPath = path.join("temp", path.basename(rpkgPath).slice(0, -5), window.sessionStorage.brickToInspect.split(".")[1], window.sessionStorage.brickToInspect)
		var tempMetaPath = path.join("temp", path.basename(rpkgPath).slice(0, -5), window.sessionStorage.brickToInspect.split(".")[1], window.sessionStorage.brickToInspect + ".meta")
		execSync("ResourceTool.exe HM3 convert TEMP \"" + tempPath + "\" \"" + tempPath + ".json\" --simple")
		execSync("rpkg-cli.exe -hash_meta_to_json \"" + tempMetaPath + "\"")

		var tbluHash = searchHash(JSON.parse(String(fs.readFileSync(tempMetaPath + ".json"))).hash_reference_data[JSON.parse(String(fs.readFileSync(tempPath + ".json"))).blueprintIndexInResourceHeader].hash)
		if (!tbluHash.includes(".")) { tbluHash = tbluHash + ".TBLU" }

		execSync(`rpkg-cli.exe -extract_from_rpkg "${rpkgPath2}" -filter "${tbluHash.split(".")[0]}" -output_path temp\\`)

		var tbluPath = path.join("temp", path.basename(rpkgPath2).slice(0, -5), tbluHash.split(".")[1], tbluHash)
		var tbluMetaPath = path.join("temp", path.basename(rpkgPath2).slice(0, -5), tbluHash.split(".")[1], tbluHash + ".meta")
		execSync("ResourceTool.exe HM3 convert TBLU \"" + tbluPath + "\" \"" + tbluPath + ".json\" --simple")
		execSync("rpkg-cli.exe -hash_meta_to_json \"" + tbluMetaPath + "\"")

		await (require("./quickentity")).convert("HM3", tempPath + ".json", tempMetaPath + ".json", tbluPath + ".json", tbluMetaPath + ".json", path.join("temp", "QuickEntityJSON.json"))
	}
}

window.$ = window.jQuery = require("jquery")

const genRandHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

var snippetEditor, previouslySelected, currentlySelected, justCreatedNode
var editMode = "json"

createSnippetEditor()

var allEnums = JSON.parse(fs.readFileSync("enums.json"))

hasLoadedOnce = false

if (window.sessionStorage.brickToInspect) {
	loadEditor()
}

async function toggleContentSearch() {
	editorTree.settings.search.search_callback = editorTree.settings.search.search_callback ? false : searchContent
}

function searchContent(search, node) {
	return LosslessJSON.stringify(entity.entities[node.id]).toLowerCase().includes(search.toLowerCase())
}

function sortFunction(a, b) {
	if (shouldSort) {
		if ((!(this.get_node(a).original ? this.get_node(a).original : this.get_node(a)).folder && !(this.get_node(b).original ? this.get_node(b).original : this.get_node(b)).folder) || ((this.get_node(a).original ? this.get_node(a).original : this.get_node(a)).folder && (this.get_node(b).original ? this.get_node(b).original : this.get_node(b)).folder)) {
			return (this.get_text(a).localeCompare(this.get_text(b), undefined, { numeric: true, sensitivity: 'base' }) > 0) ? 1 : -1
		} else {
			return (this.get_node(a).original ? this.get_node(a).original : this.get_node(a)).folder ? -1 : 1
		}
	}
}

if (window.sessionStorage.loadImmediately === "yes") { // bruh why does session storage not support booleans
	loadEditor()
}

async function loadEditor() {
	if (hasLoadedOnce) {
		window.sessionStorage.loadImmediately = "yes"
		window.location.reload()
		return
	}

	window.sessionStorage.loadImmediately = "no"
	hasLoadedOnce = true

	// $("#loadEditorButton")[0].style.display = "none"

	await inspectBrick()

	$("#treeviewSpace").on("changed.jstree", selectionUpdate)
	$("#treeviewSpace").on("move_node.jstree", dragAndDrop)
	$("#treeviewSpace").on("create_node.jstree", nodeCreated)
	$("#treeviewSpace").on("rename_node.jstree", nodeRenamed)
	$("#treeviewSpace").on("delete_node.jstree", nodeDeleted)
	$("#treeviewSpace").jstree({
		"core": {
			"multiple": false,
			"data": [],
			"themes": {
				"name": "default",
				"dots": true,
				"icons": true
			},
			"check_callback": true
		},
		"search": {
			"fuzzy": true,
			"show_only_matches": true,
			"close_opened_onclear": false,
			"search_callback": false
		},
		"sort": sortFunction,
		"contextmenu": {
			"select_node": false,
			"items": contextMenu
		},
		"plugins": ["contextmenu", "dnd", "search", "sort"]
	})

	var to = false;
	$('#treeviewSearch').on("keyup", function () {
		if (to) {
			clearTimeout(to);
		}
		to = setTimeout(function () {
			var v = $('#treeviewSearch').val();
			$('#treeviewSpace').jstree(true).search(v);
		}, 250);
	});

	editorTree = $("#treeviewSpace").jstree()

	editorTree.settings.core.data = []

	if (!window.sessionStorage.brickToInspect) {
		currentlyOpenedEntity = electron.remote.dialog.showOpenDialogSync({
			title: "Select the QuickEntity JSON",
			buttonLabel: "Select",
			filters: [{ name: 'JSON files', extensions: ['json'] }],
			properties: ["openFile"]
		})[0]
	}

	originalEntityJSON = String(fs.readFileSync(window.sessionStorage.brickToInspect ? path.join("temp", "QuickEntityJSON.json") : currentlyOpenedEntity))
	entity = LosslessJSON.parse(originalEntityJSON)

	if (entity.quickEntityVersion != ExpectedQuickEntityVersion) {
		if (!(await Swal.fire({
			title: 'QuickEntity Version Mismatch',
			text: `The QuickEntity JSON was created with version ${entity.quickEntityVersion}. This version of QuickEntity Editor expects version ${ExpectedQuickEntityVersion}. Are you sure you want to continue?`,
			showCancelButton: true,
			confirmButtonText: 'Continue',
			allowOutsideClick: false
		})).isConfirmed) {
			return
		}
	}

	currentlySelected = false

	refreshEditor()
}

function createSnippetEditor() {
	self.module = undefined

	requirejs(['vs/editor/editor.main'], function () {
		monaco.editor.defineTheme('shutUpAnthony', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'keyword.json', foreground: 'b5cea8' }
			]
		});

		snippetEditor = monaco.editor.create(document.getElementById("jsonEditorSpace"), {
			value: "The JSON for the selected entity will appear here.",
			language: "json",
			roundedSelection: false,
			theme: "vs-dark"
		})
	})
}

function buildReverseRefs() {
	reverseReferences = {}

	for (var entry of Object.keys(entity.entities).filter(a => entity.entities[a].type != "comment")) {
		reverseReferences[entry] = []
	}

	try {
		for (var entry of Object.entries(entity.entities).filter(a => a[1].type != "comment")) {
			hasChildren[getReferencedLocalEntity(entry[1].parent)] = true

			for (var property of Object.entries(entry[1].properties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						reverseReferences[getReferencedLocalEntity(property[1].value)].push({
							type: "Property: " + property[0],
							id: entry[0]
						})
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							reverseReferences[getReferencedLocalEntity(value)].push({
								type: "Property: " + property[0],
								id: entry[0]
							})
						}
					}
				}
			}

			for (var property of Object.entries(entry[1].postInitProperties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						reverseReferences[getReferencedLocalEntity(property[1].value)].push({
							type: "Property: " + property[0],
							id: entry[0]
						})
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							reverseReferences[getReferencedLocalEntity(value)].push({
								type: "Property: " + property[0],
								id: entry[0]
							})
						}
					}
				}
			}

			if (entry[1].entitySubsets) {
				for (var subset of entry[1].entitySubsets) {
					for (let ent of subset[1].entities) {
						reverseReferences[ent].push({
							type: "Entity Subset: " + subset[0],
							id: entry[0]
						})
					}
				}
			}

			if (entry[1].events) {
				for (var pin of entry[1].events) {
					reverseReferences[pin.onEntity].push({
						type: "Event: " + pin.onEvent + "/" + pin.shouldTrigger,
						id: entry[0]
					})
				}
			}

			if (entry[1].inputCopying) {
				for (var pin of entry[1].inputCopying) {
					reverseReferences[pin.onEntity].push({
						type: "Input Copy: " + pin.whenTriggered + "/" + pin.alsoTrigger,
						id: entry[0]
					})
				}
			}

			if (entry[1].outputCopying) {
				for (var pin of entry[1].outputCopying) {
					reverseReferences[pin.onEntity].push({
						type: "Output Copy: " + pin.onEvent + "/" + pin.propagateEvent,
						id: entry[0]
					})
				}
			}
		}
	} catch {
		Swal.fire({
			icon: "error",
			title: 'Bro ur json is fucked',
			html: `Uhh<br>${entry[0]}<br>${property}<br>${subset}<br>${pin}`,
			showCancelButton: false,
			confirmButtonText: 'shit',
			allowOutsideClick: false
		})
	}
}

function refreshEditor() {
	for (let entry of Object.keys(entity.entities).filter(a => a[1].type != "comment")) {
		entity.entities[entry].entityID = entry
	}

	buildReverseRefs()

	editorTree.settings.core.data = []

	var icons = {
		"[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype": "far fa-user",
		"[assembly:/_pro/characters/templates/hero/agent47/agent47.template?/agent47_default.entitytemplate].pc_entitytype": "far fa-user-circle",
		"[assembly:/_pro/design/levelflow.template?/herospawn.entitytemplate].pc_entitytype": "far fa-user-circle",
		"[modules:/zglobaloutfitkit.class].pc_entitytype": "fas fa-tshirt",
		"[modules:/zroomentity.class].pc_entitytype": "fas fa-map-marker-alt",
		"[modules:/zboxvolumeentity.class].pc_entitytype": "far fa-square",
		"[modules:/zsoundbankentity.class].pc_entitytype": "fas fa-music",
		"[modules:/zcameraentity.class].pc_entitytype": "fas fa-camera",
		"[modules:/zsequenceentity.class].pc_entitytype": "fas fa-film",
		"[modules:/zhitmandamageovertime.class].pc_entitytype": "fas fa-skull-crossbones",
		"0059FBD4AEBCDED0": "far fa-comment", // Hashes

		"levelflow.template?/exit": "fas fa-sign-out-alt",
		"zitem": "fas fa-wrench", // Specific

		"blockup": "fas fa-cube",
		"setpiece_container_body": "fas fa-box-open",
		"setpiece_trap": "fas fa-skull-crossbones",
		"animset": "fas fa-running",
		"emitter": "fas fa-wifi",
		"sender": "fas fa-wifi",
		"event": "fas fa-location-arrow",
		"death": "fas fa-skull",
		"zone": "far fa-square", // Types

		"foliage/": "fas fa-seedling",
		"vehicles/": "fas fa-car-side",
		"environment/": "far fa-map",
		"logic/": "fas fa-cogs",
		"design/": "fas fa-swatchbook",
		"modules:/": "fas fa-project-diagram" // Paths
	}

	icons = Object.entries(icons)

	for (let entry of Object.entries(entity.entities)) {
		if (entry[1].type != "comment") {
			editorTree.settings.core.data.push({
				id: String(entry[0]), // required
				parent: getReferencedLocalEntity(entry[1].parent) || "#", // required
				icon: (entry[1].template == "[modules:/zentity.class].pc_entitytype" && hasChildren[entry[0]]) ? "far fa-folder" : (icons.find(a => entry[1].template.includes(a[0])) ? icons.find(a => entry[1].template.includes(a[0]))[1] : "far fa-file"), // icon
				text: `${entry[1].name} (ref ${entry[0]})`, // node text
				folder: entry[1].template == "[modules:/zentity.class].pc_entitytype" && hasChildren[entry[0]] // for sorting and stuff
			})
		} else {
			editorTree.settings.core.data.push({
				id: String(entry[0]),
				parent: getReferencedLocalEntity(entry[1].parent) || "#",
				icon: "far fa-sticky-note", // icon
				text: entry[1].name + " (comment)", // node text
				folder: false // for sorting and stuff
			})
		}
	}

	editorTree.refresh()
}

async function selectionUpdate(e, data) {
	if (data.action == "select_node" && data.node.id != currentlySelected) {
		document.querySelector("#entityValidityData")["_x_dataStack"][0].initialised = true

		if (currentlySelected) {
			if (entity.entities[currentlySelected].type != "comment") {
				if (!(await checkEditorJSONValidity())) {
					$("#entityValidityIndicator")[0].style.animation = "reminder 1s infinite"
					setTimeout(() => $("#entityValidityIndicator")[0].style.animation = "", 1000)
					editorTree.deselect_node(data.node.id)
					editorTree.select_node(currentlySelected)
					return
				}

				if (editMode != "json") {
					snippetEditor.setValue(beautify(LosslessJSON.stringify(entity.entities[currentlySelected]), {
						"indent_size": "1",
						"indent_char": "\t",
						"max_preserve_newlines": "5",
						"preserve_newlines": true,
						"keep_array_indentation": false,
						"break_chained_methods": false,
						"indent_scripts": "normal",
						"brace_style": "collapse",
						"space_before_conditional": true,
						"unescape_strings": false,
						"jslint_happy": false,
						"end_with_newline": false,
						"wrap_line_length": "0",
						"indent_inner_html": false,
						"comma_first": false,
						"e4x": false,
						"indent_empty_lines": false
					}))
					monaco.editor.setTheme("vs-dark")
					monaco.editor.setTheme("shutUpAnthony")
				}

				var needsRefresh = false
				if (entity.entities[currentlySelected].name != LosslessJSON.parse(snippetEditor.getValue()).name
					|| entity.entities[currentlySelected].entityID != LosslessJSON.parse(snippetEditor.getValue()).entityID
					|| !isEqual(entity.entities[currentlySelected].parent, LosslessJSON.parse(snippetEditor.getValue()).parent)) {
					if (entity.entities[currentlySelected].entityID != LosslessJSON.parse(snippetEditor.getValue()).entityID) {
						entity.entities[LosslessJSON.parse(snippetEditor.getValue()).entityID] = entity.entities[currentlySelected]
						delete entity.entities[currentlySelected]

						buildReverseRefs()
					}

					var needsRefresh = true
				}

				if (entity.entities[currentlySelected]) { entity.entities[currentlySelected] = LosslessJSON.parse(snippetEditor.getValue()) }
			} else {
				editorTree.set_text(currentlySelected, entity.entities[currentlySelected].name + " (comment)")
			}
		}

		displayEntityInSnippetEditor(entity.entities[data.node.id])

		previouslySelected = currentlySelected
		currentlySelected = data.node.id

		if (previouslySelected && entity.entities[previouslySelected].type != "comment") {
			if (needsRefresh) {
				refreshEditor()
				editorTree.select_node(currentlySelected)
			}
		}
	}
}

async function dragAndDrop(e, data) {
	if (data.old_parent != data.parent) {
		entity.entities[data.node.id].parent = changeReferenceToLocalEntity(entity.entities[data.node.id].parent, data.parent)
		displayEntityInSnippetEditor(entity.entities[data.node.id])

		currentlySelected = data.node.id
		refreshEditor()
		setTimeout(() => {
			editorTree.select_node(currentlySelected)
		}, 500);
	}
}

async function nodeCreated(e, data) {
	let entityID = "abcd" + genRandHex(12)

	justCreatedNode = true
	createdNode = entityID

	entity.entities[entityID] = {
		"parent": data.parent,
		"name": "New Entity",
		"template": "[modules:/zentity.class].pc_entitytype",
		"blueprint": "[modules:/zentity.class].pc_entityblueprint",
		"properties": {},
		"postInitProperties": {},
		"editorOnly": false,
		"platformSpecificPropertyValues": [],
		"events": [],
		"inputCopying": [],
		"outputCopying": []
	}

	buildReverseRefs()
}

async function nodeRenamed(e, data) {
	if (justCreatedNode) {
		entity.entities[createdNode].name = data.text.replace(/ \(ref .*\)/gi, "").replace(/ \(comment\)/gi, "")
		entity.entities[createdNode].entityID = createdNode

		displayEntityInSnippetEditor(entity.entities[createdNode])

		currentlySelected = createdNode
		refreshEditor()
		setTimeout(() => {
			editorTree.select_node(currentlySelected)
		}, 500);

		justCreatedNode = false
	} else {
		entity.entities[data.node.id].name = data.text.replace(/ \(ref .*\)/gi, "").replace(/ \(comment\)/gi, "")

		displayEntityInSnippetEditor(entity.entities[data.node.id])

		currentlySelected = data.node.id
		refreshEditor()
		setTimeout(() => {
			editorTree.select_node(currentlySelected)
		}, 500);
	}
}

async function nodeDeleted(e, data) {
	let entityParent = getReferencedLocalEntity(entity.entities[data.node.id].parent)

	for (let ent of traverseEntityTree(data.node.id)) {
		buildReverseRefs()
		try { deleteReferencesToEntity(ent.entityID) } catch { }
		delete entity.entities[ent.entityID]
	}

	buildReverseRefs()
	try { deleteReferencesToEntity(data.node.id) } catch { }
	delete entity.entities[data.node.id]

	buildReverseRefs()
	displayEntityInSnippetEditor(entityParent ? entity.entities[entityParent] : Object.values(entity.entities)[0])

	currentlySelected = entityParent || Object.keys(entity.entities)[0]
	refreshEditor()
	setTimeout(() => {
		editorTree.select_node(currentlySelected)
	}, 500);
}

function displayEntityInSnippetEditor(theEntity) {
	if (theEntity.type != "comment") {
		$("#refsSpace")[0].style.display = "block"

		if (editMode == "visual") {
			document.getElementById("switchModeButton").setAttribute("label", "Switch to JSON Mode")
			document.getElementById("jsonEditorSpace").style.display = "none"
			document.getElementById("jsonEditorBreak").style.display = "none"
			document.getElementById("visualEditorSpace").style.display = "block"
			document.getElementById("commentEditorSpace").style.display = "none"
		} else {
			document.getElementById("switchModeButton").setAttribute("label", "Switch to Visual Mode")
			document.getElementById("visualEditorSpace").style.display = "none"
			document.getElementById("visualEditorSpace").innerHTML = ""
			document.getElementById("jsonEditorSpace").style.display = "block"
			document.getElementById("jsonEditorBreak").style.display = "block"
			document.getElementById("commentEditorSpace").style.display = "none"
		}

		if (!reverseReferences[theEntity.entityID]) {
			reverseReferences[theEntity.entityID] = []
		}

		if (editMode == "json") {
			snippetEditor.setValue(beautify(LosslessJSON.stringify(theEntity), {
				"indent_size": "1",
				"indent_char": "\t",
				"max_preserve_newlines": "5",
				"preserve_newlines": true,
				"keep_array_indentation": false,
				"break_chained_methods": false,
				"indent_scripts": "normal",
				"brace_style": "collapse",
				"space_before_conditional": true,
				"unescape_strings": false,
				"jslint_happy": false,
				"end_with_newline": false,
				"wrap_line_length": "0",
				"indent_inner_html": false,
				"comma_first": false,
				"e4x": false,
				"indent_empty_lines": false
			}))
			monaco.editor.setTheme("vs-dark")
			monaco.editor.setTheme("shutUpAnthony")

			var x = `
				<div>
					<span class="font-semibold text-lg mr-2">Parent</span><span onclick="${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? 'editorTree.deselect_node(currentlySelected); editorTree.select_node(\'' + getReferencedLocalEntity(theEntity.parent) + '\')' : ''}" class="${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? 'text-gray-200 underline' : ''}">${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? entity.entities[getReferencedLocalEntity(theEntity.parent)].name : "None"}${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? ' (ref ' + getReferencedLocalEntity(theEntity.parent) + ')' : ''}</span>
				</div>
			`

			for (var property of Object.entries(theEntity.properties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(property[1].value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(property[1].value)].name} (ref ${getReferencedLocalEntity(property[1].value)})</span>
							</div>
						`
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							x += `
								<div>
									<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(value)].name} (ref ${getReferencedLocalEntity(value)})</span>
								</div>
							`
						}
					}
				}
			}

			for (var property of Object.entries(theEntity.postInitProperties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(property[1].value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(property[1].value)].name} (ref ${getReferencedLocalEntity(property[1].value)})</span>
							</div>
						`
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							x += `
								<div>
									<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(value)].name} (ref ${getReferencedLocalEntity(value)})</span>
								</div>
							`
						}
					}
				}
			}

			if (theEntity.entitySubsets) {
				for (var subset of theEntity.entitySubsets) {
					for (let ent of subset[1].entities) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Entity Subset: ${subset[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${ent}')" class="text-gray-200 underline">${entity.entities[ent].name} (ref ${ent})</span>
							</div>
						`
					}
				}
			}

			if (theEntity.events) {
				for (var pin of theEntity.events) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Event: ${pin.onEvent}/${pin.shouldTrigger}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			if (theEntity.inputCopying) {
				for (var pin of theEntity.inputCopying) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Input Copy: ${pin.whenTriggered}/${pin.alsoTrigger}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			if (theEntity.outputCopying) {
				for (var pin of theEntity.outputCopying) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Output Copy: ${pin.onEvent}/${pin.propagateEvent}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			document.getElementById("entityName").innerText = theEntity.name
			document.getElementById("entityProperties").innerHTML = x

			var reverseRefsHTML = ``

			for (var ref of reverseReferences[theEntity.entityID]) {
				reverseRefsHTML += `
					<div>
						<span class="font-semibold text-lg mr-2">${ref.type}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${ref.id}')" class="text-gray-200 underline">${entity.entities[ref.id].name} (ref ${ref.id})</span>
					</div>
				`
			}

			document.getElementById("entityReverseRefs").innerHTML = reverseRefsHTML
		} else {
			// REFERENCES

			var x = `
				<div>
					<span class="font-semibold text-lg mr-2">Parent</span><span onclick="${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? 'editorTree.deselect_node(currentlySelected); editorTree.select_node(\'' + getReferencedLocalEntity(theEntity.parent) + '\')' : ''}" class="${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? 'text-gray-200 underline' : ''}">${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? entity.entities[getReferencedLocalEntity(theEntity.parent)].name : "None"}${entity.entities[getReferencedLocalEntity(theEntity.parent)] ? ' (ref ' + getReferencedLocalEntity(theEntity.parent) + ')' : ''}</span>
				</div>
			`

			for (var property of Object.entries(theEntity.properties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(property[1].value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(property[1].value)].name} (ref ${getReferencedLocalEntity(property[1].value)})</span>
							</div>
						`
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							x += `
								<div>
									<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(value)].name} (ref ${getReferencedLocalEntity(value)})</span>
								</div>
							`
						}
					}
				}
			}

			for (var property of Object.entries(theEntity.postInitProperties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(property[1].value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(property[1].value)].name} (ref ${getReferencedLocalEntity(property[1].value)})</span>
							</div>
						`
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							x += `
								<div>
									<span class="font-semibold text-lg mr-2">Property: ${property[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${getReferencedLocalEntity(value)}')" class="text-gray-200 underline">${entity.entities[getReferencedLocalEntity(value)].name} (ref ${getReferencedLocalEntity(value)})</span>
								</div>
							`
						}
					}
				}
			}

			if (theEntity.entitySubsets) {
				for (var subset of theEntity.entitySubsets) {
					for (let ent of subset[1].entities) {
						x += `
							<div>
								<span class="font-semibold text-lg mr-2">Entity Subset: ${subset[0]}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${ent}')" class="text-gray-200 underline">${entity.entities[ent].name} (ref ${ent})</span>
							</div>
						`
					}
				}
			}

			if (theEntity.events) {
				for (var pin of theEntity.events) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Event: ${pin.onEvent}/${pin.shouldTrigger}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			if (theEntity.inputCopying) {
				for (var pin of theEntity.inputCopying) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Input Copy: ${pin.whenTriggered}/${pin.alsoTrigger}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			if (theEntity.outputCopying) {
				for (var pin of theEntity.outputCopying) {
					x += `
						<div>
							<span class="font-semibold text-lg mr-2">Output Copy: ${pin.onEvent}/${pin.propagateEvent}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${pin.onEntity}')" class="text-gray-200 underline">${entity.entities[pin.onEntity].name} (ref ${pin.onEntity})</span>
						</div>
					`
				}
			}

			document.getElementById("entityName").innerText = theEntity.name
			document.getElementById("entityProperties").innerHTML = x

			var reverseRefsHTML = ``

			for (var ref of reverseReferences[theEntity.entityID]) {
				reverseRefsHTML += `
					<div>
						<span class="font-semibold text-lg mr-2">${ref.type}</span><span onclick="editorTree.deselect_node(currentlySelected); editorTree.select_node('${ref.id}')" class="text-gray-200 underline">${entity.entities[ref.id].name} (ref ${ref.id})</span>
					</div>
				`
			}

			document.getElementById("entityReverseRefs").innerHTML = reverseRefsHTML

			// EDITOR COMPONENTS

			var parentEditor = document.createElement("div")
			parentEditor.innerHTML = `<span class="text-2xl font-semibold mb-2">Properties</span><br>`

			var visualEditor = document.createElement("div")
			parentEditor.appendChild(visualEditor)

			var allProperties = []
			allProperties.push(...Object.entries(theEntity.properties).map(a => { return { name: a[0], type: a[1].type, value: a[1].value } }))
			allProperties.push(...Object.entries(theEntity.postInitProperties).map(a => { return { name: a[0], type: a[1].type, value: a[1].value } }))

			curveEditors = []

			for (var property of allProperties) {
				switch (property.type) {
					case "SMatrix43": // 3 x 2 matrix input
						var y = document.createElement("div")
						y.innerHTML = ` <div class="mb-4">
											<label class="block mb-2">
												${property.name} (position)
											</label>
											<div>
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="x (initial: ${property.value.position.x})" value="${property.value.position.x}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="y (initial: ${property.value.position.y})" value="${property.value.position.y}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="z (initial: ${property.value.position.z})" value="${property.value.position.z}">
											</div>
										</div>
										<div class="mb-4">
											<label class="block mb-2">
												${property.name} (rotation)
											</label>
											<div>
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="x (initial: ${property.value.rotation.x})" value="${property.value.rotation.x}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="y (initial: ${property.value.rotation.y})" value="${property.value.rotation.y}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="z (initial: ${property.value.rotation.z})" value="${property.value.rotation.z}">
											</div>
										</div>`

						var inputs = ["position|x", "position|y", "position|z", "rotation|x", "rotation|y", "rotation|z"]
						for (var input in inputs) {
							y.querySelectorAll("input")[input].propertyToSaveTo = property.name + "|" + inputs[input]
							y.querySelectorAll("input")[input].addEventListener("input", function () {
								theEntity.properties[this.propertyToSaveTo.split("|")[0]].value[this.propertyToSaveTo.split("|")[1]][this.propertyToSaveTo.split("|")[2]] = new LosslessJSON.LosslessNumber(this.value)
							})
						}

						visualEditor.appendChild(y)
						break;

					case "SVector3": // 3 x 1 matrix input
						var y = document.createElement("div")
						y.innerHTML = ` <div class="mb-4">
											<label class="block mb-2">
												${property.name}
											</label>
											<div>
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="x (initial: ${property.value.x})" value="${property.value.x}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="y (initial: ${property.value.y})" value="${property.value.y}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="z (initial: ${property.value.z})" value="${property.value.z}">
											</div>
										</div>`

						var inputs = ["x", "y", "z"]
						for (var input in inputs) {
							y.querySelectorAll("input")[input].propertyToSaveTo = property.name + "|" + inputs[input]
							y.querySelectorAll("input")[input].addEventListener("input", function () {
								theEntity.properties[this.propertyToSaveTo.split("|")[0]].value[this.propertyToSaveTo.split("|")[1]] = new LosslessJSON.LosslessNumber(this.value)
							})
						}

						visualEditor.appendChild(y)
						break;

					case "SVector2": // 2 x 1 matrix input
						var y = document.createElement("div")
						y.innerHTML = ` <div class="mb-4">
											<label class="block mb-2">
												${property.name}
											</label>
											<div>
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="x (initial: ${property.value.x})" value="${property.value.x}">
												<input class="shadow appearance-none border rounded w-1/4 py-2 px-2.5 text-black" type="text" placeholder="y (initial: ${property.value.y})" value="${property.value.y}">
											</div>
										</div>`

						var inputs = ["x", "y"]
						for (var input in inputs) {
							y.querySelectorAll("input")[input].propertyToSaveTo = property.name + "|" + inputs[input]
							y.querySelectorAll("input")[input].addEventListener("input", function () {
								theEntity.properties[this.propertyToSaveTo.split("|")[0]].value[this.propertyToSaveTo.split("|")[1]] = new LosslessJSON.LosslessNumber(this.value)
							})
						}

						visualEditor.appendChild(y)
						break;

					case "ZGuid":
					case "ZString":
					case "ZRuntimeResourceID":
					case "SEntityTemplateReference": // String input
						var y = document.createElement("div")
						y.innerHTML = `<neo-input label="${property.name}" placeholder="Initial: ${property.value}"></neo-input>`

						y.children[0].value = property.value
						y.children[0].propertyToSaveTo = property.name
						y.children[0].addEventListener("input", function () {
							theEntity.properties[this.propertyToSaveTo].value = this.value
						})

						visualEditor.appendChild(y)
						break;

					case "int32":
					case "uint32":
					case "uint8":
					case "uint16":
					case "uint64":
					case "float32": // Number input
						var y = document.createElement("div")
						y.innerHTML = `<neo-input label="${property.name}" placeholder="Initial: ${property.value}"></neo-input>`

						y.children[0].inputElement.type = "number"
						y.children[0].value = property.value.value
						y.children[0].propertyToSaveTo = property.name
						y.children[0].addEventListener("input", function () {
							theEntity.properties[this.propertyToSaveTo].value = new LosslessJSON.LosslessNumber(this.value)
						})

						visualEditor.appendChild(y)
						break;

					case "ZGameTime": // Number input, specifically for ZGameTime (m_nTicks key of value)
						var y = document.createElement("div")
						y.innerHTML = `<neo-input label="${property.name}" placeholder="Initial: ${property.value.m_nTicks}"></neo-input>`

						y.children[0].inputElement.type = "number"
						y.children[0].value = property.value.value
						y.children[0].propertyToSaveTo = property.name
						y.children[0].addEventListener("input", function () {
							theEntity.properties[this.propertyToSaveTo].value.m_nTicks = new LosslessJSON.LosslessNumber(this.value)
						})

						visualEditor.appendChild(y)
						break;

					case "bool": // Checkbox input
						var y = document.createElement("div")
						y.innerHTML = `<neo-checkbox label="${property.name}"></neo-checkbox>`

						y.children[0].checked = property.value
						y.children[0].propertyToSaveTo = property.name
						y.children[0].addEventListener("input", function () {
							theEntity.properties[this.propertyToSaveTo].value = this.checked
						})

						visualEditor.appendChild(y)
						break;

					case "SColorRGB":
					case "SColorRGBA": // Colour picker
						var x = document.createElement("div")
						x.innerHTML = property.name

						var y = document.createElement("div")
						visualEditor.appendChild(x)
						visualEditor.appendChild(y)

						var picker = Pickr.create({
							el: y,
							theme: 'nano', // or 'monolith', or 'nano'

							swatches: [],

							components: {
								// Main components
								preview: true,
								opacity: true,
								hue: true,

								// Input / output Options
								interaction: {
									hex: true,
									input: true,
									save: true
								}
							}
						})

						picker.propertyToSaveTo = property.name
						picker.propertyToSaveToType = property.type == "SColorRGB" ? "rgb" : "rgba"

						picker.on("save", function (colour, picker) {
							if (picker.propertyToSaveToType == "rgb") {
								theEntity.properties[picker.propertyToSaveTo].value = ("#" + colour.toHEXA()[0] + colour.toHEXA()[1] + colour.toHEXA()[2]).toLowerCase()
							} else {
								theEntity.properties[picker.propertyToSaveTo].value = ("#" + colour.toHEXA()[0] + colour.toHEXA()[1] + colour.toHEXA()[2] + colour.toHEXA()[3] || "ff").toLowerCase()
							}
						})

						picker.on("init", function (picker) {
							picker.setColor(theEntity.properties[picker.propertyToSaveTo].value)
						})

						picker.getRoot().root.classList.add("mb-4")

						break;

					case "ZCurve": // Curve editor
						var x = document.createElement("div")
						x.innerHTML = property.name

						var y = document.createElement("div")
						y.classList.add("w-full")
						y.innerHTML = `<canvas width="800" height="500" style="cursor: auto;">
											Error: Your browser does not support the HTML canvas element. Which is strange, because you're using Electron, which supports the canvas element.
										</canvas>` // canvas
						visualEditor.appendChild(x)
						visualEditor.appendChild(y)

						var curveEditor = new CurveEditor(y.querySelector("canvas"));
						curveEditor.setEditorState({
							knots: [],
							xMin: -1,
							xMax: 7,
							yMin: -1.5,
							yMax: 1.5,
							extendedDomain: false,
							interpolationMethod: "linear",
							relevantXMin: 0,
							relevantXMax: 7,
							gridEnabled: true
						});

						curveEditor.setFromZCurve(property.value.data)

						curveEditor.align()

						curveEditor.propertyToSaveTo = property.name

						curveEditor.addEventListener("change", (function () {
							setTimeout((function () {
								theEntity.properties[this.propertyToSaveTo].value.data = this.getAsZCurve()
							}).bind(this), 500)
						}).bind(curveEditor))

						curveEditors.push(curveEditor)

						y.classList.add("mb-4")
						break;

					default: // String or number input (ignored if neither string nor number). Looks for enums if possible.
						if (typeof property.value == "string" || property.value.isLosslessNumber) {
							if (typeof property.value == "string") {
								if (allEnums[property.type]) {
									var y = document.createElement("div")
									y.innerHTML = `<neo-select label="${property.name}">
													${allEnums[property.type].map(a => "<option>" + a + "</option>").join("")}
													</neo-select><br>`

									setTimeout((function () {
										var a = ([...this[0].children[0].selectElement.children]).find(b => b.value == this[1].value)
										a.selected = true

										this[0].children[0].propertyToSaveTo = this[1].name
										this[0].children[0].addEventListener("input", (function () {
											theEntity.properties[this.propertyToSaveTo].value = this.value
										}).bind(this[0].children[0]))
									}).bind([y, property]), 500)

									visualEditor.appendChild(y)
								} else {
									var y = document.createElement("div")
									y.innerHTML = `<neo-input label="${property.name}" placeholder="Initial: ${property.value}"></neo-input>`

									y.children[0].value = property.value
									y.children[0].propertyToSaveTo = property.name
									y.children[0].addEventListener("input", function () {
										theEntity.properties[this.propertyToSaveTo].value = this.value
									})

									visualEditor.appendChild(y)
								}
							} else {
								var y = document.createElement("div")
								y.innerHTML = `<neo-input label="${property.name}" placeholder="Initial: ${property.value}"></neo-input>`

								y.children[0].inputElement.type = "number"
								y.children[0].value = property.value.value
								y.children[0].propertyToSaveTo = property.name
								y.children[0].addEventListener("input", function () {
									theEntity.properties[this.propertyToSaveTo].value = new LosslessJSON.LosslessNumber(this.value)
								})

								visualEditor.appendChild(y)
							}
						}
						break;
				}
			}

			document.getElementById("visualEditorSpace").innerHTML = ""
			document.getElementById("visualEditorSpace").appendChild(parentEditor)
		}
	} else {
		$("#refsSpace")[0].style.display = "none"

		document.getElementById("jsonEditorSpace").style.display = "none"
		document.getElementById("jsonEditorBreak").style.display = "none"
		document.getElementById("visualEditorSpace").style.display = "none"

		document.getElementById("entityName").innerText = "Comment"
		$("#commentEditorName")[0].value = theEntity.name
		$("#commentEditorText")[0].value = theEntity.text

		document.getElementById("commentEditorSpace").style.display = "block"
		autosize.update(document.querySelector("#commentEditorText"))
	}

	try { refreshDocs(theEntity) } catch { }
}

function refreshDocs(theEntity) {
	if (theEntity.type != "comment") {
		let templateOverrides = {
			"[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype": "ZActor"
		}

		if (theEntity.template.startsWith("[modules:/") || templateOverrides[theEntity.template]) {
			if (allModules.find(mod => mod.querySelector("classes").querySelector(`class[name="${templateOverrides[theEntity.template] || theEntity.template.replace("[modules:/", "").replace(".class].pc_entitytype", "")}" i]`))) {
				let minfo = allModules.find(mod => mod.querySelector("classes").querySelector(`class[name="${templateOverrides[theEntity.template] || theEntity.template.replace("[modules:/", "").replace(".class].pc_entitytype", "")}" i]`))
				let cinfo = minfo.querySelector("classes").querySelector(`class[name="${templateOverrides[theEntity.template] || theEntity.template.replace("[modules:/", "").replace(".class].pc_entitytype", "")}" i]`)

				$("#infoModuleName")[0].innerText = cinfo.attributes.name.value
				$("#infoModuleBaseClasses")[0].innerText = [...cinfo.querySelector("baseclasses").children].map(a => a.attributes.type.value).join(", ")

				$("#infoModuleDocs")[0].innerHTML = ""
				switch (selectedInfo) {
					case "properties":
						let properties = [...cinfo.querySelector("properties").children]

						for (let property of properties) {
							$("#infoModuleDocs")[0].innerHTML += `
								<div>
									<span class="text-xl font-normal">${property.attributes.Name.value}</span> ${property.attributes.Type.value}<br>
									${[...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "INIT") && [...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "INIT").attributes.Value.value != "" ? `<span class="text-lg font-semibold">Initially</span> ${[...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "INIT").attributes.Value.value}<br>` : ''}
									${[...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "CONSTAFTERSTART") && [...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "CONSTAFTERSTART").attributes.Value.value == "True" ? '<span class="text-lg font-semibold">Constant after start</span><br>' : ''}
									${[...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "HELPTEXT") && [...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "HELPTEXT").attributes.Value.value != "" ? `<span class="text-sm">${[...property.querySelector("attributes").children].find(a => a.attributes.Name.value == "HELPTEXT").attributes.Value.value}</span>` : ''}
								</div>
							`
						}

						if (properties.length == 3) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(33%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(33%,1fr)"
						} else if (properties.length == 2) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(50%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(50%,1fr)"
						} else if (properties.length == 1) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(80%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(80%,1fr)"
						}
						break

					case "inputPins":
						let inputpins = [...cinfo.querySelector("inputpins").children]

						for (let pin of inputpins) {
							$("#infoModuleDocs")[0].innerHTML += `
								<div>
									<span class="text-xl font-normal">${pin.attributes.name.value}</span> ${pin.attributes.type.value}<br>
									${pin.attributes.helptext ? `<span class="text-sm">${pin.attributes.helptext.value}</span>` : ''}
								</div>
							`
						}

						if (inputpins.length == 3) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(33%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(33%,1fr)"
						} else if (inputpins.length == 2) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(50%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(50%,1fr)"
						} else if (inputpins.length == 1) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(80%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(80%,1fr)"
						}
						break

					case "outputPins":
						let outputpins = [...cinfo.querySelector("outputpins").children]

						for (let pin of outputpins) {
							$("#infoModuleDocs")[0].innerHTML += `
								<div>
									<span class="text-xl font-normal">${pin.attributes.name.value}</span> ${pin.attributes.type.value}<br>
									${pin.attributes.helptext ? `<span class="text-sm">${pin.attributes.helptext.value}</span>` : ''}
								</div>
							`
						}

						if (outputpins.length == 3) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(33%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(33%,1fr)"
						} else if (outputpins.length == 2) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(50%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(50%,1fr)"
						} else if (outputpins.length == 1) {
							$("#infoModuleDocs")[0].style.gridTemplateColumns = "repeat(auto-fill,minmax(80%,1fr))"
							$("#infoModuleDocs")[0].style.gridAutoColumns = "minmax(80%,1fr)"
						}
				}

				$("#infoModule")[0].style.display = "block"
				$("#infoTemplate")[0].style.display = "none"
			} else {
				if (!theEntity.template.startsWith("assembly:/") && hashListAsObject[theEntity.template + ".TEMP"]) {
					$("#infoTemplateName")[0].innerText = hashListAsObject[theEntity.template + ".TEMP"].replace("\r", "").replace("\n", "") + "\n"
				} else {
					$("#infoTemplateName")[0].innerText = theEntity.template + "\n"
				}

				$("#infoTemplateNoDocumentation")[0].innerText = "No documentation"

				$("#infoModule")[0].style.display = "none"
				$("#infoTemplate")[0].style.display = "block"
			}
		} else {
			if (!theEntity.template.startsWith("assembly:/") && hashListAsObject[theEntity.template + ".TEMP"]) {
				$("#infoTemplateName")[0].innerText = hashListAsObject[theEntity.template + ".TEMP"].replace("\r", "").replace("\n", "") + "\n"
			} else {
				$("#infoTemplateName")[0].innerText = theEntity.template + "\n"
			}

			$("#infoTemplateNoDocumentation")[0].innerText = "No documentation"

			$("#infoModule")[0].style.display = "none"
			$("#infoTemplate")[0].style.display = "block"
		}
	} else {
		$("#infoTemplateName")[0].innerText = theEntity.name + "\n"
		$("#infoTemplateNoDocumentation")[0].innerText = "Comment entity"

		$("#infoModule")[0].style.display = "none"
		$("#infoTemplate")[0].style.display = "block"
	}
}

function switchEditMode() {
	if (editMode == "json") {
		editMode = "visual"
		document.getElementById("switchModeButton").setAttribute("label", "Switch to JSON Mode")
		document.getElementById("jsonEditorSpace").style.display = "none"
		document.getElementById("jsonEditorBreak").style.display = "none"
		document.getElementById("visualEditorSpace").style.display = "block"
		document.getElementById("commentEditorSpace").style.display = "none"
	} else {
		editMode = "json"
		document.getElementById("switchModeButton").setAttribute("label", "Switch to Visual Mode")
		document.getElementById("visualEditorSpace").style.display = "none"
		document.getElementById("visualEditorSpace").innerHTML = ""
		document.getElementById("jsonEditorSpace").style.display = "block"
		document.getElementById("jsonEditorBreak").style.display = "block"
		document.getElementById("commentEditorSpace").style.display = "none"
	}

	displayEntityInSnippetEditor(entity.entities[currentlySelected])
	snippetEditor.layout()
}

function back() {
	editorTree.deselect_node(currentlySelected)
	editorTree.select_node(previouslySelected)
}

currentView = "tree"
function changeView(view) {
	document.getElementById(currentView).style.display = "none";
	document.getElementById(view).style.display = "block";

	document.getElementById(currentView + "Tab").classList.add("bg-gray-700");
	document.getElementById(currentView + "Tab").classList.remove("bg-black");
	document.getElementById(view + "Tab").classList.remove("bg-gray-700");
	document.getElementById(view + "Tab").classList.add("bg-black");

	if (currentView == "overrides") {
		Object.assign(entity, LosslessJSON.parse(overrideEditor.getValue()))
	}

	editorGraphForceLayout.kill()

	switch (view) {
		case "metadata":
			$("#templateHashMetadata")[0].value = entity.tempHash
			$("#blueprintHashMetadata")[0].value = entity.tbluHash
			$("#rootEntityMetadata")[0].value = entity.rootEntity
			$("#entitySubtypeMetadata")[0].value = entity.subType
			$("#externalScenesMetadata")[0].value = entity.externalScenes
			break

		case "overrides":
			document.getElementById("overrideEditorSpace").innerHTML = ""
			requirejs(['vs/editor/editor.main'], function () {
				overrideEditor = monaco.editor.create(document.getElementById("overrideEditorSpace"), {
					value: "",
					language: "json",
					roundedSelection: false,
					theme: "vs-dark"
				})

				overrideEditor.setValue(beautify(LosslessJSON.stringify({
					propertyOverrides: entity.propertyOverrides,
					overrideDeletes: entity.overrideDeletes,
					pinConnectionOverrides: entity.pinConnectionOverrides,
					pinConnectionOverrideDeletes: entity.pinConnectionOverrideDeletes
				}), {
					"indent_size": "1",
					"indent_char": "\t",
					"max_preserve_newlines": "5",
					"preserve_newlines": true,
					"keep_array_indentation": false,
					"break_chained_methods": false,
					"indent_scripts": "normal",
					"brace_style": "collapse",
					"space_before_conditional": true,
					"unescape_strings": false,
					"jslint_happy": false,
					"end_with_newline": false,
					"wrap_line_length": "0",
					"indent_inner_html": false,
					"comma_first": false,
					"e4x": false,
					"indent_empty_lines": false
				}))
				monaco.editor.setTheme("vs-dark")
				monaco.editor.setTheme("shutUpAnthony")
			})
			break

		case "graph":
			refreshGraph()
			break

		case "pieGraph":
			if (currentView === view) {
				document.getElementById('pieGraphFrame').contentWindow.location.reload();
			}

			setTimeout(() => {
				document.getElementById('pieGraphFrame').contentWindow.externallyLoadedModel = entity;
				document.getElementById('pieGraphFrame').contentWindow.externallyLoadedReferences = reverseReferences;
				document.getElementById('pieGraphFrame').contentWindow.externalEditorTree = editorTree;
				document.getElementById('pieGraphFrame').contentWindow.hashList = hashListAsObject;

				document.getElementById('pieGraphFrame').contentWindow.displayEntityInSnippetEditor = displayEntityInSnippetEditor;

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
		default:
			refreshEditor()
			break
	}

	currentView = view
}

function refreshGraph() {
	editorGraphForceLayout.kill()

	document.getElementById("graphSpace").innerHTML = ""

	editorGraph = new Graph()

	for (let entry of Object.values(entity.entities).filter(a => a.type != "comment")) {
		editorGraph.addNode(entry.entityID, { label: entry.name, x: seedrandom(entry.entityID + "x")(), y: seedrandom(entry.entityID + "y")(), size: 5, color: ((entry.name).toLowerCase().includes(editorGraphFilter.toLowerCase()) ? chroma.random().hex() : "#d4d4d4") })
	}

	for (let entry of editorGraph.nodes().map(a => [a, entity.entities[a]])) {
		if (editorGraphDisplay.includes("pins")) {
			if (entry[1].events) {
				for (var pin of entry[1].events) {
					try {
						if ((pin.onEvent + "/" + pin.shouldTrigger).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
							editorGraph.addEdge(entry[0], pin.onEntity, { type: "arrow", label: pin.onEvent + "/" + pin.shouldTrigger, size: 2 })
					} catch { }
				}
			}

			if (entry[1].inputCopying) {
				for (var pin of entry[1].inputCopying) {
					try {
						if (("Forward " + pin.whenTriggered + "/" + pin.alsoTrigger).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
							editorGraph.addEdge(entry[0], pin.onEntity, { type: "arrow", label: "Forward " + pin.whenTriggered + "/" + pin.alsoTrigger, size: 2 })
					} catch { }
				}
			}

			if (entry[1].outputCopying) {
				for (var pin of entry[1].outputCopying) {
					try {
						if (("Propagate " + pin.onEvent + "/" + pin.propagateEvent).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
							editorGraph.addEdge(entry[0], pin.onEntity, { type: "arrow", label: "Propagate " + pin.onEvent + "/" + pin.propagateEvent, size: 2 })
					} catch { }
				}
			}
		}

		if (editorGraphDisplay.includes("properties")) {
			for (var property of Object.entries(entry[1].properties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						try {
							if ((property[0]).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
								editorGraph.addEdge(entry[0], getReferencedLocalEntity(property[1].value), { type: "arrow", label: property[0], size: 2 })
						} catch { }
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							try {
								if ((property[0]).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
									editorGraph.addEdge(entry[0], getReferencedLocalEntity(value), { type: "arrow", label: property[0], size: 2 })
							} catch { }
						}
					}
				}
			}

			for (var property of Object.entries(entry[1].postInitProperties)) {
				if (property[1].type == "SEntityTemplateReference") {
					if (getReferencedLocalEntity(property[1].value)) {
						try {
							if ((property[0]).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
								editorGraph.addEdge(entry[0], getReferencedLocalEntity(property[1].value), { type: "arrow", label: property[0], size: 2 })
						} catch { }
					}
				} else if (property[1].type == "TArray<SEntityTemplateReference>") {
					for (let value of property[1].value) {
						if (getReferencedLocalEntity(value)) {
							try {
								if ((property[0]).toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
									editorGraph.addEdge(entry[0], getReferencedLocalEntity(value), { type: "arrow", label: property[0], size: 2 })
							} catch { }
						}
					}
				}
			}
		}

		if (editorGraphDisplay.includes("parents")) {
			if (getReferencedLocalEntity(entry[1].parent)) {
				try {
					if (("Parent of").toLowerCase().includes(editorGraphEdgeFilter.toLowerCase()))
						editorGraph.addEdge(getReferencedLocalEntity(entry[1].parent), entry[0], { type: "arrow", label: "Parent of", size: 2 })
				} catch { }
			}
		}
	}

	editorGraphRenderer = new Sigma(editorGraph, document.getElementById("graphSpace"), {
		renderEdgeLabels: true
	})

	editorGraphRenderer.on("clickNode", ({ node }) => { changeView("tree"); setTimeout(() => { editorTree.deselect_all(); editorTree.select_node(node) }, 200) })
	editorGraphRenderer.on("enterNode", ({ node }) => { editorGraphMousedOverNode = node })
	editorGraphRenderer.on("leaveNode", ({ node }) => { editorGraphMousedOverNode = false })

	editorGraphRenderer.on("downNode", ({ node }) => {
		editorGraphRenderer.camera.disable()
		editorGraphDraggedNode = node
	})

	editorGraphRenderer.getMouseCaptor().on("mouseup", async () => {
		if (editorGraphDraggedNode && editorGraphDraggedNode != editorGraphMousedOverNode) {
			if (editorGraphMousedOverNode) {
				switch ((await Swal.fire({
					title: 'Reference',
					text: "What type of reference should be added?",
					input: 'select',
					inputOptions: {
						'event': 'Event',
						'inputCopy': 'Input Copy',
						'outputCopy': 'Output Copy',
						'property': 'Property'
					},
					showCancelButton: true,
					confirmButtonText: 'OK',
					allowOutsideClick: false
				})).value) {
					case "property":
						let property = (await Swal.fire({
							title: 'Property Type',
							text: "Reference an entity as a property.",
							input: 'select',
							inputOptions: {
								"properties": "Properties",
								"postInitProperties": "Post-Init Properties"
							},
							showCancelButton: true,
							confirmButtonText: 'OK',
							allowOutsideClick: false
						})).value

						let propertyName = (await Swal.fire({
							title: 'Property Name',
							text: "Reference an entity as a property.",
							input: 'text',
							showCancelButton: true,
							confirmButtonText: 'OK',
							allowOutsideClick: false
						})).value

						if (entity.entities[editorGraphDraggedNode][property][propertyName] && entity.entities[editorGraphDraggedNode][property][propertyName].type == "TArray<SEntityTemplateReference>") {
							entity.entities[editorGraphDraggedNode][property][propertyName].value.push(editorGraphMousedOverNode)
						} else {
							entity.entities[editorGraphDraggedNode][property][propertyName] = {
								type: "SEntityTemplateReference",
								value: editorGraphMousedOverNode
							}
						}

						break;

					case "event":
						let event = (await Swal.fire({
							title: 'Event',
							text: "Trigger an input on one entity when another entity outputs an event.",
							html:
								'<input id="swal-input1" class="swal2-input" placeholder="Output pin on entity 1">' +
								'<input id="swal-input2" class="swal2-input" placeholder="Input pin on entity 2">',
							preConfirm: () => {
								return [
									document.getElementById('swal-input1').value,
									document.getElementById('swal-input2').value
								]
							},
							showCancelButton: true,
							confirmButtonText: 'OK',
							allowOutsideClick: false
						})).value

						entity.entities[editorGraphDraggedNode].events.push({
							onEvent: event[0],
							shouldTrigger: event[1],
							onEntity: editorGraphMousedOverNode
						})
						break;

					case "inputCopy":
						let inputCopy = (await Swal.fire({
							title: 'Input Copy',
							text: "Copy an input from one entity to another.",
							html:
								'<input id="swal-input1" class="swal2-input" placeholder="Input pin on entity 1">' +
								'<input id="swal-input2" class="swal2-input" placeholder="Input pin on entity 2">',
							preConfirm: () => {
								return [
									document.getElementById('swal-input1').value,
									document.getElementById('swal-input2').value
								]
							},
							showCancelButton: true,
							confirmButtonText: 'OK',
							allowOutsideClick: false
						})).value

						entity.entities[editorGraphDraggedNode].inputCopying.push({
							whenTriggered: inputCopy[0],
							alsoTrigger: inputCopy[1],
							onEntity: editorGraphMousedOverNode
						})
						break;

					case "outputCopy":
						let outputCopy = (await Swal.fire({
							title: 'Output Copy',
							text: "Copy an output from one entity to another.",
							html:
								'<input id="swal-input1" class="swal2-input" placeholder="Output pin on entity 1">' +
								'<input id="swal-input2" class="swal2-input" placeholder="Output pin on entity 2">',
							preConfirm: () => {
								return [
									document.getElementById('swal-input1').value,
									document.getElementById('swal-input2').value
								]
							},
							showCancelButton: true,
							confirmButtonText: 'OK',
							allowOutsideClick: false
						})).value

						entity.entities[editorGraphDraggedNode].outputCopying.push({
							onEvent: outputCopy[0],
							propagateEvent: outputCopy[1],
							onEntity: editorGraphMousedOverNode
						})
						break;
				}

				editorGraphRenderer.camera.enable()
				editorGraphDraggedNode = false

				refreshGraph()
			} else {
				let entityID = "abcd" + genRandHex(12)

				entity.entities[entityID] = {
					"parent": {
						"ref": editorGraphDraggedNode,
						"exposedEntity": "",
						"externalScene": "SPECIAL: None",
						"entityID": "ffffffffffffffff"
					},
					"name": "New Entity",
					"template": "[modules:/zentity.class].pc_entitytype",
					"blueprint": "[modules:/zentity.class].pc_entityblueprint",
					"properties": {},
					"postInitProperties": {},
					"editorOnly": false,
					"platformSpecificPropertyValues": [],
					"events": [],
					"inputCopying": [],
					"outputCopying": [],
					"entityID": entityID
				}

				buildReverseRefs()

				editorGraphRenderer.camera.enable()
				editorGraphDraggedNode = false
				refreshGraph()
			}
		}
	})

	editorGraphForceLayout = new FA2Layout(editorGraph, { settings: forceAtlas2.inferSettings(editorGraph) })
	editorGraphForceLayout.start()
}

async function saveEntity(saveAs = false) {
	if (currentlySelected && entity.entities[currentlySelected].type != "comment") {
		if (!isEqual(LosslessJSON.parse(snippetEditor.getValue()), entity.entities[currentlySelected])) {
			entity.entities[currentlySelected] = LosslessJSON.parse(snippetEditor.getValue())
		}
	}

	for (let entry of Object.values(entity.entities)) {
		delete entry.entityID
	}

	if (!currentlyOpenedEntity || saveAs) {
		currentlyOpenedEntity = electron.remote.dialog.showSaveDialogSync({
			title: "Save the QuickEntity JSON file",
			buttonLabel: "Save",
			filters: [{ name: 'JSON file', extensions: ['json'] }],
			properties: [],
			defaultPath: defaultEntitySavePath
		})
	}

	defaultEntitySavePath = currentlyOpenedEntity;

	let savedEntity = LosslessJSON.stringify(entity)
	let sizeOfEntity = new TextEncoder().encode(savedEntity).length

	fs.writeFileSync(currentlyOpenedEntity, sizeOfEntity > 8_000_000 ? savedEntity : beautify(savedEntity, {
		"indent_size": "1",
		"indent_char": "\t",
		"max_preserve_newlines": "5",
		"preserve_newlines": true,
		"keep_array_indentation": false,
		"break_chained_methods": false,
		"indent_scripts": "normal",
		"brace_style": "collapse",
		"space_before_conditional": true,
		"unescape_strings": false,
		"jslint_happy": false,
		"end_with_newline": false,
		"wrap_line_length": "0",
		"indent_inner_html": false,
		"comma_first": false,
		"e4x": false,
		"indent_empty_lines": false
	}))

	for (let entry of Object.keys(entity.entities)) {
		entity.entities[entry].entityID = entry
	}

	if (!saveAs) { toast().success('Saved', 'to ' + window.currentlyOpenedEntity).from('bottom', 'start').with({ color: 'bg-emerald-500' }).show() }
}

async function saveEntityAsPatch() {
	if (currentlySelected && entity.entities[currentlySelected].type != "comment") {
		if (!isEqual(LosslessJSON.parse(snippetEditor.getValue()), entity.entities[currentlySelected])) {
			entity.entities[currentlySelected] = LosslessJSON.parse(snippetEditor.getValue())
		}
	}

	for (let entry of Object.values(entity.entities)) {
		delete entry.entityID
	}

	fs.writeFileSync("./temp1.json", originalEntityJSON)
	fs.writeFileSync("./temp2.json", LosslessJSON.stringify(entity))

	for (let entry of Object.keys(entity.entities)) {
		entity.entities[entry].entityID = entry
	}

	await (require("./quickentity")).createPatchJSON("./temp1.json", "./temp2.json", "./temp3.json")

	fs.copyFileSync("./temp3.json", electron.remote.dialog.showSaveDialogSync({
		title: "Save the patch JSON",
		buttonLabel: "Save",
		filters: [{ name: 'JSON file', extensions: ['json'] }],
		properties: [],
		defaultPath: defaultEntitySavePath
	}))

	fs.unlinkSync("./temp1.json")
	fs.unlinkSync("./temp2.json")
	fs.unlinkSync("./temp3.json")
}

window.onresize = function () {
	snippetEditor && snippetEditor.layout()
}

var jsonValidityTimeout = false
$('#jsonEditorSpace').on("keyup", function () {
	if (!jsonValidityTimeout) {
		jsonValidityTimeout = setTimeout(function () {
			checkEditorJSONValidity()
			jsonValidityTimeout = false
		}, 250);
	}
});

async function checkEditorJSONValidity() {
	document.querySelector("#entityValidityData")["_x_dataStack"][0].valid = true

	var entry = ["", {}]
	try {
		entry = LosslessJSON.parse(snippetEditor.getValue())
		entry = [entry.entityID, entry]
	} catch {
		document.querySelector("#entityValidityData")["_x_dataStack"][0].valid = false
		document.querySelector("#entityValidityData")["_x_dataStack"][0].reason = "Invalid JSON"

		return false
	}

	try {
		var setOfEntities = new Set(Object.keys(entity.entities))

		for (var property of Object.entries(entry[1].properties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (getReferencedLocalEntity(property[1].value)) {
					if (!setOfEntities.has(getReferencedLocalEntity(property[1].value))) {
						throw new Error(property[0])
					}
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value of property[1].value) {
					if (getReferencedLocalEntity(value)) {
						if (!setOfEntities.has(getReferencedLocalEntity(value))) {
							throw new Error(property[0])
						}
					}
				}
			}
		}

		for (var property of Object.entries(entry[1].postInitProperties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (getReferencedLocalEntity(property[1].value)) {
					if (!setOfEntities.has(getReferencedLocalEntity(property[1].value))) {
						throw new Error(property[0])
					}
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value of property[1].value) {
					if (getReferencedLocalEntity(value)) {
						if (!setOfEntities.has(getReferencedLocalEntity(value))) {
							throw new Error(property[0])
						}
					}
				}
			}
		}

		if (entry[1].entitySubsets) {
			for (var subset of entry[1].entitySubsets) {
				for (let ent of subset[1].entities) {
					if (!setOfEntities.has(ent)) {
						throw new Error(subset[0])
					}
				}
			}
		}

		if (entry[1].events) {
			for (var pin of entry[1].events) {
				if (!setOfEntities.has(pin.onEntity)) {
					throw new Error(pin.onEvent)
				}
			}
		}

		if (entry[1].inputCopying) {
			for (var pin of entry[1].inputCopying) {
				if (!setOfEntities.has(pin.onEntity)) {
					throw new Error(pin.whenTriggered)
				}
			}
		}

		if (entry[1].outputCopying) {
			for (var pin of entry[1].outputCopying) {
				if (!setOfEntities.has(pin.onEntity)) {
					throw new Error(pin.onEvent)
				}
			}
		}
	} catch (e) {
		document.querySelector("#entityValidityData")["_x_dataStack"][0].valid = false
		document.querySelector("#entityValidityData")["_x_dataStack"][0].reason = "Invalid Reference: " + e.message
		return false
	}

	return true
}

function deleteReferencesToEntity(ent) {
	for (let item of reverseReferences[ent]) {
		let refEnt = item.id
		for (var property of Object.entries(entity.entities[refEnt].properties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (getReferencedLocalEntity(property[1].value)) {
					if (getReferencedLocalEntity(property[1].value) == ent) {
						delete entity.entities[refEnt].properties[property[0]]
					}
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value = property[1].value.length - 1; value >= 0; value--) {
					if (getReferencedLocalEntity(property[1].value[value])) {
						if (getReferencedLocalEntity(property[1].value[value]) == ent) {
							entity.entities[refEnt].properties[property[0]].value.splice(value, 1)
						}
					}
				}
			}
		}

		for (var property of Object.entries(entity.entities[refEnt].postInitProperties)) {
			if (property[1].type == "SEntityTemplateReference") {
				if (getReferencedLocalEntity(property[1].value)) {
					if (getReferencedLocalEntity(property[1].value) == ent) {
						delete entity.entities[refEnt].postInitProperties[property[0]]
					}
				}
			} else if (property[1].type == "TArray<SEntityTemplateReference>") {
				for (let value = property[1].value.length - 1; value >= 0; value--) {
					if (getReferencedLocalEntity(property[1].value[value])) {
						if (getReferencedLocalEntity(property[1].value[value]) == ent) {
							entity.entities[refEnt].postInitProperties[property[0]].value.splice(value, 1)
						}
					}
				}
			}
		}

		if (entity.entities[refEnt].entitySubsets) {
			for (var subset in entity.entities[refEnt].entitySubsets) {
				for (let subsetEntity = entity.entities[refEnt].entitySubsets[subset][1].entities.length - 1; subsetEntity >= 0; subsetEntity--) {
					if (entity.entities[refEnt].entitySubsets[subset][1].entities[subsetEntity] == ent) {
						entity.entities[refEnt].entitySubsets[subset][1].entities.splice(subsetEntity, 1)
					}
				}
			}
		}

		if (entity.entities[refEnt].events) {
			for (let pin = entity.entities[refEnt].events.length - 1; pin >= 0; pin--) {
				if (entity.entities[refEnt].events[pin].onEntity == ent) {
					entity.entities[refEnt].events.splice(pin, 1)
				}
			}
		}

		if (entity.entities[refEnt].inputCopying) {
			for (let pin = entity.entities[refEnt].inputCopying.length - 1; pin >= 0; pin--) {
				if (entity.entities[refEnt].inputCopying[pin].onEntity == ent) {
					entity.entities[refEnt].inputCopying.splice(pin, 1)
				}
			}
		}

		if (entity.entities[refEnt].outputCopying) {
			for (let pin = entity.entities[refEnt].outputCopying.length - 1; pin >= 0; pin--) {
				if (entity.entities[refEnt].outputCopying[pin].onEntity == ent) {
					entity.entities[refEnt].outputCopying.splice(pin, 1)
				}
			}
		}
	}
}

async function generateOverrideDeletes() {
	let entities = (await Swal.fire({
		title: 'Entities',
		text: "Enter the entity IDs to delete, separated by spaces.",
		input: 'text',
		showCancelButton: true,
		confirmButtonText: 'OK',
		allowOutsideClick: false
	})).value.split(" ")

	let externalScene = (await Swal.fire({
		title: 'External Scene',
		text: "Enter the external scene to delete from.",
		input: 'text',
		showCancelButton: true,
		confirmButtonText: 'OK',
		allowOutsideClick: false
	})).value

	for (let ent of entities) {
		entity.overrideDeletes.push({
			"ref": ent,
			"externalScene": externalScene
		})
	}

	overrideEditor.setValue(beautify(LosslessJSON.stringify({
		propertyOverrides: entity.propertyOverrides,
		overrideDeletes: entity.overrideDeletes,
		pinConnectionOverrides: entity.pinConnectionOverrides,
		pinConnectionOverrideDeletes: entity.pinConnectionOverrideDeletes
	}), {
		"indent_size": "1",
		"indent_char": "\t",
		"max_preserve_newlines": "5",
		"preserve_newlines": true,
		"keep_array_indentation": false,
		"break_chained_methods": false,
		"indent_scripts": "normal",
		"brace_style": "collapse",
		"space_before_conditional": true,
		"unescape_strings": false,
		"jslint_happy": false,
		"end_with_newline": false,
		"wrap_line_length": "0",
		"indent_inner_html": false,
		"comma_first": false,
		"e4x": false,
		"indent_empty_lines": false
	}))
}

function deployMods() {
	function sanitise(html) {
		return sanitizeHtml(html, {
			allowedTags: ['b', 'i', 'em', 'strong', 'br']
		});
	}

	function showMessage(title, message, icon) {
		Swal.fire({
			showConfirmButton: false,
			allowEnterKey: true,
			title: title,
			html: message,
			icon: icon
		})
	}

	Swal.fire({
		title: 'Deploying your mods',
		html: 'Grab a coffee or something - your enabled mods are being applied to the game.<br><br><i></i>',
		didOpen: async () => {
			Swal.showLoading()

			setTimeout(() => {
				let hasClosed = false;

				const deployProcessClosed = () => {
					if (hasClosed) return;
					hasClosed = true;

					if (fullOutput.includes("Deployed all mods successfully.")) {
						Swal.close()

						showMessage("Deployed successfully", "Successfully deployed. You can now play the game with mods!", "success")
					} else {
						Swal.close()

						showMessage("Error in deployment", "<i>" + sanitise(fullOutput.split("\n").slice(fullOutput.endsWith("\n") ? -2 : -1)[0]) + "</i>", "error")
					}
				}

				let deployProcess = spawn(path.join(SimpleModFrameworkPath, 'Deploy.exe'), ["consoleLog"], { // any arguments will disable nicer logging
					cwd: SimpleModFrameworkPath
				})

				let output = ""
				let fullOutput = ""

				deployProcess.stdout.on("data", (data) => {
					output += String(data)
					fullOutput += String(data)

					console.log(output);

					output = output.split("\n").slice(output.endsWith("\n") ? -2 : -1)[0]

					Swal.getHtmlContainer().querySelector('i').textContent = output.split("\n").slice(output.endsWith("\n") ? -2 : -1)[0]

					if (fullOutput.includes("Deployed all mods successfully.")) {
						deployProcessClosed()
					}
				})

				deployProcess.on("exit", () => deployProcessClosed())
			}, 500)
		},
		allowEnterKey: false,
		allowOutsideClick: false,
		allowEscapeKey: false,
		showConfirmButton: false
	})
}

function runGame() {
	spawn(path.join(RunGamePath, 'offline.cmd'), [], { cwd: RunGamePath });
}