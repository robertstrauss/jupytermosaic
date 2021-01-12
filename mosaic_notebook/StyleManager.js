define([
    'base/js/events',
    'require'
],
function (events, requirejs) {
class StyleManager {
    constructor () {
        var that = this;
        // add stylesheet
        console.log('url', requirejs.toUrl('/'), requirejs.toUrl('.'))
        $('<link rel="stylesheet" type="text/css"/>').attr('href', requirejs.toUrl('./style.css')).appendTo('head');

        events.on('kernel_ready.Kernel', function (event, data) {
            that.addStyleSelect();
        });
    }

    addStyleSelect(){
        let styleselect = $('#mosaicstyleselect');
    
    
        if ( styleselect.length < 1 ) {
            styleselect = $('<select>').attr('id', 'mosaicstyleselect');
        
            styleselect.addClass('form-control');
            styleselect.addClass('select-xs');
        
            styleselect.append($('<option>').attr('value', 'floating').html('Floating cells'));
            styleselect.append($('<option>').attr('value', 'flat').html('Flat layout'));
    
            $('#maintoolbar-container').append(styleselect);
    
            styleselect.change(function (event) {
                localStorage.setItem('mosaicstyle', this.value);
    
                $('#notebook-container').attr('data-mosaicstyle', this.value);
            })
        }
    
    
        styleselect.val(localStorage.getItem('mosaicstyle')).change();
    }
}
return StyleManager;
}
);