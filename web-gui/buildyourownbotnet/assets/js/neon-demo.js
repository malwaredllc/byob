/**
 *	Neon Demo Scripts (Demo Theme Only)
 *
 *	Developed by Arlind Nushi - www.laborator.co
 */

if(typeof Dropzone != 'undefined')
{
	Dropzone.autoDiscover = false;
}

;(function($, window, undefined)
{
	"use strict";
	
	$(document).ready(function()
	{	
		// Dropzone Example
		if(typeof Dropzone != 'undefined')
		{
			if($("#dropzone_example").length)
			{
				var dz = new Dropzone("#dropzone_example"),
					dze_info = $("#dze_info"),
					status = {uploaded: 0, errors: 0};
				
				var $f = $('<tr><td class="name"></td><td class="size"></td><td class="type"></td><td class="status"></td></tr>');

				dz.on("success", function(file) {
					
					var _$f = $f.clone();
					
					dze_info.removeClass('hidden');
					
					_$f.addClass('success');
					
					_$f.find('.name').html(file.name);
					_$f.find('.size').html(parseInt(file.size / 1024, 10) + ' KB');
					_$f.find('.type').html(file.type);
					_$f.find('.status').html('Uploaded <i class="entypo-check"></i>');
					
					dze_info.find('tbody').append( _$f );
					
					status.uploaded++;
					
					dze_info.find('tfoot td').html('<span class="label label-success">' + status.uploaded + ' uploaded</span> <span class="label label-danger">' + status.errors + ' not uploaded</span>');
					
				})
				.on('error', function(file)
				{
					var _$f = $f.clone();
					
					dze_info.removeClass('hidden');
					
					_$f.addClass('danger');
					
					_$f.find('.name').html(file.name);
					_$f.find('.size').html(parseInt(file.size / 1024, 10) + ' KB');
					_$f.find('.type').html(file.type);
					_$f.find('.status').html('Uploaded <i class="entypo-cancel"></i>');
					
					dze_info.find('tbody').append( _$f );
					
					status.errors++;
					
					dze_info.find('tfoot td').html('<span class="label label-success">' + status.uploaded + ' uploaded</span> <span class="label label-danger">' + status.errors + ' not uploaded</span>');
				});
			}
			
		}
	});
	
})(jQuery, window);
