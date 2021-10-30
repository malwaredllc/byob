/**
 *	Neon Main JavaScript File
 *
 *	Theme by: www.laborator.co
 **/

var public_vars = public_vars || {};

;(function($, window, undefined){

	"use strict";

	$(document).ready(function()
	{
		// Sidebar Menu var
		public_vars.$body	 	 	= $("body");
		public_vars.$pageContainer  = public_vars.$body.find(".page-container");
		public_vars.$chat 			= public_vars.$pageContainer.find('#chat');
		public_vars.$horizontalMenu = public_vars.$pageContainer.find('header.navbar');
		public_vars.$sidebarMenu	= public_vars.$pageContainer.find('.sidebar-menu');
		public_vars.$mainMenu	    = public_vars.$sidebarMenu.find('#main-menu');
		public_vars.$mainContent	= public_vars.$pageContainer.find('.main-content');
		public_vars.$sidebarUserEnv = public_vars.$sidebarMenu.find('.sidebar-user-info');
		public_vars.$sidebarUser 	= public_vars.$sidebarUserEnv.find('.user-link');


		public_vars.$body.addClass('loaded');

		// Just to make sure...
		$(window).on('error', function(ev)
		{
			// Do not let page without showing if JS fails somewhere
			init_page_transitions();
		});

		if(public_vars.$pageContainer.hasClass('right-sidebar'))
		{
			public_vars.isRightSidebar = true;
		}




		// Sidebar Menu Setup
		setup_sidebar_menu();




		// Horizontal Menu Setup
		setup_horizontal_menu();



		// Sidebar Collapse icon
		public_vars.$sidebarMenu.find(".sidebar-collapse-icon").on('click', function(ev)
		{
			ev.preventDefault();

			var with_animation = $(this).hasClass('with-animation');

			toggle_sidebar_menu(with_animation);
		});




		// Mobile Sidebar Collapse icon
		public_vars.$sidebarMenu.find(".sidebar-mobile-menu a").on('click', function(ev)
		{
			ev.preventDefault();

			var with_animation = $(this).hasClass('with-animation');

			if(with_animation)
			{
				public_vars.$mainMenu.stop().slideToggle('normal', function()
				{
					public_vars.$mainMenu.css('height', 'auto');
				});
			}
			else
			{
				public_vars.$mainMenu.toggle();
			}
		});




		// Mobile Horizontal Menu Collapse icon
		public_vars.$horizontalMenu.find(".horizontal-mobile-menu a").on('click', function(ev)
		{
			ev.preventDefault();

			var $menu = public_vars.$horizontalMenu.find('.navbar-nav'),
				with_animation = $(this).hasClass('with-animation');

			if(with_animation)
			{
				$menu.stop().slideToggle('normal', function()
				{
					$menu.attr('height', 'auto');

					if($menu.css('display') == 'none')
					{
						$menu.attr('style', '');
					}
				});
			}
			else
			{
				$menu.toggle();
			}
		});




		// Close Sidebar if Tablet Screen is visible
		public_vars.$sidebarMenu.data('initial-state', (public_vars.$pageContainer.hasClass('sidebar-collapsed') ? 'closed' : 'open'));

		if(is('tabletscreen'))
		{
			hide_sidebar_menu(false);
		}




		// NiceScroll
		if($.isFunction($.fn.niceScroll))
		{
			var nicescroll_defaults = {
				cursorcolor: '#d4d4d4',
				cursorborder: '1px solid #ccc',
				railpadding: {right: 3},
				cursorborderradius: 1,
				autohidemode: true,
				sensitiverail: true
			};

			public_vars.$body.find('.dropdown .scroller').niceScroll(nicescroll_defaults);

			$(".dropdown").on("shown.bs.dropdown", function ()
			{
				$(".scroller").getNiceScroll().resize();
				$(".scroller").getNiceScroll().show();
			});
		}


		// Fixed Sidebar
		var fixed_sidebar = $(".sidebar-menu.fixed");

		if(fixed_sidebar.length == 1)
		{
			ps_init();
		}




		// Scrollable
		if($.isFunction($.fn.slimScroll))
		{
			$(".scrollable").each(function(i, el)
			{
				var $this = $(el),
					height = attrDefault($this, 'height', $this.height());

				if($this.is(':visible'))
				{
					$this.removeClass('scrollable');

					if($this.height() < parseInt(height, 10))
					{
						height = $this.outerHeight(true) + 10;
					}

					$this.addClass('scrollable');
				}

				$this.css({maxHeight: ''}).slimScroll({
					height: height,
					position: attrDefault($this, 'scroll-position', 'right'),
					color: attrDefault($this, 'rail-color', '#000'),
					size: attrDefault($this, 'rail-width', 6),
					borderRadius: attrDefault($this, 'rail-radius', 3),
					opacity: attrDefault($this, 'rail-opacity', .3),
					alwaysVisible: parseInt(attrDefault($this, 'autohide', 1), 10) == 1 ? false : true
				});
			});
		}




		// Panels

		// Added on v1.1.4 - Fixed collapsing effect with panel tables
		$(".panel-heading").each(function(i, el)
		{
			var $this = $(el),
				$body = $this.next('table');

			$body.wrap('<div class="panel-body with-table"></div>');

			$body = $this.next('.with-table').next('table');
			$body.wrap('<div class="panel-body with-table"></div>');

		});

		continueWrappingPanelTables();
		// End of: Added on v1.1.4


		$('body').on('click', '.panel > .panel-heading > .panel-options > a[data-rel="reload"]', function(ev)
		{
			ev.preventDefault();

			var $this = jQuery(this).closest('.panel');

			blockUI($this);
			$this.addClass('reloading');

			setTimeout(function()
			{
				unblockUI($this)
				$this.removeClass('reloading');

			}, 900);

		}).on('click', '.panel > .panel-heading > .panel-options > a[data-rel="close"]', function(ev)
		{
			ev.preventDefault();

			var $this = $(this),
				$panel = $this.closest('.panel');

			var t = new TimelineLite({
				onComplete: function()
				{
					$panel.slideUp(function()
					{
						$panel.remove();
					});
				}
			});

			t.append( TweenMax.to($panel, .2, {css: {scale: 0.95}}) );
			t.append( TweenMax.to($panel, .5, {css: {autoAlpha: 0, transform: "translateX(100px) scale(.95)"}}) );

		}).on('click', '.panel > .panel-heading > .panel-options > a[data-rel="collapse"]', function(ev)
		{
			ev.preventDefault();

			var $this = $(this),
				$panel = $this.closest('.panel'),
				$body = $panel.children('.panel-body, .table'),
				do_collapse = ! $panel.hasClass('panel-collapse');

			if($panel.is('[data-collapsed="1"]'))
			{
				$panel.attr('data-collapsed', 0);
				$body.hide();
				do_collapse = false;
			}

			if(do_collapse)
			{
				$body.slideUp('normal');
				$panel.addClass('panel-collapse');
			}
			else
			{
				$body.slideDown('normal');
				$panel.removeClass('panel-collapse');
			}
		});




		// Data Toggle for Radio and Checkbox Elements
		$('[data-toggle="buttons-radio"]').each(function()
		{
			var $buttons = $(this).children();

			$buttons.each(function(i, el)
			{
				var $this = $(el);

				$this.click(function(ev)
				{
					$buttons.removeClass('active');
				});
			});
		});

		$('[data-toggle="buttons-checkbox"]').each(function()
		{
			var $buttons = $(this).children();

			$buttons.each(function(i, el)
			{
				var $this = $(el);

				$this.click(function(ev)
				{
					$this.removeClass('active');
				});
			});
		});

		$('[data-loading-text]').each(function(i, el) // Temporary for demo purpose only
		{
			var $this = $(el);

			$this.on('click', function(ev)
			{
				$this.button('loading');

				setTimeout(function(){ $this.button('reset'); }, 1800);
			});
		});




		// Popovers and tooltips
		$('[data-toggle="popover"]').each(function(i, el)
		{
			var $this = $(el),
				placement = attrDefault($this, 'placement', 'right'),
				trigger = attrDefault($this, 'trigger', 'click'),
				popover_class = $this.hasClass('popover-secondary') ? 'popover-secondary' : ($this.hasClass('popover-primary') ? 'popover-primary' : ($this.hasClass('popover-default') ? 'popover-default' : ''));

			$this.popover({
				placement: placement,
				trigger: trigger
			});

			$this.on('shown.bs.popover', function(ev)
			{
				var $popover = $this.next();

				$popover.addClass(popover_class);
			});
		});

		$('[data-toggle="tooltip"]').each(function(i, el)
		{
			var $this = $(el),
				placement = attrDefault($this, 'placement', 'top'),
				trigger = attrDefault($this, 'trigger', 'hover'),
				popover_class = $this.hasClass('tooltip-secondary') ? 'tooltip-secondary' : ($this.hasClass('tooltip-primary') ? 'tooltip-primary' : ($this.hasClass('tooltip-default') ? 'tooltip-default' : ''));

			$this.tooltip({
				placement: placement,
				trigger: trigger
			});

			$this.on('shown.bs.tooltip', function(ev)
			{
				var $tooltip = $this.next();

				$tooltip.addClass(popover_class);
			});
		});




		// jQuery Knob
		if($.isFunction($.fn.knob))
		{
			$(".knob").knob({
				change: function (value) {
				},
				release: function (value) {
				},
				cancel: function () {
				},
				draw: function () {

					if (this.$.data('skin') == 'tron') {

						var a = this.angle(this.cv) // Angle
							,
							sa = this.startAngle // Previous start angle
							,
							sat = this.startAngle // Start angle
							,
							ea // Previous end angle
							, eat = sat + a // End angle
							,
							r = 1;

						this.g.lineWidth = this.lineWidth;

						this.o.cursor && (sat = eat - 0.3) && (eat = eat + 0.3);

						if (this.o.displayPrevious) {
							ea = this.startAngle + this.angle(this.v);
							this.o.cursor && (sa = ea - 0.3) && (ea = ea + 0.3);
							this.g.beginPath();
							this.g.strokeStyle = this.pColor;
							this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, sa, ea, false);
							this.g.stroke();
						}

						this.g.beginPath();
						this.g.strokeStyle = r ? this.o.fgColor : this.fgColor;
						this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, sat, eat, false);
						this.g.stroke();

						this.g.lineWidth = 2;
						this.g.beginPath();
						this.g.strokeStyle = this.o.fgColor;
						this.g.arc(this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, 0, 2 * Math.PI, false);
						this.g.stroke();

						return false;
					}
				}
			});
		}




		// Slider
		if($.isFunction($.fn.slider))
		{
			$(".slider").each(function(i, el)
			{
				var $this = $(el),
					$label_1 = $('<span class="ui-label"></span>'),
					$label_2 = $label_1.clone(),

					orientation = attrDefault($this, 'vertical', 0) != 0 ? 'vertical' : 'horizontal',

					prefix = attrDefault($this, 'prefix', ''),
					postfix = attrDefault($this, 'postfix', ''),

					fill = attrDefault($this, 'fill', ''),
					$fill = $(fill),

					step = attrDefault($this, 'step', 1),
					value = attrDefault($this, 'value', 5),
					min = attrDefault($this, 'min', 0),
					max = attrDefault($this, 'max', 100),
					min_val = attrDefault($this, 'min-val', 10),
					max_val = attrDefault($this, 'max-val', 90),

					is_range = $this.is('[data-min-val]') || $this.is('[data-max-val]'),

					reps = 0;


				// Range Slider Options
				if(is_range)
				{
					$this.slider({
						range: true,
						orientation: orientation,
						min: min,
						max: max,
						values: [min_val, max_val],
						step: step,
						slide: function(e, ui)
						{
							var min_val = (prefix ? prefix : '') + ui.values[0] + (postfix ? postfix : ''),
								max_val = (prefix ? prefix : '') + ui.values[1] + (postfix ? postfix : '');

							$label_1.html( min_val );
							$label_2.html( max_val );

							if(fill)
								$fill.val(min_val + ',' + max_val);

							reps++;
						},
						change: function(ev, ui)
						{
							if(reps == 1)
							{
								var min_val = (prefix ? prefix : '') + ui.values[0] + (postfix ? postfix : ''),
									max_val = (prefix ? prefix : '') + ui.values[1] + (postfix ? postfix : '');

								$label_1.html( min_val );
								$label_2.html( max_val );

								if(fill)
									$fill.val(min_val + ',' + max_val);
							}

							reps = 0;
						}
					});

					var $handles = $this.find('.ui-slider-handle');

					$label_1.html((prefix ? prefix : '') + min_val + (postfix ? postfix : ''));
					$handles.first().append( $label_1 );

					$label_2.html((prefix ? prefix : '') + max_val+ (postfix ? postfix : ''));
					$handles.last().append( $label_2 );
				}
				// Normal Slider
				else
				{

					$this.slider({
						range: attrDefault($this, 'basic', 0) ? false : "min",
						orientation: orientation,
						min: min,
						max: max,
						value: value,
						step: step,
						slide: function(ev, ui)
						{
							var val = (prefix ? prefix : '') + ui.value + (postfix ? postfix : '');

							$label_1.html( val );


							if(fill)
								$fill.val(val);

							reps++;
						},
						change: function(ev, ui)
						{
							if(reps == 1)
							{
								var val = (prefix ? prefix : '') + ui.value + (postfix ? postfix : '');

								$label_1.html( val );

								if(fill)
									$fill.val(val);
							}

							reps = 0;
						}
					});

					var $handles = $this.find('.ui-slider-handle');
						//$fill = $('<div class="ui-fill"></div>');

					$label_1.html((prefix ? prefix : '') + value + (postfix ? postfix : ''));
					$handles.html( $label_1 );

					//$handles.parent().prepend( $fill );

					//$fill.width($handles.get(0).style.left);
				}

			})
		}




		// Radio Toggle
		if($.isFunction($.fn.bootstrapSwitch))
		{

			$('.make-switch.is-radio').on('switch-change', function () {
		        $('.make-switch.is-radio').bootstrapSwitch('toggleRadioState');
		    });
		}




		// Select2 Dropdown replacement
		if($.isFunction($.fn.select2))
		{
			$(".select2").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						allowClear: attrDefault($this, 'allowClear', false)
					};

				$this.select2(opts);
				$this.addClass('visible');

				//$this.select2("open");
			});


			if($.isFunction($.fn.niceScroll))
			{
				$(".select2-results").niceScroll({
					cursorcolor: '#d4d4d4',
					cursorborder: '1px solid #ccc',
					railpadding: {right: 3}
				});
			}
		}




		// SelectBoxIt Dropdown replacement
		if($.isFunction($.fn.selectBoxIt))
		{
			$("select.selectboxit").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						showFirstOption: attrDefault($this, 'first-option', true),
						'native': attrDefault($this, 'native', false),
						defaultText: attrDefault($this, 'text', ''),
					};

				$this.addClass('visible');
				$this.selectBoxIt(opts);
			});
		}




		// Auto Size for Textarea
		if($.isFunction($.fn.autosize))
		{
			$("textarea.autogrow, textarea.autosize").autosize();
		}




		// Tagsinput
		if($.isFunction($.fn.tagsinput))
		{
			$(".tagsinput").tagsinput();
		}




		// Typeahead
		if($.isFunction($.fn.typeahead))
		{
			$(".typeahead").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						name: $this.attr('name') ? $this.attr('name') : ($this.attr('id') ? $this.attr('id') : 'tt')
					};

				if($this.hasClass('tagsinput'))
					return;

				if($this.data('local'))
				{
					var local = $this.data('local');

					local = local.replace(/\s*,\s*/g, ',').split(',');

					opts['local'] = local;
				}

				if($this.data('prefetch'))
				{
					var prefetch = $this.data('prefetch');

					opts['prefetch'] = prefetch;
				}

				if($this.data('remote'))
				{
					var remote = $this.data('remote');

					opts['remote'] = remote;
				}

				if($this.data('template'))
				{
					var template = $this.data('template');

					opts['template'] = template;
					opts['engine'] = Hogan;
				}

				$this.typeahead(opts);
			});
		}




		// Datepicker
		if($.isFunction($.fn.datepicker))
		{
			$(".datepicker").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						format: attrDefault($this, 'format', 'mm/dd/yyyy'),
						startDate: attrDefault($this, 'startDate', ''),
						endDate: attrDefault($this, 'endDate', ''),
						daysOfWeekDisabled: attrDefault($this, 'disabledDays', ''),
						startView: attrDefault($this, 'startView', 0),
						rtl: rtl()
					},
					$n = $this.next(),
					$p = $this.prev();

				$this.datepicker(opts);

				if($n.is('.input-group-addon') && $n.has('a'))
				{
					$n.on('click', function(ev)
					{
						ev.preventDefault();

						$this.datepicker('show');
					});
				}

				if($p.is('.input-group-addon') && $p.has('a'))
				{
					$p.on('click', function(ev)
					{
						ev.preventDefault();

						$this.datepicker('show');
					});
				}
			});
		}




		// Timepicker
		if($.isFunction($.fn.timepicker))
		{
			$(".timepicker").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						template: attrDefault($this, 'template', false),
						showSeconds: attrDefault($this, 'showSeconds', false),
						defaultTime: attrDefault($this, 'defaultTime', 'current'),
						showMeridian: attrDefault($this, 'showMeridian', true),
						minuteStep: attrDefault($this, 'minuteStep', 15),
						secondStep: attrDefault($this, 'secondStep', 15)
					},
					$n = $this.next(),
					$p = $this.prev();

				$this.timepicker(opts);

				if($n.is('.input-group-addon') && $n.has('a'))
				{
					$n.on('click', function(ev)
					{
						ev.preventDefault();

						$this.timepicker('showWidget');
					});
				}

				if($p.is('.input-group-addon') && $p.has('a'))
				{
					$p.on('click', function(ev)
					{
						ev.preventDefault();

						$this.timepicker('showWidget');
					});
				}
			});
		}




		// Colorpicker
		if($.isFunction($.fn.colorpicker))
		{
			$(".colorpicker").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						//format: attrDefault($this, 'format', false)
					},
					$n = $this.next(),
					$p = $this.prev(),

					$preview = $this.siblings('.input-group-addon').find('.color-preview');

				$this.colorpicker(opts);

				if($n.is('.input-group-addon') && $n.has('a'))
				{
					$n.on('click', function(ev)
					{
						ev.preventDefault();

						$this.colorpicker('show');
					});
				}

				if($p.is('.input-group-addon') && $p.has('a'))
				{
					$p.on('click', function(ev)
					{
						ev.preventDefault();

						$this.colorpicker('show');
					});
				}

				if($preview.length)
				{
					$this.on('changeColor', function(ev){

						$preview.css('background-color', ev.color.toHex());
					});

					if($this.val().length)
					{
						$preview.css('background-color', $this.val());
					}
				}
			});
		}




		// Date Range Picker
		if($.isFunction($.fn.daterangepicker))
		{
			$(".daterange").each(function(i, el)
			{
				// Change the range as you desire
				var ranges = {
					'Today': [moment(), moment()],
					'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
					'Last 7 Days': [moment().subtract('days', 6), moment()],
					'Last 30 Days': [moment().subtract('days', 29), moment()],
					'This Month': [moment().startOf('month'), moment().endOf('month')],
					'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
				};

				var $this = $(el),
					opts = {
						format: attrDefault($this, 'format', 'MM/DD/YYYY'),
						timePicker: attrDefault($this, 'timePicker', false),
						timePickerIncrement: attrDefault($this, 'timePickerIncrement', false),
						separator: attrDefault($this, 'separator', ' - '),
					},
					min_date = attrDefault($this, 'minDate', ''),
					max_date = attrDefault($this, 'maxDate', ''),
					start_date = attrDefault($this, 'startDate', ''),
					end_date = attrDefault($this, 'endDate', '');

				if($this.hasClass('add-ranges'))
				{
					opts['ranges'] = ranges;
				}

				if(min_date.length)
				{
					opts['minDate'] = min_date;
				}

				if(max_date.length)
				{
					opts['maxDate'] = max_date;
				}

				if(start_date.length)
				{
					opts['startDate'] = start_date;
				}

				if(end_date.length)
				{
					opts['endDate'] = end_date;
				}


				$this.daterangepicker(opts, function(start, end)
				{
					var drp = $this.data('daterangepicker');

					if($this.is('[data-callback]'))
					{
						//daterange_callback(start, end);
						callback_test(start, end);
					}

					if($this.hasClass('daterange-inline'))
					{
						$this.find('span').html(start.format(drp.format) + drp.separator + end.format(drp.format));
					}
				});
			});
		}




		// Input Mask
		if($.isFunction($.fn.inputmask))
		{
			$("[data-mask]").each(function(i, el)
			{
				var $this = $(el),
					mask = $this.data('mask').toString(),
					opts = {
						numericInput: attrDefault($this, 'numeric', false),
						radixPoint: attrDefault($this, 'radixPoint', ''),
						rightAlignNumerics: attrDefault($this, 'numericAlign', 'left') == 'right'
					},
					placeholder = attrDefault($this, 'placeholder', ''),
					is_regex = attrDefault($this, 'isRegex', '');


				if(placeholder.length)
				{
					opts[placeholder] = placeholder;
				}

				switch(mask.toLowerCase())
				{
					case "phone":
						mask = "(999) 999-9999";
						break;

					case "currency":
					case "rcurrency":

						var sign = attrDefault($this, 'sign', '$');;

						mask = "999,999,999.99";

						if($this.data('mask').toLowerCase() == 'rcurrency')
						{
							mask += ' ' + sign;
						}
						else
						{
							mask = sign + ' ' + mask;
						}

						opts.numericInput = true;
						opts.rightAlignNumerics = false;
						opts.radixPoint = '.';
						break;

					case "email":
						mask = 'Regex';
						opts.regex = "[a-zA-Z0-9._%-]+@[a-zA-Z0-9-\.]+\\.[a-zA-Z]{2,4}";
						break;

					case "fdecimal":
						mask = 'decimal';
						$.extend(opts, {
							autoGroup		: true,
							groupSize		: 3,
							radixPoint		: attrDefault($this, 'rad', '.'),
							groupSeparator	: attrDefault($this, 'dec', ',')
						});
				}

				if(is_regex)
				{
					opts.regex = mask;
					mask = 'Regex';
				}

				$this.inputmask(mask, opts);
			});
		}




		// Form Validation
		if($.isFunction($.fn.validate))
		{
			$("form.validate").each(function(i, el)
			{
				var $this = $(el),
					opts = {
						rules: {},
						messages: {},
						errorElement: 'span',
						errorClass: 'validate-has-error',
						highlight: function (element) {
							$(element).closest('.form-group').addClass('validate-has-error');
						},
						unhighlight: function (element) {
							$(element).closest('.form-group').removeClass('validate-has-error');
						},
						errorPlacement: function (error, element)
						{
							if(element.closest('.has-switch').length)
							{
								error.insertAfter(element.closest('.has-switch'));
							}
							else
							if(element.parent('.checkbox, .radio').length || element.parent('.input-group').length)
							{
								error.insertAfter(element.parent());
							}
							else
							{
								error.insertAfter(element);
							}
						}
					},
					$fields = $this.find('[data-validate]');


				$fields.each(function(j, el2)
				{
					var $field = $(el2),
						name = $field.attr('name'),
						validate = attrDefault($field, 'validate', '').toString(),
						_validate = validate.split(',');

					for(var k in _validate)
					{
						var rule = _validate[k],
							params,
							message;

						if(typeof opts['rules'][name] == 'undefined')
						{
							opts['rules'][name] = {};
							opts['messages'][name] = {};
						}

						if($.inArray(rule, ['required', 'url', 'email', 'number', 'date', 'creditcard']) != -1)
						{
							opts['rules'][name][rule] = true;

							message = $field.data('message-' + rule);

							if(message)
							{
								opts['messages'][name][rule] = message;
							}
						}
						// Parameter Value (#1 parameter)
						else
						if(params = rule.match(/(\w+)\[(.*?)\]/i))
						{
							if($.inArray(params[1], ['min', 'max', 'minlength', 'maxlength', 'equalTo']) != -1)
							{
								opts['rules'][name][params[1]] = params[2];


								message = $field.data('message-' + params[1]);

								if(message)
								{
									opts['messages'][name][params[1]] = message;
								}
							}
						}
					}
				});

				$this.validate(opts);
			});
		}




		// Replaced File Input
		$("input.file2[type=file]").each(function(i, el)
		{
			var $this = $(el),
				label = attrDefault($this, 'label', 'Browse');

			$this.bootstrapFileInput(label);
		});




		// Jasny Bootstrap | Fileinput
		if($.isFunction($.fn.fileinput))
		{
			$(".fileinput").fileinput()
		}




		// Multi-select
		if($.isFunction($.fn.multiSelect))
		{
			$(".multi-select").multiSelect();
		}




		// Form Wizard
		if($.isFunction($.fn.bootstrapWizard))
		{
			$(".form-wizard").each(function(i, el)
			{
				var $this = $(el),
					$progress = $this.find(".steps-progress div"),
					_index = $this.find('> ul > li.active').index();

				// Validation
				var checkFormWizardValidaion = function(tab, navigation, index)
					{
			  			if($this.hasClass('validate'))
			  			{
							var $valid = $this.valid();

							if( ! $valid)
							{
								$this.data('validator').focusInvalid();
								return false;
							}
						}

				  		return true;
					};


				$this.bootstrapWizard({
					tabClass: "",
			  		onTabShow: function($tab, $navigation, index)
			  		{

						setCurrentProgressTab($this, $navigation, $tab, $progress, index);
			  		},

			  		onNext: checkFormWizardValidaion,
			  		onTabClick: checkFormWizardValidaion
			  	});

			  	$this.data('bootstrapWizard').show( _index );

			  	/*$(window).on('neon.resize', function()
			  	{
			  		$this.data('bootstrapWizard').show( _index );
			  	});*/
			});
		}




		// Wysiwyg Editor
		if($.isFunction($.fn.wysihtml5))
		{
			$(".wysihtml5").each(function(i, el)
			{
				var $this = $(el),
					stylesheets = attrDefault($this, 'stylesheet-url', '')

				$(".wysihtml5").wysihtml5({
					stylesheets: stylesheets.split(',')
				});
			});
		}




		// CKeditor WYSIWYG
		if($.isFunction($.fn.ckeditor))
		{
			$(".ckeditor").ckeditor({
				contentsLangDirection: rtl() ? 'rtl' : 'ltr'
			});
		}




		// Checkbox/Radio Replacement
		replaceCheckboxes();




		// Tile Progress
		$(".tile-progress").each(function(i, el)
		{
			var $this = $(el),
				$pct_counter = $this.find('.pct-counter'),
				$progressbar = $this.find('.tile-progressbar span'),
				percentage = parseFloat($progressbar.data('fill')),
				pct_len = percentage.toString().length;

			if(typeof scrollMonitor == 'undefined')
			{
				$progressbar.width(percentage + '%');
				$pct_counter.html(percentage);
			}
			else
			{
				var tile_progress = scrollMonitor.create( el );

				tile_progress.fullyEnterViewport(function(){
					$progressbar.width(percentage +'%');
					tile_progress.destroy();

					var o = {pct: 0};
					TweenLite.to(o, 1, {pct: percentage, ease: Quint.easeInOut, onUpdate: function()
						{
							var pct_str = o.pct.toString().substring(0, pct_len);

							$pct_counter.html(pct_str);
						}
					});
				});
			}
		});




		// Tile Stats
		$(".tile-stats").each(function(i, el)
		{
			var $this = $(el),
				$num = $this.find('.num'),

				start = attrDefault($num, 'start', 0),
				end = attrDefault($num, 'end', 0),
				prefix = attrDefault($num, 'prefix', ''),
				postfix = attrDefault($num, 'postfix', ''),
				duration = attrDefault($num, 'duration', 1000),
				delay = attrDefault($num, 'delay', 1000),
				format = attrDefault($num, 'format', false);

			if(start < end)
			{
				if(typeof scrollMonitor == 'undefined')
				{
					$num.html(prefix + end + postfix);
				}
				else
				{
					var tile_stats = scrollMonitor.create( el );

					tile_stats.fullyEnterViewport(function(){

						var o = {curr: start};

						TweenLite.to(o, duration/1000, {curr: end, ease: Power1.easeInOut, delay: delay/1000, onUpdate: function()
							{
								$num.html(prefix + (format ? numberWithCommas( Math.round(o.curr) ) : Math.round(o.curr)) + postfix);
							}
						});

						tile_stats.destroy()
					});
				}
			}
		});




		// Tocify Table
		if($.isFunction($.fn.tocify) && $("#toc").length)
		{
			$("#toc").tocify({
				context: '.tocify-content',
				selectors: "h2,h3,h4,h5"
			});


			var $this = $(".tocify"),
				watcher = scrollMonitor.create($this.get(0));

			$this.width( $this.parent().width() );

			watcher.lock();

			watcher.stateChange(function()
			{
				$($this.get(0)).toggleClass('fixed', this.isAboveViewport)
			});
		}



		// Modal Static
		public_vars.$body.on('click', '.modal[data-backdrop="static"]', function(ev)
		{
			if( $(ev.target).is('.modal') )
			{
				var $modal_dialog = $(this).find('.modal-dialog .modal-content'),
					tt = new TimelineMax({paused: true});

				tt.append( TweenMax.to($modal_dialog, .1, {css: {scale: 1.1}, ease: Expo.easeInOut}) );
				tt.append( TweenMax.to($modal_dialog, .3, {css: {scale: 1}, ease: Back.easeOut}) );

				tt.play();
			}
		});


		// Added on v1.1

		// Sidebar User Links Popup
		if(public_vars.$sidebarUserEnv.length)
		{
			var $su_normal = public_vars.$sidebarUserEnv.find('.sui-normal'),
				$su_hover = public_vars.$sidebarUserEnv.find('.sui-hover');

			if($su_normal.length && $su_hover.length)
			{
				public_vars.$sidebarUser.on('click', function(ev)
				{
					ev.preventDefault();
					$su_hover.addClass('visible');
				});

				$su_hover.on('click', '.close-sui-popup', function(ev)
				{
					ev.preventDefault();
					$su_hover.addClass('going-invisible');
					$su_hover.removeClass('visible');

					setTimeout(function(){ $su_hover.removeClass('going-invisible'); }, 220);
				});
			}
		}
		// End of: Added on v1.1


		// Added on v1.1.4
		$(".input-spinner").each(function(i, el)
		{
			var $this = $(el),
				$minus = $this.find('button:first'),
				$plus = $this.find('button:last'),
				$input = $this.find('input'),

				minus_step = attrDefault($minus, 'step', -1),
				plus_step = attrDefault($minus, 'step', 1),

				min = attrDefault($input, 'min', null),
				max = attrDefault($input, 'max', null);


			$this.find('button').on('click', function(ev)
			{
				ev.preventDefault();

				var $this = $(this),
					val = $input.val(),
					step = attrDefault($this, 'step', $this[0] == $minus[0] ? -1 : 1);

				if( ! step.toString().match(/^[0-9-\.]+$/))
				{
					step = $this[0] == $minus[0] ? -1 : 1;
				}

				if( ! val.toString().match(/^[0-9-\.]+$/))
				{
					val = 0;
				}

				$input.val( parseFloat(val) + step ).trigger('keyup');
			});

			$input.keyup(function()
			{
				if(min != null && parseFloat($input.val()) < min)
				{
					$input.val(min);
				}
				else

				if(max != null && parseFloat($input.val()) > max)
				{
					$input.val(max);
				}
			});

		});


		// Search Results Tabs
		var $search_results_env = $(".search-results-env");

		if($search_results_env.length)
		{
			var $sr_nav_tabs = $search_results_env.find(".nav-tabs li"),
				$sr_tab_panes = $search_results_env.find('.search-results-panes .search-results-pane');

			$sr_nav_tabs.find('a').on('click', function(ev)
			{
				ev.preventDefault();

				var $this = $(this),
					$tab_pane = $sr_tab_panes.filter($this.attr('href'));

				$sr_nav_tabs.not($this.parent()).removeClass('active');
				$this.parent().addClass('active');

				$sr_tab_panes.not($tab_pane).fadeOut('fast', function()
				{
					$tab_pane.fadeIn('fast');
				});
			});
		}
		// End of: Added on v1.1.4


		// Apply Page Transition
		onPageAppear(init_page_transitions);

	});



	// Enable/Disable Resizable Event
	var wid = 0;

	$(window).resize(function() {
		clearTimeout(wid);
		wid = setTimeout(trigger_resizable, 200);
	});



})(jQuery, window);


/* Functions */

// Sidebar Menu Setup
function setup_sidebar_menu()
{
	var $ = jQuery,
		$items_with_submenu	  = public_vars.$sidebarMenu.find('li:has(ul)'),
		submenu_options		  = {
			submenu_open_delay: 0.25,
			submenu_open_easing: Sine.easeInOut,
			submenu_opened_class: 'opened'
		},
		root_level_class 	  = 'root-level',
		is_multiopen 		  = public_vars.$mainMenu.hasClass('multiple-expanded');

	public_vars.$mainMenu.find('> li').addClass(root_level_class);

	$items_with_submenu.each(function(i, el)
	{
		var $this = $(el),
			$link = $this.find('> a'),
			$submenu = $this.find('> ul');

		$this.addClass('has-sub');

		$link.click(function(ev)
		{
			ev.preventDefault();

			if( ! is_multiopen && $this.hasClass(root_level_class))
			{
				var close_submenus = public_vars.$mainMenu.find('.' + root_level_class).not($this).find('> ul');

				close_submenus.each(function(i, el)
				{
					var $sub = $(el);
					menu_do_collapse($sub, $sub.parent(), submenu_options);
				});
			}

			if( ! $this.hasClass(submenu_options.submenu_opened_class))
			{
				var current_height;

				if( ! $submenu.is(':visible'))
				{
					menu_do_expand($submenu, $this, submenu_options);
				}
			}
			else
			{
				menu_do_collapse($submenu, $this, submenu_options);
			}
		});

	});

	// Open the submenus with "opened" class
	public_vars.$mainMenu.find('.'+submenu_options.submenu_opened_class+' > ul').addClass('visible');

	// Well, somebody may forgot to add "active" for all inhertiance, but we are going to help you (just in case) - we do this job for you for free :P!
	if(public_vars.$mainMenu.hasClass('auto-inherit-active-class'))
	{
		menu_set_active_class_to_parents( public_vars.$mainMenu.find('.active') );
	}

	// Search Input
	var $search_input = public_vars.$mainMenu.find('#search input[type="text"]'),
		$search_el = public_vars.$mainMenu.find('#search');

	public_vars.$mainMenu.find('#search form').submit(function(ev)
	{
		var is_collapsed = public_vars.$pageContainer.hasClass('sidebar-collapsed');

		if(is_collapsed)
		{
			if($search_el.hasClass('focused') == false)
			{
				ev.preventDefault();
				$search_el.addClass('focused');

				$search_input.focus();

				return false;
			}
		}
	});

	$search_input.on('blur', function(ev)
	{
		var is_collapsed = public_vars.$pageContainer.hasClass('sidebar-collapsed');

		if(is_collapsed)
		{
			$search_el.removeClass('focused');
		}
	});
}


function menu_do_expand($submenu, $this, options)
{
	$submenu.addClass('visible').height('');
	current_height = $submenu.outerHeight();

	var props_from = {
		opacity: .2,
		height: 0,
		top: -20
	},
	props_to = {
		height: current_height,
		opacity: 1,
		top: 0
	};

	if(isxs())
	{
		delete props_from['opacity'];
		delete props_from['top'];

		delete props_to['opacity'];
		delete props_to['top'];
	}

	TweenMax.set($submenu, {css: props_from});

	$this.addClass(options.submenu_opened_class);

	TweenMax.to($submenu, options.submenu_open_delay, {css: props_to, ease: options.submenu_open_easing, onUpdate: ps_update, onComplete: function()
	{
		$submenu.attr('style', '');
	}});
}


function menu_do_collapse($submenu, $this, options)
{
	if(public_vars.$pageContainer.hasClass('sidebar-collapsed') && $this.hasClass('root-level'))
	{
		return;
	}

	$this.removeClass(options.submenu_opened_class);

	TweenMax.to($submenu, options.submenu_open_delay, {css: {height: 0, opacity: .2}, ease: options.submenu_open_easing, onUpdate: ps_update, onComplete: function()
	{
		$submenu.removeClass('visible');
	}});
}


function menu_set_active_class_to_parents($active_element)
{
	if($active_element.length)
	{
		var $parent = $active_element.parent().parent();

		$parent.addClass('active');

		if(! $parent.hasClass('root-level'))
			menu_set_active_class_to_parents($parent)
	}
}



// Horizontal Menu Setup
function setup_horizontal_menu()
{
	var $					  = jQuery,
		$nav_bar_menu		  = public_vars.$horizontalMenu.find('.navbar-nav'),
		$items_with_submenu	  = $nav_bar_menu.find('li:has(ul)'),
		$search				  = public_vars.$horizontalMenu.find('li#search'),
		$search_input		  = $search.find('.search-input'),
		$search_submit		  = $search.find('form'),
		root_level_class 	  = 'root-level'
		is_multiopen 		  = $nav_bar_menu.hasClass('multiple-expanded'),
		submenu_options		  = {
			submenu_open_delay: 0.5,
			submenu_open_easing: Sine.easeInOut,
			submenu_opened_class: 'opened'
		};

	$nav_bar_menu.find('> li').addClass(root_level_class);

	$items_with_submenu.each(function(i, el)
	{
		var $this = $(el),
			$link = $this.find('> a'),
			$submenu = $this.find('> ul');

		$this.addClass('has-sub');

		setup_horizontal_menu_hover($this, $submenu);

		// xs devices only
		$link.click(function(ev)
		{
			if(isxs() || is('tabletscreen'))
			{
				ev.preventDefault();

				if( ! is_multiopen && $this.hasClass(root_level_class))
				{
					var close_submenus = $nav_bar_menu.find('.' + root_level_class).not($this).find('> ul');

					close_submenus.each(function(i, el)
					{
						var $sub = $(el);
						menu_do_collapse($sub, $sub.parent(), submenu_options);
					});
				}

				if( ! $this.hasClass(submenu_options.submenu_opened_class))
				{
					var current_height;

					if( ! $submenu.is(':visible'))
					{
						menu_do_expand($submenu, $this, submenu_options);
					}
				}
				else
				{
					menu_do_collapse($submenu, $this, submenu_options);
				}
			}
		});

	});


	// Search Input
	if($search.hasClass('search-input-collapsed'))
	{
		$search_submit.submit(function(ev)
		{
			if($search.hasClass('search-input-collapsed'))
			{
				ev.preventDefault();
				$search.removeClass('search-input-collapsed');
				$search_input.focus();

				return false;
			}
		});

		$search_input.on('blur', function(ev)
		{
			$search.addClass('search-input-collapsed');
		});
	}
}

jQuery(public_vars, {
	hover_index: 4
});

function setup_horizontal_menu_hover($item, $sub)
{
	var del = 0.5,
		trans_x = -10,
		ease = Quad.easeInOut;

	TweenMax.set($sub, {css: {autoAlpha: 0, transform: "translateX("+trans_x+"px)"}});

	$item.hoverIntent({
		over: function()
		{
			if(isxs())
				return false;

			if($sub.css('display') == 'none')
			{
				$sub.css({display: 'block', visibility: 'hidden'});
			}

			$sub.css({zIndex: ++public_vars.hover_index});
			TweenMax.to($sub, del, {css: {autoAlpha: 1, transform: "translateX(0px)"}, ease: ease});
		},

		out: function()
		{
			if(isxs())
				return false;

			TweenMax.to($sub, del, {css: {autoAlpha: 0, transform: "translateX("+trans_x+"px)"}, ease: ease, onComplete: function()
			{
				TweenMax.set($sub, {css: {transform: "translateX("+trans_x+"px)"}});
				$sub.css({display: 'none'});
			}});
		},

		timeout: 300,
		interval: 50
	});

}



// Block UI Helper
function blockUI($el)
{
	$el.block({
		message: '',
		css: {
			border: 'none',
			padding: '0px',
			backgroundColor: 'none'
		},
		overlayCSS: {
			backgroundColor: '#fff',
			opacity: .3,
			cursor: 'wait'
		}
	});
}

function unblockUI($el)
{
	$el.unblock();
}


// Element Attribute Helper
function attrDefault($el, data_var, default_val)
{
	if(typeof $el.data(data_var) != 'undefined')
	{
		return $el.data(data_var);
	}

	return default_val;
}



// Test function
function callback_test()
{
	alert("Callback function executed! No. of arguments: " + arguments.length + "\n\nSee console log for outputed of the arguments.");

	console.log(arguments);
}


// Root Wizard Current Tab
function setCurrentProgressTab($rootwizard, $nav, $tab, $progress, index)
{
	$tab.prevAll().addClass('completed');
	$tab.nextAll().removeClass('completed');

	var items      	  = $nav.children().length,
		pct           = parseInt((index+1) / items * 100, 10),
		$first_tab    = $nav.find('li:first-child'),
		margin        = (1/(items*2) * 100) + '%';//$first_tab.find('span').position().left + 'px';

	if( $first_tab.hasClass('active'))
	{
		$progress.width(0);
	}
	else
	{
		if(rtl())
		{
			$progress.width( $progress.parent().outerWidth(true) - $tab.prev().position().left - $tab.find('span').width()/2 );
		}
		else
		{
			$progress.width( ((index-1) /(items-1)) * 100 + '%' ); //$progress.width( $tab.prev().position().left - $tab.find('span').width()/2 );
		}
	}


	$progress.parent().css({
		marginLeft: margin,
		marginRight: margin
	});

	/*var m = $first_tab.find('span').position().left - $first_tab.find('span').width() / 2;

	$rootwizard.find('.tab-content').css({
		marginLeft: m,
		marginRight: m
	});*/
}


// Replace Checkboxes
function replaceCheckboxes()
{
	var $ = jQuery;

	$(".checkbox-replace:not(.neon-cb-replacement), .radio-replace:not(.neon-cb-replacement)").each(function(i, el)
	{
		var $this = $(el),
			$input = $this.find('input:first'),
			$wrapper = $('<label class="cb-wrapper" />'),
			$checked = $('<div class="checked" />'),
			checked_class = 'checked',
			is_radio = $input.is('[type="radio"]'),
			$related,
			name = $input.attr('name');


		$this.addClass('neon-cb-replacement');


		$input.wrap($wrapper);

		$wrapper = $input.parent();

		$wrapper.append($checked).next('label').on('click', function(ev)
		{
			$wrapper.click();
		});

		$input.on('change', function(ev)
		{
			if(is_radio)
			{
				//$(".neon-cb-replacement input[type=radio][name='"+name+"']").closest('.neon-cb-replacement').removeClass(checked_class);
				$(".neon-cb-replacement input[type=radio][name='"+name+"']:not(:checked)").closest('.neon-cb-replacement').removeClass(checked_class);
			}

			if($input.is(':disabled'))
			{
				$wrapper.addClass('disabled');
			}

			$this[$input.is(':checked') ? 'addClass' : 'removeClass'](checked_class);

		}).trigger('change');
	});
}



// Scroll to Bottom
function scrollToBottom($el)
{
	var $ = jQuery;

	if(typeof $el == 'string')
		$el = $($el);

	$el.get(0).scrollTop = $el.get(0).scrollHeight;
}


// Check viewport visibility (entrie element)
function elementInViewport(el)
{
	var top = el.offsetTop;
	var left = el.offsetLeft;
	var width = el.offsetWidth;
	var height = el.offsetHeight;

	while (el.offsetParent) {
		el = el.offsetParent;
		top += el.offsetTop;
		left += el.offsetLeft;
	}

	return (
		top >= window.pageYOffset &&
		left >= window.pageXOffset &&
		(top + height) <= (window.pageYOffset + window.innerHeight) &&
		(left + width) <= (window.pageXOffset + window.innerWidth)
	);
}

// X Overflow
function disableXOverflow()
{
	public_vars.$body.addClass('overflow-x-disabled');
}

function enableXOverflow()
{
	public_vars.$body.removeClass('overflow-x-disabled');
}


// Page Transitions
function init_page_transitions()
{
	var transitions = ['page-fade', 'page-left-in', 'page-right-in', 'page-fade-only'];

	for(var i in transitions)
	{
		var transition_name = transitions[i];

		if(public_vars.$body.hasClass(transition_name))
		{
			public_vars.$body.addClass(transition_name + '-init')

			setTimeout(function()
			{
				public_vars.$body.removeClass(transition_name + ' ' + transition_name + '-init');

			}, 850);

			return;
		}
	}
}


// Page Visibility API
function onPageAppear(callback)
{

	var hidden, state, visibilityChange;

	if (typeof document.hidden !== "undefined")
	{
		hidden = "hidden";
		visibilityChange = "visibilitychange";
		state = "visibilityState";
	}
	else if (typeof document.mozHidden !== "undefined")
	{
		hidden = "mozHidden";
		visibilityChange = "mozvisibilitychange";
		state = "mozVisibilityState";
	}
	else if (typeof document.msHidden !== "undefined")
	{
		hidden = "msHidden";
		visibilityChange = "msvisibilitychange";
		state = "msVisibilityState";
	}
	else if (typeof document.webkitHidden !== "undefined")
	{
		hidden = "webkitHidden";
		visibilityChange = "webkitvisibilitychange";
		state = "webkitVisibilityState";
	}

	if(document[state] || typeof document[state] == 'undefined')
	{
		callback();
	}

	document.addEventListener(visibilityChange, callback, false);
}


function continueWrappingPanelTables()
{
	var $tables = jQuery(".panel-body.with-table + table");

	if($tables.length)
	{
		$tables.wrap('<div class="panel-body with-table"></div>');
		continueWrappingPanelTables();
	}
}


function show_loading_bar(options)
{
	var defaults = {
		pct: 0,
		delay: 1.3,
		wait: 0,
		before: function(){},
		finish: function(){},
		resetOnEnd: true
	};

	if(typeof options == 'object')
		defaults = jQuery.extend(defaults, options);
	else
	if(typeof options == 'number')
		defaults.pct = options;


	if(defaults.pct > 100)
		defaults.pct = 100;
	else
	if(defaults.pct < 0)
		defaults.pct = 0;

	var $ = jQuery,
		$loading_bar = $(".neon-loading-bar");

	if($loading_bar.length == 0)
	{
		$loading_bar = $('<div class="neon-loading-bar progress-is-hidden"><span data-pct="0"></span></div>');
		public_vars.$body.append( $loading_bar );
	}

	var $pct = $loading_bar.find('span'),
		current_pct = $pct.data('pct'),
		is_regress = current_pct > defaults.pct;


	defaults.before(current_pct);

	TweenMax.to($pct, defaults.delay, {css: {width: defaults.pct + '%'}, delay: defaults.wait, ease: is_regress ? Expo.easeOut : Expo.easeIn,
	onStart: function()
	{
		$loading_bar.removeClass('progress-is-hidden');
	},
	onComplete: function()
	{
		var pct = $pct.data('pct');

		if(pct == 100 && defaults.resetOnEnd)
		{
			hide_loading_bar();
		}

		defaults.finish(pct);
	},
	onUpdate: function()
	{
		$pct.data('pct', parseInt($pct.get(0).style.width, 10));
	}});
}

function hide_loading_bar()
{
	var $ = jQuery,
		$loading_bar = $(".neon-loading-bar"),
		$pct = $loading_bar.find('span');

	$loading_bar.addClass('progress-is-hidden');
	$pct.width(0).data('pct', 0);
}

function numberWithCommas(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}