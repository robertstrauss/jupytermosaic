styleSheet = $(`<style>
.mosaicgroup {
    display: flex;
    border: 1px solid grey;
}
.mosaicrow {
    flex-direction: row;
}
.mosaiccol {
    flex-direction: column;
}
.cell, .mosaicgroup,  #mosaicdropplacer {
    min-width: 0;
    flex: 1 1 0px;
}
.mosaicdragging {
    box-shadow: 0px 5px 20px 0px black;
    opacity: 0.6;
    background: white;
    z-index: 2;
}
#mosaicdropplacer {
    background: rgba(0, 122, 255, 0.5);
    width: 100%;
    height: 100px;
}
#notebook > .container {
    width: 95%;
}
</style>`);
$('head').append(styleSheet);




// #mosaicdragcontainer {
//     position: fixed;
//     top: 0;
//     left: 0;
//     width: 1;
//     height: 1;
//     display: block;
//     overflow: shown;
// }





// load mosaic structure from metadata
const celllist = Jupyter.notebook.get_cells();
for (let i in celllist){
    const cell = celllist[i];

    let group = $('#notebook > .container');
    // if it has mosaic metadata position it in the mosaic
    if (cell != undefined && cell.metadata != undefined && cell.metadata.mosaic != undefined) {
        group = $('#notebook > .container');
        // iterate over the numbers in the list defined in mosaic metadata
        for (let index in cell.metadata.mosaic) {
            // each number in the list is like a dimension: the first is row, the next is column,
            //     then row within that column, column within that, etc...
            // so the first number will select a group at the top level, the next will select a group within that, etc...
            newgroup = group.children(`.mosaicgroup[data-mosaicnumber=${cell.metadata.mosaic[index]}]`);
            console.log(newgroup);
            // group = $(`#mosaic-${index}-${cell.metadata.mosaic[index]}`);
            if (newgroup.length < 1) { // create the group if it doesn't exist yet
                newgroup = createnewgroupin(group);
                group.append(newgroup);
            }
            group = newgroup; // to recurse inside the new group
        }
    }
    cell.element.appendTo(group); // put cell in innermost group

    // add dragging functionality
    cell.element.mousedown(function (event){
        // check if click was in code area or not
        if ($(event.target).closest('.inner_cell').length < 1) {
            // if not in code area, start dragging functionality
            startDrag(cell, event);
        }
    });
}








function startDrag(cell, ievent) {
    const dropmargin = 40; // pixel size of drop area in margin of objects

    const elem = cell.element;

    // change appearance of cell being dragged
    elem.addClass('mosaicdragging');

    // // put dragging elements in a container so they don't mess up the formatting while being dragged
    // dragcont = $('#mosaicdragcontainer');
    // if ( dragcont.length < 1 ) {
    //     dragcont = $('<div>').attr('id', 'mosaicdragcontainer');
    //     $('body').append(dragcont);
    // }
    // dragcont.append(elem);


    // record offset of position and mouse for dragging
    ox = parseInt(elem.css('left')) - ievent.clientX;
    oy = parseInt(elem.css('top') ) - ievent.clientY;

    // an element to show where the cell would be placed if dropped now
    placer = $('<div>');
    placer.attr('id', 'mosaicdropplacer');
    elem.after(placer);

    // reset dragging, css, move cell, and save metadata
    document.onmouseup =  function (event) {

        // change css back
        elem.removeClass('mosaicdragging');
        elem.css('top',  'initial');
        elem.css('left', 'initial');

        // remove event listeners
        document.onmousemove = null;
        document.onmouseup = null;

        // move element to placer's location and remove placer
        const oldgroup = elem.closest('.mosaicgroup');
        placer.after(elem);
        placer.remove();
        removeNested(oldgroup);


        // save the new position into the cells metadata
        mosaic = [];
        groups = elem.parents('.mosaicgroup');
        for (let i = 0; i < groups.length; i++) {
            mosaic.push(groups[i].getAttribute('data-mosaicnumber'));
        }
        console.log(mosaic);
        cell.metadata.mosaic = mosaic;
    };

    // calculate where in the mosaic to put the cell and move it there
    document.onmousemove = function (event) {
        event.preventDefault();

        // elem.css('left',  ox + event.clientX);//parseInt(elem.css('top'))  + event.clientY - lastY);
        // elem.css('top',   oy + event.clientY);//parseInt(elem.css('left')) + event.clientX - lastX);

        // which cell mouse is on
        // (droppable || $('#notebook')).css('border', 'initial');
        const droppable = $(event.target).closest('.cell');
        if ( droppable == undefined || droppable.offset() == undefined || droppable.is(elem) ) return;

        const dropx = (event.clientX - droppable.offset().left); // x pos of mouse relative to element
        const dropy = (event.clientY - droppable.offset().top)

        // distance from each side of the current element
        // sides = {
        //     'top':  Math.abs(dropy),
        //     'left': Math.abs(dropx),
        //     'bottom': Math.abs(droppable.height()-dropy),
        //     'right':  Math.abs(droppable.width()-dropx)
        // };

        // get the closest side
        // side = 'top';
        // for (let i in sides) if ( sides[i] < sides[side] ) side = i;

        // if the mouse is within the left margin
        if ( Math.abs(dropx) < dropmargin ) {
            side = 'left';
        }
        // if the mouse is within the right margin
        else if ( Math.abs(droppable.width()-dropx) < dropmargin ) {
            side = 'right';
        }
        // if the mouse is within the top margin
        else if ( Math.abs(dropy) < dropmargin ) {
            side = 'top';
        }
        // if the mouse is within the bottom margin 
        else if ( Math.abs(droppable.height()-dropy) < dropmargin ) {
            side = 'bottom';
        }
        // somewhere else
        else {
            return; // cancel drag
        }
        


        let parentgroup = droppable.closest('.mosaicgroup');

        // if it isn't contained in a mosaicgroup, parentgroup will be length 0
        if ( parentgroup.length < 1 ) {
            parentgroup = $('#notebook > .container');
            parentgroup.addClass('mosaiccol');
        }
        // if the group is a row
        if ( parentgroup.hasClass('mosaicrow') ) {
            if ( side == 'top' || side == 'bottom' ) {
                aligned = false;
            } else if ( side == 'left' || side == 'right' ) {
                aligned = true;
            }
        }
        // if the group is a column
        else if ( parentgroup.hasClass('mosaiccol') ) {
            if ( side == 'top' || side == 'bottom' ) {
                aligned = true;
            } else if ( side == 'left' || side == 'right' ) {
                aligned = false;
            }
        }
        // otherwise
        else {
            return;
        }



        // adding in a different direction has to create a new group with that direction
        if ( ! aligned ) {
            subgroup = createnewgroupin(parentgroup);
            droppable.wrap(subgroup);
        }


        // move placer
        const oldgroups = placer.parents('.mosaicgroup');

        // paste in the cell where it was dropped to
        if ( side == 'left' || side == 'top' ) { 
            droppable.before(placer); // before puts it on left or top
        } else { 
            droppable.after(placer);  // after  puts it on bottom of right
        }

        removeNested(oldgroups);
        removeNested(parentgroup.parents('.mosaicgroup'));
    };


    // remove groups if two are nested with nothing else inside
    function removeNested(group) {
        // remove the cell's old mosaic group if it only has 1 element now
        if ( group.children().length < 1 ) {
            parent = group.closest('.mosaicgroup');
            group.remove();
            if ( parent.length > 0 ) removeNested(parent);
        }
        // if ( group.children('.mosaicgroup, cell').length <= 1 ) { // if theres only one thing total (mosaicgroup or cell)
        //     group.children('.mosaicgroup').children().unwrap(); // removes inner group
        //     group.children().unwrap(); // removes outer group
        //     group.remove(); // in case there were no children
        // }
    }
}






/**
 * finds a free mosaicnumber (one that isn't in use) in mosaicgroup group
 * @param {jqueryelement} group
 * @returns {jqueryelement} subgroup
 */
function createnewgroupin(group) {
    let mosaicnumber = 0;
    // while there is already a mosaicgroup in group with mosaicnumber mosaicnumber
    while ( group.find(`.mosaicgroup[data-mosaicnumber=${mosaicnumber}]`).length > 0 ) {
        mosaicnumber++;
    }
    // if group is empty use it instead (don't nest groups with nothing else)
    if ( group.find('.cell, .mosaicgrid').length <= 0 ) return group;
    // create a new subgroup with the mosaicnumber
    const subgroup = $('<div>').addClass('mosaicgroup').attr('data-mosaicnumber', mosaicnumber);
    // subgroup has opposite direction of group
    if ( group.hasClass('mosaicrow') )      subgroup.addClass('mosaiccol');
    else if ( group.hasClass('mosaiccol') ) subgroup.addClass('mosaicrow');
    else subgroup.addClass('mosaicrow');
    return subgroup;
}