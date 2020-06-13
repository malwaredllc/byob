/*
	Resuable Functions with Neon Theme

	------

	Theme by: Laborator - www.laborator.co

	Developed by: Arlind Nushi
	Designed by: Art Ramadani
*/

var public_vars = public_vars || {};


// ! Sidebar Menu Options
jQuery.extend(public_vars, {
	sidebarCollapseClass: 'sidebar-collapsed',
	sidebarOnTransitionClass: 'sidebar-is-busy',
	sidebarOnHideTransitionClass: 'sidebar-is-collapsing',
	sidebarOnShowTransitionClass: 'sidebar-is-showing',
	sidebarTransitionTime: 700, // ms
	isRightSidebar: false
});

function show_sidebar_menu(with_animation)
{
	if(isxs())
		return;

	if( ! with_animation)
	{
		public_vars.$pageContainer.removeClass(public_vars.sidebarCollapseClass);
	}
	else
	{
		if(public_vars.$mainMenu.data('is-busy') || ! public_vars.$pageContainer.hasClass(public_vars.sidebarCollapseClass))
			return;

		// Check
		public_vars.$pageContainer.removeClass(public_vars.sidebarCollapseClass);

		var duration		 = public_vars.sidebarTransitionTime,
			expanded_width   = public_vars.$sidebarMenu.width(),
			$sidebar_inner   = public_vars.$sidebarMenu.find('.sidebar-menu-inner'),
			$span_elements   = public_vars.$mainMenu.find('li a span'),
			$submenus        = public_vars.$mainMenu.find('.has-sub > ul'),
			$search_input    = public_vars.$mainMenu.find('#search .search-input'),
			$search_button   = public_vars.$mainMenu.find('#search button'),
			$logo_env		 = public_vars.$sidebarMenu.find('.logo-env'),
			$collapse_icon	 = $logo_env.find('.sidebar-collapse'),
			$logo			 = $logo_env.find('.logo'),
			$sidebar_ulink	 = public_vars.$sidebarUser.find('span, strong'),

			logo_env_padding = parseInt($logo_env.css('padding'), 10);

		// Check
		public_vars.$pageContainer.addClass(public_vars.sidebarCollapseClass);

		public_vars.$sidebarMenu.add( $sidebar_inner ).transit({width: expanded_width}, public_vars.sidebarTransitionTime/2);

		// Showing Class
		setTimeout(function(){ public_vars.$pageContainer.addClass(public_vars.sidebarOnShowTransitionClass); }, 1);

		// Start animation
		public_vars.$mainMenu.data('is-busy', true);

		public_vars.$pageContainer.addClass(public_vars.sidebarOnTransitionClass);

		$logo_env.transit({padding: logo_env_padding}, public_vars.sidebarTransitionTime);

		// Second Phase
		setTimeout(function()
		{
			$logo.css({width: 'auto', height: 'auto'});

			TweenMax.set($logo, {css: {scaleY: 0}});

			TweenMax.to($logo, (public_vars.sidebarTransitionTime/2) / 1100, {css: {scaleY: 1}});

			// Third Phase
			setTimeout(function(){

				public_vars.$pageContainer.removeClass(public_vars.sidebarCollapseClass);

				$submenus.hide().filter('.visible').slideDown('normal', function()
				{
					$submenus.attr('style', '');
				});

				public_vars.$pageContainer.removeClass(public_vars.sidebarOnShowTransitionClass);

				// Last Phase
				setTimeout(function()
				{
					// Reset Vars
					public_vars.$pageContainer
					.add(public_vars.$sidebarMenu)
					.add($sidebar_inner)
					.add($logo_env)
					.add($logo)
					.add($span_elements)
					.add($submenus)
					.attr('style', '');

					public_vars.$pageContainer.removeClass(public_vars.sidebarOnTransitionClass);

					public_vars.$mainMenu.data('is-busy', false); // Transition End

				}, public_vars.sidebarTransitionTime);


			}, public_vars.sidebarTransitionTime/2);

		}, public_vars.sidebarTransitionTime/2);
	}
}

function hide_sidebar_menu(with_animation)
{
	if(isxs())
		return;

	if( ! with_animation)
	{
		public_vars.$pageContainer.addClass(public_vars.sidebarCollapseClass);
		public_vars.$mainMenu.find('.has-sub > ul').attr('style', '');
	}
	else
	{
		if(public_vars.$mainMenu.data('is-busy') || public_vars.$pageContainer.hasClass(public_vars.sidebarCollapseClass))
			return;

		// Check
		public_vars.$pageContainer.addClass(public_vars.sidebarCollapseClass);

		var duration		 = public_vars.sidebarTransitionTime,
			collapsed_width  = public_vars.$sidebarMenu.width(),
			$sidebar_inner   = public_vars.$sidebarMenu.find('.sidebar-menu-inner'),
			$span_elements   = public_vars.$mainMenu.find('li a span'),
			$user_link   	 = public_vars.$sidebarMenu.find('.user-link *').not('img'),
			$submenus        = public_vars.$mainMenu.find('.has-sub > ul'),
			$search_input    = public_vars.$mainMenu.find('#search .search-input'),
			$search_button   = public_vars.$mainMenu.find('#search button'),
			$logo_env		 = public_vars.$sidebarMenu.find('.logo-env'),
			$collapse_icon	 = $logo_env.find('.sidebar-collapse'),
			$logo			 = $logo_env.find('.logo'),
			$sidebar_ulink	 = public_vars.$sidebarUser.find('span, strong'),

			logo_env_padding = parseInt($logo_env.css('padding'), 10);

		// Return to normal state
		public_vars.$pageContainer.removeClass(public_vars.sidebarCollapseClass);

		// Start animation (1)
		public_vars.$mainMenu.data('is-busy', true);


		$logo.transit({scale: [1, 0]}, duration / 5, '', function()
		{
			$logo.hide();
			public_vars.$sidebarMenu.transit({width: collapsed_width});

			if(public_vars.$sidebarMenu.hasClass('fixed'))
			{
				$sidebar_inner.transit({width: collapsed_width});
			}

			$span_elements.hide();
			$user_link.hide();
		});

		// Add Classes & Hide Span Elements
		public_vars.$pageContainer.addClass(public_vars.sidebarOnTransitionClass);
		setTimeout(function(){ public_vars.$pageContainer.addClass(public_vars.sidebarOnHideTransitionClass); }, 1);

		TweenMax.to($submenus, public_vars.sidebarTransitionTime / 1100, {css: {height: 0}});

		$logo.transit({scale: [1,0], perspective: 300}, public_vars.sidebarTransitionTime/2);
		$logo_env.transit({padding: logo_env_padding}, public_vars.sidebarTransitionTime);

		setTimeout(function()
		{
			// In the end do some stuff
			public_vars.$pageContainer
			.add(public_vars.$sidebarMenu)
			.add($sidebar_inner)
			.add($search_input)
			.add($search_button)
			.add($user_link)
			.add($logo_env)
			.add($logo)
			.add($span_elements)
			.add($collapse_icon)
			.add($submenus)
			.add($sidebar_ulink)
			.add(public_vars.$mainMenu)
			.attr('style', '');

			public_vars.$pageContainer.addClass(public_vars.sidebarCollapseClass);

			public_vars.$mainMenu.data('is-busy', false);
			public_vars.$pageContainer.removeClass(public_vars.sidebarOnTransitionClass).removeClass(public_vars.sidebarOnHideTransitionClass);

			$collapse_icon.css('style', '');

		}, public_vars.sidebarTransitionTime);
	}
}

function toggle_sidebar_menu(with_animation)
{
	var open = public_vars.$pageContainer.hasClass(public_vars.sidebarCollapseClass);

	if(open)
	{
		show_sidebar_menu(with_animation);
		ps_init();
	}
	else
	{
		hide_sidebar_menu(with_animation);
		ps_destroy();
	}
}


// Added on v1.5
function rtl() // checks whether the content is in RTL mode
{
	if(typeof window.isRTL == 'boolean')
		return window.isRTL;

	window.isRTL = jQuery("html").get(0).dir == 'rtl' ? true : false;

	return window.isRTL;
}

// Right to left Coeficient
function rtlc()
{
	return rtl() ? -1 : 1;
}


// Perfect scroll bar functions by Arlind Nushi
function ps_update(destroy_init)
{
	if(isxs())
		return;

	if(jQuery.isFunction(jQuery.fn.perfectScrollbar))
	{
		if(public_vars.$sidebarMenu.hasClass('collapsed'))
		{
			return;
		}

		public_vars.$sidebarMenu.find('.sidebar-menu-inner').perfectScrollbar('update');

		if(destroy_init)
		{
			ps_destroy();
			ps_init();
		}
	}
}


function ps_init()
{
	if(isxs())
		return;

	if(jQuery.isFunction(jQuery.fn.perfectScrollbar))
	{
		if(public_vars.$pageContainer.hasClass(public_vars.sidebarCollapseClass) || ! public_vars.$sidebarMenu.hasClass('fixed'))
		{
			return;
		}

		public_vars.$sidebarMenu.find('.sidebar-menu-inner').perfectScrollbar({
			wheelSpeed: 1,
			wheelPropagation: public_vars.wheelPropagation
		});
	}
}

function ps_destroy()
{
	if(jQuery.isFunction(jQuery.fn.perfectScrollbar))
	{
		public_vars.$sidebarMenu.find('.sidebar-menu-inner').perfectScrollbar('destroy');
	}
}