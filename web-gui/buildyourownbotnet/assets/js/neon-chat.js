/**
 *	Chat Plugin
 *
 *	Created by: Arlind Nushi
 *
 *	www.laborator.co
 */

var neonChat = neonChat || {
	$current_user: null,
	isOpen: false,
	chat_history: [],
	statuses: {
		online: {class: 'is-online', order: 1, label: 'Online'},
		offline: {class: 'is-offline', order: 4, label: 'Offline'},
		idle: {class: 'is-idle', order: 3, label: 'Idle'},
		busy: {class: 'is-busy', order: 2, label: 'Busy'}
	}
};

;(function($, window, undefined)
{
	"use strict";

	var $chat = $("#chat"),
		$chat_inner = $chat.find('.chat-inner'),
		$chat_badge = $chat.find('.badge').add($('.chat-notifications-badge')),
		$conversation_window = $chat.find(".chat-conversation"),
		$conversation_header = $conversation_window.find(".conversation-header"),
		$conversation_body = $conversation_window.find('.conversation-body'),
		$textarea = $conversation_window.find('.chat-textarea textarea'),

		sidebar_default_is_open = ! $(".page-container").hasClass('sidebar-collapsed');


	$.extend(neonChat, {

		init: function()
		{
			// Implement Unique ID in case it doesn't exists
			if( $.isFunction( $.fn.uniqueId ) == false ) {
									
				jQuery.fn.extend({
				
					uniqueId: (function() {
						var uuid = 0;
				
						return function() {
							return this.each(function() {
								if ( !this.id ) {
									this.id = "ui-id-" + ( ++uuid );
								}
							});
						};
					})(),
				});
			}
			
			// Conversation Close
			$conversation_window.on('click', '.conversation-close', neonChat.close);

			$("body").on('click', '.chat-close', function(ev)
			{
				ev.preventDefault();

				var animate = $(this).is('[data-animate]');

				neonChat.hideChat(animate);
			});

			$("body").on('click', '.chat-open', function(ev)
			{
				ev.preventDefault();

				var animate = $(this).is('[data-animate]');

				neonChat.showChat(animate);
			});


			// Texarea
			$textarea.keydown(function(e)
			{
				if(e.keyCode == 13 && !e.shiftKey)
				{
					e.preventDefault();
					neonChat.submitMessage();
					return false;
				}
				else
				if(e.keyCode == 27)
				{
					neonChat.close();
				}
			});


			$chat.on('click', '.chat-group a', function(ev)
			{
				ev.preventDefault();

				var $chat_user = $(this);

				if($chat_user.hasClass('active'))
				{
					neonChat.close();
				}
				else
				{
					neonChat.open($chat_user);
				}
			});

			$chat.find('.chat-group a').each(function(i, el)
			{
				var $this = $(el);

				$this.append('<span class="badge badge-info is-hidden">0</span>');
			});

			neonChat.refreshUserIds();
			neonChat.orderGroups();
			neonChat.prefetchMessages();
			neonChat.countUnreadMessages();
			neonChat.puffUnreads();

			// Chat
			if($chat.hasClass('fixed') && $chat_inner.length && $.isFunction($.fn.niceScroll))
			{
				$chat.find('.chat-inner').niceScroll({
					cursorcolor: '#454a54',
					cursorborder: '1px solid #454a54',
					railpadding: {right: 3},
					railalign: 'right',
					cursorborderradius: 1
				});
			}

			// Chat Toggle
			$("body").on('click', '[data-toggle="chat"]', function(ev)
			{
				ev.preventDefault();

				var $this = $(this),
					with_animation = $this.is('[data-animate]'),
					collapse_sidebar = $this.is('[data-collapse-sidebar]');

				neonChat.toggleChat(with_animation, collapse_sidebar);
			});
		},

		open: function($user_link)
		{
			this.refreshUserIds();

			if(typeof $user_link == 'string')
			{
				$user_link = $($user_link);
			}

			// Set Active Class
			$chat.find('.chat-group a').not($user_link).removeClass('active');
			$user_link.addClass('active');

			// Chat Header
			var user_status = this.statuses[ this.chat_history[$user_link.attr('id')].status ];


			$conversation_header.find('.display-name').html($user_link.find('em').text());

			if(user_status)
			{
				$conversation_header.find('.user-status').attr('class', 'user-status ' + user_status.class);
				$conversation_header.find('small').html(user_status.label);
			}

			$conversation_window.show();
			$textarea.val('');

			this.updateScrollbars();
			this.updateConversationOffset($user_link);


			$textarea.focus();

			this.$current_user = $user_link;
			this.isOpen = true;

			this.renderMessages(this.$current_user.attr('id'));
			this.resetUnreads(this.$current_user.attr('id'));
			this.puffUnreadsAll();
		},

		close: function()
		{
			$chat.find('.chat-group a').removeClass('active');

			$conversation_window.hide().css({top: 0, opacity: 0});

			$conversation_body.find('li.unread').removeClass('unread');

			this.$current_user = null;
			this.isOpen = false;

			return false;
		},

		updateScrollbars: function()
		{
			scrollToBottom('#chat .chat-conversation .conversation-body');
		},

		updateConversationOffset: function($el)
		{
			var top_h = $conversation_window.find('.conversation-body').position().top + 1,
				offset = $el.position().top - top_h,
				minus = 0,

				con_h = $conversation_window.height(),
				win_h = $(window).height();

			if($chat.hasClass('fixed') && offset + con_h > win_h)
			{
				minus = offset + con_h - win_h;
			}

			if($(".page-container.horizontal-menu").length)
			{
				minus += $(".page-container.horizontal-menu .navbar").height();
			}

			offset -= minus;

			$conversation_window.transition({
				top: offset,
				opacity: 1
			});

		},

		getChatHistoryLength: function()
		{
			var max_chat_history = parseInt($chat.data('max-chat-history'), 10);

			if( ! max_chat_history || max_chat_history < 1)
			{
				max_chat_history = 25;
			}

			return max_chat_history;

		},

		submitMessage: function() // Submit whats on textarea
		{
			var msg = $.trim($textarea.val());

			$textarea.val('');

			if(this.isOpen && this.$current_user)
			{
				var id = this.$current_user.uniqueId().attr('id');

				this.pushMessage(id, msg.replace( /<.*?>/g, '' ), $chat.data('current-user'), new Date());
				this.renderMessages(id);
			}
		},

		refreshUserIds: function()
		{
			$('#chat .chat-group a').each(function(i, el)
			{
				var $this = $(el),
					$status = $this.find('.user-status');

				$this.uniqueId();

				var id = $this.attr('id');

				if(typeof neonChat.chat_history[id] == 'undefined')
				{
					var status = $this.data('status');

					if( ! status)
					{
						for(var i in neonChat.statuses)
						{
							if($status.hasClass(neonChat.statuses[i].class))
							{
								status = i;
								break;
							}
						}
					}

					neonChat.chat_history[id] = {
						$el: $this,
						messages: [],
						unreads: 0,
						status: status
					};
				}
			});

		},

		pushMessage: function(id, msg, from, time, fromOpponent, unread)
		{
			if(id && msg)
			{
				this.refreshUserIds();

				var max_chat_history = this.getChatHistoryLength();


				if(this.chat_history[id].messages.length >= max_chat_history)
				{
					this.chat_history[id].messages = this.chat_history[id].messages.reverse().slice(0, max_chat_history - 1).reverse();
				}

				this.chat_history[id].messages.push({
					message: msg,
					from: from,
					time: time,
					fromOpponent: fromOpponent,
					unread: unread
				});

				if(unread)
				{
					this.puffUnreadsAll();
				}

				this.puffUnreads();
			}
		},

		renderMessages: function(id, slient)
		{
			if(typeof this.chat_history[id] != 'undefined')
			{
				$conversation_body.html('');

				for(var i in this.chat_history[id].messages)
				{
					var entry = this.chat_history[id].messages[i],
						$entry = $('<li><span class="user"></span><p></p><span class="time"></span></li>'),
						date = entry.time,
						date_formated = date;

					if(typeof date == 'object')
					{
						var	hour = date.getHours(),
							hour = (hour < 10 ? "0" : "") + hour,

							min  = date.getMinutes(),
							min = (min < 10 ? "0" : "") + min,

							sec  = date.getSeconds();
							sec = (sec < 10 ? "0" : "") + sec;

						date_formated = hour + ':' + min;
					}


					// Populate message DOM
					$entry.find('.user').html(entry.from);
					$entry.find('p').html(entry.message.replace(/\n/g, '<br>'));
					$entry.find('.time').html(date_formated);

					if(entry.fromOpponent)
					{
						$entry.addClass('odd');
					}

					if(entry.unread && typeof slient == 'undefined')
					{
						$entry.addClass('unread');
						entry.unread = false;
					}

					$conversation_body.append($entry);
				}

				this.updateScrollbars();
			}
		},

		getStatus: function(id)
		{
			if(typeof id == 'object')
			{
				id = id.attr('id');
			}

			var user = neonChat.chat_history[id];

			if(user)
			{
				return user.status;
			}

			return null;
		},

		setStatus: function(id, status)
		{
			var $user = typeof id == 'string' ? $('.chat-group a#'+id.replace('#', '')) : id;

			if($user.$el)
			{
				$user = $user.$el;
			}

			if($user.length && this.statuses[status].class)
			{
				var $status = $user.find('.user-status');

				for(var i in this.statuses)
				{
					$status.removeClass(this.statuses[i].class);
				}

				$status.addClass(this.statuses[status].class);
				$user.data('status', status);

				neonChat.chat_history[ $user.attr('id') ].status = status;
				this.orderGroups();
			}
		},

		orderGroups: function()
		{
			var $groups = $chat.find('.chat-group');

			if( ! $chat.data('order-by-status'))
			{
				return false;
			}

			$groups.each(function(i, el)
			{
				var $group = $(el),
					$contacts = $group.find('> a');

				$contacts.each(function(i, el)
				{
					var $contact = $(el),
						$status = $contact.find('.user-status');

					for(var i in neonChat.statuses)
					{
						var status = neonChat.statuses[i];

						if(i == $contact.data('status'))
						{
							$contact.data('order-id', status.order);
							return true;
						}
						else
						if($status.hasClass(status.class))
						{
							$contact.data('order-id', status.order);
							return true;
						}
					}
				});

				var $new_order = $contacts.sort(function(a,b){
					return parseInt($(a).data('order-id'), 10) > parseInt($(b).data('order-id'), 10);
				}).appendTo($group);
			});

			return true;
		},

		prefetchMessages: function()
		{
			$chat.find('.chat-group a').each(function(i, el)
			{
				var $contact = $(el),
					id = $contact.attr('id'),
					history_container = $contact.data('conversation-history');

				if(history_container && history_container.length)
				{
					$($(history_container)).find('> li').each(function(j, el2)
					{
						var $entry = $(el2),
							from = $entry.find('.user').html(),
							message = $entry.find('p').html(),
							time = $entry.find('.time').html(),
							fromOpponent = $entry.hasClass('even') || $entry.hasClass('odd') || $entry.hasClass('opponent'),
							unread = $entry.hasClass('unread');

						neonChat.pushMessage(id, message, from, time, fromOpponent, unread)
					});
				}

			});
		},

		countUnreadMessages: function(id)
		{
			var counter = 0;

			if( ! id)
			{
				for(var id in neonChat.chat_history)
				{
					var user = neonChat.chat_history[id],
						current_user_count = 0;

					for(var i in user.messages)
					{
						if(user.messages[i].unread)
						{
							counter++;
							current_user_count++;
						}
					}

					user.unreads = current_user_count;
				}
			}
			else
			{
				if(typeof id == 'object')
				{
					id = id.attr('id');
				}

				var user = neonChat.chat_history[id];

				if(user)
				{
					return user.unreads;
				}
			}

			return counter;
		},

		puffUnreads: function()
		{
			for(var i in this.chat_history)
			{
				var entry = neonChat.chat_history[i],
					$badge = entry.$el.find('.badge');

				if(entry.unreads > 0)
				{
					$badge.html(entry.unreads).removeClass('is-hidden');
				}
				else
				{
					$badge.html(entry.unreads).addClass('is-hidden');
				}
			}
		},

		puffUnreadsAll: function()
		{
			var total_unreads = this.countUnreadMessages();

			$chat_badge.html(total_unreads);
			$chat_badge[total_unreads > 0 ? 'removeClass' : 'addClass']('is-hidden');
		},

		resetUnreads: function(id)
		{
			if(typeof id == 'object')
			{
				id = id.attr('id');
			}

			var user = neonChat.chat_history[id];

			if(user)
			{
				user.unreads = 0;
				user.$el.find('.badge').html('0').addClass('is-hidden');
			}
		},

		// Groups
		createGroup: function(name, prepend)
		{
			var $group = $('<div class="chat-group"><strong>'+name+'</strong></div>');

			if(prepend)
			{
				$group.insertBefore( $chat.find('.chat-group:first') );
			}
			else
			{
				$group['appendTo']($chat);
			}

			$group.hide().slideDown();

			$group = $group.uniqueId();

			return $group.attr('id');
		},

		removeGroup: function(group_id, move_users_to_group)
		{
			var $group = $chat.find("#" + group_id.replace('#', '') + '.chat-group');

			if($group.length)
			{
				if(move_users_to_group)
				{
					var $group_2 = $chat.find("#" + move_users_to_group.replace('#', '') + '.chat-group');

					if($group_2.length)
					{
						$group.find('a').each(function(i, el)
						{
							var $user = $(el);

							$group_2.append($user);

							$user.hide().slideDown();
						});
					}

					this.orderGroups();
				}

				$group.slideUp(function()
				{
					$group.remove();
				});
			}
		},

		addUser: function(group_id, display_name, status, prepend, user_id)
		{
			var $group = group_id;

			if(typeof group_id == 'string')
			{
				$group = $chat.find("#" + group_id.replace('#', '') + '.chat-group');
			}

			if($group && $group.length)
			{
				var status = this.statuses[status],
					$user = $('<a href="#"><span class="user-status '+ status.class +'"></span> <em>'+ display_name +'</em> <span class="badge badge-info is-hidden>0</span></a>');

				if(user_id)
				{
					$user.attr('id', user_id);
				}

				if(prepend)
				{
					$user.insertAfter( $group.find('> strong') );
				}
				else
				{
					$user['appendTo']($group);
				}

				$user.hide().slideDown();

				this.refreshUserIds();
				this.orderGroups();

				return $user.uniqueId().attr('id');
			}

			return null;
		},

		addUserId: function(group_id, user_id, display_name, status, prepend)
		{
			return this.addUser(group_id, display_name, status, prepend, user_id);
		},

		getUser: function(id)
		{
			return this.chat_history[id] ? this.chat_history[id] : null;
		},

		moveUser: function(user_id, new_group_id, prepend)
		{
			var $new_group = $chat.find("#" + new_group_id.replace('#', '') + '.chat-group'),
				user = this.chat_history[user_id];


			if($new_group.length && user)
			{
				if(prepend)
				{
					user.$el.insertAfter($new_group.find('> strong'));
				}
				else
				{
					user.$el['appendTo']($new_group);
				}

				this.orderGroups();

				return true;
			}

			return false;
		},

		// Chat Container
		showChat: function(animated)
		{
			var visible_class = 'chat-visible';

			if(isxs())
			{
				visible_class += ' toggle-click';
			}

			if(animated)
			{
				if ( $chat.data( 'is-busy' ) || public_vars.$pageContainer.hasClass( visible_class ) ) {
					return false;
				}

				$chat.data( 'is-busy', true );
				
				var isLeft = public_vars.$pageContainer.hasClass( 'right-sidebar' ) ? -1 : 1;
				
				public_vars.$pageContainer.addClass( visible_class );
				
				TweenMax.from( $chat, 0.3, { opacity: 0, x: isLeft * 100, ease: Sine.easeInOut, onComplete: function() {
					$chat.data('is-busy', false).removeAttr( 'style' );
				} } );
				
				/*

				public_vars.$pageContainer.addClass(visible_class);

				var mc_padding_right = parseInt(public_vars.$mainContent.css('padding-right'), 10),
					mc_padding_left = parseInt(public_vars.$mainContent.css('padding-left'), 10),
					chat_width = $chat.width();

				public_vars.$pageContainer.removeClass(visible_class);

				if(public_vars.$pageContainer.hasClass('right-sidebar'))
				{
					public_vars.$mainContent.transition({
						paddingLeft: mc_padding_left + chat_width,
						duration: 200
					});
				}
				else
				{	
					public_vars.$mainContent.transition({
						paddingRight: mc_padding_right + chat_width,
						duration: 200
					});
				}
				
				TweenMax.set($chat, {css: {autoAlpha: public_vars.$body.hasClass('boxed-layout') ? 0 : 1, transform: "translateX("+((public_vars.$pageContainer.hasClass('right-sidebar') ? -1 : 1) * chat_width)+"px)"}});

				TweenMax.to($chat, .65, {css: {autoAlpha: 1, transform: "translateX(0)"}, ease: Sine.easeOut, onComplete: function()
				{
					public_vars.$pageContainer.addClass(visible_class);
					public_vars.$mainContent.attr('style', '');

					TweenMax.set($chat, {css: {transform: '', paddingRight: '', paddingLeft: ''}});

					$chat.data('is-busy', false);
				}});
				*/
			}
			else
			{
				public_vars.$pageContainer.addClass(visible_class);
			}
		},

		hideChat: function(animated)
		{
			var visible_class = 'chat-visible';


			if(isxs())
			{
				visible_class += ' toggle-click';
			}

			if(animated)
			{
				if ( $chat.data( 'is-busy' ) || public_vars.$pageContainer.hasClass( visible_class ) == false ) {
					return false;
				}

				$chat.data( 'is-busy', true );
				
				var isLeft = public_vars.$pageContainer.hasClass( 'right-sidebar' ) ? -1 : 1;
				
				TweenMax.to( $chat, 0.3, { opacity: 0, x: isLeft * 100, ease: Sine.easeInOut, onComplete: function() {
					$chat.data('is-busy', false).removeAttr( 'style' );
					public_vars.$pageContainer.removeClass( visible_class );
				} } );
				
				/*

				$chat.data('is-busy', true);

				disableXOverflow();

				public_vars.$pageContainer.removeClass(visible_class);

				var mc_padding_right = parseInt(public_vars.$mainContent.css('padding-right'), 10),
					mc_padding_left = parseInt(public_vars.$mainContent.css('padding-left'), 10),
					chat_width = $chat.width();

				public_vars.$pageContainer.addClass(visible_class);

				// Close any opened conversation
				neonChat.close();

				TweenMax.to($chat, .4, {css: {autoAlpha: (public_vars.$body.hasClass('boxed-layout') ? 0 : 1), transform: "translateX("+ ((public_vars.$pageContainer.hasClass('right-sidebar') ? -1 : 1) * chat_width) +"px)"}, ease: Sine.easeIn});

				var opts = {
					paddingRight: mc_padding_right,
					duration: 700,
					complete: function()
					{
						public_vars.$pageContainer.attr('style', '');
						public_vars.$mainContent.attr('style', '');
						$chat.attr('style', '');

						public_vars.$pageContainer.removeClass(visible_class);
						enableXOverflow();
						$chat.data('is-busy', false);
					}
				};

				if(public_vars.$pageContainer.hasClass('right-sidebar'))
				{
					delete opts.paddingRight;
					opts.paddingLeft = mc_padding_left;
				}

				public_vars.$mainContent.transition(opts);
				*/
			}
			else
			{
				public_vars.$pageContainer.removeClass(visible_class);
			}
		},

		toggleChat: function(animated, collapse_sidebar)
		{
			var _func = public_vars.$pageContainer.hasClass('chat-visible') ? 'hideChat' : 'showChat';

			if(isxs())
			{
				_func = public_vars.$pageContainer.hasClass('toggle-click') ? 'hideChat' : 'showChat';
			}

			neonChat[_func](animated);

			if(collapse_sidebar)
			{
				if(sidebar_default_is_open)
				{
					if(_func == 'hideChat') // Hide Sidebar
					{
						show_sidebar_menu(animated);
					}
					else
					{
						hide_sidebar_menu(animated);
					}
				}
			}
		}
	});


	// Set Cursor
	$conversation_body.on('click', function()
	{
		$textarea.focus();
	});


	// Refresh Ids
	neonChat.init();

})(jQuery, window);