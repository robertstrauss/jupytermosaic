import $ from 'jquery';
import { Cell } from '@jupyterlab/cells';

/**
 * Finds a free mosaicnumber (one that isn't in use) in a mosaicgroup.
 * @param group - A jQuery object representing the parent mosaic group
 * @returns A jQuery object representing the newly created subgroup
 */
function createnewgroupin(group: JQuery<HTMLElement>, mosaicnumber: number =-1): JQuery<HTMLElement> {
    if (mosaicnumber == -1) {
        mosaicnumber = 0;

        // Find the first unused mosaicnumber
        while (group.find(`.mosaicgroup[data-mosaicnumber=${mosaicnumber}]`).length > 0) {
            mosaicnumber++;
        }
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

    const directContent = $group.children('.mosaicgroup, .jp-Cell');
    const scrollableContent = $group.children('.mosaicscrollable').children('.mosaicgroup, .jp-Cell');
    const isNotebookContainer = $group.attr('id') === 'mosaic-root';

    if (directContent.length <= 1 && scrollableContent.length <= 1 && !isNotebookContainer) {
        console.log('removing', group);
        // $group.find('.mosaicgroup').children().unwrap();
        // $group.children().unwrap();
        // TODO: call saveMosaicPosition to persist the updated state
    }
}



export function recursecreatemosaic(
    cell: Cell,
    group: HTMLElement | JQuery<HTMLElement>,
    index: number
): JQuery<HTMLElement> {
    const mosaic = (cell.model.sharedModel.metadata.mosaic as Array<number>);
    const $group = $(group); // normalize to jQuery

    if (mosaic === undefined || mosaic[index] === undefined) {
        return $group; // wrap DOM element if needed
    }


    let newgroup: JQuery<HTMLElement> = $group.children(`.mosaicgroup[data-mosaicnumber=${mosaic[index]}]`);

    // Create the group if it doesn't exist yet
    if (newgroup.length < 1) {
        newgroup = createnewgroupin($group, mosaic[index]);
        newgroup.attr('data-mosaicnumber', mosaic[index]?.toString());
        //$group.append(newgroup);
    }

    return recursecreatemosaic(cell, newgroup, index + 1);
}




export function findorcreatemosaicgroupin(group: JQuery<HTMLElement> | HTMLElement, mosaicpath: Array<string>) {
    let lastgroup = $(group);
    let ng;
    mosaicpath.forEach(mosaicnum => {
        if (mosaicnum !== '') {
            ng = lastgroup.children(`[data-mosaicnumber="${mosaicnum}"]`).first()
            if (ng.length < 1) {
                ng = createnewgroupin(lastgroup, parseInt(mosaicnum));
            }
            lastgroup = ng;
        }
    });
    return lastgroup;
}








/**
 * Begins the process of dragging a cell when the cell is clicked on.
 * @param cell - The Jupyter notebook cell object the drag started on.
 * @param ievent - The mouse event that started the drag.
 */
export function startDrag(cells: Cell[], ievent: MouseEvent): void {
    // get the cells that will be moved
    const cellobjs: Cell[] = cells;
    // get the elements that will be moved
    const elem: HTMLElement[] = [];
    for (const cellObj of cellobjs) {
        elem.push(cellObj.node);
    }

    // Change appearance of cells being dragged
    for (const el of elem) {
        el.classList.add('mosaicdragging');
    }

    // Calculate what edge the mouse is at and highlight that
    let highlight = document.getElementById('mosaicdrophighlight');
    if (!highlight) {
        highlight = document.createElement('div');
        highlight.id = 'mosaicdrophighlight';
        document.body.appendChild(highlight);
    }

    let droppable: HTMLElement | null = document.createElement('div');
    let dropx: number, dropy: number, dropwidth: number, dropheight: number;
    let parentgroup: HTMLElement | null, side: string | undefined, aligned: boolean;
    let mindist: number;

    function end(): void {
        droppable = document.createElement('div');
        if (highlight) {
            highlight.removeAttribute('data-hoverside');
        }
        return;
    }
    document.onmousemove = function (event: MouseEvent): void {
        if (!event.target) {
            return end();
        }

        event.preventDefault();

        // Find the closest parent with the class 'cell' or 'mosaicgroup'
        let droppable = (event.target as HTMLElement).closest('.jp-Cell, .mosaicgroup') as HTMLElement | null;

        const mosaicRoot = document.getElementById('mosaic-root');

        // Check if the target has the class 'end_space'
        if ((event.target as HTMLElement).classList.contains('.jp-Notebook-footer')
        || (event.target as HTMLElement).classList.contains('.jp-WidnowPanel-outer')) {
            if (mosaicRoot) {
                droppable = mosaicRoot.lastElementChild as HTMLElement | null;
            }
        }

        // If no valid droppable element is found or it matches the dragged element, cancel
        if (!droppable || elem.includes(droppable)) {
            return end();
        }

        // Calculate the mouse position relative to the droppable element
        console.log('droppable', droppable);
        const droppableRect = droppable.getBoundingClientRect();
        const rootRect = mosaicRoot?.getBoundingClientRect() || { left: 0, top: 0 };
        console.log('drop left, top', droppableRect.left, droppableRect.top);
        console.log('root left, top', rootRect.left, rootRect.top);
        dropx = event.clientX - droppableRect.left + rootRect.left; // x pos of mouse relative to element
        dropy = event.clientY - droppableRect.top + rootRect.top;  // y pos of mouse relative to element

        dropwidth = droppableRect.width;
        dropheight = droppableRect.height;

        // Find the side the mouse is closest to
        mindist = Math.min(dropx, dropy, dropwidth - dropx, dropheight - dropy);
        if (dropx === mindist) {
            side = 'left';
        } else if (dropy === mindist) {
            side = 'top';
        } else if (dropwidth - dropx === mindist) {
            side = 'right';
        } else if (dropheight - dropy === mindist) {
            side = 'bottom';
        } else {
            return; // cancel drag
        }

        // Insert the highlight element after the droppable element
        if (droppable.parentNode) {
            if (highlight) {
                droppable.parentNode.insertBefore(highlight, droppable.nextSibling);
            }
        }

        // Update the highlight element's style
        if (highlight) {
            highlight.style.position = 'absolute';
            highlight.style.top = `${droppableRect.top + window.scrollY}px`;
            highlight.style.left = `${droppableRect.left + window.scrollX}px`;
            highlight.style.width = `${droppableRect.width}px`;
            highlight.style.height = `${droppableRect.height}px`;

            // Add the data-hoverside attribute to the highlight element
            highlight.setAttribute('data-hoverside', side);
        }
    };

    // reset dragging, css, move cells, and save metadata
    document.onmouseup = function (event: MouseEvent): void {
        // change css back
        for (const el of elem) {
            el.classList.remove('mosaicdragging');
        }
        if (highlight) {
            highlight.removeAttribute('data-hoverside');
        }

        // remove event listeners
        document.onmousemove = null;
        document.onmouseup = null;

        if (!droppable || !side) {
            return;
        }

        // move element to within the parent element
        parentgroup = droppable.closest('.mosaicgroup');
        if (! parentgroup) {
            parentgroup = document.querySelector('#mosaic-root');
            parentgroup?.classList.add('mosaiccol');
        }

        // check if the drop direction is aligned with the parent's direction
        if (parentgroup?.classList.contains('mosaiccol')) {
            aligned = side === 'top' || side === 'bottom';
        } else if (parentgroup?.classList.contains('mosaicrow')) {
            aligned = side === 'left' || side === 'right';
        } else {
            aligned = false;
        }

        // left and top elements come before, right and bottom come after
        const before = side === 'left' || side === 'top';
        const after = side === 'right' || side === 'bottom';

        // if it is aligned with parent just add it to the parent
        if (aligned) {
            if (before) {
                for (const el of elem) {
                    droppable.insertAdjacentElement('beforebegin', el);
                }
            } else if (after) {
                for (const el of elem) {
                    droppable.insertAdjacentElement('afterend', el);
                }
            }
        } else {
            // Otherwise, if it's a cell create a new group and if it's a group use itself
            if (droppable.classList.contains('mosaicgroup')) {
                if (before) {
                    for (const el of elem) {
                        droppable.insertAdjacentElement('afterbegin', el); // Prepend each element
                    }
                } else if (after) {
                    for (const el of elem) {
                        droppable.insertAdjacentElement('beforeend', el); // Append each element
                    }
                }
            } else if (droppable.classList.contains('cell')) {
                if (parentgroup) {
                    const subgroup = createnewgroupin($(parentgroup)).get(0) as HTMLElement; // Create a new group in the parent group

                    // Wrap the droppable element in the new subgroup
                    const wrapper = document.createElement('div');
                    wrapper.className = subgroup.className;
                    droppable.parentNode?.insertBefore(wrapper, droppable);
                    wrapper.appendChild(droppable);

                    if (before) {
                        for (const el of elem) {
                            droppable.insertAdjacentElement('beforebegin', el); // Insert elements before the droppable
                        }
                    } else if (after) {
                        for (const el of elem) {
                            droppable.insertAdjacentElement('afterend', el); // Insert elements after the droppable
                        }
                    }
                }
            }
        }

        removeIfRedundant(parentgroup as Node); // Remove redundant groups

        // save the new position of each cell into the cell's metadata
        for (const cellObj of cellobjs) {
            saveMosaicPosition(cellObj);
        }
    };
}




function saveMosaicPosition(cell: Cell): void {
    // Write cell position in mosaic to metadata
    const mosaic: string[] = [];
    const groups = $(cell.node).parents('.mosaicgroup, .mosaicscrollable').not('#mosaic-root');

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i] as HTMLElement;
        if ($(group).hasClass('mosaicscrollable')) {
            // mosaic.unshift('scroll'); // Uncomment if needed
        } else if ($(group).hasClass('mosaicgroup')) {
            const mosaicNumber = group.getAttribute('data-mosaicnumber');
            if (mosaicNumber) {
                mosaic.unshift(mosaicNumber);
            }
        }
    }

    cell.model.sharedModel.metadata.mosaic = mosaic;
}