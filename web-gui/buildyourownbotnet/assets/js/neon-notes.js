/**
 *	Neon Notes Script
 *
 *	Developed by Arlind Nushi - www.laborator.co
 */

var neonNotes = neonNotes || {};

;(function($, window, undefined)
{
	"use strict";
	
	$(document).ready(function()
	{
		neonNotes.$container = $(".notes-env");
		
		$.extend(neonNotes, {
			isPresent: neonNotes.$container.length > 0,
			
			noTitleText: "Untitled",
			noDescriptionText: "(No content)",
			
			
			$currentNote: $(null),
			$currentNoteTitle: $(null),
			$currentNoteDescription: $(null),
			$currentNoteContent: $(null),
			
			addNote: function()
			{	
				var $note = $('<li><a href="#"><strong></strong><span></li></a></li>');
				
				$note.append('<div class="content"></div>').append('<button class="note-close">&times;</button>');
				
				$note.find('strong').html(neonNotes.noTitleText);
				$note.find('span').html(neonNotes.noDescriptionText);
				
				neonNotes.$notesList.prepend($note);
				
				TweenMax.set($note, {autoAlpha: 0});
				
				var tl = new TimelineMax();
				
				tl.append( TweenMax.to($note, .10, {css: {autoAlpha: 1}}) );
				tl.append( TweenMax.to($note, .15, {css: {autoAlpha: .8}}) );
				tl.append( TweenMax.to($note, .15, {css: {autoAlpha: 1}}) );
				
				neonNotes.$notesList.find('li').removeClass('current');
				$note.addClass('current');
				
				neonNotes.$writePadTxt.focus();
				
				neonNotes.checkCurrentNote();
			},
			
			checkCurrentNote: function()
			{
				var $current_note = neonNotes.$notesList.find('li.current').first();
				
				if($current_note.length)
				{
					neonNotes.$currentNote             = $current_note;
					neonNotes.$currentNoteTitle        = $current_note.find('strong');
					neonNotes.$currentNoteDescription  = $current_note.find('span');
					neonNotes.$currentNoteContent      = $current_note.find('.content');
					
					neonNotes.$writePadTxt.val( $.trim( neonNotes.$currentNoteContent.html() ) ).trigger('autosize.resize');;
				}
				else
				{
					var first = neonNotes.$notesList.find('li:first:not(.no-notes)');
					
					if(first.length)
					{
						first.addClass('current');
						neonNotes.checkCurrentNote();
					}
					else
					{
						neonNotes.$writePadTxt.val('');
						neonNotes.$currentNote = $(null);
						neonNotes.$currentNoteTitle = $(null);
						neonNotes.$currentNoteDescription = $(null);
						neonNotes.$currentNoteContent = $(null);
					}
				}
			},
			
			updateCurrentNoteText: function()
			{
				var text = $.trim( neonNotes.$writePadTxt.val() );
					
				if(neonNotes.$currentNote.length)
				{
					var title = '',
						description = '';
					
					if(text.length)
					{
						var _text = text.split("\n"), currline = 1;
						
						for(var i=0; i<_text.length; i++)
						{
							if(_text[i])
							{
								if(currline == 1)
								{
									title = _text[i];
								}
								else
								if(currline == 2)
								{
									description = _text[i];
								}
								
								currline++;
							}
							
							if(currline > 2)
								break;
						}
					}
					
					neonNotes.$currentNoteTitle.text( title.length ? title : neonNotes.noTitleText );
					neonNotes.$currentNoteDescription.text( description.length ? description : neonNotes.noDescriptionText );
					neonNotes.$currentNoteContent.text( text );
				}
				else
				if(text.length)
				{
					neonNotes.addNote();
				}
			}
		});
		
		// Mail Container Height fit with the document
		if(neonNotes.isPresent)
		{
			neonNotes.$notesList = neonNotes.$container.find('.list-of-notes');
			neonNotes.$writePad = neonNotes.$container.find('.write-pad');
			neonNotes.$writePadTxt = neonNotes.$writePad.find('textarea');
			
			neonNotes.$addNote = neonNotes.$container.find('#add-note');
			
			neonNotes.$addNote.on('click', function(ev)
			{
				neonNotes.addNote();
			});
			
			neonNotes.$writePadTxt.on('keyup', function(ev)
			{
				neonNotes.updateCurrentNoteText();
			});
			
			neonNotes.checkCurrentNote();
			
			neonNotes.$notesList.on('click', 'li a', function(ev)
			{
				ev.preventDefault();
				
				neonNotes.$notesList.find('li').removeClass('current');
				$(this).parent().addClass('current');
				
				neonNotes.checkCurrentNote();
				
				
			});
			
			neonNotes.$notesList.on('click', 'li .note-close', function(ev)
			{
				ev.preventDefault();
				
				var $note = $(this).parent();
				
				var tl = new TimelineMax();
				
				tl.append( 
					TweenMax.to($note, .15, {css: {autoAlpha: 0.2}, onComplete: function()
					{
						$note.slideUp('fast', function()
						{
							$note.remove();
							neonNotes.checkCurrentNote();
						});
					}}) 
				);
			});
		}
	});
	
})(jQuery, window);

