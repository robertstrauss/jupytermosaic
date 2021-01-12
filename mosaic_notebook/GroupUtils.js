define([],

function () {
return class GroupUtils {

    constructor () {
        this.mosaiccollapseobserver = new MutationObserver(this.collapseObserver);
    }

    /**
     * finds a free mosaicnumber (one that isn't in use) in mosaicgroup group
     * @param {jquery object} group
     * @returns {jquery object} subgroup
     */
    createnewgroupin(group) {
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
        this.mosaiccollapseobserver.observe(subgroup.get(0), {
            subtree: false,
            attributes: false,
            childList: true,
        });
        return subgroup;
    }

    /**
     * mosaiccollapseobserver detects when a mosaicgroup is emptied and removes it ( collapses redundant groups )
     */
    collapseObserver (mutations, observer) {
        for ( let mutation of mutations ) {
            if ( mutation.removedNodes.length > 0 ) {
                this.removeIfRedundant(mutation.target);
            }
        }
    }


    /** gets rid of wrapped/nested groups, or empty groups */
    removeIfRedundant(group) {
        console.log(group, $(group).children('.cell, .mosaicgroup'))
        if ( $(group).children('.cell, .mosaicgroup').length <= 1) {
            console.log('removing', group);
            $(group).children('.mosaicgroup').children().unwrap();
            $(group).children().unwrap();
            // TODO: should call saveMosaicPosition to save the fixed redundancy
        }
    }
}
});