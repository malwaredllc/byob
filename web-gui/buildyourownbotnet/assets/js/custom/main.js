(function(){
  "use strict";


$(function ($) {

     
    //Detecting viewpot dimension
     var vH = $(window).height();
     var vW = $(window).width();


     //Adjusting Intro Components Spacing based on detected screen resolution
     $('.fullwidth').css('width',vW);
     $('.halfwidth').css('width',vW/2);
     $('.fullheight').css('height',vH);
     $('.halfheight').css('height',vH/2);
  
    //Mobile Menu (multi level)
    // $('ul.slimmenu').slimmenu({
    //     resizeWidth: '1200',
    //     collapserTitle: 'menu',
    //     easingEffect:'easeInOutQuint',
    //     animSpeed:'medium',
    // });




});
// $(function ($)  : ends

})();
//  JSHint wrapper $(function ($)  : ends