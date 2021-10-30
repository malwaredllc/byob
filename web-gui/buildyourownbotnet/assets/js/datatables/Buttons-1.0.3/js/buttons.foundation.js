
(function($, DataTables){

$.extend( true, DataTables.Buttons.defaults, {
	dom: {
		container: {
			tag: 'ul',
			className: 'dt-buttons button-group'
		},
		buttonContainer: {
			tag: 'li',
			className: ''
		},
		button: {
			tag: 'a',
			className: 'button small'
		},
		buttonLiner: {
			tag: null
		},
		collection: {
			tag: 'ul',
			className: 'dt-button-collection f-dropdown open',
			button: {
				tag: 'a',
				className: 'small'
			}
		}
	}
} );

DataTables.ext.buttons.collection.className = 'buttons-collection dropdown';

})(jQuery, jQuery.fn.dataTable);
