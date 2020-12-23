styleSheet = $(`<style>
/** 
 * defines the gap width variable, which is the size of the margins between cells where cells can be dropped to place them
 */
:root {
    --gap-width: 10px;
}

/** 
 * makes the contianer of the cells wider, so there's more room,
 * and sets it to negative z-index so it doesn't capture all the mouse events
 */
#notebook-container {
    width: 95%;
    z-index: -5
}

/** mosaicgroups are flex so all the cells are squeezed into a row or column */
.mosaicgroup {
    display: flex;
    position: relative;
}
/** hide empty groups so they don't make blank gaps if they somehow get left there */
.mosaicgroup:empty {
    display: none;
}
/** 
 * makes cells and mosaic groups the same size, with gaps between them, and not overflow 
 * z-index is to make them capture the mouse events so they know when something is dragging over them
 */
.cell, .mosaicgroup {
    min-width: 0;
    width: unset !important;
    flex: 1 1 0px;
    margin: var(--gap-width) !important;
    z-index: 2;
}
/** rows are rows, and don't need to leave extra space on the sides for dropping */
.mosaicrow {
    flex-direction: row;
    margin-left: 0 !important;
    margin-right: 0 !important;
}
/** cols are columnss, and don't need to leave extra space on the top and bottom for dropping */
.mosaiccol {
    flex-direction: column;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

/** takes away white middle column so cells are floating in the grey area */
#notebook-container {
    background: transparent;
    box-shadow: none;
}
/** makes cells floating things with round corners */
div.cell {
    background: white;
    box-shadow: 0px 3px 10px 1px rgba(0,0,0,0.5);
    border-radius: 10px !important;
}


/** make the input prompt (In [ ]) and output prompt (Out [ ]) above the input and output rather than beside */
.cell > .input, .output > .output_area {
    flex-direction: column !important;
}
/** 
 * make the output view full width of the cell 
 * (it usually leaves room for the output prompt, but we are putting that on top instead)
 */
.output_subarea {
    max-width: 100% !important;
}
/** makes the input prompt or blank area of markdown cells clickable with z-index, so it can be dragged there, and full size */
.input_prompt {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 2;
}
/** styles the input prompt of code cells only, making it bigger and on the top rather than side */
.prompt_container > .input_prompt {
    text-align: left;
    position: relative;
    height: 2.8rem;
    width: 100%;
}

/** puts the output prompt's overlay big and on the top rather than side just like the output prompt itself */
.out_prompt_overlay {
    width: 100%;
    height: 2.8rem;
}

/**
 * the after psuedo elements of cells and mosaicgroups are for captuing mouseevents outside the element itself,
 * so when the mouse is dragging a cell near one of them it can detect it.
 * they also are used to highlight where the cell will go when dropped by changing the border color.
 */
.cell::after, .mosaicgroup::after {
    display: inline-block;
    flex: 0 0 auto;
    content: "";
    position: absolute;
    background: transparent;
    top: calc(var(--gap-width)*-1);
    left: calc(var(--gap-width)*-1);
    width: 100%;
    height: 100%;
    border: var(--gap-width) solid transparent;
    box-sizing: content-box;
    z-index: 1;
}
/** when the mouse is hovering by the top highlight the top edge to show where the cell will go when dropped */
[data-hoverside=top]::after {
    border-top-color: lightblue;
}
/** when the mouse is hovering by the left highlight the left edge to show where the cell will go when dropped */
[data-hoverside=left]::after {
    border-left-color: lightblue;
}
/** when the mouse is hovering by the bottom highlight the bottom edge to show where the cell will go when dropped */
[data-hoverside=bottom]::after {
    border-bottom-color: lightblue;
}
/** when the mouse is hovering by the right highlight the right edge to show where the cell will go when dropped */
[data-hoverside=right]::after {
    border-right-color: lightblue;
}

/** decrease opacity and give cells extra shadow when being dragged, to make it clear they are being dragged */
.mosaicdragging {
    position: absolute;
    box-shadow: 0px 5px 20px 0px black;
    opacity: 0.6;
    background: white;
    z-index: 2;
}

</style>`);
$('head').append(styleSheet);







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
    let droppable, dropx, dropy, parentgroup, side, aligned;
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

        // if the mouse is within the left margin
        if ( dropx <  0 ) { //Math.abs(dropx) < dropmargin ) {
            side = 'left';
        }
        // if the mouse is within the right margin
        else if ( dropx > droppable.outerWidth() ) { //Math.abs(droppable.outerWidth()-dropx) < dropmargin ) {
            side = 'right';
        }
        // if the mouse is within the top margin
        else if ( dropy < 0 ) { //Math.abs(dropy) < dropmargin ) {
            side = 'top';
        }
        // if the mouse is within the bottom margin 
        else if ( dropy > droppable.outerHeight() ) { //Math.abs(droppable.outerHeight()-dropy) < dropmargin ) {
            side = 'bottom';
        }
        // somewhere else
        else {
            return; // cancel drag
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

        // save the new position of each cell into the cell's metadata
        for ( let i in cellobjs ) {
            const mosaic = [];
            const groups = cellobjs[i].element.parents('.mosaicgroup');
            for (let i = 0; i < groups.length; i++) {
                mosaic.unshift(groups[i].getAttribute('data-mosaicnumber'));
            }
            cellobjs[i].metadata.mosaic = mosaic;
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
            if ( $(mutation.target).children('.cell, .mosaicgroup').length <= 1) {
                console.log('removing', mutation.target);
                $(mutation.target).children('.mosaicgroup').children().unwrap();
                $(mutation.target).children('.cell').unwrap();
            }
        }
    }
});




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









// load mosaic structure from metadata
$('#notebook-container').addClass('mosaiccol');
const celllist = Jupyter.notebook.get_cells();
for (let i in celllist){
    const cell = celllist[i];

    function recursecreatemosaic(group, index) {
        if ( cell.metadata.mosaic == undefined || cell.metadata.mosaic[index] == undefined ) {
            return group;
        }
        let newgroup = group.children(`.mosaicgroup[data-mosaicnumber=${cell.metadata.mosaic[index]}]`);
        if (newgroup.length < 1) { // create the group if it doesn't exist yet
            newgroup = createnewgroupin(group);
            newgroup.attr('data-mosaicnumber', cell.metadata.mosaic[index]);
            group.append(newgroup);
        }
        return recursecreatemosaic(newgroup, index+1);
    }


    let group = recursecreatemosaic($('#notebook-container'), 0);
    // console.log('appending', group);
    cell.element.appendTo(group); // put cell in innermost group

    // add dragging functionality
    cell.element.mousedown(function (event){
        console.log(event.target);
        // has to be clicked with left mouse button, no shift or control key, and on the input label
        if ( event.button == 0 && ! event.shiftKey && ! event.ctrlKey && $(event.target).closest('.input_prompt').length > 0 ) {
            // if not in code area, start dragging functionality
            startDrag(cell, event);
        }
    });
}