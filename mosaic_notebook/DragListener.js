define([
    'base/js/namespace',
    'base/js/events'
],
function (Jupyter, events){
return class DragListener {

    constructor() {
        var that = this;
        // subscribe to cell creation to add drag listeners to new cells
        events.on('create.Cell', function (event, data) {
            that.addDragger(data.cell);
        })
    }

    /**
     * add drag listener to cell
     * @param {cell obj} cell 
     */
    addDragger(cell) {
        // add dragging functionality
        cell.element.mousedown(function (event){
            // has to be clicked with left mouse button, no shift or control key, and on the input label
            if ( event.button == 0 && ! event.shiftKey && ! event.ctrlKey && $(event.target).closest('.input_prompt').length > 0 ) {
                // if not in code area, start dragging functionality
                startDrag(cell, event);
            }
        });
    }

    /**
     * begins the process of dragging a cell when the cell is clicked on.
     * @param {Jupyter notebook cell object the drag started on} cell 
     * @param {the mouse event that started the drag} ievent 
     */
    startDrag(cell, ievent) {
        this.cell = cell;

        // unlesss multiple cells are selected, select this one 
        if ( Jupyter.notebook.get_selected_cells().length <= 1 ) {
            this.cell.element.trigger('click');
        }

        // get the cells that will be moved
        this.cellobjs = Jupyter.notebook.get_selected_cells();
        this.cellobjs.push(this.cell);

        // get the elements that will be moved
        this.this.elem = $();
        for ( let i in this.cellobjs ) {
            this.this.elem = this.this.elem.add(this.cellobjs[i].element);
        }

        // change appearance of cells being dragged
        this.this.elem.addClass('mosaicdragging');

        document.onmousemove = this.moveDrag;

        document.onmouseup = this.endDrag;
    }

    /** calculate what edge the mouse is at and highlight that */
    moveDrag (event) {
        // don't select text or do some other drag action
        event.preventDefault();

        if ( this.droppable != undefined ) {
            // clear highlighting from previous move
            this.droppable.removeAttr('data-hoverside')
        }

        // which cell mouse is on
        this.droppable = $(event.target).closest('.cell, .mosaicgroup');
        if ( this.droppable.length < 1 || this.droppable.is(this.elem) ) {
            this.droppable = null;
            return;
        }

        dropx = (event.clientX - this.droppable.offset().left); // x pos of mouse relative to element
        dropy = (event.clientY - this.droppable.offset().top);  // y pos of mouse relative to element

        dropwidth  = this.droppable.outerWidth();
        dropheight = this.droppable.outerHeight();

        // for mosaicgroups, drop areas are on margins (psuedoelements, so x and y will be outside element)
        if ( this.droppable.hasClass('mosaicgroup') ) {
            // if the mouse is within the left margin
            if ( dropx <  0 ) { //Math.abs(dropx) < dropmargin ) {
                side = 'left';
            }
            // if the mouse is within the right margin
            else if ( dropx > dropwidth ) { //Math.abs(this.droppable.outerWidth()-dropx) < dropmargin ) {
                side = 'right';
            }
            // if the mouse is within the top margin
            else if ( dropy < 0 ) { //Math.abs(dropy) < dropmargin ) {
                side = 'top';
            }
            // if the mouse is within the bottom margin 
            else if ( dropy > dropheight ) { //Math.abs(this.droppable.outerHeight()-dropy) < dropmargin ) {
                side = 'bottom';
            }
            // somewhere else
            else {
                return; // cancel drag
            }
        }
        // for cells, the nearest side
        else if ( this.droppable.hasClass('cell') ) {
            // find the side its closest too
            mindist = Math.min(dropx, dropy, dropwidth-dropx, dropheight-dropy);
            if ( dropx === mindist ) {
                side = 'left';
            } else if ( dropy === mindist ) {
                side = 'top';
            } else if ( dropwidth-dropx === mindist ) {
                side = 'right';
            } else if ( dropheight-dropy === mindist ) {
                side = 'bottom';
            } else {
                return; // cancel drag
            }
        }
        
        // highlight edge
        this.droppable.attr('data-hoverside', side);
    };


    /** reset dragging, css, move cells, and save metadata */
    endDrag (event) {

        // change css back
        this.elem.removeClass('mosaicdragging');

        // remove event listeners
        document.onmousemove = null;
        document.onmouseup = null;

        if ( this.droppable == undefined || side == undefined ) {
            return;
        }

        this.droppable.removeAttr('data-hoverside');

        // move element to within the parent element
        parentgroup = this.droppable.parent().closest('.mosaicgroup');
        if ( parentgroup.length < 1 ) {
            parentgroup = $('#notebook-container');
            parentgroup.addClass('mosaiccol');
        }

        // check if the drop direction is aligned with the parent's direction
        if ( parentgroup.hasClass('mosaiccol') ) {
            aligned = ( side == 'top' || side == 'bottom' ) ? true : false;
        }
        else if ( parentgroup.hasClass('mosaicrow') ) {
            aligned = ( side == 'left' || side == 'right' ) ? true : false;
        }

        // left and top elements come before, right and bottom come after
        if ( side == 'left' || side == 'top' ) {
            before = true;
            after = false;
        }
        else if ( side == 'bottom' || side == 'right' ) {
            after = true;
            before = false;
        }

        // if it is aligned with parent just add it to the parent
        if ( aligned ) {
            if ( before ) {
                this.droppable.before(this.elem);
            } else if ( after ) {
                this.droppable.after(this.elem);
            }
        } else {
            // otherwise, if it's a cell create a new group and if it's a group use itself
            if ( this.droppable.hasClass('mosaicgroup') ) {
                if ( before ) {
                    this.droppable.prepend(this.elem);
                } else if ( after ) {
                    this.droppable.append(this.elem);
                }
            } else if ( this.droppable.hasClass('cell') ) {
                subgroup = createnewgroupin(parentgroup);
                this.droppable.wrap(subgroup);
                if ( before ) {
                    this.droppable.before(this.elem);
                } else if ( after ) {
                    this.droppable.after(this.elem);
                }
                
                // add this.droppable to the list of things to save metadata of
                indices = Jupyter.notebook.get_selected_cells_indices();
                if ( Jupyter.notebook.get_cell_element(indices[0]-1).is(this.droppable) ) {
                    this.cellobjs.push(Jupyter.notebook.get_cell(indices[0]-1));
                }
                else if ( Jupyter.notebook.get_cell_element(indices[indices.length-1]+1).is(this.droppable) ) {
                    this.cellobjs.push(Jupyter.notebook.get_cell(indices[indices.length-1]+1));
                }
            }

        }

        groupUtils.removeIfRedundant(parentgroup);

        // save the new position of each cell into the cell's metadata
        for ( let i in this.cellobjs ) {
            cellUtils.saveMosaicPosition(this.cellobjs[i]);
        }
    }

}

});