
(function($, DataTables){

$.extend( true, DataTables.Buttons.defaults, {
	dom: {
		container: {
			className: 'dt-buttons btn-group'
		},
		button: {
			className: 'btn btn-default'
		},
		collection: {
			tag: 'ul',
			className: 'dt-button-collection dropdown-menu',
			button: {
				tag: 'li',
				className: 'dt-button'
			},
			buttonLiner: {
				tag: 'a',
				className: ''
			}
		}
	}
} );

DataTables.ext.buttons.collection.text = function ( dt ) {
	return dt.i18n('buttons.collection', 'Collection <span class="caret"/>');
};

})(jQuery, jQuery.fn.dataTable);
