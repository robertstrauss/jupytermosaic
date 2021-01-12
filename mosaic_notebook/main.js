define([
    'base/js/namespace',
    'base/js/events',
    'require',

    './StyleManager',
    './DragListener',
    './GroupUtils',
    './CellUtils'
    ], function (Jupyter, events, requirejs, StyleManager, DragListener, GroupUtils, CellUtils) {

// instantiate modules
styleManager = new StyleManager(events, requirejs);
dragListener = new DragListener(Jupyter, events);
groupUtils   = new GroupUtils();
cellUtils    = new CellUtils(Jupyter);

console.log("MODULES INSTANTIATED")

function recursecreatemosaic(cell, group, index) {
    if ( cell.metadata.mosaic == undefined || cell.metadata.mosaic[index] == undefined ) {
        return group;
    }
    let newgroup = group.children(`.mosaicgroup[data-mosaicnumber=${cell.metadata.mosaic[index]}]`);
    if (newgroup.length < 1) { // create the group if it doesn't exist yet
        newgroup = groupUtils.createnewgroupin(group);
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

        // addDragger(cell);
        // addHover(cell);
    }

    $('#notebook-container').append(root.children())

    // get rid of redundant wrapped mosaicgroups
    $('.mosaicgroup').each(function(){
        groupUtils.removeIfRedundant($(this));
    });
}



console.log('setting up event listeners');




events.on('notebook_loaded.Notebook', function(event, data){
    console.log('NOTEBOOK LOADED called!', event, data);
});


events.on('kernel_ready.Kernel', function(event, data){
    loadMosaic();
    console.log("loading mosaic");
});





});
