const { knownProps } = require('./extractedData/knownProps');

function InitialisePieTreeExtensions(selectedId)
{
	function createGameCommsMenu() {
		const commsItems = {};

		const selectedEntity = entity.entities[selectedId];

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

					if (isCoverplane || hasVolumeBox)
						pieServerExtensions.UpdateInGame('draw_volume', d.id || window.ctxTarget.data('id').split('_')[0]);
					else
						pieServerExtensions.HighlightInGame(d.id || window.ctxTarget.data('id').split('_')[0]);
				}
			};
		}

		if (hasTransform)
			commsItems.setToHeroPosition = {
				separator_before: !1,
				icon: !1,
				_disabled: !1,
				separator_after: !1,
				label: "Set transform to hero position",
				action: function (b) {
					let d = editorTree.get_node(b.reference);

					pieServerExtensions.RequestPosition(d.id || window.ctxTarget.data('id').split('_')[0]);
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

					pieServerExtensions.UpdateInGame('set_hero_position', d.id || window.ctxTarget.data('id').split('_')[0]);
				}
			};

		return commsItems;
	}

    return {
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

				if(!knownProps[template])
				{
					console.warn(`Unknown template: ${template}`);
					return;
				}

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
		}
    };
}

module.exports = {
    InitialisePieTreeExtensions
};
