import { loadDir, toggleSelect, getSelectedItems, currentPath,
         toolbarButton, createNewFolder, startMove, startCopy, deleteSelected,
         renameSelected, showHidden, setShowHidden, showPropertiesModal
        } from './app.js';

import { openPreview } from "./preview.js";

import { downloadSelected, uploadFiles } from './upload.js';

export function addMobileRenderInteractions(div, f) {
    let pressTimer = null;
    let longPressTriggered = false;

    const LONG_PRESS_TIME = 500; // time in ms

    div.addEventListener("pointerdown", () => {
        longPressTriggered = false;

        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            toggleSelect(div, f);
        }, LONG_PRESS_TIME);
    });

    div.addEventListener("pointerup", () => {
        clearTimeout(pressTimer);

        if (!longPressTriggered) {
            if(getSelectedItems() && getSelectedItems().length == 0) {
                if (f.isDir) {
                    loadDir(f.path);
                } else if (f.type === "image" || f.type === "video") {
                    openPreview(f);
                }
            } else {
                toggleSelect(div, f);
            }
        }
    });

    div.addEventListener("pointerleave", () => {
        clearTimeout(pressTimer);
    });
}

export function addMobileToolbarButtons(bar, selectionCount) {
    const menuItems = [];

    if (selectionCount === 0) {
      bar.appendChild(toolbarButton("Upload", "fas fa-upload", uploadFiles));
      menuItems.push({ label: "New Folder", action: createNewFolder });
    } else {
      bar.appendChild(toolbarButton("Move", "fas fa-arrows-alt", startMove));
      bar.appendChild(toolbarButton("Copy", "fas fa-copy", startCopy));

      menuItems.push({ label: "Download", action: downloadSelected });
      menuItems.push({ label: "Delete", action: deleteSelected });

      if (selectionCount === 1) {
        menuItems.push({ label: "Rename", action: renameSelected });
      }
    }

    menuItems.push({
        label: "Show hidden",
        checked: showHidden,
        action: () => {
            setShowHidden(!showHidden);
            loadDir(currentPath);
        }
    });


    if (selectionCount <= 1) {
      menuItems.push({ label: "Properties", action: showPropertiesModal });
    }

    bar.appendChild(createOverflowMenuButton(menuItems));
    return;
}

function createOverflowMenuButton(menuItems) {
    const wrapper = document.createElement("div");
    wrapper.className = "overflow-menu";

    const button = document.createElement("button");
    button.className = "toolbar-btn";
    button.innerHTML = '<i class="fas fa-ellipsis-vertical"></i>';

    const menu = document.createElement("div");
    menu.className = "overflow-menu-content";
    menu.style.display = "none";

    menuItems.forEach(item => {
        const entry = document.createElement("div");
        entry.className = "overflow-menu-item";

        if (typeof item.checked === "boolean") {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = item.checked;
            checkbox.style.marginRight = "8px";
            checkbox.style.cursor = "pointer";

            entry.onclick = () => {
                menu.style.display = "none";
                item.action();
            };

            const label = document.createElement("span");
            label.innerText = item.label;

            entry.appendChild(checkbox);
            entry.appendChild(label);
        } else {
            entry.innerText = item.label;
                entry.onclick = () => {
                menu.style.display = "none";
                item.action();
            };
        }

        menu.appendChild(entry);
    });


    button.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    };

    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    wrapper.appendChild(button);
    wrapper.appendChild(menu);

    return wrapper;
}
