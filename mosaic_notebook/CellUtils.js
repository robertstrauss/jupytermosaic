define([
    'base/js/namespace',
    'base/js/events'
], function (Jupyter, events) {
return class CellUtils {

    constructor () {
        Jupyter = Jupyter;
        events.on('create.Cell', function (event, data) {
            this.saveMosaicPosition(data.cell);
            this.addHover(data.cell);
        });
    }
    
    /** write cell position to metadata */
    saveMosaicPosition(cell) {
        const mosaic = [];
        const groups = cell.element.parents('.mosaicgroup');
        for (let i = 0; i < groups.length; i++) {
            mosaic.unshift(groups[i].getAttribute('data-mosaicnumber'));
        }
        cell.set_metadata('mosaic', mosaic);
        Jupyter.notebook.set_dirty();
    }

    /** add hover listener to cells */
    addHover(cell) {
        cell.element.mouseenter(function (event) {
            let prevcell = Jupyter.notebook.get_prev_cell(cell);
            if ( prevcell != undefined ) {
                prevcell.element.addClass('prevcell');
            }
            let nextcell = Jupyter.notebook.get_next_cell(cell);
            if ( nextcell != undefined ) {
                nextcell.element.addClass('nextcell');
            }
    
            cell.element.closest('.mosaicgroup').addClass('focusgroup');
        });
        cell.element.mouseleave(function (event) {
            let prevcell = Jupyter.notebook.get_prev_cell(cell);
            if ( prevcell != undefined ) {
                prevcell.element.removeClass('prevcell');
            }
            let nextcell = Jupyter.notebook.get_next_cell(cell);
            if ( nextcell != undefined ) {
                nextcell.element.removeClass('nextcell');
            }
            cell.element.closest('.mosaicgroup').removeClass('focusgroup');
    
        });
    }
    
    
}
});