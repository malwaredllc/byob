/*!
 * Column visibility buttons for Buttons and DataTables.
 * 2015 SpryMedia Ltd - datatables.net/license
 */

(function($, DataTable) {
"use strict";


$.extend( DataTable.ext.buttons, {
	// A collection of column visibility buttons
	colvis: function ( dt, conf ) {
		return {
			extend: 'collection',
			text: function ( dt ) {
				return dt.i18n( 'buttons.colvis', 'Column visibility' );
			},
			className: 'buttons-colvis',
			buttons: [ {
				extend: 'columnsToggle',
				columns: conf.columns
			} ]
		};
	},

	// Selected columns with individual buttons - toggle column visibility
	columnsToggle: function ( dt, conf ) {
		var columns = dt.columns( conf.columns ).indexes().map( function ( idx ) {
			return {
				extend: 'columnToggle',
				columns: idx
			};
		} ).toArray();

		return columns;
	},

	// Single button to toggle column visibility
	columnToggle: function ( dt, conf ) {
		return {
			extend: 'columnVisibility',
			columns: conf.columns
		};
	},

	// Selected columns with individual buttons - set column visibility
	columnsVisibility: function ( dt, conf ) {
		var columns = dt.columns( conf.columns ).indexes().map( function ( idx ) {
			return {
				extend: 'columnVisibility',
				columns: idx,
				visibility: conf.visibility
			};
		} ).toArray();

		return columns;
	},

	// Single button to set column visibility
	columnVisibility: {
		columns: null, // column selector
		text: function ( dt, button, conf ) {
			return conf._columnText( dt, conf.columns );
		},
		className: 'buttons-columnVisibility',
		action: function ( e, dt, button, conf ) {
			var col = dt.column( conf.columns );

			col.visible( conf.visibility !== undefined ?
				conf.visibility :
				! col.visible()
			);
		},
		init: function ( dt, button, conf ) {
			var that = this;
			var col = dt.column( conf.columns );

			dt
				.on( 'column-visibility.dt'+conf.namespace, function (e, settings, column, state) {
					if ( column === conf.columns ) {
						that.active( state );
					}
				} )
				.on( 'column-reorder.dt'+conf.namespace, function (e, settings, details) {
					var col = dt.column( conf.columns );

					button.text( conf._columnText( dt, conf.columns ) );
					that.active( col.visible() );
				} );

			this.active( col.visible() );
		},
		destroy: function ( dt, button, conf ) {
			dt
				.off( 'column-visibility.dt'+conf.namespace )
				.off( 'column-reorder.dt'+conf.namespace );
		},

		_columnText: function ( dt, col ) {
			// Use DataTables' internal data structure until this is presented
			// is a public API. The other option is to use
			// `$( column(col).node() ).text()` but the node might not have been
			// populated when Buttons is constructed.
			var idx = dt.column( col ).index();
			return dt.settings()[0].aoColumns[ idx ].sTitle
				.replace(/\n/g," ")        // remove new lines
				.replace( /<.*?>/g, "" )   // strip HTML
				.replace(/^\s+|\s+$/g,""); // trim
		}
	},


	colvisRestore: {
		className: 'buttons-colvisRestore',

		text: function ( dt ) {
			return dt.i18n( 'buttons.colvisRestore', 'Restore visibility' );
		},

		init: function ( dt, button, conf ) {
			conf._visOriginal = dt.columns().indexes().map( function ( idx ) {
				return dt.column( idx ).visible();
			} ).toArray();
		},

		action: function ( e, dt, button, conf ) {
			dt.columns().every( function ( i ) {
				this.visible( conf._visOriginal[ i ] );
			} );
		}
	},


	colvisGroup: {
		className: 'buttons-colvisGroup',

		action: function ( e, dt, button, conf ) {
			dt.columns( conf.show ).visible( true );
			dt.columns( conf.hide ).visible( false );
		},

		show: [],

		hide: []
	}
} );


})(jQuery, jQuery.fn.dataTable);
