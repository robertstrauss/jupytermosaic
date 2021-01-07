define([
    'base/js/namespace',
    'base/js/events',
    'require'
    ], function (Jupyter, events, requirejs) {

// add stylesheet
$('<link rel="stylesheet" type="text/css"/>').attr('href', requirejs.toUrl('./style.css')).appendTo('head');

/**
 * begins the process of dragging a cell when the cell is clicked on.
 * @param {Jupyter notebook cell object the drag started on} cell 
 * @param {the mouse event that started the drag} ievent 
 */
function startDrag(cell, ievent) {
    // const dropmargin = 50; // pixel size of drop area in margin of objects


    // unlesss multiple cells are selected, select this one 
    if ( Jupyter.notebook.get_selected_cells().length <= 1 ) {
        cell.element.trigger('click');
    }

    // get the cells that will be moved
    const cellobjs = Jupyter.notebook.get_selected_cells();
    cellobjs.push(cell);

    // get the elements that will be moved
    let elem = $();
    for ( let i in cellobjs ) {
        elem = elem.add(cellobjs[i].element);
    }

    // change appearance of cells being dragged
    elem.addClass('mosaicdragging');

    // calculate what edge the mouse is at and highlight that
    let droppable, dropx, dropy, parentgroup, side, aligned, dropheight, dropwidth, mindist;
    document.onmousemove = function (event) {
        event.preventDefault();

        if ( droppable != undefined ) {
            // clear highlighting from previous move
            droppable.removeAttr('data-hoverside')
        }

        // which cell mouse is on
        droppable = $(event.target).closest('.cell, .mosaicgroup');
        if ( droppable.length < 1 || droppable.is(elem) ) {
            droppable = null;
            return;
        }

        dropx = (event.clientX - droppable.offset().left); // x pos of mouse relative to element
        dropy = (event.clientY - droppable.offset().top);  // y pos of mouse relative to element

        dropwidth  = droppable.outerWidth();
        dropheight = droppable.outerHeight();

        // for mosaicgroups, drop areas are on margins (psuedoelements, so x and y will be outside element)
        if ( droppable.hasClass('mosaicgroup') ) {
            // if the mouse is within the left margin
            if ( dropx <  0 ) { //Math.abs(dropx) < dropmargin ) {
                side = 'left';
            }
            // if the mouse is within the right margin
            else if ( dropx > dropwidth ) { //Math.abs(droppable.outerWidth()-dropx) < dropmargin ) {
                side = 'right';
            }
            // if the mouse is within the top margin
            else if ( dropy < 0 ) { //Math.abs(dropy) < dropmargin ) {
                side = 'top';
            }
            // if the mouse is within the bottom margin 
            else if ( dropy > dropheight ) { //Math.abs(droppable.outerHeight()-dropy) < dropmargin ) {
                side = 'bottom';
            }
            // somewhere else
            else {
                return; // cancel drag
            }
        }
        // for cells, the nearest side
        else if ( droppable.hasClass('cell') ) {
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
        droppable.attr('data-hoverside', side);
    };









    // reset dragging, css, move cells, and save metadata
    document.onmouseup =  function (event) {

        // change css back
        elem.removeClass('mosaicdragging');

        // remove event listeners
        document.onmousemove = null;
        document.onmouseup = null;

        if ( droppable == undefined || side == undefined ) {
            return;
        }

        droppable.removeAttr('data-hoverside');

        // move element to within the parent element
        parentgroup = droppable.parent().closest('.mosaicgroup');
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
                droppable.before(elem);
            } else if ( after ) {
                droppable.after(elem);
            }
        } else {
            // otherwise, if it's a cell create a new group and if it's a group use itself
            if ( droppable.hasClass('mosaicgroup') ) {
                if ( before ) {
                    droppable.prepend(elem);
                } else if ( after ) {
                    droppable.append(elem);
                }
            } else if ( droppable.hasClass('cell') ) {
                subgroup = createnewgroupin(parentgroup);
                droppable.wrap(subgroup);
                if ( before ) {
                    droppable.before(elem);
                } else if ( after ) {
                    droppable.after(elem);
                }
                
                // add droppable to the list of things to save metadata of
                indices = Jupyter.notebook.get_selected_cells_indices();
                if ( Jupyter.notebook.get_cell_element(indices[0]-1).is(droppable) ) {
                    cellobjs.push(Jupyter.notebook.get_cell(indices[0]-1));
                }
                else if ( Jupyter.notebook.get_cell_element(indices[indices.length-1]+1).is(droppable) ) {
                    cellobjs.push(Jupyter.notebook.get_cell(indices[indices.length-1]+1));
                }
            }

        }

        removeIfRedundant(parentgroup);

        // save the new position of each cell into the cell's metadata
        for ( let i in cellobjs ) {
            saveMosaicPosition(cellobjs[i]);
        }
    };
}





/**
 * mosaiccollapseobserver detects when a mosaicgroup is emptied and removes it ( collapses redundant groups )
 */
const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

const mosaiccollapseobserver = new MutationObserver(function(mutations, mosaiccollapseobserver) {
    for ( let mutation of mutations ) {
        if ( mutation.removedNodes.length > 0 ) {
            removeIfRedundant(mutation.target);
        }
    }
});



function removeIfRedundant(group) {
    console.log(group, $(group).children('.cell, .mosaicgroup'))
    if ( $(group).children('.cell, .mosaicgroup').length <= 1) {
        console.log('removing', group);
        $(group).children('.mosaicgroup').children().unwrap();
        $(group).children().unwrap();
        // TODO: should call saveMosaicPosition to save the fixed redundancy
    }
}


/**
 * finds a free mosaicnumber (one that isn't in use) in mosaicgroup group
 * @param {jquery object} group
 * @returns {jquery object} subgroup
 */
function createnewgroupin(group) {
    let mosaicnumber = 0;
    // while there is already a mosaicgroup in group with mosaicnumber mosaicnumber
    while ( group.find(`.mosaicgroup[data-mosaicnumber=${mosaicnumber}]`).length > 0 ) {
        mosaicnumber++;
    }
    // // if group is empty use it instead (don't nest groups with nothing else)
    // if ( group.find('.cell, .mosaicgrid').length <= 0 ) return group;
    // create a new subgroup with the mosaicnumber
    const subgroup = $('<div>').addClass('mosaicgroup').attr('data-mosaicnumber', mosaicnumber);
    // subgroup has opposite direction of group
    if ( group.hasClass('mosaicrow') )      subgroup.addClass('mosaiccol');
    else if ( group.hasClass('mosaiccol') ) subgroup.addClass('mosaicrow');
    else subgroup.addClass('mosaicrow');

    // add mosaiccollapseobserver to remove the group when it is emptied
    mosaiccollapseobserver.observe(subgroup.get(0), {
        subtree: false,
        attributes: false,
        childList: true,
    });
    return subgroup;
}















function recursecreatemosaic(cell, group, index) {
    if ( cell.metadata.mosaic == undefined || cell.metadata.mosaic[index] == undefined ) {
        return group;
    }
    let newgroup = group.children(`.mosaicgroup[data-mosaicnumber=${cell.metadata.mosaic[index]}]`);
    if (newgroup.length < 1) { // create the group if it doesn't exist yet
        newgroup = createnewgroupin(group);
        newgroup.attr('data-mosaicnumber', cell.metadata.mosaic[index]);
        group.append(newgroup);
    }
    return recursecreatemosaic(cell, newgroup, index+1);
}


function loadMosaic() {
    // load mosaic structure from metadata
    const celllist = Jupyter.notebook.get_cells();
    const root = $('<div>');
    // root.addClass('mosaiccol');
    // root.addClass('mosaicgroup');
    for (let i in celllist){
        const cell = celllist[i];

        const group = recursecreatemosaic(cell, root, 0);
        cell.element.appendTo(group); // put cell in innermost group

        addDragger(cell);
        addHover(cell);
    }

    $('#notebook-container').append(root.children())

    // get rid of redundant wrapped mosaicgroups
    $('.mosaicgroup').each(function(){
        removeIfRedundant($(this));
    });
}



function addHover(cell) {
    // if ( cell2 !== undefined ) {
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
    // }
}




function addDragger(cell) {
    // add dragging functionality
    cell.element.mousedown(function (event){
        // has to be clicked with left mouse button, no shift or control key, and on the input label
        if ( event.button == 0 && ! event.shiftKey && ! event.ctrlKey && $(event.target).closest('.input_prompt').length > 0 ) {
            // if not in code area, start dragging functionality
            startDrag(cell, event);
        }
    });
}


function saveMosaicPosition(cell) {
    // write cell position in mosaic to metadata
    const mosaic = [];
    const groups = cell.element.parents('.mosaicgroup');
    for (let i = 0; i < groups.length; i++) {
        mosaic.unshift(groups[i].getAttribute('data-mosaicnumber'));
    }
    cell.metadata.mosaic = mosaic;
}





events.on('create.Cell', function (event,data) {
    addDragger(data.cell);
    addHover(data.cell);
    saveMosaicPosition(data.cell);
});


// events.on('notebook_loaded.Notebook', function(event, data){
//     console.log('event listener called!', event, data);
// });


events.on('kernel_ready.Kernel', function(event, data){
    // console.log('kernel event listener called!', event, data);
    loadMosaic();
    addStyleSelect();
});

// events.on('app intialize', function(event, data){
//     console.log('app initialized event called!', event, data);
// })


function addStyleSelect(){
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



});
