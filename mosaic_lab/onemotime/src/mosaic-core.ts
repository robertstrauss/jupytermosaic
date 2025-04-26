import $ from 'jquery';
import { Cell } from '@jupyterlab/cells';

/**
 * Finds a free mosaicnumber (one that isn't in use) in a mosaicgroup.
 * @param group - A jQuery object representing the parent mosaic group
 * @returns A jQuery object representing the newly created subgroup
 */
function createnewgroupin(group: JQuery<HTMLElement>): JQuery<HTMLElement> {
    let mosaicnumber: number = 0;

    // Find the first unused mosaicnumber
    while (group.find(`.mosaicgroup[data-mosaicnumber=${mosaicnumber}]`).length > 0) {
        mosaicnumber++;
    }

    // Create a new subgroup with the mosaicnumber
    const subgroup: JQuery<HTMLElement> = $('<div>')
        .addClass('mosaicgroup')
        .attr('data-mosaicnumber', mosaicnumber.toString());
    group.append(subgroup);

    // Add a double-click handler to toggle scrollability
    subgroup.dblclick(function (this: HTMLElement, event: JQuery.DoubleClickEvent) {
        if (event.target === this) {
            let cellscroll: JQuery<HTMLElement> = $(this).closest('.mosaicscrollable');
            console.log('scroll', cellscroll);

            if (cellscroll.length === 0) {
                const wrapper = $('<div>').attr('class', 'mosaicscrollable');
                console.log('made scroll', wrapper);
                $(this).wrap(wrapper);
            } else {
                $(this).unwrap('.mosaicscrollable');
            }
        }
    });

    // Set tooltip for instructions
    subgroup.attr('title', 'double click to toggle scrolling');

    // Assign layout direction based on parent
    if (group.hasClass('mosaicrow')) {
        subgroup.addClass('mosaiccol');
    } else if (group.hasClass('mosaiccol')) {
        subgroup.addClass('mosaicrow');
    } else {
        subgroup.addClass('mosaicrow');
    }

    // Observe this subgroup for automatic removal on empty
    mosaiccollapseobserver.observe(subgroup.get(0) as HTMLElement, {
        subtree: false,
        attributes: false,
        childList: true
    });

    return subgroup;
}


/**
 * mosaiccollapseobserver detects when a mosaicgroup is emptied and removes it (collapses redundant groups)
 */
const MutationObserverClass: typeof MutationObserver =
    window.MutationObserver || (window as any).WebKitMutationObserver;

const mosaiccollapseobserver = new MutationObserverClass((
    mutations: MutationRecord[],
    _observer: MutationObserver
) => {
    for (const mutation of mutations) {
        if (mutation.removedNodes.length > 0) {
            removeIfRedundant(mutation.target as Node);
        }
    }
});


function removeIfRedundant(group: Node | HTMLElement | JQuery<HTMLElement>): void {
    const $group = $(group);

    const directContent = $group.children('.mosaicgroup, .cell');
    const scrollableContent = $group.children('.mosaicscrollable').children('.mosaicgroup, .cell');
    const isNotebookContainer = $group.attr('id') === 'notebook-container';

    if (directContent.length <= 1 && scrollableContent.length <= 1 && !isNotebookContainer) {
        console.log('removing', group);
        $group.find('.mosaicgroup').children().unwrap();
        $group.children().unwrap();
        // TODO: call saveMosaicPosition to persist the updated state
    }
}



export function recursecreatemosaic(
    cell: Cell,
    group: HTMLElement | JQuery<HTMLElement>,
    index: number
): JQuery<HTMLElement> {
    const mosaic = (cell.model.sharedModel.metadata.mosaic as Array<number>);

    if (mosaic === undefined || mosaic[index] === undefined) {
        return $(group); // wrap DOM element if needed
    }

    const $group = $(group); // normalize to jQuery

    let newgroup: JQuery<HTMLElement> = $group.children(`.mosaicgroup[data-mosaicnumber=${mosaic[index]}]`);

    // Create the group if it doesn't exist yet
    if (newgroup.length < 1) {
        newgroup = createnewgroupin($group);
        newgroup.attr('data-mosaicnumber', mosaic[index]?.toString());
        //$group.append(newgroup);
    }

    return recursecreatemosaic(cell, newgroup, index + 1);
}




export function findorcreatemosaicgroupin(group: JQuery<HTMLElement> | HTMLElement, mosaicpath: Array<string | number>) {
  let lastgroup = $(group);
  let ng;
  mosaicpath.forEach(mosaicnum => {
    ng = lastgroup.children(`[data-mosaicnumber="${mosaicnum}"]`).first()
    if (ng.length < 1) {
      ng = createnewgroupin(lastgroup);
    }
    lastgroup = ng;
  });
  return lastgroup;
}
