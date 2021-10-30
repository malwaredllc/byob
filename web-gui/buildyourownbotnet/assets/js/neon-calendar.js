/**
 *	Neon Calendar Script
 *
 *	Developed by Arlind Nushi - www.laborator.co
 */

var neonCalendar = neonCalendar || {};

;(function($, window, undefined)
{
	"use strict";

	$(document).ready(function()
	{
		neonCalendar.$container = $(".calendar-env");

		$.extend(neonCalendar, {
			isPresent: neonCalendar.$container.length > 0
		});

		// Mail Container Height fit with the document
		if(neonCalendar.isPresent)
		{
			neonCalendar.$sidebar = neonCalendar.$container.find('.calendar-sidebar');
			neonCalendar.$body = neonCalendar.$container.find('.calendar-body');


			// Checkboxes
			var $cb = neonCalendar.$body.find('table thead input[type="checkbox"], table tfoot input[type="checkbox"]');

			$cb.on('click', function()
			{
				$cb.attr('checked', this.checked).trigger('change');

				calendar_toggle_checkbox_status(this.checked);
			});

			// Highlight
			neonCalendar.$body.find('table tbody input[type="checkbox"]').on('change', function()
			{
				$(this).closest('tr')[this.checked ? 'addClass' : 'removeClass']('highlight');
			});


			// Setup Calendar
			if($.isFunction($.fn.fullCalendar))
			{
				var calendar = $('#calendar');

				calendar.fullCalendar({
					header: {
						left: 'title',
						right: 'month,agendaWeek,agendaDay today prev,next'
					},

					//defaultView: 'basicWeek',

					editable: true,
					firstDay: 1,
					height: 600,
					droppable: true,
					drop: function(date, allDay) {

						var $this = $(this),
							eventObject = {
								title: $this.text(),
								start: date,
								allDay: allDay,
								className: $this.data('event-class')
							};

						calendar.fullCalendar('renderEvent', eventObject, true);

						$this.remove();
					}
				});

				$("#draggable_events li a").draggable({
					zIndex: 999,
					revert: true,
					revertDuration: 0
				}).on('click', function()
				{
					return false;
				});
			}
			else
			{
				alert("Please include full-calendar script!");
			}


			$("body").on('submit', '#add_event_form', function(ev)
			{
				ev.preventDefault();

				var text = $("#add_event_form input");

				if(text.val().length == 0)
					return false;

				var classes = ['', 'color-green', 'color-blue', 'color-orange', 'color-primary', ''],
					_class = classes[ Math.floor(classes.length * Math.random()) ],
					$event = $('<li><a href="#"></a></li>');

				$event.find('a').text(text.val()).addClass(_class).attr('data-event-class', _class);

				$event.appendTo($("#draggable_events"));

				$("#draggable_events li a").draggable({
					zIndex: 999,
					revert: true,
					revertDuration: 0
				}).on('click', function()
				{
					return false;
				});

				fit_calendar_container_height();

				$event.hide().slideDown('fast');
				text.val('');

				return false;
			});
		}
	});

})(jQuery, window);


function fit_calendar_container_height()
{
	if(neonCalendar.isPresent)
	{
		if(neonCalendar.$sidebar.height() < neonCalendar.$body.height())
		{
			neonCalendar.$sidebar.height( neonCalendar.$body.height() );
		}
		else
		{
			var old_height = neonCalendar.$sidebar.height();

			neonCalendar.$sidebar.height('');

			if(neonCalendar.$sidebar.height() < neonCalendar.$body.height())
			{
				neonCalendar.$sidebar.height(old_height);
			}
		}
	}
}

function reset_calendar_container_height()
{
	if(neonCalendar.isPresent)
	{
		neonCalendar.$sidebar.height('auto');
	}
}

function calendar_toggle_checkbox_status(checked)
{
	neonCalendar.$body.find('table tbody input[type="checkbox"]' + (checked ? '' : ':checked')).attr('checked',  ! checked).click();
}