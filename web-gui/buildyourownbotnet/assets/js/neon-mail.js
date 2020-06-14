/**
 *	Neon Mail Script
 *
 *	Developed by Arlind Nushi - www.laborator.co
 */

var neonMail = neonMail || {};

;(function($, window, undefined)
{
	"use strict";
	
	$(document).ready(function()
	{
		neonMail.$container = $(".mail-env");
		
		$.extend(neonMail, {
			isPresent: neonMail.$container.length > 0
		});
		
		// Mail Container Height fit with the document
		if(neonMail.isPresent)
		{
			neonMail.$sidebar = neonMail.$container.find('.mail-sidebar');
			neonMail.$body = neonMail.$container.find('.mail-body');
			
			
			// Checkboxes
			var $cb = neonMail.$body.find('table thead input[type="checkbox"], table tfoot input[type="checkbox"]');
			
			$cb.on('click', function()
			{
				$cb.attr('checked', this.checked).trigger('change');
				
				mail_toggle_checkbox_status(this.checked);
			});
			
			// Highlight
			neonMail.$body.find('table tbody input[type="checkbox"]').on('change', function()
			{
				$(this).closest('tr')[this.checked ? 'addClass' : 'removeClass']('highlight');
			});
		}
	});
	
})(jQuery, window);


function fit_mail_container_height()
{
	if(neonMail.isPresent)
	{
		if(neonMail.$sidebar.height() < neonMail.$body.height())
		{
			neonMail.$sidebar.height( neonMail.$body.height() );
		}
		else
		{
			var old_height = neonMail.$sidebar.height();
			
			neonMail.$sidebar.height('');
			
			if(neonMail.$sidebar.height() < neonMail.$body.height())
			{
				neonMail.$sidebar.height(old_height);
			}
		}
	}
}

function reset_mail_container_height()
{
	if(neonMail.isPresent)
	{
		neonMail.$sidebar.height('auto');
	}
}

function mail_toggle_checkbox_status(checked)
{	
	neonMail.$body.find('table tbody input[type="checkbox"]' + (checked ? '' : ':checked')).attr('checked',  ! checked).click();
}